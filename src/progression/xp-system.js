/**
 * XP System - Player experience and leveling
 *
 * XP Curve: Level N requires sum(100 * i^1.5 for i in 1..N) cumulative XP
 * - Level 10 = 22,316 XP
 * - Level 50 = 538,022 XP
 * - Level 100 = 2,520,284 XP
 *
 * @module progression/xp-system
 */

const fs = require('fs');
const path = require('path');

// Precomputed cumulative XP thresholds for levels 1-100
const LEVEL_XP_THRESHOLDS = [];
for (let n = 1; n <= 100; n++) {
  LEVEL_XP_THRESHOLDS[n] = LEVEL_XP_THRESHOLDS[n - 1] + Math.floor(100 * Math.pow(n, 1.5));
}

/**
 * XP System managing player levels and experience
 */
class XPSystem {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir] - Directory for player data files
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/players');
    this.cache = new Map();
    this.listeners = [];

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Add a listener for XP events
   * @param {Function} listener - Callback(playerUuid, event)
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Emit an event to all listeners
   * @private
   */
  _emit(playerUuid, event) {
    for (const listener of this.listeners) {
      try {
        listener(playerUuid, event);
      } catch (e) {
        console.error('[XPSystem] Listener error:', e);
      }
    }
  }

  /**
   * Get player data file path
   * @private
   */
  _getPlayerPath(uuid) {
    return path.join(this.dataDir, `${uuid}.json`);
  }

  /**
   * Load player data from disk
   * @private
   */
  _loadPlayer(uuid) {
    if (this.cache.has(uuid)) {
      return this.cache.get(uuid);
    }

    const filePath = this._getPlayerPath(uuid);
    let data;

    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.error(`[XPSystem] Failed to load ${uuid}:`, e);
        data = this._createDefaultPlayer(uuid);
      }
    } else {
      data = this._createDefaultPlayer(uuid);
    }

    this.cache.set(uuid, data);
    return data;
  }

  /**
   * Create default player data structure
   * @private
   */
  _createDefaultPlayer(uuid) {
    return {
      uuid,
      xp: 0,
      level: 1,
      skillPoints: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Save player data to disk
   * @private
   */
  _savePlayer(uuid) {
    const data = this.cache.get(uuid);
    if (!data) return;

    data.updatedAt = new Date().toISOString();
    const filePath = this._getPlayerPath(uuid);

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`[XPSystem] Failed to save ${uuid}:`, e);
    }
  }

  /**
   * Calculate level from total XP
   * @param {number} totalXP
   * @returns {number} Level (1-100)
   */
  calculateLevel(totalXP) {
    for (let level = 100; level >= 1; level--) {
      if (totalXP >= LEVEL_XP_THRESHOLDS[level]) {
        return level;
      }
    }
    return 1;
  }

  /**
   * Get XP required for a specific level
   * @param {number} level
   * @returns {number} Cumulative XP required
   */
  getXPForLevel(level) {
    if (level < 1) return 0;
    if (level > 100) return LEVEL_XP_THRESHOLDS[100];
    return LEVEL_XP_THRESHOLDS[level];
  }

  /**
   * Add XP to a player
   * @param {string} playerUuid - Player UUID
   * @param {number} amount - XP amount to add
   * @param {string} source - Source of XP (e.g., 'fishing', 'quest')
   * @returns {Object} Result with levelUp info
   */
  addXP(playerUuid, amount, source = 'unknown') {
    const player = this._loadPlayer(playerUuid);
    const oldLevel = player.level;

    player.xp += amount;
    player.level = this.calculateLevel(player.xp);

    const result = {
      addedXP: amount,
      totalXP: player.xp,
      oldLevel,
      newLevel: player.level,
      levelUp: player.level > oldLevel,
      skillPointsEarned: 0,
      source
    };

    // Award skill points for level ups (1 per level)
    if (result.levelUp) {
      const levelsGained = player.level - oldLevel;
      player.skillPoints += levelsGained;
      result.skillPointsEarned = levelsGained;

      this._emit(playerUuid, {
        type: 'level_up',
        oldLevel,
        newLevel: player.level,
        skillPoints: result.skillPointsEarned
      });
    }

    this._emit(playerUuid, {
      type: 'xp_gained',
      amount,
      source,
      totalXP: player.xp
    });

    this._savePlayer(playerUuid);
    return result;
  }

  /**
   * Get player's current level
   * @param {string} playerUuid
   * @returns {number} Level (1-100)
   */
  getLevel(playerUuid) {
    const player = this._loadPlayer(playerUuid);
    return player.level;
  }

  /**
   * Get player's total XP
   * @param {string} playerUuid
   * @returns {number}
   */
  getTotalXP(playerUuid) {
    const player = this._loadPlayer(playerUuid);
    return player.xp;
  }

  /**
   * Get XP progress to next level
   * @param {string} playerUuid
   * @returns {Object} { current, needed, percentage, level, nextLevel }
   */
  getXPProgress(playerUuid) {
    const player = this._loadPlayer(playerUuid);
    const currentLevel = player.level;
    const nextLevel = Math.min(currentLevel + 1, 100);

    const currentLevelXP = this.getXPForLevel(currentLevel);
    const nextLevelXP = this.getXPForLevel(nextLevel);

    const current = player.xp - currentLevelXP;
    const needed = nextLevelXP - currentLevelXP;
    const percentage = needed > 0 ? Math.min(100, (current / needed) * 100) : 100;

    return {
      level: currentLevel,
      nextLevel,
      current: Math.max(0, current),
      needed,
      percentage: Math.floor(percentage),
      totalXP: player.xp
    };
  }

  /**
   * Get player's available skill points
   * @param {string} playerUuid
   * @returns {number}
   */
  getSkillPoints(playerUuid) {
    const player = this._loadPlayer(playerUuid);
    return player.skillPoints;
  }

  /**
   * Use a skill point
   * @param {string} playerUuid
   * @returns {boolean} Success
   */
  useSkillPoint(playerUuid) {
    const player = this._loadPlayer(playerUuid);
    if (player.skillPoints <= 0) return false;

    player.skillPoints--;
    this._savePlayer(playerUuid);
    return true;
  }

  /**
   * Get all player data
   * @param {string} playerUuid
   * @returns {Object}
   */
  getPlayerData(playerUuid) {
    return this._loadPlayer(playerUuid);
  }

  /**
   * Clear cache for a player
   * @param {string} playerUuid
   */
  clearCache(playerUuid) {
    this.cache.delete(playerUuid);
  }

  /**
   * Clear entire cache
   */
  clearAllCache() {
    this.cache.clear();
  }

  /**
   * Get level thresholds for external use
   * @returns {number[]}
   */
  static getLevelThresholds() {
    return [...LEVEL_XP_THRESHOLDS];
  }
}

module.exports = { XPSystem, LEVEL_XP_THRESHOLDS };
