/**
 * Title System - Earnable player titles
 *
 * Players earn titles through achievements:
 * - Level milestones
 * - Catch achievements
 * - Collection progress
 * - Special events
 *
 * @module progression/titles
 */

const fs = require('fs');
const path = require('path');

/**
 * Title definitions with earn conditions
 */
const TITLE_DEFINITIONS = {
  // Level-based titles
  first_cast: {
    id: 'first_cast',
    name: 'First Cast',
    description: 'Caught your first fish',
    category: 'milestone',
    rarity: 'common',
    condition: { type: 'catch_fish', count: 1 }
  },
  apprentice_angler: {
    id: 'apprentice_angler',
    name: 'Apprentice Angler',
    description: 'Reached level 5',
    category: 'level',
    rarity: 'common',
    condition: { type: 'level', level: 5 }
  },
  journeyman_angler: {
    id: 'journeyman_angler',
    name: 'Journeyman Angler',
    description: 'Reached level 10',
    category: 'level',
    rarity: 'uncommon',
    condition: { type: 'level', level: 10 }
  },
  expert_fisher: {
    id: 'expert_fisher',
    name: 'Expert Fisher',
    description: 'Reached level 20',
    category: 'level',
    rarity: 'rare',
    condition: { type: 'level', level: 20 }
  },
  master_angler: {
    id: 'master_angler',
    name: 'Master Angler',
    description: 'Reached level 50',
    category: 'level',
    rarity: 'epic',
    condition: { type: 'level', level: 50 }
  },
  legendary_angler: {
    id: 'legendary_angler',
    name: 'Legendary Angler',
    description: 'Reached level 75',
    category: 'level',
    rarity: 'legendary',
    condition: { type: 'level', level: 75 }
  },
  mythic_angler: {
    id: 'mythic_angler',
    name: 'Mythic Angler',
    description: 'Reached level 100',
    category: 'level',
    rarity: 'mythic',
    condition: { type: 'level', level: 100 }
  },

  // Catch-based titles
  prolific_fisher: {
    id: 'prolific_fisher',
    name: 'Prolific Fisher',
    description: 'Caught 100 fish',
    category: 'catch',
    rarity: 'common',
    condition: { type: 'catch_fish', count: 100 }
  },
  fish_hoarder: {
    id: 'fish_hoarder',
    name: 'Fish Hoarder',
    description: 'Caught 500 fish',
    category: 'catch',
    rarity: 'uncommon',
    condition: { type: 'catch_fish', count: 500 }
  },
  thousand_catches: {
    id: 'thousand_catches',
    name: 'Thousand Catches',
    description: 'Caught 1,000 fish',
    category: 'catch',
    rarity: 'rare',
    condition: { type: 'catch_fish', count: 1000 }
  },
  fish_legend: {
    id: 'fish_legend',
    name: 'Fish Legend',
    description: 'Caught 5,000 fish',
    category: 'catch',
    rarity: 'legendary',
    condition: { type: 'catch_fish', count: 5000 }
  },

  // Rarity-based titles
  rare_catch: {
    id: 'rare_catch',
    name: 'Rare Catch',
    description: 'Caught a rare fish',
    category: 'rarity',
    rarity: 'uncommon',
    condition: { type: 'catch_rarity', rarity: 'rare', count: 1 }
  },
  epic_discovery: {
    id: 'epic_discovery',
    name: 'Epic Discovery',
    description: 'Caught an epic fish',
    category: 'rarity',
    rarity: 'epic',
    condition: { type: 'catch_rarity', rarity: 'epic', count: 1 }
  },
  legendary_hunter: {
    id: 'legendary_hunter',
    name: 'Legendary Hunter',
    description: 'Caught a legendary fish',
    category: 'rarity',
    rarity: 'legendary',
    condition: { type: 'catch_rarity', rarity: 'legendary', count: 1 }
  },
  mythic_seeker: {
    id: 'mythic_seeker',
    name: 'Mythic Seeker',
    description: 'Caught a mythic fish',
    category: 'rarity',
    rarity: 'mythic',
    condition: { type: 'catch_rarity', rarity: 'mythic', count: 1 }
  },

  // Collection titles
  collector: {
    id: 'collector',
    name: 'Collector',
    description: 'Discovered 10 fish species',
    category: 'collection',
    rarity: 'common',
    condition: { type: 'species_discovered', count: 10 }
  },
  encyclopedia: {
    id: 'encyclopedia',
    name: 'Encyclopedia',
    description: 'Discovered 25 fish species',
    category: 'collection',
    rarity: 'rare',
    condition: { type: 'species_discovered', count: 25 }
  },
  marine_biologist: {
    id: 'marine_biologist',
    name: 'Marine Biologist',
    description: 'Discovered 50 fish species',
    category: 'collection',
    rarity: 'legendary',
    condition: { type: 'species_discovered', count: 50 }
  },

  // Special titles
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Caught 50 fish at night',
    category: 'special',
    rarity: 'uncommon',
    condition: { type: 'time_catch', time: 'night', count: 50 }
  },
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Caught 50 fish at dawn',
    category: 'special',
    rarity: 'uncommon',
    condition: { type: 'time_catch', time: 'dawn', count: 50 }
  },
  rain_fisher: {
    id: 'rain_fisher',
    name: 'Rain Fisher',
    description: 'Caught 25 fish in rain',
    category: 'special',
    rarity: 'rare',
    condition: { type: 'weather_catch', weather: 'rain', count: 25 }
  },
  storm_chaser: {
    id: 'storm_chaser',
    name: 'Storm Chaser',
    description: 'Caught 10 fish in thunderstorm',
    category: 'special',
    rarity: 'epic',
    condition: { type: 'weather_catch', weather: 'thunder', count: 10 }
  },

  // Quest titles
  quest_completionist: {
    id: 'quest_completionist',
    name: 'Quest Completionist',
    description: 'Completed 25 quests',
    category: 'quest',
    rarity: 'uncommon',
    condition: { type: 'quests_completed', count: 25 }
  },
  quest_master: {
    id: 'quest_master',
    name: 'Quest Master',
    description: 'Completed 100 quests',
    category: 'quest',
    rarity: 'legendary',
    condition: { type: 'quests_completed', count: 100 }
  },

  // Streak titles
  dedicated: {
    id: 'dedicated',
    name: 'Dedicated',
    description: '7-day fishing streak',
    category: 'streak',
    rarity: 'uncommon',
    condition: { type: 'streak', days: 7 }
  },
  devoted: {
    id: 'devoted',
    name: 'Devoted',
    description: '30-day fishing streak',
    category: 'streak',
    rarity: 'rare',
    condition: { type: 'streak', days: 30 }
  },
  unwavering: {
    id: 'unwavering',
    name: 'Unwavering',
    description: '100-day fishing streak',
    category: 'streak',
    rarity: 'legendary',
    condition: { type: 'streak', days: 100 }
  }
};

