/**
 * @module craftmind/identity
 * @description Unified bot identity system across all games. Tracks personality traits, relationships, achievements, and stats.
 *
 * This system provides a persistent identity for each bot that spans multiple games and sessions.
 * It captures the bot's "personality" through traits, tracks social relationships, records achievements,
 * and maintains per-game statistics.
 *
 * @example
 * const identity = new BotIdentity('Cody_A', '/tmp');
 * await identity.load();
 * identity.addTrait('patience', 0.8);
 * identity.recordAction('fishing', 'cast_line', 'success');
 * identity.updateRelationship('Steve', 5);
 * await identity.save();
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} TraitData
 * @property {number} patience - Willingness to wait (0-1)
 * @property {number} sociability - Desire for social interaction (0-1)
 * @property {number} curiosity - Tendency to explore (0-1)
 * @property {number} creativity - Originality in actions (0-1)
 * @property {number} endurance - Persistence through difficulty (0-1)
 * @property {number} intelligence - Learning and problem-solving (0-1)
 */

/**
 * @typedef {Object} ActionLogEntry
 * @property {string} timestamp - ISO timestamp
 * @property {string} game - Game identifier (fishing, courses, herding, etc.)
 * @property {string} action - Action performed
 * @property {string} result - Outcome (success, failure, partial)
 */

/**
 * @typedef {Object} RelationshipData
 * @property {number} score - Relationship score (-100 to 100)
 * @property {string} lastInteraction - ISO timestamp of last interaction
 * @property {number} interactions - Total number of interactions
 */

/**
 * @typedef {Object} GameStats
 * @property {number} actions - Total actions performed
 * @property {number} success - Successful actions
 * @property {number} failures - Failed actions
 * @property {Object.<string, number>} custom - Custom game-specific stats
 */

/**
 * @typedef {Object} IdentityData
 * @property {string} name - Bot name
 * @property {TraitData} traits - Personality traits
 * @property {ActionLogEntry[]} history - Action history (last 100)
 * @property {Object.<string, RelationshipData>} relationships - Player relationships
 * @property {string[]} achievements - Unlocked achievement IDs
 * @property {Object.<string, GameStats>} stats - Per-game statistics
 * @property {string} created_at - Creation timestamp
 * @property {string} last_seen - Last activity timestamp
 */

const BLANK_IDENTITY = (name) => ({
  name,
  traits: {
    patience: 0.5,
    sociability: 0.5,
    curiosity: 0.5,
    creativity: 0.5,
    endurance: 0.5,
    intelligence: 0.5,
  },
  history: [],
  relationships: {},
  achievements: [],
  stats: {},
  created_at: new Date().toISOString(),
  last_seen: new Date().toISOString(),
});

class BotIdentity {
  /**
   * @param {string} name - Bot's username
   * @param {string} [dataDir='/tmp'] - Directory for persistence files
   */
  constructor(name, dataDir = '/tmp') {
    this._name = name;
    this._dataDir = dataDir;
    this._file = path.join(dataDir, `identity-${name}.json`);
    this._data = BLANK_IDENTITY(name);
  }

  /** @type {IdentityData} */
  get data() {
    return this._data;
  }

  /** @type {string} */
  get name() {
    return this._name;
  }

  /**
   * Load identity from disk.
   * @returns {Promise<void>}
   */
  async load() {
    return new Promise((resolve) => {
      try {
        if (fs.existsSync(this._file)) {
          const loaded = JSON.parse(fs.readFileSync(this._file, 'utf8'));
          // Merge with blank template to handle new fields
          this._data = { ...BLANK_IDENTITY(this._name), ...loaded };
          // Ensure traits object has all default values
          this._data.traits = { ...BLANK_IDENTITY(this._name).traits, ...this._data.traits };
        }
      } catch (err) {
        console.error(`[Identity] Failed to load ${this._name}: ${err.message}`);
      } finally {
        resolve();
      }
    });
  }

  /**
   * Save identity to disk.
   * @returns {Promise<void>}
   */
  async save() {
    return new Promise((resolve) => {
      try {
        fs.mkdirSync(this._dataDir, { recursive: true });
        this._data.last_seen = new Date().toISOString();
        fs.writeFileSync(this._file, JSON.stringify(this._data, null, 2));
      } catch (err) {
        console.error(`[Identity] Failed to save ${this._name}: ${err.message}`);
      } finally {
        resolve();
      }
    });
  }

  // ── Traits ──

  /**
   * Set or update a personality trait.
   * @param {string} key - Trait name (patience, sociability, curiosity, creativity, endurance, intelligence)
   * @param {number} value - Trait value (0-1)
   */
  addTrait(key, value) {
    if (value < 0 || value > 1) {
      throw new Error(`Trait value must be between 0 and 1, got ${value}`);
    }
    this._data.traits[key] = value;
  }

  /**
   * Get a personality trait value.
   * @param {string} key - Trait name
   * @returns {number|undefined} Trait value or undefined if not found
   */
  getTrait(key) {
    return this._data.traits[key];
  }

  /**
   * Get all personality traits.
   * @returns {TraitData} Copy of traits object
   */
  getTraits() {
    return { ...this._data.traits };
  }

  // ── Action History ──

