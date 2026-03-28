/**
 * @module craftmind/market/listing
 * @description MarketListing - Player-to-player market listing management.
 *
 * Handles creation, cancellation, and expiration of market listings
 * where players can list items for sale at their chosen prices.
 *
 * @example
 * const listing = new MarketListing('./data/market/listings.json');
 * const newListng = listing.createListing(
 *   'player-uuid-123',
 *   { id: 'fishing:golden_salmon', displayName: 'Golden Salmon', rarity: 'rare' },
 *   50, // price per unit
 *   3   // amount
 * );
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * @typedef {Object} MarketListingItem
 * @property {string} id - Item ID (e.g., 'fishing:golden_salmon')
 * @property {string} displayName - Display name
 * @property {string} rarity - Item rarity
 * @property {string} [category] - Item category
 */

/**
 * @typedef {Object} Listing
 * @property {string} id - Unique listing ID
 * @property {string} sellerUuid - Seller's player UUID
 * @property {string} sellerName - Seller's display name
 * @property {MarketListingItem} item - Item being sold
 * @property {number} pricePerUnit - Price per item in credits
 * @property {number} quantity - Number of items
 * @property {number} totalPrice - Total price (quantity * pricePerUnit)
 * @property {string} createdAt - Creation timestamp (ISO)
 * @property {string} expiresAt - Expiration timestamp (ISO)
 * @property {string} status - Listing status (active, sold, expired, cancelled)
 */

/**
 * @typedef {Object} ListingOptions
 * @property {number} [durationDays=7] - Days until listing expires
 * @property {number} [maxListingsPerPlayer=20] - Maximum active listings per player
 * @property {number} [minPrice=1] - Minimum price per unit
 * @property {number} [maxPrice=100000] - Maximum price per unit
 */

const DEFAULT_OPTIONS = {
  durationDays: 7,
  maxListingsPerPlayer: 20,
  minPrice: 1,
  maxPrice: 100000,
};

/**
 * MarketListing class for managing P2P market listings.
 */
class MarketListing {
  /**
   * Create a new MarketListing manager.
   * @param {string} [filePath='./data/market/listings.json'] - Path to listings file
   * @param {ListingOptions} [options={}] - Configuration options
   */
  constructor(filePath = './data/market/listings.json', options = {}) {
    /** @type {string} Listings file path */
    this.filePath = filePath;

    /** @type {ListingOptions} Configuration options */
    this.options = { ...DEFAULT_OPTIONS, ...options };

    /** @type {Map<string, Listing>} Active listings by ID */
    this.listings = new Map();

    /** @type {Map<string, Set<string>>} Listing IDs by seller UUID */
    this.bySeller = new Map();

    /** @type {Map<string, Set<string>>} Listing IDs by item ID */
    this.byItem = new Map();

    /** @type {boolean} Loaded from disk */
    this._loaded = false;

    // Load from disk on creation
    this.load();
  }

