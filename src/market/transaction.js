/**
 * @module craftmind/market/transaction
 * @description MarketTransaction - P2P market transaction processing.
 *
 * Handles purchases between players with escrow, tax collection,
 * and fraud prevention (no buying own listings).
 *
 * @example
 * const transaction = new MarketTransaction(listingManager, economy);
 * const result = await transaction.purchase('buyer-uuid', 'listing-123', 5);
 * // Returns: { success: true, totalPrice: 250, tax: 25, sellerEarnings: 225 }
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * @typedef {Object} PurchaseResult
 * @property {boolean} success - Whether purchase succeeded
 * @property {string} [error] - Error message if failed
 * @property {string} [transactionId] - Transaction ID
 * @property {number} [quantity] - Quantity purchased
 * @property {number} [pricePerUnit] - Price per unit
 * @property {number} [totalPrice] - Total price paid
 * @property {number} [tax] - Tax collected (10%)
 * @property {number} [sellerEarnings] - Amount seller receives
 */

/**
 * @typedef {Object} TransactionRecord
 * @property {string} id - Transaction ID
 * @property {string} buyerUuid - Buyer's UUID
 * @property {string} buyerName - Buyer's display name
 * @property {string} sellerUuid - Seller's UUID
 * @property {string} sellerName - Seller's display name
 * @property {Object} item - Item details
 * @property {number} quantity - Quantity purchased
 * @property {number} pricePerUnit - Price per unit
 * @property {number} totalPrice - Total price
 * @property {number} tax - Tax collected
 * @property {number} sellerEarnings - Seller's earnings after tax
 * @property {string} status - Transaction status (pending, completed, refunded)
 * @property {string} createdAt - Creation timestamp
 * @property {string} [completedAt] - Completion timestamp
 */

/**
 * @typedef {Object} TransactionOptions
 * @property {number} [taxRate=0.10] - Tax rate (0.10 = 10%)
 * @property {number} [escrowDurationMs=30000] - Escrow hold duration (30s)
 * @property {number} [maxTransactionAmount=1000000] - Maximum single transaction
 */

const DEFAULT_OPTIONS = {
  taxRate: 0.10, // 10% tax
  escrowDurationMs: 30000, // 30 seconds
  maxTransactionAmount: 1000000,
};

/**
 * MarketTransaction class for processing P2P market transactions.
 */
class MarketTransaction {
  /**
   * Create a new MarketTransaction manager.
   * @param {Object} listingManager - MarketListing instance
   * @param {Object} economy - GameEconomy instance
   * @param {string} [filePath='./data/market/transactions.json'] - Path to transactions file
   * @param {TransactionOptions} [options={}] - Configuration options
   */
  constructor(listingManager, economy, filePath = './data/market/transactions.json', options = {}) {
    /** @type {Object} Listing manager */
    this.listingManager = listingManager;

    /** @type {Object} Economy manager */
    this.economy = economy;

    /** @type {string} Transactions file path */
    this.filePath = filePath;

    /** @type {TransactionOptions} Configuration options */
    this.options = { ...DEFAULT_OPTIONS, ...options };

    /** @type {Map<string, TransactionRecord>} Transactions by ID */
    this.transactions = new Map();

    /** @type {Map<string, TransactionRecord[]>} Transactions by buyer UUID */
    this.byBuyer = new Map();

    /** @type {Map<string, TransactionRecord[]>} Transactions by seller UUID */
    this.bySeller = new Map();

    /** @type {Map<string, number>} Escrow balances by UUID */
    this.escrow = new Map();

    /** @type {number} Total tax collected */
    this.totalTaxCollected = 0;

    // Load from disk
    this.load();
  }

