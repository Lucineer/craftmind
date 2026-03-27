/**
 * @module craftmind/economy/shop
 * @description Shop - NPC shop interface with buy/sell functionality.
 *
 * Provides a shop system for NPCs to sell items and buy player catches.
 * Supports stock management, pricing, and transaction logging.
 *
 * @example
 * const shop = new Shop('Gustav\'s Tackle', pricingEngine, transactionLog);
 * shop.addItem('bait', 'consumable', 10);
 * const result = shop.buy(player, 'bait', 5);
 */

const { PricingEngine } = require('./pricing');

/**
 * @typedef {Object} ShopItem
 * @property {string} id - Unique item ID
 * @property {string} name - Display name
 * @property {string} category - Item category
 * @property {number} buyPrice - Price to buy from shop
 * @property {number} sellPrice - Price to sell to shop
 * @property {number} stock - Current stock (-1 for unlimited)
 * @property {number} maxStock - Maximum stock
 * @property {string} rarity - For fish items
 */

/**
 * @typedef {Object} ShopConfig
 * @property {string} name - Shop name
 * @property {string} owner - NPC owner name
 * @property {string} type - Shop type (tackle, general, fish_market)
 * @property {number} buyMarkup - Markup for buying
 * @property {number} sellMarkdown - Markdown for selling
 */

/**
 * @typedef {Object} Player
 * @property {string} uuid - Player UUID
 * @property {string} name - Player name
 * @property {number} credits - Player's credits
 */

/**
 * @typedef {Object} TransactionResult
 * @property {boolean} success - Whether transaction succeeded
 * @property {string} [error] - Error message if failed
 * @property {number} amount - Amount paid/received
 * @property {number} [newBalance] - Player's new credit balance
 * @property {number} [newStock] - Item's new stock level
 */

/**
 * Shop class - manages NPC shop inventory and transactions.
 */
class Shop {
  /**
   * Create a new Shop.
   * @param {ShopConfig} config - Shop configuration
   * @param {PricingEngine} [pricingEngine] - Optional pricing engine
   * @param {Object} [transactionLog] - Optional transaction logger
   */
  constructor(config, pricingEngine = null, transactionLog = null) {
    /** @type {ShopConfig} */
    this.config = {
      name: config.name || 'Shop',
      owner: config.owner || 'NPC',
      type: config.type || 'general',
      buyMarkup: config.buyMarkup || 1.5,
      sellMarkdown: config.sellMarkdown || 0.5,
    };

    /** @type {Map<string, ShopItem>} */
    this.inventory = new Map();

    /** @type {PricingEngine} */
    this.pricing = pricingEngine || new PricingEngine();

    /** @type {Object} Transaction log */
    this.transactionLog = transactionLog;

    /** @type {Map<string, number>} Player credit tracking (if no external system) */
    this.playerCredits = new Map();

    /** @type {Date} Last restock time */
    this.lastRestock = new Date();

    /** @type {number} Next item ID */
    this._nextId = 1;
  }

  /**
   * Generate a unique item ID.
   * @private
   * @returns {string}
   */
  _generateId() {
    return `item_${this._nextId++}`;
  }

  /**
   * Add an item to the shop inventory.
   * @param {string} name - Item name
   * @param {string} category - Item category
   * @param {number} price - Base price
   * @param {Object} [options]
   * @param {number} [options.stock=-1] - Initial stock (-1 for unlimited)
   * @param {number} [options.maxStock=100] - Maximum stock
   * @param {string} [options.rarity] - Item rarity
   * @param {number} [options.buyPrice] - Override buy price
   * @param {number} [options.sellPrice] - Override sell price
   * @returns {ShopItem}
   */
  addItem(name, category, price, options = {}) {
    const id = options.id || this._generateId();

    const item = {
      id,
      name,
      category,
      buyPrice: options.buyPrice ?? Math.floor(price * this.config.buyMarkup),
      sellPrice: options.sellPrice ?? Math.floor(price * this.config.sellMarkdown),
      stock: options.stock ?? -1,
      maxStock: options.maxStock ?? 100,
      rarity: options.rarity || null,
    };

    this.inventory.set(id, item);
    return item;
  }

  /**
   * Remove an item from the shop.
   * @param {string} itemId - Item ID
   * @returns {boolean} True if removed
   */
  removeItem(itemId) {
    return this.inventory.delete(itemId);
  }

  /**
   * Get an item by ID.
   * @param {string} itemId
   * @returns {ShopItem|null}
   */
  getItem(itemId) {
    return this.inventory.get(itemId) || null;
  }

