/**
 * @module craftmind/economy
 * @description Cross-game economy system with currency, trading, and leaderboards.
 *
 * This system provides a unified currency that can be earned across multiple games and
 * spent on upgrades, cosmetics, or other benefits. It maintains transaction logs, pricing
 * for items, and leaderboards tracking the wealthiest bots.
 *
 * @example
 * const economy = new GameEconomy(25566, '/tmp');
 * await economy.load();
 * economy.addCurrency('Cody_A', 10, 'Caught rare fish');
 * economy.spendCurrency('Cody_A', 5, 'Bought new fishing rod');
 * await economy.save();
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} TradeLogEntry
 * @property {string} timestamp - ISO timestamp
 * @property {string} bot - Bot name
 * @property {string} type - Transaction type (earn, spend, transfer)
 * @property {number} amount - Currency amount (positive for earn, negative for spend)
 * @property {string} reason - Transaction description
 * @property {string} [from] - Source bot (for transfers)
 * @property {string} [to] - Destination bot (for transfers)
 */

/**
 * @typedef {Object} BotBalance
 * @property {number} balance - Current balance
 * @property {string} lastTransaction - Last activity timestamp
 * @property {Object.<string, number>} earningsByReason - Total earnings per reason
 * @property {Object.<string, number>} spendingByCategory - Total spending per category
 */

/**
 * @typedef {Object} PriceData
 * @property {number} price - Item price
 * @property {string} lastUpdated - Last update timestamp
 */

/**
 * @typedef {Object} EconomyData
 * @property {number} serverPort - Server port identifier
 * @property {Object.<string, BotBalance>} balances - Bot balances
 * @property {TradeLogEntry[]} tradeLog - Transaction history
 * @property {Object.<string, PriceData>} prices - Item prices
 * @property {string} lastUpdated - Last update timestamp
 */

const BLANK_ECONOMY = (serverPort) => ({
  serverPort,
  balances: {},
  tradeLog: [],
  prices: {
    'fishing_rod': 10,
    'bait': 2,
    'boat': 50,
    'fishing_license': 100,
  },
  lastUpdated: new Date().toISOString(),
});

// Currency earning rates per game
const CURRENCY_RATES = {
  fishing: {
    base: 1,              // 1 per fish
    rare: 5,              // 5 per rare fish
    achievement: 10,      // 10 per achievement
  },
  courses: {
    lesson: 5,            // 5 per lesson
    completion: 10,       // 10 per course completion
  },
  herding: {
    pen: 3,               // 3 per pen
    perfect: 10,          // 10 per perfect round
  },
  studio: {
    film: 10,             // 10 per film
    award: 25,            // 25 per award
  },
  circuits: {
    challenge: 4,         // 4 per challenge
    levelUp: 15,          // 15 per level up
  },
  ranch: {
    task: 2,              // 2 per task
    evolution: 8,         // 8 per evolution
  },
  researcher: {
    discovery: 20,        // 20 per discovery
    paper: 50,            // 50 per paper
  },
  discgolf: {
    hole: 2,              // 2 per hole
    record: 15,           // 15 per course record
  },
};

class GameEconomy {
  /**
   * @param {number} serverPort - Server port (for economy isolation per server)
   * @param {string} [dataDir='/tmp'] - Directory for persistence files
   */
  constructor(serverPort, dataDir = '/tmp') {
    this._serverPort = serverPort;
    this._dataDir = dataDir;
    this._file = path.join(dataDir, `economy-${serverPort}.json`);
    this._data = BLANK_ECONOMY(serverPort);
  }

  /** @type {EconomyData} */
  get data() {
    return this._data;
  }

  /** @type {number} */
  get serverPort() {
    return this._serverPort;
  }

  /**
   * Load economy from disk.
   * @returns {Promise<void>}
   */
  async load() {
    return new Promise((resolve) => {
      try {
        if (fs.existsSync(this._file)) {
          const loaded = JSON.parse(fs.readFileSync(this._file, 'utf8'));
          // Merge with blank template to handle new fields
          this._data = { ...BLANK_ECONOMY(this._serverPort), ...loaded };
        }
      } catch (err) {
        console.error(`[Economy] Failed to load economy for port ${this._serverPort}: ${err.message}`);
      } finally {
        resolve();
      }
    });
  }

  /**
   * Save economy to disk.
   * @returns {Promise<void>}
   */
  async save() {
    return new Promise((resolve) => {
      try {
        fs.mkdirSync(this._dataDir, { recursive: true });
        this._data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(this._file, JSON.stringify(this._data, null, 2));
      } catch (err) {
        console.error(`[Economy] Failed to save economy for port ${this._serverPort}: ${err.message}`);
      } finally {
        resolve();
      }
    });
  }

