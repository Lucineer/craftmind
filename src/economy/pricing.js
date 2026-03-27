/**
 * @module craftmind/economy/pricing
 * @description PricingEngine - Calculates buy/sell prices for items.
 *
 * Implements the economy pricing system with:
 * - Rarity-based base prices
 * - Size modifiers
 * - Daily price fluctuations
 * - Buy/sell markup
 *
 * @example
 * const pricing = new PricingEngine();
 * const sellPrice = pricing.getSellPrice({ name: 'salmon', rarity: 'uncommon' }, 'large');
 * const buyPrice = pricing.getBuyPrice({ name: 'bait' });
 */

/**
 * @typedef {Object} FishData
 * @property {string} name - Fish name
 * @property {string} rarity - Rarity level
 * @property {number} [baseValue] - Optional base value override
 */

/**
 * @typedef {Object} ItemData
 * @property {string} name - Item name
 * @property {string} category - Item category
 * @property {number} [basePrice] - Base price
 */

/** @constant {Object} Rarity price ranges */
const RARITY_PRICES = {
  common: { min: 1, max: 5, base: 3 },
  uncommon: { min: 10, max: 25, base: 15 },
  rare: { min: 50, max: 100, base: 75 },
  epic: { min: 200, max: 500, base: 350 },
  legendary: { min: 1000, max: 5000, base: 2500 },
  mythic: { min: 10000, max: 50000, base: 25000 },
};

/** @constant {Object} Size modifiers */
const SIZE_MODIFIERS = {
  tiny: 0.5,
  small: 0.75,
  average: 1.0,
  large: 1.25,
  huge: 1.5,
  record: 2.0,
};

/** @constant {number} Buy markup (1.5x sell price) */
const BUY_MARKUP = 1.5;

/** @constant {number} Daily price fluctuation range (±10%) */
const DAILY_FLUCTUATION = 0.1;

/**
 * PricingEngine class for economy price calculations.
 */
class PricingEngine {
  /**
   * Create a new PricingEngine.
   * @param {Object} [options]
   * @param {number} [options.buyMarkup=1.5] - Markup for buying items
   * @param {number} [options.dailyFluctuation=0.1] - Daily price variance
   */
  constructor(options = {}) {
    /** @type {number} Buy markup multiplier */
    this.buyMarkup = options.buyMarkup || BUY_MARKUP;

    /** @type {number} Daily price fluctuation */
    this.dailyFluctuation = options.dailyFluctuation || DAILY_FLUCTUATION;

    /** @type {Map<string, number>} Item-specific price overrides */
    this.priceOverrides = new Map();

    /** @type {Map<string, number>} Daily fluctuation multipliers */
    this.dailyFluctuations = new Map();

    /** @type {Date} Last fluctuation update */
    this.lastFluctuationUpdate = null;

    /** @type {Object} Fish-specific pricing */
    this.fishPrices = this._initFishPrices();
  }

  /**
   * Initialize fish-specific prices based on CROSS-GAME-ECONOMY.md.
   * @private
   * @returns {Object}
   */
  _initFishPrices() {
    return {
      // Common fish
      cod: { rarity: 'common', baseValue: 10 },
      salmon: { rarity: 'common', baseValue: 12 },
      tropical_fish: { rarity: 'uncommon', baseValue: 25 },
      pufferfish: { rarity: 'uncommon', baseValue: 20 },

      // Rare fish
      golden_salmon: { rarity: 'rare', baseValue: 50 },
      midnight_bass: { rarity: 'rare', baseValue: 60 },

      // Epic fish
      crystal_koi: { rarity: 'epic', baseValue: 350 },
      void_eel: { rarity: 'epic', baseValue: 400 },

      // Legendary fish
      ancient_leviathan: { rarity: 'legendary', baseValue: 2500 },
      phoenix_marlin: { rarity: 'legendary', baseValue: 3000 },

      // Treasure catches
      enchanted_book: { rarity: 'uncommon', baseValue: 30 },
      name_tag: { rarity: 'uncommon', baseValue: 35 },
      saddle: { rarity: 'uncommon', baseValue: 25 },
    };
  }

