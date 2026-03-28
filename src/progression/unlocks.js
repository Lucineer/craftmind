/**
 * Unlock System - Level-based content unlocks
 *
 * Unlocks at various level milestones:
 * - Level 5: Better bait
 * - Level 10: Iron rod
 * - Level 15: New biome access
 * - Level 20: Quest chains
 * - Level 30: Diamond rod
 * - Level 50: Legendary content
 *
 * @module progression/unlocks
 */

const fs = require('fs');
const path = require('path');

/**
 * Unlock definitions by level
 */
const UNLOCK_DEFINITIONS = {
  1: [
    {
      id: 'basic_rod',
      name: 'Basic Fishing Rod',
      description: 'Standard fishing equipment',
      type: 'equipment',
      icon: 'rod'
    },
    {
      id: 'basic_bait',
      name: 'Basic Bait',
      description: 'Simple bait for common fish',
      type: 'consumable',
      icon: 'bait'
    }
  ],
  5: [
    {
      id: 'better_bait',
      name: 'Better Bait',
      description: 'Improved bait with +10% catch rate',
      type: 'consumable',
      icon: 'bait_plus'
    },
    {
      id: 'tackle_box',
      name: 'Tackle Box',
      description: 'Storage for fishing supplies',
      type: 'feature',
      icon: 'box'
    }
  ],
  10: [
    {
      id: 'iron_rod',
      name: 'Iron Fishing Rod',
      description: 'Sturdier rod with +15% catch speed',
      type: 'equipment',
      icon: 'iron_rod'
    },
    {
      id: 'night_fishing',
      name: 'Night Fishing',
      description: 'Access to nocturnal fish species',
      type: 'feature',
      icon: 'moon'
    }
  ],
  15: [
    {
      id: 'swamp_biome',
      name: 'Swamp Biome',
      description: 'Access to swamp fishing grounds',
      type: 'biome',
      icon: 'swamp'
    },
    {
      id: 'rare_bait',
      name: 'Rare Bait',
      description: 'Specialized bait for rare catches',
      type: 'consumable',
      icon: 'rare_bait'
    }
  ],
  20: [
    {
      id: 'quest_chains',
      name: 'Quest Chains',
      description: 'Multi-part fishing adventures',
      type: 'feature',
      icon: 'scroll'
    },
    {
      id: 'deep_ocean',
      name: 'Deep Ocean Access',
      description: 'Fish in deep ocean waters',
      type: 'biome',
      icon: 'ocean'
    }
  ],
  25: [
    {
      id: 'golden_rod',
      name: 'Golden Fishing Rod',
      description: 'Golden rod with +25% rare chance',
      type: 'equipment',
      icon: 'golden_rod'
    },
    {
      id: 'tournament_entry',
      name: 'Tournament Entry',
      description: 'Compete in fishing tournaments',
      type: 'feature',
      icon: 'trophy'
    }
  ],
  30: [
    {
      id: 'diamond_rod',
      name: 'Diamond Fishing Rod',
      description: 'Diamond-tipped rod, never breaks',
      type: 'equipment',
      icon: 'diamond_rod'
    },
    {
      id: 'underground_lake',
      name: 'Underground Lake',
      description: 'Hidden cave fishing location',
      type: 'biome',
      icon: 'cave'
    }
  ],
  35: [
    {
      id: 'legendary_bait',
      name: 'Legendary Bait',
      description: 'Bait that attracts legendary fish',
      type: 'consumable',
      icon: 'legendary_bait'
    },
    {
      id: 'weather_control',
      name: 'Weather Prediction',
      description: 'See optimal fishing weather',
      type: 'feature',
      icon: 'cloud'
    }
  ],
  40: [
    {
      id: 'nether_waters',
      name: 'Nether Waters',
      description: 'Fish in the dangerous nether',
      type: 'biome',
      icon: 'fire'
    },
    {
      id: 'auto_reel',
      name: 'Auto-Reel',
      description: 'Automatic fish catching',
      type: 'feature',
      icon: 'gear'
    }
  ],
  50: [
    {
      id: 'crystal_rod',
      name: 'Crystal Fishing Rod',
      description: 'Legendary rod that glows in darkness',
      type: 'equipment',
      icon: 'crystal_rod'
    },
    {
      id: 'legendary_content',
      name: 'Legendary Quests',
      description: 'Epic fishing adventures',
      type: 'feature',
      icon: 'star'
    },
    {
      id: 'void_biome',
      name: 'Void Biome',
      description: 'Fish in the mysterious void',
      type: 'biome',
      icon: 'void'
    }
  ],
  75: [
    {
      id: 'mythic_rod',
      name: 'Mythic Fishing Rod',
      description: 'The ultimate fishing implement',
      type: 'equipment',
      icon: 'mythic_rod'
    },
    {
      id: 'all_biomes',
      name: 'All Biome Access',
      description: 'Unrestricted fishing anywhere',
      type: 'feature',
      icon: 'globe'
    }
  ],
  100: [
    {
      id: 'transcendent_rod',
      name: 'Transcendent Rod',
      description: 'A rod beyond mortal comprehension',
      type: 'equipment',
      icon: 'transcendent_rod'
    },
    {
      id: 'prestige_unlock',
      name: 'Prestige System',
      description: 'Reset for permanent bonuses',
      type: 'feature',
      icon: 'crown'
    }
  ]
};

