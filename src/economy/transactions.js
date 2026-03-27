/**
 * @module craftmind/economy/transactions
 * @description TransactionLog - Records and retrieves economic transactions.
 *
 * Provides persistent logging of all buy/sell transactions with
 * player history tracking and daily summaries.
 *
 * @example
 * const log = new TransactionLog('./data/transactions.json');
 * log.log('buy', playerUuid, shopOwner, 150, { item: 'bait', quantity: 10 });
 * const history = log.getPlayerHistory(playerUuid, 10);
 * const summary = log.getDailySummary(new Date());
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} Transaction
 * @property {string} id - Unique transaction ID
 * @property {string} type - Transaction type (buy, sell, trade, gift)
 * @property {string} from - Sender (player UUID or 'system')
 * @property {string} to - Receiver (player UUID or NPC name)
 * @property {number} amount - Credit amount
 * @property {Object} items - Item details
 * @property {Date} timestamp - Transaction timestamp
 */

/**
 * @typedef {Object} DailySummary
 * @property {string} date - Date string
 * @property {number} totalTransactions - Total number of transactions
 * @property {number} totalCredits - Net credit flow
 * @property {number} buyCount - Number of buys
 * @property {number} sellCount - Number of sells
 * @property {Object} topItems - Most traded items
 * @property {Object} topPlayers - Most active players
 */

/**
 * TransactionLog class for recording economic activity.
 */
class TransactionLog {
  /**
   * Create a new TransactionLog.
   * @param {string} [filePath='./data/transactions.json'] - Path to log file
   * @param {Object} [options]
   * @param {number} [options.maxTransactions=10000] - Maximum transactions in memory
   * @param {number} [options.summaryDays=30] - Days to keep daily summaries
   */
  constructor(filePath = './data/transactions.json', options = {}) {
    /** @type {string} Log file path */
    this.filePath = filePath;

    /** @type {number} Max transactions in memory */
    this.maxTransactions = options.maxTransactions || 10000;

    /** @type {number} Days to keep summaries */
    this.summaryDays = options.summaryDays || 30;

    /** @type {Transaction[]} Transaction history */
    this.transactions = [];

    /** @type {Map<string, DailySummary>} Daily summaries by date */
    this.dailySummaries = new Map();

    /** @type {number} Next transaction ID */
    this._nextId = 1;

    /** @type {boolean} Loaded from disk */
    this._loaded = false;

    // Load from disk on creation
    this.load();
  }