  /**
   * Generate a unique listing ID.
   * @private
   * @returns {string}
   */
  _generateId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `listing_${timestamp}_${random}`;
  }

  /**
   * Load listings from disk.
   * @returns {boolean}
   */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));

        if (data.listings) {
          for (const listing of data.listings) {
            this.listings.set(listing.id, listing);
            this._indexListing(listing);
          }
        }

        // Clean up expired listings on load
        this._cleanExpired();

        this._loaded = true;
        console.log(`[MarketListing] Loaded ${this.listings.size} listings`);
        return true;
      }
    } catch (err) {
      console.warn(`[MarketListing] Failed to load: ${err.message}`);
    }
    return false;
  }

  /**
   * Index a listing for quick lookups.
   * @private
   * @param {Listing} listing
   */
  _indexListing(listing) {
    // Index by seller
    if (!this.bySeller.has(listing.sellerUuid)) {
      this.bySeller.set(listing.sellerUuid, new Set());
    }
    this.bySeller.get(listing.sellerUuid).add(listing.id);

    // Index by item
    const itemId = listing.item?.id || 'unknown';
    if (!this.byItem.has(itemId)) {
      this.byItem.set(itemId, new Set());
    }
    this.byItem.get(itemId).add(listing.id);
  }

  /**
   * Remove listing from indexes.
   * @private
   * @param {Listing} listing
   */
  _deindexListing(listing) {
    // Remove from seller index
    const sellerListings = this.bySeller.get(listing.sellerUuid);
    if (sellerListings) {
      sellerListings.delete(listing.id);
      if (sellerListings.size === 0) {
        this.bySeller.delete(listing.sellerUuid);
      }
    }

    // Remove from item index
    const itemId = listing.item?.id || 'unknown';
    const itemListings = this.byItem.get(itemId);
    if (itemListings) {
      itemListings.delete(listing.id);
      if (itemListings.size === 0) {
        this.byItem.delete(itemId);
      }
    }
  }

  /**
   * Clean up expired listings.
   * @private
   */
  _cleanExpired() {
    const now = new Date();
    const expired = [];

    for (const [id, listing] of this.listings) {
      if (listing.status === 'active' && new Date(listing.expiresAt) < now) {
        listing.status = 'expired';
        expired.push(listing);
      }
    }

    if (expired.length > 0) {
      console.log(`[MarketListing] Expired ${expired.length} listings`);
      this.save();
    }
  }

  /**
   * Save listings to disk.
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
        listings: Array.from(this.listings.values()),
        savedAt: new Date().toISOString(),
        version: 1,
      };

      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.warn(`[MarketListing] Failed to save: ${err.message}`);
      return false;
    }
  }

  /**
   * Create a new market listing.
   * @param {string} sellerUuid - Seller's player UUID
   * @param {string} sellerName - Seller's display name
   * @param {MarketListingItem} item - Item to sell
   * @param {number} pricePerUnit - Price per item in credits
   * @param {number} quantity - Number of items to sell
   * @returns {{ success: boolean, listing?: Listing, error?: string }}
   */
  createListing(sellerUuid, sellerName, item, pricePerUnit, quantity) {
    // Validate price
    if (pricePerUnit < this.options.minPrice) {
      return { success: false, error: `Price must be at least ${this.options.minPrice}` };
    }
    if (pricePerUnit > this.options.maxPrice) {
      return { success: false, error: `Price cannot exceed ${this.options.maxPrice}` };
    }

    // Validate quantity
    if (quantity < 1) {
      return { success: false, error: 'Quantity must be at least 1' };
    }

    // Check listing limit
    const activeCount = this.getActiveListingsBySeller(sellerUuid).length;
    if (activeCount >= this.options.maxListingsPerPlayer) {
      return { success: false, error: `Maximum ${this.options.maxListingsPerPlayer} active listings allowed` };
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.options.durationDays);

    const listing = {
      id: this._generateId(),
      sellerUuid,
      sellerName,
      item: {
        id: item.id,
        displayName: item.displayName,
        rarity: item.rarity,
        category: item.category || this._getCategoryFromId(item.id),
      },
      pricePerUnit: Math.floor(pricePerUnit),
      quantity: Math.floor(quantity),
      totalPrice: Math.floor(pricePerUnit * quantity),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'active',
    };

    this.listings.set(listing.id, listing);
    this._indexListing(listing);
    this.save();

    console.log(`[MarketListing] Created listing ${listing.id}: ${quantity}x ${item.displayName} @ ${pricePerUnit} credits each`);

    return { success: true, listing };
  }

  /**
   * Infer category from item ID.
   * @private
   * @param {string} itemId
   * @returns {string}
   */
  _getCategoryFromId(itemId) {
    if (!itemId) return 'misc';
    const prefix = itemId.split(':')[0];
    const categoryMap = {
      fishing: 'fishing.catch',
      discgolf: 'discgolf.discs',
      ranch: 'ranch.products',
      studio: 'movie.props',
      education: 'education.materials',
      all: 'crossgame',
    };
    return categoryMap[prefix] || 'misc';
  }

  /**
   * Cancel a listing (seller only).
   * @param {string} sellerUuid - Seller's UUID (for authorization)
   * @param {string} listingId - Listing ID to cancel
   * @returns {{ success: boolean, listing?: Listing, error?: string }}
   */
  cancelListing(sellerUuid, listingId) {
    const listing = this.listings.get(listingId);

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    if (listing.sellerUuid !== sellerUuid) {
      return { success: false, error: 'You can only cancel your own listings' };
    }

    if (listing.status !== 'active') {
      return { success: false, error: `Cannot cancel listing with status: ${listing.status}` };
    }

    listing.status = 'cancelled';
    listing.cancelledAt = new Date().toISOString();
    this._deindexListing(listing);
    this.save();

    console.log(`[MarketListing] Cancelled listing ${listingId}`);

    return { success: true, listing };
  }

  /**
   * Get a listing by ID.
   * @param {string} listingId
   * @returns {Listing|null}
   */
  getListing(listingId) {
    return this.listings.get(listingId) || null;
  }

  /**
   * Get all active listings.
   * @returns {Listing[]}
   */
  getActiveListings() {
    return Array.from(this.listings.values())
      .filter(l => l.status === 'active');
  }

  /**
   * Get active listings by seller.
   * @param {string} sellerUuid
   * @returns {Listing[]}
   */
  getActiveListingsBySeller(sellerUuid) {
    const listingIds = this.bySeller.get(sellerUuid) || new Set();
    return Array.from(listingIds)
      .map(id => this.listings.get(id))
      .filter(l => l && l.status === 'active');
  }

  /**
   * Get listings for a specific item.
   * @param {string} itemId
   * @returns {Listing[]}
   */
  getListingsByItem(itemId) {
    const listingIds = this.byItem.get(itemId) || new Set();
    return Array.from(listingIds)
      .map(id => this.listings.get(id))
      .filter(l => l && l.status === 'active')
      .sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  }

  /**
   * Mark a listing as sold (internal use by transaction system).
   * @param {string} listingId
   * @param {number} quantitySold
   * @returns {{ success: boolean, listing?: Listing, error?: string }}
   */
  markSold(listingId, quantitySold) {
    const listing = this.listings.get(listingId);

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    if (listing.status !== 'active') {
      return { success: false, error: `Cannot sell listing with status: ${listing.status}` };
    }

    if (quantitySold > listing.quantity) {
      return { success: false, error: 'Cannot sell more than available quantity' };
    }

    if (quantitySold === listing.quantity) {
      listing.status = 'sold';
      listing.soldAt = new Date().toISOString();
      this._deindexListing(listing);
    } else {
      // Partial sale
      listing.quantity -= quantitySold;
      listing.totalPrice = listing.quantity * listing.pricePerUnit;
    }

    this.save();
    return { success: true, listing };
  }

  /**
   * Get lowest price for an item.
   * @param {string} itemId
   * @returns {number|null} Lowest price or null if no listings
   */
  getLowestPrice(itemId) {
    const listings = this.getListingsByItem(itemId);
    return listings.length > 0 ? listings[0].pricePerUnit : null;
  }

  /**
   * Get statistics about the market.
   * @returns {Object}
   */
  getStats() {
    const active = this.getActiveListings();
    const byStatus = { active: 0, sold: 0, expired: 0, cancelled: 0 };
    const byCategory = {};

    for (const listing of this.listings.values()) {
      byStatus[listing.status] = (byStatus[listing.status] || 0) + 1;
      const cat = listing.item?.category || 'misc';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    return {
      totalListings: this.listings.size,
      activeListings: active.length,
      byStatus,
      byCategory,
      uniqueSellers: this.bySeller.size,
      uniqueItems: this.byItem.size,
    };
  }

  /**
   * Clear all listings (for testing).
   */
  clear() {
    this.listings.clear();
    this.bySeller.clear();
    this.byItem.clear();
  }
}

module.exports = {
  MarketListing,
};
