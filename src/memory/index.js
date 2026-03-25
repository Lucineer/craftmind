/**
 * @module craftmind/memory
 * @description Persistent memory for bots. Stores data between sessions as JSON.
 *
 * Tracks: players met, places explored, things built, deaths, and arbitrary
 * key-value metadata.
 *
 * @example
 * const mem = new BotMemory('Cody', './memory');
 * mem.rememberPlayer('SafeArtist2047', { firstMet: '2026-03-25' });
 * mem.rememberPlace('spawn_house', { x: 100, y: 64, z: -200 });
 * mem.save();
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} MemoryData
 * @property {Object.<string, Object>} players - Players encountered.
 * @property {Object.<string, Object>} places - Locations of interest.
 * @property {Object.<string, Object>} builds - Things the bot built.
 * @property {number} deaths - Total death count.
 * @property {string[]} deathCauses - Last 10 death causes.
 * @property {Object} meta - Arbitrary key-value storage.
 */

const BLANK = () => ({
  players: {},
  places: {},
  builds: {},
  resources: {},
  deaths: 0,
  deathCauses: [],
  meta: {},
  lastSession: null,
});

class BotMemory {
  /**
   * @param {string} botName - Bot's username (used as filename).
   * @param {string} [dir='./memory'] - Directory for persistence files.
   */
  constructor(botName, dir = './memory') {
    this._botName = botName;
    this._dir = dir;
    this._file = path.join(dir, `${botName.toLowerCase()}.json`);
    this._data = BLANK();

    // Auto-load if file exists
    this._load();
  }

  /** @type {MemoryData} */
  get data() {
    return this._data;
  }

  // ── Players ──

  /**
   * Record info about a player the bot encountered.
   * @param {string} name - Player username.
   * @param {Object} [info={}] - Arbitrary info to store.
   */
  rememberPlayer(name, info = {}) {
    const key = name.toLowerCase();
    if (!this._data.players[key]) {
      this._data.players[key] = { firstMet: new Date().toISOString(), lastSeen: null, interactions: 0 };
    }
    Object.assign(this._data.players[key], info, { lastSeen: new Date().toISOString() });
    this._data.players[key].interactions = (this._data.players[key].interactions || 0) + 1;
  }

  /**
   * Get stored info about a player.
   * @param {string} name
   * @returns {Object|undefined}
   */
  getPlayer(name) {
    return this._data.players[name.toLowerCase()];
  }

  /**
   * Get all known players.
   * @returns {Object.<string, Object>}
   */
  get knownPlayers() {
    return { ...this._data.players };
  }

  // ── Places ──

  /**
   * Record a location of interest.
   * @param {string} name - Place name (e.g., "spawn", "diamond_vein").
   * @param {Object} info - Usually includes x, y, z.
   */
  rememberPlace(name, info) {
    this._data.places[name] = { ...info, discovered: new Date().toISOString() };
  }

  getPlace(name) {
    return this._data.places[name];
  }

  get knownPlaces() {
    return { ...this._data.places };
  }

  // ── Builds ──

  rememberBuild(name, info) {
    this._data.builds[name] = { ...info, builtAt: new Date().toISOString() };
  }

  get knownBuilds() {
    return { ...this._data.builds };
  }

  // ── Resources ──

  recordResource(type, location, count = 1) {
    if (!this._data.resources[type]) {
      this._data.resources[type] = { totalFound: 0, locations: [] };
    }
    this._data.resources[type].totalFound += count;
    this._data.resources[type].locations.push({ ...location, timestamp: new Date().toISOString() });
    // Keep last 20 locations per resource
    if (this._data.resources[type].locations.length > 20) {
      this._data.resources[type].locations = this._data.resources[type].locations.slice(-20);
    }
  }

  // ── Deaths ──

  recordDeath(cause = 'unknown') {
    this._data.deaths++;
    this._data.deathCauses.push({ cause, timestamp: new Date().toISOString() });
    if (this._data.deathCauses.length > 10) {
      this._data.deathCauses = this._data.deathCauses.slice(-10);
    }
  }

  // ── Meta ──

  setMeta(key, value) {
    this._data.meta[key] = value;
  }

  getMeta(key) {
    return this._data.meta[key];
  }

  // ── Persistence ──

  /**
   * Save memory to disk.
   */
  save() {
    try {
      fs.mkdirSync(this._dir, { recursive: true });
      this._data.lastSession = new Date().toISOString();
      fs.writeFileSync(this._file, JSON.stringify(this._data, null, 2));
    } catch (err) {
      console.error(`[Memory] Failed to save: ${err.message}`);
    }
  }

  /**
   * Load memory from disk (called automatically in constructor).
   */
  _load() {
    try {
      if (fs.existsSync(this._file)) {
        const loaded = JSON.parse(fs.readFileSync(this._file, 'utf8'));
        // Merge with blank template to handle new fields
        this._data = { ...BLANK(), ...loaded };
      }
    } catch (err) {
      console.error(`[Memory] Failed to load: ${err.message}`);
    }
  }
}

module.exports = { BotMemory };