  /**
   * Generate a unique transaction ID.
   * @private
   * @returns {string}
   */
  _generateId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `mtx_${timestamp}_${random}`;
  }

  /**
   * Load transactions from disk.
   * @returns {boolean}
   */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));

        if (data.transactions) {
          for (const txn of data.transactions) {
            this.transactions.set(txn.id, txn);
            this._indexTransaction(txn);
          }
        }

        this.totalTaxCollected = data.totalTaxCollected || 0;

        console.log(`[MarketTransaction] Loaded ${this.transactions.size} transactions`);
        return true;
      }
    } catch (err) {
      console.warn(`[MarketTransaction] Failed to load: ${err.message}`);
    }
    return false;
  }

  /**
   * Index a transaction for lookups.
   * @private
   * @param {TransactionRecord} txn
   */
  _indexTransaction(txn) {
    // Index by buyer
    if (!this.byBuyer.has(txn.buyerUuid)) {
      this.byBuyer.set(txn.buyerUuid, []);
    }
    this.byBuyer.get(txn.buyerUuid).push(txn);

    // Index by seller
    if (!this.bySeller.has(txn.sellerUuid)) {
      this.bySeller.set(txn.sellerUuid, []);
    }
    this.bySeller.get(txn.sellerUuid).push(txn);
  }

  /**
   * Save transactions to disk.
   * @returns {boolean}
   */
  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        transactions: Array.from(this.transactions.values()),
        totalTaxCollected: this.totalTaxCollected,
        savedAt: new Date().toISOString(),
        version: 1,
      };

      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.warn(`[MarketTransaction] Failed to save: ${err.message}`);
      return false;
    }
  }

  /**
   * Process a purchase from the market.
   * @param {string} buyerUuid - Buyer's UUID
   * @param {string} buyerName - Buyer's display name
   * @param {string} listingId - Listing to purchase from
   * @param {number} [quantity=1] - Quantity to purchase
   * @returns {PurchaseResult}
   */
  purchase(buyerUuid, buyerName, listingId, quantity = 1) {
    // Get listing
    const listing = this.listingManager.getListing(listingId);
    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    if (listing.status !== 'active') {
      return { success: false, error: `Listing is ${listing.status}` };
    }

    // Prevent buying own listings
    if (listing.sellerUuid === buyerUuid) {
      return { success: false, error: 'Cannot purchase your own listing' };
    }

    // Validate quantity
    if (quantity < 1) {
      return { success: false, error: 'Quantity must be at least 1' };
    }
    if (quantity > listing.quantity) {
      return { success: false, error: `Only ${listing.quantity} available` };
    }

    // Calculate prices
    const totalPrice = listing.pricePerUnit * quantity;
    const tax = Math.floor(totalPrice * this.options.taxRate);
    const sellerEarnings = totalPrice - tax;

    // Check max transaction
    if (totalPrice > this.options.maxTransactionAmount) {
      return { success: false, error: `Transaction exceeds maximum of ${this.options.maxTransactionAmount}` };
    }

    // Check buyer has enough credits
    const buyerBalance = this.economy.getBalance(buyerName);
    if (buyerBalance < totalPrice) {
      return {
        success: false,
        error: `Insufficient funds: have ${buyerBalance}, need ${totalPrice}`,
      };
    }

    // Deduct from buyer
    const spent = this.economy.spendCurrency(
      buyerName,
      totalPrice,
      `market:purchase:${listing.item?.id || 'unknown'}`
    );
    if (!spent) {
      return { success: false, error: 'Failed to process payment' };
    }

    // Create transaction record
    const transaction = {
      id: this._generateId(),
      buyerUuid,
      buyerName,
      sellerUuid: listing.sellerUuid,
      sellerName: listing.sellerName,
      item: listing.item,
      listingId,
      quantity,
      pricePerUnit: listing.pricePerUnit,
      totalPrice,
      tax,
      sellerEarnings,
      status: 'escrow',
      createdAt: new Date().toISOString(),
    };

    this.transactions.set(transaction.id, transaction);
    this._indexTransaction(transaction);

    // Put seller earnings in escrow
    if (!this.escrow.has(listing.sellerUuid)) {
      this.escrow.set(listing.sellerUuid, 0);
    }
    this.escrow.set(listing.sellerUuid, this.escrow.get(listing.sellerUuid) + sellerEarnings);

    // Update listing
    this.listingManager.markSold(listingId, quantity);

    // Record tax
    this.totalTaxCollected += tax;

    // Auto-release escrow after duration
    setTimeout(() => {
      this._releaseEscrow(transaction.id);
    }, this.options.escrowDurationMs);

    this.save();
    this.economy.save();

    console.log(`[MarketTransaction] Purchase: ${buyerName} bought ${quantity}x ${listing.item?.displayName} for ${totalPrice} credits`);

    return {
      success: true,
      transactionId: transaction.id,
      quantity,
      pricePerUnit: listing.pricePerUnit,
      totalPrice,
      tax,
      sellerEarnings,
    };
  }

  /**
   * Release escrow to seller.
   * @private
   * @param {string} transactionId
   */
  _releaseEscrow(transactionId) {
    const txn = this.transactions.get(transactionId);
    if (!txn || txn.status !== 'escrow') {
      return;
    }

    // Credit seller
    this.economy.addCurrency(
      txn.sellerName,
      txn.sellerEarnings,
      `market:sale:${txn.item?.id || 'unknown'}`
    );

    // Deduct from escrow
    const escrowBalance = this.escrow.get(txn.sellerUuid) || 0;
    this.escrow.set(txn.sellerUuid, Math.max(0, escrowBalance - txn.sellerEarnings));

    // Update transaction status
    txn.status = 'completed';
    txn.completedAt = new Date().toISOString();

    this.save();
    this.economy.save();

    console.log(`[MarketTransaction] Escrow released: ${txn.sellerName} received ${txn.sellerEarnings} credits`);
  }

  /**
   * Get escrow balance for a player.
   * @param {string} playerUuid
   * @returns {number}
   */
  getEscrowBalance(playerUuid) {
    return this.escrow.get(playerUuid) || 0;
  }

  /**
   * Get transaction by ID.
   * @param {string} transactionId
   * @returns {TransactionRecord|null}
   */
  getTransaction(transactionId) {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Get transaction history for a buyer.
   * @param {string} buyerUuid
   * @param {number} [limit=50]
   * @returns {TransactionRecord[]}
   */
  getBuyerHistory(buyerUuid, limit = 50) {
    const history = this.byBuyer.get(buyerUuid) || [];
    return history.slice(-limit);
  }

  /**
   * Get transaction history for a seller.
   * @param {string} sellerUuid
   * @param {number} [limit=50]
   * @returns {TransactionRecord[]}
   */
  getSellerHistory(sellerUuid, limit = 50) {
    const history = this.bySeller.get(sellerUuid) || [];
    return history.slice(-limit);
  }

  /**
   * Get recent transactions.
   * @param {number} [limit=50]
   * @returns {TransactionRecord[]}
   */
  getRecentTransactions(limit = 50) {
    return Array.from(this.transactions.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Get transaction statistics.
   * @returns {Object}
   */
  getStats() {
    const completed = Array.from(this.transactions.values())
      .filter(t => t.status === 'completed');

    const totalVolume = completed.reduce((sum, t) => sum + t.totalPrice, 0);
    const totalQuantity = completed.reduce((sum, t) => sum + t.quantity, 0);

    const byStatus = { pending: 0, escrow: 0, completed: 0, refunded: 0 };
    for (const txn of this.transactions.values()) {
      byStatus[txn.status] = (byStatus[txn.status] || 0) + 1;
    }

    return {
      totalTransactions: this.transactions.size,
      totalVolume,
      totalQuantity,
      totalTaxCollected: this.totalTaxCollected,
      byStatus,
      uniqueBuyers: this.byBuyer.size,
      uniqueSellers: this.bySeller.size,
      escrowHeld: Array.from(this.escrow.values()).reduce((a, b) => a + b, 0),
    };
  }

  /**
   * Refund a transaction (admin only).
   * @param {string} transactionId
   * @param {string} reason
   * @returns {{ success: boolean, error?: string }}
   */
  refund(transactionId, reason = 'admin_refund') {
    const txn = this.transactions.get(transactionId);
    if (!txn) {
      return { success: false, error: 'Transaction not found' };
    }

    if (txn.status === 'refunded') {
      return { success: false, error: 'Transaction already refunded' };
    }

    // Refund buyer
    this.economy.addCurrency(txn.buyerName, txn.totalPrice, `market:refund:${reason}`);

    // If in escrow, deduct from escrow
    if (txn.status === 'escrow') {
      const escrowBalance = this.escrow.get(txn.sellerUuid) || 0;
      this.escrow.set(txn.sellerUuid, Math.max(0, escrowBalance - txn.sellerEarnings));
    }

    // Update transaction
    txn.status = 'refunded';
    txn.refundedAt = new Date().toISOString();
    txn.refundReason = reason;

    // Reverse tax
    this.totalTaxCollected -= txn.tax;

    this.save();
    this.economy.save();

    console.log(`[MarketTransaction] Refunded transaction ${transactionId}: ${txn.totalPrice} credits to ${txn.buyerName}`);

    return { success: true };
  }

  /**
   * Clear all transactions (for testing).
   */
  clear() {
    this.transactions.clear();
    this.byBuyer.clear();
    this.bySeller.clear();
    this.escrow.clear();
    this.totalTaxCollected = 0;
  }
}

module.exports = {
  MarketTransaction,
};