  /**
   * Get an item by name.
   * @param {string} name
   * @returns {ShopItem|null}
   */
  getItemByName(name) {
    for (const item of this.inventory.values()) {
      if (item.name.toLowerCase() === name.toLowerCase()) {
        return item;
      }
    }
    return null;
  }

  /**
   * Get all items in a category.
   * @param {string} category
   * @returns {ShopItem[]}
   */
  getItemsByCategory(category) {
    const items = [];
    for (const item of this.inventory.values()) {
      if (item.category.toLowerCase() === category.toLowerCase()) {
        items.push(item);
      }
    }
    return items;
  }

  /**
   * Get all items in the shop.
   * @returns {ShopItem[]}
   */
  getAllItems() {
    return Array.from(this.inventory.values());
  }

  /**
   * Player buys an item from the shop.
   * @param {Player} player - Player object
   * @param {string} itemId - Item ID or name
   * @param {number} [quantity=1] - Quantity to buy
   * @returns {TransactionResult}
   */
  buy(player, itemId, quantity = 1) {
    // Find item
    let item = this.getItem(itemId);
    if (!item) {
      item = this.getItemByName(itemId);
    }
    if (!item) {
      return { success: false, error: 'Item not found', amount: 0 };
    }

    // Check stock
    if (item.stock !== -1 && item.stock < quantity) {
      return { success: false, error: 'Insufficient stock', amount: 0 };
    }

    // Calculate total
    const total = item.buyPrice * quantity;

    // Check player credits
    const playerBalance = this._getPlayerCredits(player);
    if (playerBalance < total) {
      return { success: false, error: 'Insufficient credits', amount: total };
    }

    // Process transaction
    this._deductCredits(player, total);

    // Update stock
    if (item.stock !== -1) {
      item.stock -= quantity;
    }

    // Log transaction
    if (this.transactionLog) {
      this.transactionLog.log('buy', player.uuid, this.config.owner, total, {
        item: item.name,
        quantity,
        pricePerUnit: item.buyPrice,
        shop: this.config.name,
      });
    }

    const newBalance = this._getPlayerCredits(player);

    return {
      success: true,
      amount: total,
      newBalance,
      newStock: item.stock,
    };
  }

  /**
   * Player sells an item to the shop.
   * @param {Player} player - Player object
   * @param {string} itemName - Item name
   * @param {string} category - Item category
   * @param {number} [quantity=1] - Quantity to sell
   * @param {string} [size] - Size (for fish)
   * @param {string} [rarity] - Rarity (for fish)
   * @returns {TransactionResult}
   */
  sell(player, itemName, category, quantity = 1, size = 'average', rarity = null) {
    // Calculate price
    let pricePerUnit;

    if (rarity) {
      // Selling a fish
      pricePerUnit = this.pricing.getSellPrice({ name: itemName, rarity }, size);
    } else {
      // Selling a regular item
      pricePerUnit = this.pricing.getItemSellPrice({ name: itemName, category });
    }

    const total = pricePerUnit * quantity;

    // Check if shop accepts this item
    const shopItem = this.getItemByName(itemName);
    if (shopItem) {
      // Shop has this item, use its sell price
      const shopTotal = shopItem.sellPrice * quantity;
      if (shopTotal > total) {
        // Use shop price if better
        pricePerUnit = shopItem.sellPrice;
      }
    }

    // Add credits to player
    this._addCredits(player, total);

    // Update stock if item exists in shop
    if (shopItem && shopItem.stock !== -1) {
      shopItem.stock = Math.min(shopItem.stock + quantity, shopItem.maxStock);
    }

    // Log transaction
    if (this.transactionLog) {
      this.transactionLog.log('sell', this.config.owner, player.uuid, total, {
        item: itemName,
        quantity,
        pricePerUnit,
        size,
        rarity,
        shop: this.config.name,
      });
    }

    const newBalance = this._getPlayerCredits(player);

    return {
      success: true,
      amount: total,
      newBalance,
      pricePerUnit,
    };
  }

  /**
   * Player sells a fish to the shop.
   * Convenience method for fish sales.
   * @param {Player} player
   * @param {Object} fish - Fish data
   * @param {string} fish.name - Fish name
   * @param {string} fish.rarity - Fish rarity
   * @param {string} [fish.size='average'] - Fish size
   * @param {number} [quantity=1]
   * @returns {TransactionResult}
   */
  sellFish(player, fish, quantity = 1) {
    return this.sell(
      player,
      fish.name,
      'fish',
      quantity,
      fish.size || 'average',
      fish.rarity
    );
  }

  /**
   * Get player's credit balance.
   * @private
   * @param {Player} player
   * @returns {number}
   */
  _getPlayerCredits(player) {
    if (player.credits !== undefined) {
      return player.credits;
    }
    return this.playerCredits.get(player.uuid) || 0;
  }