// Rarity display colors (for chat formatting)
const RARITY_COLORS = {
  common: '§f',
  uncommon: '§a',
  rare: '§b',
  epic: '§d',
  legendary: '§6',
  mythic: '§5'
};

const RARITY_BRACKETS = {
  common: ['[', ']'],
  uncommon: ['[', ']'],
  rare: ['【', '】'],
  epic: ['✦', '✦'],
  legendary: ['★', '★'],
  mythic: ['✧', '✧']
};

/**
 * Title System class
 */
class TitleSystem {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir] - Directory for title data
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/players');
    this.cache = new Map();

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get player title data file path
   * @private
   */
  _getPlayerPath(uuid) {
    return path.join(this.dataDir, `${uuid}_titles.json`);
  }

  /**
   * Load player title data
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
        console.error(`[TitleSystem] Failed to load ${uuid}:`, e);
        data = this._createDefaultTitles(uuid);
      }
    } else {
      data = this._createDefaultTitles(uuid);
    }

    this.cache.set(uuid, data);
    return data;
  }

  /**
   * Create default title data
   * @private
   */
  _createDefaultTitles(uuid) {
    return {
      uuid,
      earnedTitles: [],
      activeTitle: null,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Save player title data
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
      console.error(`[TitleSystem] Failed to save ${uuid}:`, e);
    }
  }

  /**
   * Award a title to a player
   * @param {string} playerUuid
   * @param {string} titleId
   * @returns {Object} Result
   */
  awardTitle(playerUuid, titleId) {
    const titleDef = TITLE_DEFINITIONS[titleId];
    if (!titleDef) {
      return { success: false, error: 'Invalid title' };
    }

    const player = this._loadPlayer(playerUuid);
    if (player.earnedTitles.includes(titleId)) {
      return { success: false, error: 'Already earned' };
    }

    player.earnedTitles.push(titleId);

    // Auto-set as active if first title
    if (!player.activeTitle) {
      player.activeTitle = titleId;
    }

    this._savePlayer(playerUuid);

    return {
      success: true,
      title: titleDef,
      isFirstTitle: player.earnedTitles.length === 1
    };
  }

  /**
   * Check and award titles based on stats
   * @param {string} playerUuid
   * @param {Object} stats - Player stats to check against
   * @returns {Array} Newly earned titles
   */
  checkAndAward(playerUuid, stats) {
    const newTitles = [];

    for (const [titleId, titleDef] of Object.entries(TITLE_DEFINITIONS)) {
      if (this._meetsCondition(titleDef.condition, stats)) {
        const result = this.awardTitle(playerUuid, titleId);
        if (result.success) {
          newTitles.push(result.title);
        }
      }
    }

    return newTitles;
  }

  /**
   * Check if stats meet a title condition
   * @private
   */
  _meetsCondition(condition, stats) {
    switch (condition.type) {
      case 'level':
        return stats.level >= condition.level;

      case 'catch_fish':
        return stats.totalFish >= condition.count;

      case 'catch_rarity':
        return (stats.rarityCounts?.[condition.rarity] || 0) >= condition.count;

      case 'species_discovered':
        return stats.speciesDiscovered >= condition.count;

      case 'quests_completed':
        return stats.questsCompleted >= condition.count;

      case 'streak':
        return stats.currentStreak >= condition.days;

      case 'time_catch':
        return (stats.timeCatches?.[condition.time] || 0) >= condition.count;

      case 'weather_catch':
        return (stats.weatherCatches?.[condition.weather] || 0) >= condition.count;

      default:
        return false;
    }
  }

  /**
   * Set player's active title
   * @param {string} playerUuid
   * @param {string} titleId
   * @returns {Object} Result
   */
  setTitle(playerUuid, titleId) {
    const player = this._loadPlayer(playerUuid);

    if (titleId && !player.earnedTitles.includes(titleId)) {
      return { success: false, error: 'Title not earned' };
    }

    player.activeTitle = titleId || null;
    this._savePlayer(playerUuid);

    return {
      success: true,
      activeTitle: titleId ? TITLE_DEFINITIONS[titleId] : null
    };
  }

  /**
   * Get formatted title display for a player
   * @param {string} playerUuid
   * @param {string} playerName - Player's display name
   * @returns {string} Formatted: "[Title] PlayerName"
   */
  getTitleDisplay(playerUuid, playerName) {
    const player = this._loadPlayer(playerUuid);

    if (!player.activeTitle) {
      return playerName;
    }

    const titleDef = TITLE_DEFINITIONS[player.activeTitle];
    if (!titleDef) {
      return playerName;
    }

    const color = RARITY_COLORS[titleDef.rarity] || '§f';
    const brackets = RARITY_BRACKETS[titleDef.rarity] || ['[', ']'];

    return `${color}${brackets[0]}${titleDef.name}${brackets[1]}§r ${playerName}`;
  }

  /**
   * Get all earned titles for a player
   * @param {string} playerUuid
   * @returns {Object}
   */
  getEarnedTitles(playerUuid) {
    const player = this._loadPlayer(playerUuid);
    const titles = player.earnedTitles.map(id => TITLE_DEFINITIONS[id]).filter(Boolean);

    return {
      titles,
      count: titles.length,
      activeTitle: player.activeTitle ? TITLE_DEFINITIONS[player.activeTitle] : null
    };
  }

  /**
   * Get title definition
   * @param {string} titleId
   * @returns {Object|null}
   */
  getTitle(titleId) {
    return TITLE_DEFINITIONS[titleId] || null;
  }

  /**
   * Get all title definitions
   * @returns {Object}
   */
  getAllTitles() {
    return { ...TITLE_DEFINITIONS };
  }

  /**
   * Get titles by category
   * @param {string} category
   * @returns {Array}
   */
  getTitlesByCategory(category) {
    return Object.values(TITLE_DEFINITIONS).filter(t => t.category === category);
  }

  /**
   * Clear cache for a player
   * @param {string} playerUuid
   */
  clearCache(playerUuid) {
    this.cache.delete(playerUuid);
  }
}

module.exports = { TitleSystem, TITLE_DEFINITIONS, RARITY_COLORS, RARITY_BRACKETS };