  /**
   * Update daily price fluctuations.
   * Called automatically when getting prices.
   * @private
   */
  _updateDailyFluctuations() {
    const today = new Date().toDateString();

    if (this.lastFluctuationUpdate?.toDateString() !== today) {
      this.dailyFluctuations.clear();
      this.lastFluctuationUpdate = new Date();
    }
  }

  /**
   * Get the daily fluctuation multiplier for an item.
   * @private
   * @param {string} itemName - Item name
   * @returns {number} Multiplier (0.9 to 1.1 by default)
   */
  _getFluctuation(itemName) {
    this._updateDailyFluctuations();

    if (!this.dailyFluctuations.has(itemName)) {
      const fluctuation = 1 + (Math.random() * 2 - 1) * this.dailyFluctuation;
      this.dailyFluctuations.set(itemName, fluctuation);
    }

    return this.dailyFluctuations.get(itemName);
  }

  /**
   * Get the sell price for a fish.
   * @param {FishData} fish - Fish data
   * @param {string} [size='average'] - Fish size
   * @returns {number} Sell price in credits
   */
  getSellPrice(fish, size = 'average') {
    // Get base value
    let baseValue = fish.baseValue;

    if (!baseValue) {
      // Look up fish-specific price
      const fishPrice = this.fishPrices[fish.name.toLowerCase()];
      if (fishPrice) {
        baseValue = fishPrice.baseValue;
      } else {
        // Use rarity-based pricing
        const rarity = fish.rarity?.toLowerCase() || 'common';
        const range = RARITY_PRICES[rarity] || RARITY_PRICES.common;
        baseValue = range.base;
      }
    }

    // Apply size modifier
    const sizeMod = SIZE_MODIFIERS[size.toLowerCase()] || SIZE_MODIFIERS.average;
    let price = Math.floor(baseValue * sizeMod);

    // Apply daily fluctuation
    const fluctuation = this._getFluctuation(fish.name);
    price = Math.floor(price * fluctuation);

    // Check for price override
    const override = this.priceOverrides.get(fish.name.toLowerCase());
    if (override !== undefined) {
      price = override;
    }

    return Math.max(1, price);
  }

  /**
   * Get the buy price for an item (what player pays).
   * @param {ItemData} item - Item data
   * @returns {number} Buy price in credits
   */
  getBuyPrice(item) {
    // Get base value
    let baseValue = item.basePrice;

    if (!baseValue) {
      // Look up fish-specific price (for buying fish)
      const fishPrice = this.fishPrices[item.name.toLowerCase()];
      if (fishPrice) {
        baseValue = fishPrice.baseValue;
      } else {
        // Category-based pricing
        baseValue = this._getCategoryBasePrice(item.category);
      }
    }

    // Apply buy markup
    let price = Math.floor(baseValue * this.buyMarkup);

    // Apply daily fluctuation
    const fluctuation = this._getFluctuation(item.name);
    price = Math.floor(price * fluctuation);

    return Math.max(1, price);
  }

  /**
   * Get base price for an item category.
   * @private
   * @param {string} category
   * @returns {number}
   */
  _getCategoryBasePrice(category) {
    const categoryPrices = {
      bait: 10,
      rod: 200,
      tackle: 50,
      consumable: 25,
      cosmetic: 100,
      material: 15,
      food: 5,
      tool: 100,
      weapon: 150,
      armor: 200,
    };

    return categoryPrices[category?.toLowerCase()] || 50;
  }

  /**
   * Get the sell price for an item (what player gets for selling to shop).
   * @param {ItemData} item - Item data
   * @returns {number} Sell price in credits
   */
  getItemSellPrice(item) {
    let baseValue = item.basePrice;

    if (!baseValue) {
      const fishPrice = this.fishPrices[item.name.toLowerCase()];
      if (fishPrice) {
        baseValue = fishPrice.baseValue;
      } else {
        baseValue = this._getCategoryBasePrice(item.category);
      }
    }

    // Players get 50% of base value when selling non-fish items
    const sellMultiplier = item.rarity ? 1.0 : 0.5;
    let price = Math.floor(baseValue * sellMultiplier);

    const fluctuation = this._getFluctuation(item.name);
    price = Math.floor(price * fluctuation);

    return Math.max(1, price);
  }