  /**
   * Deduct credits from player.
   * @private
   * @param {Player} player
   * @param {number} amount
   */
  _deductCredits(player, amount) {
    if (player.credits !== undefined) {
      player.credits -= amount;
    } else {
      const current = this.playerCredits.get(player.uuid) || 0;
      this.playerCredits.set(player.uuid, current - amount);
    }
  }

  /**
   * Add credits to player.
   * @private
   * @param {Player} player
   * @param {number} amount
   */
  _addCredits(player, amount) {
    if (player.credits !== undefined) {
      player.credits += amount;
    } else {
      const current = this.playerCredits.get(player.uuid) || 0;
      this.playerCredits.set(player.uuid, current + amount);
    }
  }

  /**
   * Restock the shop.
   * @param {Object} [stockLevels] - Override stock levels {itemId: quantity}
   */
  restock(stockLevels = null) {
    for (const [id, item] of this.inventory) {
      if (item.stock !== -1) {
        if (stockLevels && stockLevels[id] !== undefined) {
          item.stock = Math.min(stockLevels[id], item.maxStock);
        } else {
          item.stock = item.maxStock;
        }
      }
    }
    this.lastRestock = new Date();
  }

  /**
   * Get shop inventory display.
   * @param {string} [category] - Filter by category
   * @returns {string[]} Lines of text for display
   */
  getDisplay(category = null) {
    const lines = [];
    lines.push(`=== ${this.config.name} ===`);
    lines.push(`Owner: ${this.config.owner}`);
    lines.push('');

    const items = category ? this.getItemsByCategory(category) : this.getAllItems();

    if (items.length === 0) {
      lines.push('(No items available)');
    } else {
      lines.push('Item                    Buy     Sell    Stock');
      lines.push('-'.repeat(48));

      for (const item of items) {
        const stock = item.stock === -1 ? '∞' : item.stock;
        const name = item.name.padEnd(20).substring(0, 20);
        const buy = String(item.buyPrice).padStart(6);
        const sell = String(item.sellPrice).padStart(6);
        const stockStr = String(stock).padStart(6);
        lines.push(`${name} ${buy}   ${sell}   ${stockStr}`);
      }
    }

    return lines;
  }

  /**
   * Get shop status summary.
   * @returns {Object}
   */
  getStatus() {
    const items = this.getAllItems();
    const lowStock = items.filter(i => i.stock !== -1 && i.stock < 10);

    return {
      name: this.config.name,
      owner: this.config.owner,
      type: this.config.type,
      itemCount: items.length,
      lowStockCount: lowStock.length,
      lastRestock: this.lastRestock.toISOString(),
    };
  }

  /**
   * Export shop state.
   * @returns {Object}
   */
  exportState() {
    return {
      config: this.config,
      items: this.getAllItems().map(item => ({
        ...item,
      })),
      lastRestock: this.lastRestock.toISOString(),
      nextId: this._nextId,
    };
  }

  /**
   * Import shop state.
   * @param {Object} state
   */
  importState(state) {
    if (state.config) {
      Object.assign(this.config, state.config);
    }

    if (state.items) {
      this.inventory.clear();
      for (const item of state.items) {
        this.inventory.set(item.id, item);
      }
    }

    if (state.lastRestock) {
      this.lastRestock = new Date(state.lastRestock);
    }

    if (state.nextId) {
      this._nextId = state.nextId;
    }
  }
}

/**
 * Create a default tackle shop (Gustav's shop).
 * @param {PricingEngine} [pricing]
 * @param {Object} [transactionLog]
 * @returns {Shop}
 */
function createTackleShop(pricing = null, transactionLog = null) {
  const shop = new Shop({
    name: "Gustav's Tackle",
    owner: 'Gustav',
    type: 'tackle',
  }, pricing, transactionLog);

  // Add fishing supplies
  shop.addItem('Basic Bait', 'bait', 10, { stock: -1 });
  shop.addItem('Lucky Bait', 'bait', 50, { stock: 100 });
  shop.addItem('Golden Bait', 'bait', 200, { stock: 20, rarity: 'rare' });
  shop.addItem('Basic Rod', 'rod', 200, { stock: -1 });
  shop.addItem('Reinforced Rod', 'rod', 500, { stock: 10 });
  shop.addItem('Fishing Line', 'tackle', 25, { stock: 50 });
  shop.addItem('Hook Set', 'tackle', 30, { stock: 50 });
  shop.addItem('Tackle Box', 'tackle', 100, { stock: 25 });
  shop.addItem('Fish Finder', 'tool', 300, { stock: 5 });

  return shop;
}

module.exports = {
  Shop,
  createTackleShop,
};
