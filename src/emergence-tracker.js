/**
 * @module craftmind/emergence-tracker
 * @description Detects emergent behavior patterns not explicitly scripted.
 *
 * Analyzes behavior logs to find patterns that arise from rule interactions,
 * exports discoveries as shareable "insight cards", and works for any bot.
 *
 * @example
 * const tracker = new EmergenceTracker();
 * tracker.log('fish_behavior', { action: 'school', count: 8, depth: 5 });
 * tracker.log('fish_behavior', { action: 'school', count: 12, depth: 5 });
 * const discoveries = tracker.detectPatterns();
 */

const { EventEmitter } = require('events');

/**
 * @typedef {Object} BehaviorLog
 * @property {string} category
 * @property {Object} data
 * @property {number} timestamp
 */

/**
 * @typedef {Object} EmergentPattern
 * @property {string} id
 * @property {string} category
 * @property {Object} signature - Key features of the pattern.
 * @property {number} frequency - How often the pattern occurs.
 * @property {number} firstSeen - Timestamp of first occurrence.
 * @property {number} lastSeen - Timestamp of most recent occurrence.
 * @property {string[]} sequence - Action sequence that defines the pattern.
 * @property {Object|null} causalityHint - Context about what may have caused this.
 * @property {boolean} isNew
 */

class EmergenceTracker extends EventEmitter {
  /**
   * @param {{ windowSize?: number, minFrequency?: number, maxPatterns?: number }} [opts]
   */
  constructor(opts = {}) {
    super();
    this._windowSize = opts.windowSize || 100; // logs to analyze
    this._minFrequency = opts.minFrequency || 3; // min occurrences to count as pattern
    this._maxPatterns = opts.maxPatterns || 50;

    /** @type {BehaviorLog[]} */
    this._logs = [];
    /** @type {Map<string, EmergentPattern>} */
    this._patterns = new Map();
    /** @type {Map<string, Object>} */
    this._context = new Map(); // for causality hints
    /** @type {EmergentPattern[]} */
    this._discoveries = [];
  }

  /**
   * Log a behavior event.
   * @param {string} category
   * @param {Object} data
   * @param {Object} [context] - Optional state context for causality hints.
   */
  log(category, data, context) {
    const entry = { category, data: { ...data }, timestamp: Date.now() };
    this._logs.push(entry);

    // Keep logs bounded
    if (this._logs.length > this._windowSize * 3) {
      this._logs = this._logs.slice(-this._windowSize * 2);
    }

    // Store context for causality
    if (context) {
      this._context.set(`${Date.now()}`, { ...context });
      // Prune old context
      const cutoff = Date.now() - 600000; // 10 min
      for (const [key, val] of this._context) {
        if (parseInt(key) < cutoff) this._context.delete(key);
      }
    }
  }

  /**
   * Detect patterns in recent behavior logs.
   * @returns {EmergentPattern[]}
   */
  detectPatterns() {
    const recent = this._logs.slice(-this._windowSize);
    const byCategory = new Map();

    for (const entry of recent) {
      if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
      byCategory.get(entry.category).push(entry);
    }

    const newDiscoveries = [];

    for (const [category, entries] of byCategory) {
      // Look for repeated action sequences
      const sequences = this._findSequences(entries);
      for (const seq of sequences) {
        if (seq.frequency < this._minFrequency) continue;

        const id = this._patternId(category, seq.signature);
        const existing = this._patterns.get(id);

        const pattern = {
          id,
          category,
          signature: seq.signature,
          frequency: seq.frequency,
          firstSeen: existing ? existing.firstSeen : seq.firstSeen,
          lastSeen: seq.lastSeen,
          sequence: seq.sequence,
          causalityHint: this._findCausality(seq.firstSeen),
          isNew: !existing,
        };

        const wasNew = !existing;
        this._patterns.set(id, pattern);

        if (wasNew) {
          newDiscoveries.push(pattern);
          this._discoveries.push(pattern);
          this.emit('discovery', pattern);
        } else {
          // Update existing
          existing.frequency = pattern.frequency;
          existing.lastSeen = pattern.lastSeen;
        }
      }
    }

    // Prune stale patterns
    if (this._patterns.size > this._maxPatterns) {
      const sorted = [...this._patterns.entries()].sort((a, b) => b[1].lastSeen - a[1].lastSeen);
      this._patterns = new Map(sorted.slice(0, this._maxPatterns));
    }

    return newDiscoveries;
  }

