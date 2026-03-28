/**
 * Leaderboard Engine - Competitive rankings
 *
 * Categories:
 * - most_fish: Total fish caught
 * - biggest_fish: Largest fish by size
 * - rarest_catch: Rarest fish caught (by rarity tier)
 * - fastest_100: Time to catch 100 fish
 * - total_earnings: Total credits earned from fishing
 * - highest_level: Player level
 *
 * Supports weekly and all-time tracking.
 *
 * @module leaderboard/engine
 */

const fs = require('fs');
const path = require('path');

/**
 * Leaderboard Engine class
 */
class LeaderboardEngine {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir] - Directory for leaderboard data
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/leaderboard');
    this.cache = new Map();
    this.weeklyCache = new Map();

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this._loadAllTimeData();
    this._loadWeeklyData();
  }

  /**
   * Get all-time leaderboard file path
   * @private
   */
  _getAllTimePath() {
    return path.join(this.dataDir, 'alltime.json');
  }

  /**
   * Get weekly leaderboard file path
   * @private
   */
  _getWeeklyPath() {
    const now = new Date();
    const weekNum = this._getWeekNumber(now);
    return path.join(this.dataDir, `weekly_${now.getFullYear()}_${weekNum}.json`);
  }

  /**
   * Get ISO week number
   * @private
   */
  _getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  /**
   * Load all-time leaderboard data
   * @private
   */
  _loadAllTimeData() {
    const filePath = this._getAllTimePath();
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        for (const [category, entries] of Object.entries(data)) {
          this.cache.set(category, entries);
        }
      } catch (e) {
        console.error('[LeaderboardEngine] Failed to load all-time:', e);
      }
    }
  }

  /**
   * Load weekly leaderboard data
   * @private
   */
  _loadWeeklyData() {
    const filePath = this._getWeeklyPath();
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        for (const [category, entries] of Object.entries(data)) {
          this.weeklyCache.set(category, entries);
        }
      } catch (e) {
        console.error('[LeaderboardEngine] Failed to load weekly:', e);
      }
    }
  }

  /**
   * Save all-time leaderboard data
   * @private
   */
  _saveAllTimeData() {
    const data = {};
    for (const [category, entries] of this.cache) {
      data[category] = entries;
    }
    fs.writeFileSync(this._getAllTimePath(), JSON.stringify(data, null, 2));
  }

  /**
   * Save weekly leaderboard data
   * @private
   */
  _saveWeeklyData() {
    const data = {};
    for (const [category, entries] of this.weeklyCache) {
      data[category] = entries;
    }
    fs.writeFileSync(this._getWeeklyPath(), JSON.stringify(data, null, 2));
  }

  /**
   * Update a player's score in a category
   * @param {string} playerUuid
   * @param {string} playerName - Display name
   * @param {string} category - Category ID
   * @param {number} value - Score value
   * @param {boolean} [replace=true] - Replace existing value if higher/lower (based on category)
   * @returns {Object} Update result
   */
  update(playerUuid, playerName, category, value, replace = true) {
    const result = {
      category,
      value,
      allTime: { rank: null, improved: false, previousRank: null },
      weekly: { rank: null, improved: false, previousRank: null }
    };

    // Update all-time
    result.allTime = this._updateLeaderboard(
      this.cache,
      playerUuid,
      playerName,
      category,
      value,
      replace
    );

    // Update weekly
    result.weekly = this._updateLeaderboard(
      this.weeklyCache,
      playerUuid,
      playerName,
      category,
      value,
      replace
    );

    this._saveAllTimeData();
    this._saveWeeklyData();

    return result;
  }

  /**
   * Update a leaderboard cache
   * @private
   */
  _updateLeaderboard(cache, playerUuid, playerName, category, value, replace) {
    if (!cache.has(category)) {
      cache.set(category, []);
    }

    const entries = cache.get(category);
    const existingIndex = entries.findIndex(e => e.uuid === playerUuid);
    let improved = false;
    let previousRank = null;

    if (existingIndex >= 0) {
      previousRank = existingIndex + 1;
      const existing = entries[existingIndex];

      // For "fastest" categories, lower is better
      const isLowerBetter = category === 'fastest_100';
      const shouldReplace = isLowerBetter
        ? value < existing.value
        : value > existing.value;

      if (replace && shouldReplace) {
        entries[existingIndex] = {
          uuid: playerUuid,
          name: playerName,
          value,
          updatedAt: new Date().toISOString()
        };
        improved = true;
      }
    } else {
      entries.push({
        uuid: playerUuid,
        name: playerName,
        value,
        updatedAt: new Date().toISOString()
      });
      improved = true;
    }

    // Sort entries
    const isLowerBetter = category === 'fastest_100';
    entries.sort((a, b) => isLowerBetter ? a.value - b.value : b.value - a.value);

    // Find new rank
    const newRank = entries.findIndex(e => e.uuid === playerUuid) + 1;

    return {
      rank: newRank || null,
      improved,
      previousRank
    };
  }

  /**
   * Get top N entries for a category
   * @param {string} category
   * @param {number} [limit=10]
   * @param {string} [period='alltime'] - 'alltime' or 'weekly'
   * @returns {Array}
   */
  getTop(category, limit = 10, period = 'alltime') {
    const cache = period === 'weekly' ? this.weeklyCache : this.cache;
    const entries = cache.get(category) || [];
    return entries.slice(0, limit);
  }

  /**
   * Get a player's rank in a category
   * @param {string} playerUuid
   * @param {string} category
   * @param {string} [period='alltime']
   * @returns {Object}
   */
  getPlayerRank(playerUuid, category, period = 'alltime') {
    const cache = period === 'weekly' ? this.weeklyCache : this.cache;
    const entries = cache.get(category) || [];
    const index = entries.findIndex(e => e.uuid === playerUuid);

    if (index === -1) {
      return { rank: null, entry: null };
    }

    return {
      rank: index + 1,
      entry: entries[index]
    };
  }

  /**
   * Get all rankings for a player
   * @param {string} playerUuid
   * @param {string} [period='alltime']
   * @returns {Object}
   */
  getAllPlayerRanks(playerUuid, period = 'alltime') {
    const categories = [
      'most_fish',
      'biggest_fish',
      'rarest_catch',
      'fastest_100',
      'total_earnings',
      'highest_level'
    ];

    const ranks = {};
    for (const category of categories) {
      ranks[category] = this.getPlayerRank(playerUuid, category, period);
    }

    return ranks;
  }

  /**
   * Get entries around a player's rank
   * @param {string} playerUuid
   * @param {string} category
   * @param {number} [range=3] - Players above and below to include
   * @param {string} [period='alltime']
   * @returns {Object}
   */
  getAroundPlayer(playerUuid, category, range = 3, period = 'alltime') {
    const cache = period === 'weekly' ? this.weeklyCache : this.cache;
    const entries = cache.get(category) || [];
    const playerIndex = entries.findIndex(e => e.uuid === playerUuid);

    if (playerIndex === -1) {
      return { found: false, entries: [] };
    }

    const start = Math.max(0, playerIndex - range);
    const end = Math.min(entries.length, playerIndex + range + 1);

    return {
      found: true,
      playerRank: playerIndex + 1,
      entries: entries.slice(start, end).map((e, i) => ({
        ...e,
        rank: start + i + 1,
        isPlayer: e.uuid === playerUuid
      }))
    };
  }

  /**
   * Get total number of entries in a category
   * @param {string} category
   * @param {string} [period='alltime']
   * @returns {number}
   */
  getTotalEntries(category, period = 'alltime') {
    const cache = period === 'weekly' ? this.weeklyCache : this.cache;
    return (cache.get(category) || []).length;
  }

  /**
   * Clear caches (useful for testing)
   */
  clearCache() {
    this.cache.clear();
    this.weeklyCache.clear();
  }

  /**
   * Force reload from disk
   */
  reload() {
    this.cache.clear();
    this.weeklyCache.clear();
    this._loadAllTimeData();
    this._loadWeeklyData();
  }
}

module.exports = { LeaderboardEngine };
