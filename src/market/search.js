/**
 * @module craftmind/market/search
 * @description MarketSearch - Search and filter market listings.
 *
 * Provides advanced search functionality for the player market,
 * including filtering by category, rarity, price range, and more.
 * Supports pagination and auto-complete for item names.
 *
 * @example
 * const search = new MarketSearch(listingManager);
 * const results = search.search({
 *   category: 'fishing.catch',
 *   rarity: 'rare',
 *   sortBy: 'price_asc',
 *   page: 1
 * });
 * // Returns paginated results with 20 items per page
 */

/**
 * @typedef {Object} SearchFilters
 * @property {string} [category] - Filter by category
 * @property {string} [rarity] - Filter by rarity
 * @property {number} [minPrice] - Minimum price per unit
 * @property {number} [maxPrice] - Maximum price per unit
 * @property {string} [sellerName] - Filter by seller name (partial match)
 * @property {string} [itemName] - Filter by item name (partial match)
 * @property {string} [sortBy] - Sort field (price_asc, price_desc, newest, oldest, quantity)
 * @property {number} [page=1] - Page number (1-indexed)
 * @property {number} [pageSize=20] - Items per page
 */

/**
 * @typedef {Object} SearchResult
 * @property {Object[]} items - Matching listings
 * @property {number} total - Total matching items
 * @property {number} page - Current page
 * @property {number} pageSize - Items per page
 * @property {number} totalPages - Total pages
 * @property {boolean} hasMore - More pages available
 */

/**
 * MarketSearch class for searching market listings.
 */
class MarketSearch {
  /**
   * Create a new MarketSearch.
   * @param {Object} listingManager - MarketListing instance
   */
  constructor(listingManager) {
    /** @type {Object} Listing manager */
    this.listingManager = listingManager;

    /** @type {number} Default page size */
    this.defaultPageSize = 20;

    /** @type {Map<string, string[]>} Auto-complete cache */
    this._autocompleteCache = new Map();

    /** @type {Date} Last cache update */
    this._cacheUpdated = null;

    /** @type {number} Cache TTL in ms (5 minutes) */
    this._cacheTTL = 5 * 60 * 1000;
  }