  /**
   * Get all discovered patterns.
   * @returns {EmergentPattern[]}
   */
  get patterns() {
    return [...this._patterns.values()].sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get new discoveries since last call.
   * @returns {EmergentPattern[]}
   */
  get newDiscoveries() {
    const d = this._discoveries;
    this._discoveries = [];
    return d;
  }

  /**
   * Export a pattern as a shareable insight card.
   * @param {string} patternId
   * @returns {Object}
   */
  exportInsightCard(patternId) {
    const pattern = this._patterns.get(patternId);
    if (!pattern) return null;

    return {
      type: 'insight-card',
      version: 1,
      pattern: {
        category: pattern.category,
        signature: pattern.signature,
        sequence: pattern.sequence,
      },
      stats: {
        frequency: pattern.frequency,
        firstSeen: new Date(pattern.firstSeen).toISOString(),
        lastSeen: new Date(pattern.lastSeen).toISOString(),
      },
      causality: pattern.causalityHint,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import an insight card from another bot/instance.
   * @param {Object} card
   * @returns {EmergentPattern|null}
   */
  importInsightCard(card) {
    if (card.type !== 'insight-card' || !card.pattern) return null;

    const id = this._patternId(card.pattern.category, card.pattern.signature);
    const pattern = {
      id,
      category: card.pattern.category,
      signature: card.pattern.signature,
      frequency: card.stats.frequency,
      firstSeen: new Date(card.stats.firstSeen).getTime(),
      lastSeen: new Date(card.stats.lastSeen).getTime(),
      sequence: card.pattern.sequence,
      causalityHint: card.causality,
      isNew: true,
    };

    this._patterns.set(id, pattern);
    this._discoveries.push(pattern);
    this.emit('discovery', pattern);
    return pattern;
  }

  /**
   * Reset all tracked patterns and logs.
   */
  reset() {
    this._logs = [];
    this._patterns.clear();
    this._discoveries = [];
    this._context.clear();
  }

  /**
   * Get log count.
   * @returns {number}
   */
  get logCount() {
    return this._logs.length;
  }

  // ── Private ──

  /**
   * Find repeated action sequences in a category's logs.
   * @private
   */
  _findSequences(entries) {
    if (entries.length < this._minFrequency) return [];

    const results = [];
    const len = Math.min(5, Math.floor(entries.length / 2)); // sequence lengths to check

    for (let seqLen = 2; seqLen <= len; seqLen++) {
      // Extract action sequences
      const sequences = new Map();
      for (let i = 0; i <= entries.length - seqLen; i++) {
        const seq = entries.slice(i, i + seqLen).map(e => e.data.action || JSON.stringify(e.data)).join('→');
        if (!sequences.has(seq)) sequences.set(seq, { count: 0, firstIdx: i, lastIdx: i });
        const s = sequences.get(seq);
        s.count++;
        s.lastIdx = i;
      }

      for (const [seq, info] of sequences) {
        if (info.count >= this._minFrequency) {
          results.push({
            signature: { sequence: seq, length: seqLen },
            sequence: seq.split('→'),
            frequency: info.count,
            firstSeen: entries[info.firstIdx].timestamp,
            lastSeen: entries[info.lastIdx].timestamp,
          });
        }
      }
    }

    return results;
  }

  _patternId(category, signature) {
    return `emerge_${category}_${signature.sequence.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  _findCausality(aroundTimestamp) {
    // Find context closest to when pattern first appeared
    let closest = null;
    let closestDist = Infinity;
    for (const [ts, ctx] of this._context) {
      const dist = Math.abs(parseInt(ts) - aroundTimestamp);
      if (dist < closestDist && dist < 60000) { // within 1 minute
        closestDist = dist;
        closest = ctx;
      }
    }
    if (!closest) return null;

    // Generate simple causality hint
    const keys = Object.keys(closest);
    if (keys.length === 0) return null;
    const summary = keys.slice(0, 3).map(k => `${k}=${JSON.stringify(closest[k])}`).join(', ');
    return { hint: `Pattern started around when: ${summary}`, timestamp: aroundTimestamp };
  }
}

module.exports = { EmergenceTracker };
