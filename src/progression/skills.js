/**
 * Skill Tree System - Fishing skill branches
 *
 * Three branches for fishing:
 * - Patience: Rare fish chance
 * - Keen Eye: Catch speed, size bonus
 * - Angler: XP bonus, credits bonus
 *
 * Each branch has 5 levels costing 1 skill point each.
 * Players earn 1 skill point per level up.
 *
 * @module progression/skills
 */

const fs = require('fs');
const path = require('path');

/**
 * Skill tree definitions for fishing
 */
const SKILL_TREES = {
  patience: {
    id: 'patience',
    name: 'Patience',
    description: 'Increases chance of catching rare fish',
    maxLevel: 5,
    effects: [
      { level: 1, rareFishChance: 0.03, description: '+3% rare fish chance' },
      { level: 2, rareFishChance: 0.06, description: '+6% rare fish chance' },
      { level: 3, rareFishChance: 0.10, description: '+10% rare fish chance' },
      { level: 4, rareFishChance: 0.15, description: '+15% rare fish chance' },
      { level: 5, rareFishChance: 0.22, description: '+22% rare fish chance' }
    ]
  },
  keenEye: {
    id: 'keenEye',
    name: 'Keen Eye',
    description: 'Improves catch speed and fish size',
    maxLevel: 5,
    effects: [
      { level: 1, catchSpeed: 0.05, sizeBonus: 0.02, description: '+5% catch speed, +2% size' },
      { level: 2, catchSpeed: 0.10, sizeBonus: 0.04, description: '+10% catch speed, +4% size' },
      { level: 3, catchSpeed: 0.15, sizeBonus: 0.07, description: '+15% catch speed, +7% size' },
      { level: 4, catchSpeed: 0.20, sizeBonus: 0.10, description: '+20% catch speed, +10% size' },
      { level: 5, catchSpeed: 0.30, sizeBonus: 0.15, description: '+30% catch speed, +15% size' }
    ]
  },
  angler: {
    id: 'angler',
    name: 'Angler',
    description: 'Bonus XP and credits from fishing',
    maxLevel: 5,
    effects: [
      { level: 1, xpBonus: 0.05, creditsBonus: 0.03, description: '+5% XP, +3% credits' },
      { level: 2, xpBonus: 0.10, creditsBonus: 0.06, description: '+10% XP, +6% credits' },
      { level: 3, xpBonus: 0.15, creditsBonus: 0.10, description: '+15% XP, +10% credits' },
      { level: 4, xpBonus: 0.22, creditsBonus: 0.15, description: '+22% XP, +15% credits' },
      { level: 5, xpBonus: 0.30, creditsBonus: 0.20, description: '+30% XP, +20% credits' }
    ]
  }
};

/**
 * Skill Tree class managing player skill investments
 */
class SkillTree {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir] - Directory for skill data files
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/players');
    this.cache = new Map();

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get player skill data file path
   * @private
   */
  _getPlayerPath(uuid) {
    return path.join(this.dataDir, `${uuid}_skills.json`);
  }

  /**
   * Load player skill data
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
        console.error(`[SkillTree] Failed to load ${uuid}:`, e);
        data = this._createDefaultSkills(uuid);
      }
    } else {
      data = this._createDefaultSkills(uuid);
    }

    this.cache.set(uuid, data);
    return data;
  }

  /**
   * Create default skill data structure
   * @private
   */
  _createDefaultSkills(uuid) {
    return {
      uuid,
      skills: {
        patience: 0,
        keenEye: 0,
        angler: 0
      },
      totalPointsInvested: 0,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Save player skill data
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
      console.error(`[SkillTree] Failed to save ${uuid}:`, e);
    }
  }

  /**
   * Invest a skill point into a branch
   * @param {string} playerUuid - Player UUID
   * @param {string} branch - Branch ID (patience, keenEye, angler)
   * @returns {Object} Result
   */
  investPoint(playerUuid, branch) {
    const tree = SKILL_TREES[branch];
    if (!tree) {
      return { success: false, error: 'Invalid skill branch' };
    }

    const player = this._loadPlayer(playerUuid);
    const currentLevel = player.skills[branch] || 0;

    if (currentLevel >= tree.maxLevel) {
      return { success: false, error: 'Branch already maxed' };
    }

    player.skills[branch] = currentLevel + 1;
    player.totalPointsInvested++;

    this._savePlayer(playerUuid);

    return {
      success: true,
      branch,
      newLevel: player.skills[branch],
      effect: tree.effects[player.skills[branch] - 1]
    };
  }

  /**
   * Get player's current skill allocation
   * @param {string} playerUuid
   * @returns {Object} Skills with levels and total invested
   */
  getSkills(playerUuid) {
    const player = this._loadPlayer(playerUuid);
    const result = {
      skills: {},
      totalInvested: player.totalPointsInvested
    };

    for (const [branch, level] of Object.entries(player.skills)) {
      const tree = SKILL_TREES[branch];
      result.skills[branch] = {
        level,
        maxLevel: tree ? tree.maxLevel : 5,
        effect: tree && level > 0 ? tree.effects[level - 1] : null
      };
    }

    return result;
  }

  /**
   * Get the numerical effect value for a branch at a level
   * @param {string} branch - Branch ID
   * @param {number} level - Skill level (0-5)
   * @returns {Object|null} Effect values or null if invalid
   */
  getEffect(branch, level) {
    const tree = SKILL_TREES[branch];
    if (!tree || level < 0 || level > tree.maxLevel) {
      return null;
    }

    if (level === 0) {
      // Return zero effects for level 0
      return {
        level: 0,
        description: 'Not trained'
      };
    }

    return tree.effects[level - 1];
  }

  /**
   * Get all combined effects for a player
   * @param {string} playerUuid
   * @returns {Object} Combined effects from all branches
   */
  getCombinedEffects(playerUuid) {
    const skills = this.getSkills(playerUuid);
    const combined = {
      rareFishChance: 0,
      catchSpeed: 0,
      sizeBonus: 0,
      xpBonus: 0,
      creditsBonus: 0
    };

    for (const [branch, data] of Object.entries(skills.skills)) {
      if (data.level > 0) {
        const effect = this.getEffect(branch, data.level);
        if (effect) {
          for (const key of Object.keys(combined)) {
            if (effect[key] !== undefined) {
              combined[key] += effect[key];
            }
          }
        }
      }
    }

    return combined;
  }

  /**
   * Get skill tree definition
   * @param {string} branch
   * @returns {Object|null}
   */
  getTreeDefinition(branch) {
    return SKILL_TREES[branch] || null;
  }

  /**
   * Get all skill tree definitions
   * @returns {Object}
   */
  getAllTreeDefinitions() {
    return { ...SKILL_TREES };
  }

  /**
   * Reset a player's skills (refunds points)
   * @param {string} playerUuid
   * @returns {Object} Result with refunded points
   */
  resetSkills(playerUuid) {
    const player = this._loadPlayer(playerUuid);
    const refunded = player.totalPointsInvested;

    player.skills = { patience: 0, keenEye: 0, angler: 0 };
    player.totalPointsInvested = 0;

    this._savePlayer(playerUuid);

    return {
      success: true,
      refundedPoints: refunded
    };
  }

  /**
   * Clear cache for a player
   * @param {string} playerUuid
   */
  clearCache(playerUuid) {
    this.cache.delete(playerUuid);
  }
}

module.exports = { SkillTree, SKILL_TREES };