  /**
   * Record an action performed in a game.
   * @param {string} game - Game identifier
   * @param {string} action - Action description
   * @param {string} result - Result (success, failure, partial)
   */
  recordAction(game, action, result = 'success') {
    const entry = {
      timestamp: new Date().toISOString(),
      game,
      action,
      result,
    };
    this._data.history.push(entry);
    // Keep last 100 actions
    if (this._data.history.length > 100) {
      this._data.history = this._data.history.slice(-100);
    }

    // Update game stats
    if (!this._data.stats[game]) {
      this._data.stats[game] = { actions: 0, success: 0, failures: 0, custom: {} };
    }
    this._data.stats[game].actions++;
    if (result === 'success') {
      this._data.stats[game].success++;
    } else if (result === 'failure') {
      this._data.stats[game].failures++;
    }
  }

  /**
   * Get action history, optionally filtered by game.
   * @param {string} [game] - Filter by game identifier
   * @returns {ActionLogEntry[]} Filtered action history
   */
  getHistory(game) {
    if (!game) return [...this._data.history];
    return this._data.history.filter(entry => entry.game === game);
  }

  // ── Relationships ──

  /**
   * Get relationship data for a player.
   * @param {string} playerName - Player username
   * @returns {RelationshipData|undefined} Relationship data or undefined if not found
   */
  getRelationship(playerName) {
    return this._data.relationships[playerName.toLowerCase()];
  }

  /**
   * Update relationship score with a player.
   * @param {string} playerName - Player username
   * @param {number} delta - Score change (positive = better, negative = worse)
   */
  updateRelationship(playerName, delta) {
    const key = playerName.toLowerCase();
    if (!this._data.relationships[key]) {
      this._data.relationships[key] = {
        score: 0,
        lastInteraction: new Date().toISOString(),
        interactions: 0,
      };
    }
    this._data.relationships[key].score = Math.max(-100, Math.min(100,
      this._data.relationships[key].score + delta));
    this._data.relationships[key].lastInteraction = new Date().toISOString();
    this._data.relationships[key].interactions++;
  }

  /**
   * Get all relationships.
   * @returns {Object.<string, RelationshipData>} Copy of relationships object
   */
  getRelationships() {
    return { ...this._data.relationships };
  }

  // ── Achievements ──

  /**
   * Add an achievement to the bot's record.
   * @param {string} achievementId - Achievement identifier
   */
  addAchievement(achievementId) {
    if (!this._data.achievements.includes(achievementId)) {
      this._data.achievements.push(achievementId);
    }
  }

  /**
   * Check if bot has an achievement.
   * @param {string} achievementId - Achievement identifier
   * @returns {boolean} True if achievement is unlocked
   */
  hasAchievement(achievementId) {
    return this._data.achievements.includes(achievementId);
  }

  /**
   * Get all unlocked achievements.
   * @returns {string[]} Array of achievement IDs
   */
  getAchievements() {
    return [...this._data.achievements];
  }

  // ── Game Statistics ──

  /**
   * Get statistics for a specific game.
   * @param {string} game - Game identifier
   * @returns {GameStats|undefined} Game stats or undefined if not found
   */
  getStats(game) {
    return this._data.stats[game]
      ? { ...this._data.stats[game] }
      : undefined;
  }

  /**
   * Set a custom game statistic.
   * @param {string} game - Game identifier
   * @param {string} stat - Statistic name
   * @param {number} value - Statistic value
   */
  setCustomStat(game, stat, value) {
    if (!this._data.stats[game]) {
      this._data.stats[game] = { actions: 0, success: 0, failures: 0, custom: {} };
    }
    this._data.stats[game].custom[stat] = value;
  }

  /**
   * Increment a custom game statistic.
   * @param {string} game - Game identifier
   * @param {string} stat - Statistic name
   * @param {number} [amount=1] - Amount to increment by
   */
  incrementCustomStat(game, stat, amount = 1) {
    if (!this._data.stats[game]) {
      this._data.stats[game] = { actions: 0, success: 0, failures: 0, custom: {} };
    }
    this._data.stats[game].custom[stat] = (this._data.stats[game].custom[stat] || 0) + amount;
  }

  /**
   * Get a custom game statistic.
   * @param {string} game - Game identifier
   * @param {string} stat - Statistic name
   * @returns {number|undefined} Statistic value or undefined if not found
   */
  getCustomStat(game, stat) {
    return this._data.stats[game]?.custom[stat];
  }

  /**
   * Get all game statistics.
   * @returns {Object.<string, GameStats>} Copy of stats object
   */
  getAllStats() {
    return JSON.parse(JSON.stringify(this._data.stats));
  }

  // ── Serialization ──

  /**
   * Convert identity to JSON.
   * @returns {IdentityData} Identity data
   */
  toJSON() {
    return JSON.parse(JSON.stringify(this._data));
  }

  /**
   * Get identity summary (for debugging/logging).
   * @returns {string} Summary string
   */
  getSummary() {
    return `BotIdentity(${this._name}) {
  traits: ${JSON.stringify(this._data.traits)},
  history: ${this._data.history.length} actions,
  relationships: ${Object.keys(this._data.relationships).length} players,
  achievements: ${this._data.achievements.length} unlocked,
  games: ${Object.keys(this._data.stats).join(', ') || 'none'},
  created: ${this._data.created_at},
  last_seen: ${this._data.last_seen}
}`;
  }
}

module.exports = { BotIdentity };