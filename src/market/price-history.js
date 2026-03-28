/**
 * @module craftmind/market/price-history
 * @description PriceHistory - Track and analyze item price trends.
 *
 * Records all completed sales and provides market analytics
 * including average prices, trends, and insights.
 *
 * @example
 * const history = new PriceHistory('./data/market/price-history.json');
 * history.recordSale('fishing:golden_salmon', 45, new Date());
 * const avg = history.getAveragePrice('fishing:golden_salmon', 7); // 7-day average
 * const insight = history.getMarketInsights('fishing:golden_salmon');
 * // Returns: { trend: 'rising', changePercent: 12, ... }
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} SaleRecord
 * @property {string} itemId - Item ID
 * @property {number} price - Price per unit
 * @property {number} quantity - Quantity sold
 * @property {string} date - ISO date string
 * @property {string} [transactionId] - Related transaction ID
 */

/**
 * @typedef {Object} PriceDataPoint
 * @property {string} date - Date string (YYYY-MM-DD)
 * @property {number} avgPrice - Average price that day
 * @property {number} minPrice - Lowest price
 * @property {number} maxPrice - Highest price
 * @property {number} volume - Total quantity sold
 * @property {number} transactions - Number of transactions
 */

/**
 * @typedef {Object} MarketInsight
 * @property {string} trend - Price trend (rising, falling, stable)
 * @property {number} changePercent - Percentage change over period
 * @property {number} avgPrice - Current average price
 * @property {number} minPrice - Minimum price in period
 * @property {number} maxPrice - Maximum price in period
 * @property {number} volume - Total volume traded
 * @property {string} recommendation - Trading recommendation
 */

/**
 * @typedef {Object} PriceHistoryOptions
 * @property {number} [retentionDays=30] - Days to keep detailed records
 * @property {number} [aggregationDays=90] - Days to keep aggregated data
 */

const DEFAULT_OPTIONS = {
  retentionDays: 30,
  aggregationDays: 90,
};

/**
 * PriceHistory class for tracking market prices.
 */
class PriceHistory {
  /**
   * Create a new PriceHistory tracker.
   * @param {string} [filePath='./data/market/price-history.json'] - Path to history file
   * @param {PriceHistoryOptions} [options={}] - Configuration options
   */
  constructor(filePath = './data/market/price-history.json', options = {}) {
    /** @type {string} History file path */
    this.filePath = filePath;

    /** @type {PriceHistoryOptions} Configuration options */
    this.options = { ...DEFAULT_OPTIONS, ...options };

    /** @type {Map<string, SaleRecord[]>} Sales records by item ID */
    this.sales = new Map();

    /** @type {Map<string, PriceDataPoint[]>} Aggregated daily data by item */
    this.dailyAggregates = new Map();

    /** @type {Map<string, Object>} Cached insights by item */
    this._insightCache = new Map();

    /** @type {Date} Last cache update */
    this._cacheUpdated = null;

    /** @type {number} Cache TTL in ms (5 minutes) */
    this._cacheTTL = 5 * 60 * 1000;

    // Load from disk
    this.load();
  }