  /**
   * Search listings with filters and pagination.
   * @param {SearchFilters} filters - Search filters
   * @returns {SearchResult}
   */
  search(filters = {}) {
    const {
      category,
      rarity,
      minPrice,
      maxPrice,
      sellerName,
      itemName,
      sortBy = 'price_asc',
      page = 1,
      pageSize = this.defaultPageSize,
    } = filters;

    // Get all active listings
    let results = this.listingManager.getActiveListings();

    // Apply filters
    if (category) {
      results = results.filter(l =>
        l.item?.category?.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (rarity) {
      results = results.filter(l =>
        l.item?.rarity?.toLowerCase() === rarity.toLowerCase()
      );
    }

    if (minPrice !== undefined) {
      results = results.filter(l => l.pricePerUnit >= minPrice);
    }

    if (maxPrice !== undefined) {
      results = results.filter(l => l.pricePerUnit <= maxPrice);
    }

    if (sellerName) {
      const searchLower = sellerName.toLowerCase();
      results = results.filter(l =>
        l.sellerName?.toLowerCase().includes(searchLower)
      );
    }

    if (itemName) {
      const searchLower = itemName.toLowerCase();
      results = results.filter(l =>
        l.item?.displayName?.toLowerCase().includes(searchLower) ||
        l.item?.id?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    results = this._sortResults(results, sortBy);

    // Calculate pagination
    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    const startIndex = (validPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // Slice results for page
    const pageItems = results.slice(startIndex, endIndex);

    return {
      items: pageItems,
      total,
      page: validPage,
      pageSize,
      totalPages,
      hasMore: validPage < totalPages,
    };
  }

  /**
   * Sort results by specified field.
   * @private
   * @param {Object[]} results
   * @param {string} sortBy
   * @returns {Object[]}
   */
  _sortResults(results, sortBy) {
    const sorted = [...results];

    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.pricePerUnit - b.pricePerUnit);

      case 'price_desc':
        return sorted.sort((a, b) => b.pricePerUnit - a.pricePerUnit);

      case 'newest':
        return sorted.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );

      case 'oldest':
        return sorted.sort((a, b) =>
          new Date(a.createdAt) - new Date(b.createdAt)
        );

      case 'quantity':
        return sorted.sort((a, b) => b.quantity - a.quantity);

      case 'name':
        return sorted.sort((a, b) =>
          (a.item?.displayName || '').localeCompare(b.item?.displayName || '')
        );

      case 'rarity':
        return sorted.sort((a, b) => {
          const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
          const aIdx = rarityOrder.indexOf(a.item?.rarity?.toLowerCase()) || 0;
          const bIdx = rarityOrder.indexOf(b.item?.rarity?.toLowerCase()) || 0;
          return bIdx - aIdx; // Rarest first
        });

      default:
        return sorted;
    }
  }

  /**
   * Get auto-complete suggestions for item names.
   * @param {string} query - Partial item name
   * @param {number} [limit=10] - Maximum suggestions
   * @returns {string[]} Matching item names
   */
  autoComplete(query, limit = 10) {
    if (!query || query.length < 2) {
      return [];
    }

    // Update cache if needed
    this._updateAutocompleteCache();

    const queryLower = query.toLowerCase();
    const matches = [];

    for (const [name, ids] of this._autocompleteCache) {
      if (name.toLowerCase().includes(queryLower)) {
        matches.push({ name, count: ids.size });
      }
    }

    // Sort by relevance (exact match first, then by listing count)
    matches.sort((a, b) => {
      const aExact = a.name.toLowerCase().startsWith(queryLower) ? 0 : 1;
      const bExact = b.name.toLowerCase().startsWith(queryLower) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return b.count - a.count;
    });

    return matches.slice(0, limit).map(m => m.name);
  }

  /**
   * Update auto-complete cache.
   * @private
   */
  _updateAutocompleteCache() {
    const now = Date.now();
    if (this._cacheUpdated && (now - this._cacheUpdated) < this._cacheTTL) {
      return;
    }

    this._autocompleteCache.clear();

    const listings = this.listingManager.getActiveListings();
    for (const listing of listings) {
      const name = listing.item?.displayName;
      const id = listing.item?.id;

      if (name) {
        if (!this._autocompleteCache.has(name)) {
          this._autocompleteCache.set(name, new Set());
        }
        this._autocompleteCache.get(name).add(id);
      }
    }

    this._cacheUpdated = now;
  }

  /**
   * Get all available categories with listing counts.
   * @returns {Object.<string, number>}
   */
  getCategories() {
    const categories = {};
    const listings = this.listingManager.getActiveListings();

    for (const listing of listings) {
      const cat = listing.item?.category || 'misc';
      categories[cat] = (categories[cat] || 0) + 1;
    }

    return categories;
  }

  /**
   * Get all available rarities with listing counts.
   * @returns {Object.<string, number>}
   */
  getRarities() {
    const rarities = {};
    const listings = this.listingManager.getActiveListings();

    for (const listing of listings) {
      const rarity = listing.item?.rarity || 'unknown';
      rarities[rarity] = (rarities[rarity] || 0) + 1;
    }

    return rarities;
  }

  /**
   * Get price range for a specific item.
   * @param {string} itemId
   * @returns {{ min: number, max: number, average: number }|null}
   */
  getPriceRange(itemId) {
    const listings = this.listingManager.getListingsByItem(itemId);

    if (listings.length === 0) {
      return null;
    }

    const prices = listings.map(l => l.pricePerUnit);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;

    return { min, max, average: Math.round(average) };
  }

  /**
   * Search for deals (items priced below average).
   * @param {number} [threshold=0.15] - Percentage below average (0.15 = 15% below)
   * @returns {Object[]} Underpriced listings
   */
  findDeals(threshold = 0.15) {
    const listings = this.listingManager.getActiveListings();
    const deals = [];

    // Group by item
    const byItem = new Map();
    for (const listing of listings) {
      const itemId = listing.item?.id;
      if (!itemId) continue;

      if (!byItem.has(itemId)) {
        byItem.set(itemId, []);
      }
      byItem.get(itemId).push(listing);
    }

    // Find underpriced listings
    for (const [itemId, item] of byItem) {
      if (item.length < 2) continue; // Need multiple listings to compare

      const prices = item.map(l => l.pricePerUnit);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

      for (const listing of item) {
        const discount = (avg - listing.pricePerUnit) / avg;
        if (discount >= threshold) {
          deals.push({
            listing,
            averagePrice: Math.round(avg),
            discount: Math.round(discount * 100),
            savings: Math.round(avg - listing.pricePerUnit),
          });
        }
      }
    }

    return deals.sort((a, b) => b.discount - a.discount);
  }

  /**
   * Get trending items (most searched/viewed).
   * This is a placeholder that returns items with most listings.
   * @param {number} [limit=10]
   * @returns {Object[]}
   */
  getTrending(limit = 10) {
    const listings = this.listingManager.getActiveListings();
    const byItem = new Map();

    for (const listing of listings) {
      const itemId = listing.item?.id;
      if (!itemId) continue;

      if (!byItem.has(itemId)) {
        byItem.set(itemId, {
          id: itemId,
          name: listing.item?.displayName,
          category: listing.item?.category,
          listingCount: 0,
          lowestPrice: Infinity,
        });
      }

      const data = byItem.get(itemId);
      data.listingCount++;
      data.lowestPrice = Math.min(data.lowestPrice, listing.pricePerUnit);
    }

    return Array.from(byItem.values())
      .sort((a, b) => b.listingCount - a.listingCount)
      .slice(0, limit);
  }

  /**
   * Get recently listed items.
   * @param {number} [limit=20]
   * @returns {Object[]}
   */
  getRecent(limit = 20) {
    return this.search({ sortBy: 'newest', pageSize: limit }).items;
  }

  /**
   * Get ending soon listings.
   * @param {number} [limit=20]
   * @returns {Object[]}
   */
  getEndingSoon(limit = 20) {
    const listings = this.listingManager.getActiveListings();

    return listings
      .map(l => ({ ...l, expiresAtDate: new Date(l.expiresAt) }))
      .sort((a, b) => a.expiresAtDate - b.expiresAtDate)
      .slice(0, limit);
  }
}

module.exports = {
  MarketSearch,
};
