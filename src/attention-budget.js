/**
 * @module craftmind/attention-budget
 * @description Cognitive attention system for managing LLM call budgets.
 *
 * Models have limited attention (and API costs). This system manages what
 * the model thinks about using heartbeats, novelty interrupts, and priority queues.
 *
 * @example
 * const attn = new AttentionBudget({ maxCallsPerMinute: 2 });
 * attn.register('fish_school_1', { priority: 'normal', callback: async () => { ... } });
 * attn.register('predator_threat', { priority: 'critical', callback: async () => { ... } });
 * attn.start();
 */

const { EventEmitter } = require('events');

const PRIORITY_RANK = { critical: 4, important: 3, normal: 2, low: 1 };

/**
 * @typedef {Object} AttentionEntry
 * @property {string} id
 * @property {string} priority
 * @property {function(Object): Promise<*>|*} callback
 * @property {number} lastAttended
 * @property {number} callCount
 * @property {number} interval - Minimum ms between callbacks for this entry.
 * @property {boolean} active
 * @property {Object} meta
 */

class AttentionBudget extends EventEmitter {
  /**
   * @param {{ maxCallsPerMinute?: number, heartbeatInterval?: number, defaultInterval?: number }} [opts]
   */
  constructor(opts = {}) {
    super();
    this._maxPerMinute = opts.maxCallsPerMinute || 4;
    this._heartbeatInterval = opts.heartbeatInterval || 30000;
    this._defaultInterval = opts.defaultInterval || 60000;

    /** @type {Map<string, AttentionEntry>} */
    this._entries = new Map();
    /** @type {number[]} */
    this._callTimestamps = [];
    /** @type {{ id: string, priority: string, timestamp: number }[]} */
    this._history = [];
    /** @type {NodeJS.Timeout|null} */
    this._timer = null;
    /** @type {boolean} */
    this._running = false;
    /** @type {string|null} */
    this._focusTarget = null;
    /** @type {Set<string>} */
    this._suppressed = new Set();
  }

  /**
   * Register something that needs attention.
   * @param {string} id
   * @param {{ priority?: string, callback?: function, interval?: number, meta?: Object }} [opts]
   */
  register(id, opts = {}) {
    this._entries.set(id, {
      id,
      priority: opts.priority || 'normal',
      callback: opts.callback || null,
      interval: opts.interval || this._defaultInterval,
      lastAttended: 0,
      callCount: 0,
      active: true,
      meta: opts.meta || {},
    });
  }

  /**
   * Unregister an entry.
   * @param {string} id
   */
  unregister(id) {
    this._entries.delete(id);
    this._suppressed.delete(id);
    if (this._focusTarget === id) this._focusTarget = null;
  }

  /**
   * Update entry options.
   * @param {string} id
   * @param {Object} updates
   */
  update(id, updates) {
    const entry = this._entries.get(id);
    if (!entry) return;
    Object.assign(entry, updates);
  }

  /**
   * Trigger an immediate attention interrupt (e.g., from novelty detector).
   * Critical/important interrupts bypass budget.
   * @param {string} id
   * @param {Object} [context]
   * @returns {Promise<boolean>}
   */
  async interrupt(id, context) {
    const entry = this._entries.get(id);
    if (!entry || !entry.callback || !entry.active) return false;

    const rank = PRIORITY_RANK[entry.priority] || 1;
    // Critical interrupts always go through; others respect budget
    if (rank < PRIORITY_RANK.critical && !this._canCall()) return false;

    this._recordCall(entry, context);
    try {
      await entry.callback(context || {});
      return true;
    } catch (err) {
      this.emit('error', { id, error: err.message });
      return false;
    }
  }

  /**
   * Enter focus mode — reduces other checks.
   * @param {string} id - The entity to focus on.
   */
  focus(id) {
    this._focusTarget = id;
    const entry = this._entries.get(id);
    if (entry) this.update(id, { interval: Math.min(entry.interval, 5000) });
    this.emit('focus', { id });
  }

  /**
   * Exit focus mode.
   */
  unfocus() {
    const prev = this._focusTarget;
    this._focusTarget = null;
    this.emit('unfocus', { previous: prev });
  }

  /**
   * Suppress an entry temporarily.
   * @param {string} id
   */
  suppress(id) {
    this._suppressed.add(id);
  }

  /**
   * Unsuppress an entry.
   * @param {string} id
   */
  unsuppress(id) {
    this._suppressed.delete(id);
  }

  /**
   * Start the heartbeat loop.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._tick();
    this._timer = setInterval(() => this._tick(), this._heartbeatInterval);
    this.emit('started');
  }

  /**
   * Stop the heartbeat loop.
   */
  stop() {
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.emit('stopped');
  }

  /** @type {boolean} */
  get running() { return this._running; }

  /**
   * Get current budget usage.
   * @returns {{ callsThisMinute: number, maxPerMinute: number, available: boolean }}
   */
  get budget() {
    const callsThisMinute = this._callTimestamps.filter(t => Date.now() - t < 60000).length;
    return {
      callsThisMinute,
      maxPerMinute: this._maxPerMinute,
      available: callsThisMinute < this._maxPerMinute,
    };
  }

  /**
   * Get attention history.
   * @param {{ limit?: number }} [opts]
   * @returns {Object[]}
   */
  getHistory(opts = {}) {
    let h = this._history;
    if (opts.limit) h = h.slice(-opts.limit);
    return h;
  }

  /**
   * Get all registered entry ids.
   * @returns {string[]}
   */
  get registeredIds() {
    return [...this._entries.keys()];
  }

  // ── Private ──

  _canCall() {
    const now = Date.now();
    this._callTimestamps = this._callTimestamps.filter(t => now - t < 60000);
    return this._callTimestamps.length < this._maxPerMinute;
  }

  _recordCall(entry, context) {
    const now = Date.now();
    this._callTimestamps.push(now);
    entry.lastAttended = now;
    entry.callCount++;
    this._history.push({
      id: entry.id,
      priority: entry.priority,
      timestamp: now,
      triggeredBy: context?._trigger || 'heartbeat',
    });
    if (this._history.length > 500) this._history = this._history.slice(-500);
  }

  async _tick() {
    if (!this._running) return;

    // Collect eligible entries
    const eligible = [];
    const now = Date.now();

    for (const [id, entry] of this._entries) {
      if (!entry.callback || !entry.active) continue;
      if (this._suppressed.has(id)) continue;

      const timeSinceLast = now - entry.lastAttended;
      let minInterval = entry.interval;

      // In focus mode, non-focus entries have longer intervals
      if (this._focusTarget && id !== this._focusTarget) {
        minInterval *= 3;
      }

      if (timeSinceLast < minInterval) continue;
      eligible.push(entry);
    }

    // Sort by priority (highest first)
    eligible.sort((a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0));

    // Process as many as budget allows
    for (const entry of eligible) {
      if (!this._canCall()) break;
      this._recordCall(entry, { _trigger: 'heartbeat' });
      try {
        await entry.callback({ _trigger: 'heartbeat' });
      } catch (err) {
        this.emit('error', { id: entry.id, error: err.message });
      }
    }
  }
}

module.exports = { AttentionBudget };