  /**
   * Load price history from disk.
   * @returns {boolean}
   */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));

        if (data.sales) {
          for (const [itemId, records] of Object.entries(data.sales)) {
            this.sales.set(itemId, records);
          }
        }

        if (data.dailyAggregates) {
          for (const [itemId, aggregates] of Object.entries(data.dailyAggregates)) {
            this.dailyAggregates.set(itemId, aggregates);
          }
        }

        console.log(`[PriceHistory] Loaded history for ${this.sales.size} items`);
        return true;
      }
    } catch (err) {
      console.warn(`[PriceHistory] Failed to load: ${err.message}`);
    }
    return false;
  }

  /**
   * Save price history to disk.
   * @returns {boolean}
   */
  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        sales: Object.fromEntries(this.sales),
        dailyAggregates: Object.fromEntries(this.dailyAggregates),
        savedAt: new Date().toISOString(),
        version: 1,
      };

      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.warn(`[PriceHistory] Failed to save: ${err.message}`);
      return false;
    }
  }

  /**
   * Record a completed sale.
   * @param {string} itemId - Item ID
   * @param {number} price - Price per unit
   * @param {Date|string} [date=new Date()] - Sale date
   * @param {number} [quantity=1] - Quantity sold
   * @param {string} [transactionId] - Related transaction ID
   * @returns {SaleRecord}
   */
  recordSale(itemId, price, date = new Date(), quantity = 1, transactionId = null) {
    const dateObj = date instanceof Date ? date : new Date(date);
    const dateStr = dateObj.toISOString();

    const record = {
      itemId,
      price: Math.floor(price),
      quantity: Math.floor(quantity),
      date: dateStr,
      transactionId,
    };

    // Add to sales records
    if (!this.sales.has(itemId)) {
      this.sales.set(itemId, []);
    }
    this.sales.get(itemId).push(record);

    // Update daily aggregate
    this._updateDailyAggregate(itemId, record);

    // Invalidate cache
    this._insightCache.delete(itemId);

    // Prune old records
    this._pruneOldRecords(itemId);

    this.save();

    return record;
  }

  /**
   * Update daily aggregate for an item.
   * @private
   * @param {string} itemId
   * @param {SaleRecord} record
   */
  _updateDailyAggregate(itemId, record) {
    const dateKey = record.date.split('T')[0]; // YYYY-MM-DD

    if (!this.dailyAggregates.has(itemId)) {
      this.dailyAggregates.set(itemId, []);
    }

    const aggregates = this.dailyAggregates.get(itemId);
    let aggregate = aggregates.find(a => a.date === dateKey);

    if (!aggregate) {
      aggregate = {
        date: dateKey,
        avgPrice: 0,
        minPrice: Infinity,
        maxPrice: -Infinity,
        volume: 0,
        transactions: 0,
        _totalPrice: 0,
      };
      aggregates.push(aggregate);
    }

    // Update aggregate
    aggregate._totalPrice += record.price * record.quantity;
    aggregate.volume += record.quantity;
    aggregate.transactions++;
    aggregate.minPrice = Math.min(aggregate.minPrice, record.price);
    aggregate.maxPrice = Math.max(aggregate.maxPrice, record.price);
    aggregate.avgPrice = Math.round(aggregate._totalPrice / aggregate.volume);
  }

  /**
   * Prune old records for an item.
   * @private
   * @param {string} itemId
   */
  _pruneOldRecords(itemId) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.options.retentionDays);

    const records = this.sales.get(itemId);
    if (records) {
      // Keep records within retention period
      const filtered = records.filter(r => new Date(r.date) >= cutoff);
      this.sales.set(itemId, filtered);
    }

    // Prune old aggregates
    const aggCutoff = new Date();
    aggCutoff.setDate(aggCutoff.getDate() - this.options.aggregationDays);
    const aggDateStr = aggCutoff.toISOString().split('T')[0];

    const aggregates = this.dailyAggregates.get(itemId);
    if (aggregates) {
      const filtered = aggregates.filter(a => a.date >= aggDateStr);
      this.dailyAggregates.set(itemId, filtered);
    }
  }

  /**
   * Get average price for an item over N days.
   * @param {string} itemId
   * @param {number} [days=7] - Number of days to average
   * @returns {number|null} Average price or null if no data
   */
  getAveragePrice(itemId, days = 7) {
    const aggregates = this.dailyAggregates.get(itemId);
    if (!aggregates || aggregates.length === 0) {
      return null;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const relevant = aggregates.filter(a => a.date >= cutoffStr);
    if (relevant.length === 0) {
      return null;
    }

    const totalVolume = relevant.reduce((sum, a) => sum + a.volume, 0);
    const totalPrice = relevant.reduce((sum, a) => sum + (a.avgPrice * a.volume), 0);

    return totalVolume > 0 ? Math.round(totalPrice / totalVolume) : null;
  }

  /**
   * Get price range for an item over N days.
   * @param {string} itemId
   * @param {number} [days=7]
   * @returns {{ min: number, max: number, avg: number }|null}
   */
  getPriceRange(itemId, days = 7) {
    const aggregates = this.dailyAggregates.get(itemId);
    if (!aggregates || aggregates.length === 0) {
      return null;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const relevant = aggregates.filter(a => a.date >= cutoffStr);
    if (relevant.length === 0) {
      return null;
    }

    const min = Math.min(...relevant.map(a => a.minPrice));
    const max = Math.max(...relevant.map(a => a.maxPrice));
    const avg = this.getAveragePrice(itemId, days);

    return { min, max, avg };
  }

  /**
   * Get market insights for an item.
   * @param {string} itemId
   * @param {number} [days=7] - Period to analyze
   * @returns {MarketInsight|null}
   */
  getMarketInsights(itemId, days = 7) {
    // Check cache
    const cacheKey = `${itemId}_${days}`;
    const now = Date.now();
    if (this._insightCache.has(cacheKey)) {
      const cached = this._insightCache.get(cacheKey);
      if (now - cached.timestamp < this._cacheTTL) {
        return cached.insight;
      }
    }

    const aggregates = this.dailyAggregates.get(itemId);
    if (!aggregates || aggregates.length === 0) {
      return null;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const relevant = aggregates.filter(a => a.date >= cutoffStr).sort((a, b) => a.date.localeCompare(b.date));
    if (relevant.length === 0) {
      return null;
    }

    // Calculate trend
    let trend = 'stable';
    let changePercent = 0;

    if (relevant.length >= 2) {
      const firstPrice = relevant[0].avgPrice;
      const lastPrice = relevant[relevant.length - 1].avgPrice;
      changePercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

      if (changePercent > 5) {
        trend = 'rising';
      } else if (changePercent < -5) {
        trend = 'falling';
      }
    }

    // Calculate stats
    const minPrice = Math.min(...relevant.map(a => a.minPrice));
    const maxPrice = Math.max(...relevant.map(a => a.maxPrice));
    const avgPrice = this.getAveragePrice(itemId, days);
    const volume = relevant.reduce((sum, a) => sum + a.volume, 0);

    // Generate recommendation
    let recommendation = 'hold';
    if (trend === 'falling' && changePercent < -15) {
      recommendation = 'wait_to_buy';
    } else if (trend === 'rising' && changePercent > 15) {
      recommendation = 'sell_now';
    } else if (avgPrice && relevant[relevant.length - 1]?.minPrice < avgPrice * 0.85) {
      recommendation = 'good_deal_available';
    }

    const insight = {
      trend,
      changePercent: Math.round(changePercent * 10) / 10,
      avgPrice,
      minPrice,
      maxPrice,
      volume,
      transactions: relevant.reduce((sum, a) => sum + a.transactions, 0),
      recommendation,
      period: days,
      lastUpdated: new Date().toISOString(),
    };

    // Cache result
    this._insightCache.set(cacheKey, { insight, timestamp: now });

    return insight;
  }

  /**
   * Get price history data points for an item.
   * @param {string} itemId
   * @param {number} [days=30]
   * @returns {PriceDataPoint[]}
   */
  getPriceHistory(itemId, days = 30) {
    const aggregates = this.dailyAggregates.get(itemId);
    if (!aggregates) {
      return [];
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return aggregates
      .filter(a => a.date >= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(a => ({
        date: a.date,
        avgPrice: a.avgPrice,
        minPrice: a.minPrice,
        maxPrice: a.maxPrice,
        volume: a.volume,
        transactions: a.transactions,
      }));
  }

  /**
   * Get trending items (significant price changes).
   * @param {number} [days=7] - Period to analyze
   * @param {number} [threshold=10] - Minimum change percentage to be trending
   * @returns {Object[]}
   */
  getTrendingItems(days = 7, threshold = 10) {
    const trending = [];

    for (const itemId of this.dailyAggregates.keys()) {
      const insight = this.getMarketInsights(itemId, days);
      if (insight && Math.abs(insight.changePercent) >= threshold) {
        trending.push({
          itemId,
          ...insight,
        });
      }
    }

    return trending.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }

  /**
   * Get items with most trading volume.
   * @param {number} [days=7]
   * @param {number} [limit=10]
   * @returns {Object[]}
   */
  getTopVolumeItems(days = 7, limit = 10) {
    const volumes = [];

    for (const [itemId, aggregates] of this.dailyAggregates) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const volume = aggregates
        .filter(a => a.date >= cutoffStr)
        .reduce((sum, a) => sum + a.volume, 0);

      if (volume > 0) {
        volumes.push({ itemId, volume, avgPrice: this.getAveragePrice(itemId, days) });
      }
    }

    return volumes.sort((a, b) => b.volume - a.volume).slice(0, limit);
  }

  /**
   * Get statistics for all price history.
   * @returns {Object}
   */
  getStats() {
    let totalSales = 0;
    let totalVolume = 0;
    let oldestRecord = null;
    let newestRecord = null;

    for (const records of this.sales.values()) {
      totalSales += records.length;
      totalVolume += records.reduce((sum, r) => sum + r.quantity, 0);

      for (const record of records) {
        const date = new Date(record.date);
        if (!oldestRecord || date < oldestRecord) {
          oldestRecord = date;
        }
        if (!newestRecord || date > newestRecord) {
          newestRecord = date;
        }
      }
    }

    return {
      itemsWithHistory: this.sales.size,
      totalSales,
      totalVolume,
      dailyAggregates: this.dailyAggregates.size,
      oldestRecord: oldestRecord?.toISOString() || null,
      newestRecord: newestRecord?.toISOString() || null,
    };
  }

  /**
   * Clear all history (for testing).
   */
  clear() {
    this.sales.clear();
    this.dailyAggregates.clear();
    this._insightCache.clear();
  }
}

module.exports = {
  PriceHistory,
};