  // ── Balance Management ──

  /**
   * Get current balance for a bot.
   * @param {string} botName - Bot username
   * @returns {number} Current balance (0 if bot doesn't exist)
   */
  getBalance(botName) {
    return this._data.balances[botName.toLowerCase()]?.balance || 0;
  }

  /**
   * Get full balance data for a bot.
   * @param {string} botName - Bot username
   * @returns {BotBalance|undefined} Balance data or undefined if not found
   */
  getBalanceData(botName) {
    return this._data.balances[botName.toLowerCase()];
  }

  /**
   * Add currency to a bot's balance.
   * @param {string} botName - Bot username
   * @param {number} amount - Amount to add (must be positive)
   * @param {string} reason - Reason for earning
   * @returns {boolean} True if successful
   */
  addCurrency(botName, amount, reason = 'unknown') {
    if (amount <= 0) {
      console.error(`[Economy] Amount must be positive, got ${amount}`);
      return false;
    }

    const key = botName.toLowerCase();
    if (!this._data.balances[key]) {
      this._data.balances[key] = {
        balance: 0,
        lastTransaction: new Date().toISOString(),
        earningsByReason: {},
        spendingByCategory: {},
      };
    }

    this._data.balances[key].balance += amount;
    this._data.balances[key].lastTransaction = new Date().toISOString();
    this._data.balances[key].earningsByReason[reason] =
      (this._data.balances[key].earningsByReason[reason] || 0) + amount;

    this._logTrade({
      timestamp: new Date().toISOString(),
      bot: botName,
      type: 'earn',
      amount,
      reason,
    });

    return true;
  }

  /**
   * Spend currency from a bot's balance.
   * @param {string} botName - Bot username
   * @param {number} amount - Amount to spend (must be positive)
   * @param {string} reason - Reason for spending (used as category)
   * @returns {boolean} True if successful, false if insufficient funds
   */
  spendCurrency(botName, amount, reason = 'purchase') {
    if (amount <= 0) {
      console.error(`[Economy] Amount must be positive, got ${amount}`);
      return false;
    }

    const key = botName.toLowerCase();
    if (!this._data.balances[key] || this._data.balances[key].balance < amount) {
      console.error(`[Economy] Insufficient funds for ${botName}: has ${this.getBalance(botName)}, needs ${amount}`);
      return false;
    }

    this._data.balances[key].balance -= amount;
    this._data.balances[key].lastTransaction = new Date().toISOString();
    this._data.balances[key].spendingByCategory[reason] =
      (this._data.balances[key].spendingByCategory[reason] || 0) + amount;

    this._logTrade({
      timestamp: new Date().toISOString(),
      bot: botName,
      type: 'spend',
      amount: -amount,
      reason,
    });

    return true;
  }

  /**
   * Transfer currency between bots.
   * @param {string} fromBot - Source bot username
   * @param {string} toBot - Destination bot username
   * @param {number} amount - Amount to transfer (must be positive)
   * @returns {boolean} True if successful, false if insufficient funds
   */
  transfer(fromBot, toBot, amount) {
    if (amount <= 0) {
      console.error(`[Economy] Amount must be positive, got ${amount}`);
      return false;
    }

    if (fromBot.toLowerCase() === toBot.toLowerCase()) {
      console.error(`[Economy] Cannot transfer to self`);
      return false;
    }

    if (!this.spendCurrency(fromBot, amount, `transfer to ${toBot}`)) {
      return false;
    }

    return this.addCurrency(toBot, amount, `transfer from ${fromBot}`);
  }

  // ── Game Earnings ──

  /**
   * Award currency for game actions.
   * @param {string} botName - Bot username
   * @param {string} game - Game identifier (fishing, courses, etc.)
   * @param {string} action - Action type (base, rare, achievement, etc.)
   * @returns {boolean} True if successful
   */
  awardGameCurrency(botName, game, action) {
    const rates = CURRENCY_RATES[game];
    if (!rates) {
      console.error(`[Economy] Unknown game: ${game}`);
      return false;
    }

    const amount = rates[action];
    if (amount === undefined) {
      console.error(`[Economy] Unknown action ${action} for game ${game}`);
      return false;
    }

    return this.addCurrency(botName, amount, `${game}:${action}`);
  }

  /**
   * Get currency rates for a game.
   * @param {string} game - Game identifier
   * @returns {Object.<string, number>} Currency rates or undefined if game not found
   */
  getGameRates(game) {
    return CURRENCY_RATES[game] ? { ...CURRENCY_RATES[game] } : undefined;
  }