/**
 * Unlock System class
 */
class UnlockSystem {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir] - Directory for unlock data
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/players');
    this.cache = new Map();

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get player unlock data file path
   * @private
   */
  _getPlayerPath(uuid) {
    return path.join(this.dataDir, `${uuid}_unlocks.json`);
  }

  /**
   * Load player unlock data
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
        console.error(`[UnlockSystem] Failed to load ${uuid}:`, e);
        data = this._createDefaultUnlocks(uuid);
      }
    } else {
      data = this._createDefaultUnlocks(uuid);
    }

    this.cache.set(uuid, data);
    return data;
  }

  /**
   * Create default unlock data
   * @private
   */
  _createDefaultUnlocks(uuid) {
    return {
      uuid,
      unlockedIds: [],
      highestUnlockLevel: 0,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Save player unlock data
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
      console.error(`[UnlockSystem] Failed to save ${uuid}:`, e);
    }
  }

  /**
   * Check and return newly unlocked content based on level
   * @param {string} playerUuid
   * @param {number} newLevel - Current player level
   * @returns {Object} Result with newly unlocked items
   */
  checkUnlocks(playerUuid, newLevel) {
    const player = this._loadPlayer(playerUuid);
    const newUnlocks = [];
    const allUnlocks = [];

    // Check each level threshold
    for (const [level, unlocks] of Object.entries(UNLOCK_DEFINITIONS)) {
      const unlockLevel = parseInt(level, 10);
      if (unlockLevel <= newLevel) {
        for (const unlock of unlocks) {
          allUnlocks.push(unlock);
          if (!player.unlockedIds.includes(unlock.id)) {
            newUnlocks.push(unlock);
            player.unlockedIds.push(unlock.id);
          }
        }
      }
    }

    // Update highest unlock level
    if (newLevel > player.highestUnlockLevel) {
      player.highestUnlockLevel = newLevel;
    }

    if (newUnlocks.length > 0) {
      this._savePlayer(playerUuid);
    }

    return {
      newUnlocks,
      totalUnlocked: player.unlockedIds.length
    };
  }

  /**
   * Get all unlocked content for a player
   * @param {string} playerUuid
   * @returns {Object} All unlocked items
   */
  getUnlockedContent(playerUuid) {
    const player = this._loadPlayer(playerUuid);
    const unlocked = [];

    for (const unlockId of player.unlockedIds) {
      const unlock = this._findUnlockById(unlockId);
      if (unlock) {
        unlocked.push(unlock);
      }
    }

    return {
      unlocked,
      count: unlocked.length,
      highestLevel: player.highestUnlockLevel
    };
  }

  /**
   * Find unlock definition by ID
   * @private
   */
  _findUnlockById(id) {
    for (const unlocks of Object.values(UNLOCK_DEFINITIONS)) {
      for (const unlock of unlocks) {
        if (unlock.id === id) {
          return unlock;
        }
      }
    }
    return null;
  }

  /**
   * Check if player has a specific unlock
   * @param {string} playerUuid
   * @param {string} unlockId
   * @returns {boolean}
   */
  hasUnlock(playerUuid, unlockId) {
    const player = this._loadPlayer(playerUuid);
    return player.unlockedIds.includes(unlockId);
  }

  /**
   * Get unlocks available at a specific level
   * @param {number} level
   * @returns {Array}
   */
  getUnlocksAtLevel(level) {
    return UNLOCK_DEFINITIONS[level] || [];
  }

  /**
   * Get all unlock definitions
   * @returns {Object}
   */
  getAllDefinitions() {
    return { ...UNLOCK_DEFINITIONS };
  }

  /**
   * Get next unlock level for a player
   * @param {string} playerUuid
   * @param {number} currentLevel
   * @returns {Object|null} Next unlock info
   */
  getNextUnlock(playerUuid, currentLevel) {
    const levels = Object.keys(UNLOCK_DEFINITIONS)
      .map(l => parseInt(l, 10))
      .sort((a, b) => a - b);

    for (const level of levels) {
      if (level > currentLevel) {
        return {
          level,
          unlocks: UNLOCK_DEFINITIONS[level]
        };
      }
    }

    return null; // No more unlocks
  }

  /**
   * Clear cache for a player
   * @param {string} playerUuid
   */
  clearCache(playerUuid) {
    this.cache.delete(playerUuid);
  }
}

module.exports = { UnlockSystem, UNLOCK_DEFINITIONS };
