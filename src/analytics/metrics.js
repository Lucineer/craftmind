/**
 * Analytics Metrics Engine - Computes KPIs from analytics events
 * @module analytics/metrics
 */

const fs = require('fs');
const path = require('path');

/**
 * MetricsEngine class - Calculates DAU, MAU, retention, economy health, etc.
 */
class MetricsEngine {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.dataDir='data/analytics'] - Directory for event storage
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data', 'analytics');
  }

  /**
   * Read events from a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array<Object>>} Events
   * @private
   */
  async _readEvents(startDate, endDate) {
    const events = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const filePath = path.join(this.dataDir, `events-${dateStr}.jsonl`);

      if (fs.existsSync(filePath)) {
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');
          const lines = content.trim().split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                events.push(JSON.parse(line));
              } catch (e) {
                // Skip malformed lines
              }
            }
          }
        } catch (err) {
          // File read error, skip
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return events;
  }

  /**
   * Get date string from date
   * @param {Date} date - Date
   * @returns {string} Date string YYYY-MM-DD
   * @private
   */
  _dateStr(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate Daily Active Users (DAU)
   * @param {Array<Object>} events - Events array
   * @param {string} dateStr - Date string
   * @returns {Object} DAU metrics
   * @private
   */
  _calculateDAU(events, dateStr) {
    const dayEvents = events.filter(e => e.timestamp.startsWith(dateStr));
    const uniquePlayers = new Set();

    for (const event of dayEvents) {
      if (event.type === 'player_join' || event.type === 'player_leave') {
        if (event.data.player) {
          uniquePlayers.add(event.data.player);
        }
      }
    }

    return {
      date: dateStr,
      dau: uniquePlayers.size,
      players: [...uniquePlayers]
    };
  }

  /**
   * Calculate Monthly Active Users (MAU)
   * @param {Array<Object>} events - Events in the month
   * @param {string} yearMonth - Year-month string YYYY-MM
   * @returns {Object} MAU metrics
   * @private
   */
  _calculateMAU(events, yearMonth) {
    const monthEvents = events.filter(e => e.timestamp.startsWith(yearMonth));
    const uniquePlayers = new Set();

    for (const event of monthEvents) {
      if (event.type === 'player_join' || event.type === 'player_leave') {
        if (event.data.player) {
          uniquePlayers.add(event.data.player);
        }
      }
    }

    return {
      month: yearMonth,
      mau: uniquePlayers.size
    };
  }

  /**
   * Calculate retention rates
   * @param {Array<Object>} events - All events
   * @param {Date} sinceDate - Start date
   * @returns {Object} Retention metrics
   * @private
   */
  _calculateRetention(events, sinceDate) {
    // Find first join date for each player
    const playerFirstJoin = new Map();

    for (const event of events) {
      if (event.type === 'player_join' && event.data.player) {
        const player = event.data.player;
        if (!playerFirstJoin.has(player)) {
          playerFirstJoin.set(player, new Date(event.timestamp));
        } else {
          const existing = playerFirstJoin.get(player);
          const current = new Date(event.timestamp);
          if (current < existing) {
            playerFirstJoin.set(player, current);
          }
        }
      }
    }

    // Track player activity days
    const playerActiveDays = new Map();
    for (const event of events) {
      if ((event.type === 'player_join' || event.type === 'player_leave') && event.data.player) {
        const player = event.data.player;
        const dayStr = event.timestamp.split('T')[0];
        if (!playerActiveDays.has(player)) {
          playerActiveDays.set(player, new Set());
        }
        playerActiveDays.get(player).add(dayStr);
      }
    }

    // Calculate retention cohorts
    const retention = {
      day1: { retained: 0, total: 0, rate: 0 },
      day7: { retained: 0, total: 0, rate: 0 },
      day30: { retained: 0, total: 0, rate: 0 }
    };

    const now = new Date();

    for (const [player, firstJoin] of playerFirstJoin) {
      const daysSinceJoin = Math.floor((now - firstJoin) / (1000 * 60 * 60 * 24));
      const activeDays = playerActiveDays.get(player) || new Set();
      const joinDayStr = this._dateStr(firstJoin);

      // Day 1 retention
      if (daysSinceJoin >= 1) {
        retention.day1.total++;
        const day1Str = this._dateStr(new Date(firstJoin.getTime() + 24 * 60 * 60 * 1000));
        if (activeDays.has(day1Str)) {
          retention.day1.retained++;
        }
      }

      // Day 7 retention
      if (daysSinceJoin >= 7) {
        retention.day7.total++;
        const day7Str = this._dateStr(new Date(firstJoin.getTime() + 7 * 24 * 60 * 60 * 1000));
        if (activeDays.has(day7Str)) {
          retention.day7.retained++;
        }
      }

      // Day 30 retention
      if (daysSinceJoin >= 30) {
        retention.day30.total++;
        const day30Str = this._dateStr(new Date(firstJoin.getTime() + 30 * 24 * 60 * 60 * 1000));
        if (activeDays.has(day30Str)) {
          retention.day30.retained++;
        }
      }
    }

    // Calculate rates
    if (retention.day1.total > 0) {
      retention.day1.rate = retention.day1.retained / retention.day1.total;
    }
    if (retention.day7.total > 0) {
      retention.day7.rate = retention.day7.retained / retention.day7.total;
    }
    if (retention.day30.total > 0) {
      retention.day30.rate = retention.day30.retained / retention.day30.total;
    }

    return retention;
  }

  /**
   * Calculate economy health metrics
   * @param {Array<Object>} events - Events array
   * @returns {Object} Economy metrics
   * @private
   */
  _calculateEconomy(events) {
    // Track credits per player
    const playerCredits = new Map();
    let totalEarned = 0;
    let totalSpent = 0;

    // Fish sold = earn credits
    for (const event of events) {
      if (event.type === 'fish_sold' && event.data.player && event.data.price) {
        const player = event.data.player;
        const price = Number(event.data.price) || 0;
        totalEarned += price;
        playerCredits.set(player, (playerCredits.get(player) || 0) + price);
      }

      if (event.type === 'item_bought' && event.data.player && event.data.price) {
        const player = event.data.player;
        const price = Number(event.data.price) || 0;
        totalSpent += price;
        playerCredits.set(player, (playerCredits.get(player) || 0) - price);
      }
    }

    const credits = [...playerCredits.values()];
    const totalCredits = credits.reduce((sum, c) => sum + c, 0);
    const avgWealth = credits.length > 0 ? totalCredits / credits.length : 0;

    return {
      totalCreditsInCirculation: totalCredits,
      totalEarned,
      totalSpent,
      earnedSpentRatio: totalSpent > 0 ? totalEarned / totalSpent : totalEarned,
      averageWealth: avgWealth,
      playerCount: credits.length
    };
  }

  /**
   * Calculate game mode distribution (time per activity)
   * @param {Array<Object>} events - Events array
   * @returns {Object} Activity distribution
   * @private
   */
  _calculateActivityDistribution(events) {
    const activities = {
      fishing: { count: 0, label: 'Fishing' },
      trading: { count: 0, label: 'Trading' },
      quests: { count: 0, label: 'Quests' },
      tournaments: { count: 0, label: 'Tournaments' },
      social: { count: 0, label: 'Social/NPC' }
    };

    for (const event of events) {
      switch (event.type) {
        case 'fish_caught':
        case 'fish_sold':
          activities.fishing.count++;
          break;
        case 'item_bought':
        case 'item_sold':
          activities.trading.count++;
          break;
        case 'quest_completed':
          activities.quests.count++;
          break;
        case 'tournament_join':
          activities.tournaments.count++;
          break;
        case 'npc_interact':
          activities.social.count++;
          break;
      }
    }

    const total = Object.values(activities).reduce((sum, a) => sum + a.count, 0);

    return {
      activities,
      total,
      percentages: Object.fromEntries(
        Object.entries(activities).map(([k, v]) => [k, total > 0 ? v.count / total : 0])
      )
    };
  }

  /**
   * Calculate top items
   * @param {Array<Object>} events - Events array
   * @returns {Object} Top items
   * @private
   */
  _calculateTopItems(events) {
    const fishCaught = new Map();
    const itemsBought = new Map();
    const itemsSold = new Map();

    for (const event of events) {
      if (event.type === 'fish_caught' && event.data.fishType) {
        fishCaught.set(event.data.fishType, (fishCaught.get(event.data.fishType) || 0) + 1);
      }
      if (event.type === 'item_bought' && event.data.item) {
        itemsBought.set(event.data.item, (itemsBought.get(event.data.item) || 0) + 1);
      }
      if (event.type === 'item_sold' && event.data.item) {
        itemsSold.set(event.data.item, (itemsSold.get(event.data.item) || 0) + 1);
      }
    }

    const sortByCount = (map) => [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      topFishCaught: sortByCount(fishCaught),
      topItemsBought: sortByCount(itemsBought),
      topItemsSold: sortByCount(itemsSold)
    };
  }

  /**
   * Calculate all metrics since a given date
   * @param {Date} sinceDate - Start date for calculations
   * @returns {Promise<Object>} All computed metrics
   */
  async calculateMetrics(sinceDate) {
    const now = new Date();
    const events = await this._readEvents(sinceDate, now);

    const todayStr = this._dateStr(now);
    const yearMonth = todayStr.substring(0, 7);

    const dau = this._calculateDAU(events, todayStr);
    const mau = this._calculateMAU(events, yearMonth);
    const retention = this._calculateRetention(events, sinceDate);
    const economy = this._calculateEconomy(events);
    const activity = this._calculateActivityDistribution(events);
    const topItems = this._calculateTopItems(events);

    return {
      generatedAt: now.toISOString(),
      since: sinceDate.toISOString(),
      dau,
      mau,
      retention,
      economy,
      activity,
      topItems,
      eventCount: events.length
    };
  }

  /**
   * Get metric history over a number of days
   * @param {string} metric - Metric name (dau, retention, economy, activity)
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array<Object>>} Trend data
   */
  async getMetricHistory(metric, days = 7) {
    const history = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = this._dateStr(date);

      // Read events for just this day
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const events = await this._readEvents(dayStart, dayEnd);

      let value;

      switch (metric) {
        case 'dau':
          const dauData = this._calculateDAU(events, dateStr);
          value = dauData.dau;
          break;

        case 'retention':
          // Simplified: just day1 retention for the day
          const retention = this._calculateRetention(events, dayStart);
          value = retention.day1.rate;
          break;

        case 'economy':
          const economy = this._calculateEconomy(events);
          value = economy;
          break;

        case 'activity':
          const activity = this._calculateActivityDistribution(events);
          value = activity.percentages;
          break;

        default:
          value = null;
      }

      history.push({
        date: dateStr,
        metric,
        value
      });
    }

    return history;
  }

  /**
   * Get quick stats (lighter weight than full metrics)
   * @returns {Promise<Object>} Quick stats
   */
  async getQuickStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await this._readEvents(today, new Date());

    const stats = {
      todayEvents: events.length,
      todayFishCaught: 0,
      todayQuestsCompleted: 0,
      activePlayers: new Set()
    };

    for (const event of events) {
      if (event.type === 'fish_caught') stats.todayFishCaught++;
      if (event.type === 'quest_completed') stats.todayQuestsCompleted++;
      if (event.data.player) stats.activePlayers.add(event.data.player);
    }

    stats.activePlayers = stats.activePlayers.size;

    return stats;
  }
}

module.exports = { MetricsEngine };