  // ── Trade Log ──

  /**
   * Get recent trade log entries.
   * @param {number} [limit=50] - Maximum number of entries
   * @param {string} [botName] - Filter by bot name
   * @returns {TradeLogEntry[]} Recent trade log entries
   */
  getTradeLog(limit = 50, botName) {
    let log = [...this._data.tradeLog];
    if (botName) {
      log = log.filter(entry => entry.bot.toLowerCase() === botName.toLowerCase());
    }
    return log.slice(-limit);
  }

  /**
   * Log a trade entry.
   * @param {TradeLogEntry} entry - Trade entry to log
   * @private
   */
  _logTrade(entry) {
    this._data.tradeLog.push(entry);
    // Keep last 1000 entries
    if (this._data.tradeLog.length > 1000) {
      this._data.tradeLog = this._data.tradeLog.slice(-1000);
    }
  }

  // ── Pricing ──

  /**
   * Set price for an item.
   * @param {string} item - Item identifier
   * @param {number} price - Item price (must be positive)
   */
  setPrice(item, price) {
    if (price < 0) {
      console.error(`[Economy] Price must be non-negative, got ${price}`);
      return;
    }
    this._data.prices[item] = {
      price,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get price for an item.
   * @param {string} item - Item identifier
   * @returns {number|undefined} Item price or undefined if not found
   */
  getPrice(item) {
    return this._data.prices[item]?.price;
  }

  /**
   * Purchase an item (spends currency if bot can afford it).
   * @param {string} botName - Bot username
   * @param {string} item - Item identifier
   * @returns {boolean} True if purchase successful
   */
  purchaseItem(botName, item) {
    const price = this.getPrice(item);
    if (price === undefined) {
      console.error(`[Economy] Item not found: ${item}`);
      return false;
    }
    return this.spendCurrency(botName, price, `purchase:${item}`);
  }

  /**
   * Get all item prices.
   * @returns {Object.<string, number>} Copy of prices object
   */
  getAllPrices() {
    const prices = {};
    for (const [item, data] of Object.entries(this._data.prices)) {
      prices[item] = data.price;
    }
    return prices;
  }

  // ── Leaderboard ──

  /**
   * Get leaderboard of wealthiest bots.
   * @param {number} [limit=10] - Maximum number of entries
   * @returns {Array.<{bot: string, balance: number}>} Sorted leaderboard
   */
  getLeaderboard(limit = 10) {
    return Object.entries(this._data.balances)
      .map(([bot, data]) => ({ bot, balance: data.balance }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
  }

  /**
   * Get bot's rank on leaderboard.
   * @param {string} botName - Bot username
   * @returns {number} Bot's rank (1-indexed) or -1 if not found
   */
  getRank(botName) {
    const key = botName.toLowerCase();
    const sorted = Object.entries(this._data.balances)
      .sort((a, b) => b[1].balance - a[1].balance);
    const index = sorted.findIndex(([bot]) => bot === key);
    return index >= 0 ? index + 1 : -1;
  }

  // ── Statistics ──

  /**
   * Get total currency in circulation.
   * @returns {number} Total balance across all bots
   */
  getTotalCurrency() {
    return Object.values(this._data.balances)
      .reduce((sum, data) => sum + data.balance, 0);
  }

  /**
   * Get total earnings by reason for a bot.
   * @param {string} botName - Bot username
   * @returns {Object.<string, number>} Earnings breakdown
   */
  getEarningsBreakdown(botName) {
    return this._data.balances[botName.toLowerCase()]?.earningsByReason || {};
  }

  /**
   * Get total spending by category for a bot.
   * @param {string} botName - Bot username
   * @returns {Object.<string, number>} Spending breakdown
   */
  getSpendingBreakdown(botName) {
    return this._data.balances[botName.toLowerCase()]?.spendingByCategory || {};
  }

  /**
   * Get economy summary (for debugging/logging).
   * @returns {string} Summary string
   */
  getSummary() {
    const leaderboard = this.getLeaderboard(3);
    return `GameEconomy(port ${this._serverPort}) {
  bots: ${Object.keys(this._data.balances).length},
  total_currency: ${this.getTotalCurrency()},
  top_bots: ${leaderboard.map((e, i) => `${i + 1}. ${e.bot} (${e.balance})`).join(', ')},
  transactions: ${this._data.tradeLog.length},
  items: ${Object.keys(this._data.prices).length}
}`;
  }
}

module.exports = { GameEconomy, CURRENCY_RATES };