  /**
   * Set a price override for an item.
   * @param {string} itemName - Item name
   * @param {number} price - Fixed price (or null to remove)
   */
  setPriceOverride(itemName, price) {
    if (price === null) {
      this.priceOverrides.delete(itemName.toLowerCase());
    } else {
      this.priceOverrides.set(itemName.toLowerCase(), Math.max(1, price));
    }
  }

  /**
   * Get price range for a rarity level.
   * @param {string} rarity - Rarity level
   * @returns {Object} {min, max, base}
   */
  getRarityPriceRange(rarity) {
    return RARITY_PRICES[rarity?.toLowerCase()] || RARITY_PRICES.common;
  }

  /**
   * Get size modifier value.
   * @param {string} size - Size name
   * @returns {number}
   */
  getSizeModifier(size) {
    return SIZE_MODIFIERS[size?.toLowerCase()] || SIZE_MODIFIERS.average;
  }

  /**
   * Calculate the value of an inventory of items.
   * @param {Array<{item: FishData|ItemData, quantity: number, size?: string}>} items
   * @returns {number} Total value
   */
  calculateInventoryValue(items) {
    let total = 0;

    for (const entry of items) {
      const price = entry.item.rarity ?
        this.getSellPrice(entry.item, entry.size) :
        this.getItemSellPrice(entry.item);
      total += price * entry.quantity;
    }

    return total;
  }

  /**
   * Get a price breakdown for a fish.
   * @param {FishData} fish
   * @param {string} size
   * @returns {Object} Detailed price breakdown
   */
  getPriceBreakdown(fish, size = 'average') {
    const rarity = fish.rarity?.toLowerCase() || 'common';
    const sizeMod = this.getSizeModifier(size);
    const fluctuation = this._getFluctuation(fish.name);

    const baseValue = fish.baseValue ||
      this.fishPrices[fish.name.toLowerCase()]?.baseValue ||
      RARITY_PRICES[rarity]?.base ||
      3;

    const afterSize = Math.floor(baseValue * sizeMod);
    const afterFluctuation = Math.floor(afterSize * fluctuation);

    return {
      itemName: fish.name,
      rarity,
      size,
      baseValue,
      sizeModifier: sizeMod,
      afterSize,
      fluctuation: fluctuation.toFixed(3),
      finalPrice: afterFluctuation,
    };
  }

  /**
   * Export current pricing state.
   * @returns {Object}
   */
  exportState() {
    return {
      buyMarkup: this.buyMarkup,
      dailyFluctuation: this.dailyFluctuation,
      priceOverrides: Object.fromEntries(this.priceOverrides),
      dailyFluctuations: Object.fromEntries(this.dailyFluctuations),
      lastFluctuationUpdate: this.lastFluctuationUpdate?.toISOString(),
    };
  }

  /**
   * Import pricing state.
   * @param {Object} state
   */
  importState(state) {
    if (state.buyMarkup) this.buyMarkup = state.buyMarkup;
    if (state.dailyFluctuation) this.dailyFluctuation = state.dailyFluctuation;
    if (state.priceOverrides) {
      this.priceOverrides = new Map(Object.entries(state.priceOverrides));
    }
    if (state.dailyFluctuations) {
      this.dailyFluctuations = new Map(Object.entries(state.dailyFluctuations));
    }
    if (state.lastFluctuationUpdate) {
      this.lastFluctuationUpdate = new Date(state.lastFluctuationUpdate);
    }
  }
}

module.exports = {
  PricingEngine,
  RARITY_PRICES,
  SIZE_MODIFIERS,
  BUY_MARKUP,
  DAILY_FLUCTUATION,
};