  /**
   * Load transactions from disk.
   * @returns {boolean}
   */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));

        this.transactions = data.transactions || [];
        this._nextId = data.nextId || 1;

        if (data.dailySummaries) {
          this.dailySummaries = new Map(Object.entries(data.dailySummaries));
        }

        this._loaded = true;
        console.log(`[TransactionLog] Loaded ${this.transactions.length} transactions`);
        return true;
      }
    } catch (err) {
      console.warn(`[TransactionLog] Failed to load: ${err.message}`);
    }
    return false;
  }

  /**
   * Save transactions to disk.
   * @returns {boolean}
   */
  save() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        transactions: this.transactions.slice(-this.maxTransactions),
        nextId: this._nextId,
        dailySummaries: Object.fromEntries(this.dailySummaries),
        savedAt: new Date().toISOString(),
      };

      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.warn(`[TransactionLog] Failed to save: ${err.message}`);
      return false;
    }
  }

  /**
   * Log a transaction.
   * @param {string} type - Transaction type (buy, sell, trade, gift)
   * @param {string} from - Sender UUID/name
   * @param {string} to - Receiver UUID/name
   * @param {number} amount - Credit amount
   * @param {Object} [items] - Item details
   * @returns {Transaction}
   */
  log(type, from, to, amount, items = {}) {
    const transaction = {
      id: `txn_${this._nextId++}`,
      type,
      from,
      to,
      amount: Math.floor(amount),
      items,
      timestamp: new Date().toISOString(),
    };

    this.transactions.push(transaction);

    // Update daily summary
    this._updateDailySummary(transaction);

    // Prune old transactions if needed
    if (this.transactions.length > this.maxTransactions) {
      this._pruneTransactions();
    }

    return transaction;
  }

  /**
   * Update daily summary with a transaction.
   * @private
   * @param {Transaction} transaction
   */
  _updateDailySummary(transaction) {
    const date = transaction.timestamp.split('T')[0];

    let summary = this.dailySummaries.get(date);
    if (!summary) {
      summary = {
        date,
        totalTransactions: 0,
        totalCredits: 0,
        buyCount: 0,
        sellCount: 0,
        items: {},
        players: {},
      };
      this.dailySummaries.set(date, summary);
    }

    summary.totalTransactions++;
    summary.totalCredits += transaction.amount;

    if (transaction.type === 'buy') {
      summary.buyCount++;
    } else if (transaction.type === 'sell') {
      summary.sellCount++;
    }

    // Track items
    if (transaction.items?.item) {
      const itemName = transaction.items.item;
      summary.items[itemName] = (summary.items[itemName] || 0) + 1;
    }

    // Track players
    summary.players[transaction.from] = (summary.players[transaction.from] || 0) + 1;

    // Prune old summaries
    this._pruneSummaries();
  }

  /**
   * Prune old daily summaries.
   * @private
   */
  _pruneSummaries() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.summaryDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    for (const [date] of this.dailySummaries) {
      if (date < cutoffStr) {
        this.dailySummaries.delete(date);
      }
    }
  }

  /**
   * Prune old transactions.
   * @private
   */
  _pruneTransactions() {
    // Keep recent transactions
    this.transactions = this.transactions.slice(-this.maxTransactions);
  }

  /**
   * Get transaction history for a player.
   * @param {string} playerUuid - Player UUID
   * @param {number} [limit=50] - Maximum results
   * @returns {Transaction[]}
   */
  getPlayerHistory(playerUuid, limit = 50) {
    return this.transactions
      .filter(t => t.from === playerUuid || t.to === playerUuid)
      .slice(-limit);
  }

  /**
   * Get daily summary for a date.
   * @param {Date|string} date - Date object or ISO date string
   * @returns {DailySummary|null}
   */
  getDailySummary(date) {
    const dateStr = typeof date === 'string' ? date.split('T')[0] : date.toISOString().split('T')[0];
    return this.dailySummaries.get(dateStr) || null;
  }

  /**
   * Get summary for the last N days.
   * @param {number} [days=7]
   * @returns {DailySummary[]}
   */
  getRecentSummaries(days = 7) {
    const summaries = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const summary = this.dailySummaries.get(dateStr);

      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries;
  }

  /**
   * Get total credits earned by a player from sales.
   * @param {string} playerUuid
   * @param {number} [days=7] - Number of days to include
   * @returns {number}
   */
  getPlayerEarnings(playerUuid, days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return this.transactions
      .filter(t =>
        t.to === playerUuid &&
        t.type === 'sell' &&
        new Date(t.timestamp) >= cutoff
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Get total credits spent by a player.
   * @param {string} playerUuid
   * @param {number} [days=7] - Number of days to include
   * @returns {number}
   */
  getPlayerSpending(playerUuid, days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return this.transactions
      .filter(t =>
        t.from === playerUuid &&
        t.type === 'buy' &&
        new Date(t.timestamp) >= cutoff
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Get player statistics.
   * @param {string} playerUuid
   * @returns {Object}
   */
  getPlayerStats(playerUuid) {
    const playerTransactions = this.transactions.filter(
      t => t.from === playerUuid || t.to === playerUuid
    );

    const buys = playerTransactions.filter(t => t.type === 'buy' && t.from === playerUuid);
    const sells = playerTransactions.filter(t => t.type === 'sell' && t.to === playerUuid);

    const totalSpent = buys.reduce((sum, t) => sum + t.amount, 0);
    const totalEarned = sells.reduce((sum, t) => sum + t.amount, 0);

    // Count items bought/sold
    const itemsBought = {};
    const itemsSold = {};

    for (const t of buys) {
      if (t.items?.item) {
        const name = t.items.item;
        itemsBought[name] = (itemsBought[name] || 0) + (t.items.quantity || 1);
      }
    }

    for (const t of sells) {
      if (t.items?.item) {
        const name = t.items.item;
        itemsSold[name] = (itemsSold[name] || 0) + (t.items.quantity || 1);
      }
    }

    return {
      uuid: playerUuid,
      totalTransactions: playerTransactions.length,
      buys: buys.length,
      sells: sells.length,
      totalSpent,
      totalEarned,
      netCredits: totalEarned - totalSpent,
      topItemsBought: Object.entries(itemsBought)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      topItemsSold: Object.entries(itemsSold)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
    };
  }

  /**
   * Get shop/NPC statistics.
   * @param {string} shopName
   * @returns {Object}
   */
  getShopStats(shopName) {
    const shopTransactions = this.transactions.filter(
      t => t.from === shopName || t.to === shopName
    );

    const revenue = shopTransactions
      .filter(t => t.to === shopName)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = shopTransactions
      .filter(t => t.from === shopName)
      .reduce((sum, t) => sum + t.amount, 0);

    const uniqueCustomers = new Set(
      shopTransactions.map(t => t.from === shopName ? t.to : t.from)
    );

    return {
      name: shopName,
      totalTransactions: shopTransactions.length,
      revenue,
      expenses,
      profit: revenue - expenses,
      uniqueCustomers: uniqueCustomers.size,
    };
  }

  /**
   * Get transaction by ID.
   * @param {string} id
   * @returns {Transaction|null}
   */
  getById(id) {
    return this.transactions.find(t => t.id === id) || null;
  }

  /**
   * Search transactions.
   * @param {Object} filters
   * @param {string} [filters.type] - Filter by type
   * @param {string} [filters.player] - Filter by player (from or to)
   * @param {string} [filters.item] - Filter by item name
   * @param {Date} [filters.from] - Start date
   * @param {Date} [filters.to] - End date
   * @param {number} [limit=100] - Maximum results
   * @returns {Transaction[]}
   */
  search(filters = {}, limit = 100) {
    let results = this.transactions;

    if (filters.type) {
      results = results.filter(t => t.type === filters.type);
    }

    if (filters.player) {
      results = results.filter(t =>
        t.from === filters.player || t.to === filters.player
      );
    }

    if (filters.item) {
      results = results.filter(t =>
        t.items?.item?.toLowerCase().includes(filters.item.toLowerCase())
      );
    }

    if (filters.from) {
      const fromTime = new Date(filters.from).getTime();
      results = results.filter(t => new Date(t.timestamp).getTime() >= fromTime);
    }

    if (filters.to) {
      const toTime = new Date(filters.to).getTime();
      results = results.filter(t => new Date(t.timestamp).getTime() <= toTime);
    }

    return results.slice(-limit);
  }

  /**
   * Get overall statistics.
   * @returns {Object}
   */
  getOverallStats() {
    const totalCredits = this.transactions.reduce((sum, t) => sum + t.amount, 0);
    const byType = {};

    for (const t of this.transactions) {
      byType[t.type] = (byType[t.type] || 0) + 1;
    }

    return {
      totalTransactions: this.transactions.length,
      totalCreditsExchanged: totalCredits,
      byType,
      dailySummariesCount: this.dailySummaries.size,
      firstTransaction: this.transactions[0]?.timestamp || null,
      lastTransaction: this.transactions[this.transactions.length - 1]?.timestamp || null,
    };
  }

  /**
   * Clear all transactions and summaries.
   */
  clear() {
    this.transactions = [];
    this.dailySummaries.clear();
    this._nextId = 1;
  }

  /**
   * Export transaction log.
   * @returns {Object}
   */
  export() {
    return {
      transactions: this.transactions,
      dailySummaries: Object.fromEntries(this.dailySummaries),
      nextId: this._nextId,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import transaction log.
   * @param {Object} data
   */
  import(data) {
    if (data.transactions) {
      this.transactions = data.transactions;
    }
    if (data.dailySummaries) {
      this.dailySummaries = new Map(Object.entries(data.dailySummaries));
    }
    if (data.nextId) {
      this._nextId = data.nextId;
    }
  }
}

module.exports = {
  TransactionLog,
};
