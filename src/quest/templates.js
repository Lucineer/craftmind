/**
 * Quest Templates - Template system for generating fishing quests
 *
 * Template types:
 * - collection: catch N of a type
 * - mastery: catch above a size threshold
 * - discovery: catch new species
 * - time_limited: complete in X minutes
 * - chain: multi-step quests
 */

const { QuestType, ObjectiveType } = require('./engine');

// Template types
const TemplateType = {
  COLLECTION: 'collection',
  MASTERY: 'mastery',
  DISCOVERY: 'discovery',
  TIME_LIMITED: 'time_limited',
  CHAIN: 'chain',
  BIOME: 'biome',
  RARITY: 'rarity',
  SPECIAL: 'special'
};

// Difficulty multipliers
const DIFFICULTY_SCALE = {
  easy: { countMult: 0.5, sizeMult: 0.8, xpMult: 0.5, creditMult: 0.5 },
  medium: { countMult: 1.0, sizeMult: 1.0, xpMult: 1.0, creditMult: 1.0 },
  hard: { countMult: 1.5, sizeMult: 1.2, xpMult: 2.0, creditMult: 2.0 },
  legendary: { countMult: 2.0, sizeMult: 1.5, xpMult: 4.0, creditMult: 4.0 }
};

// Base templates
const TEMPLATES = [
  // === COLLECTION TEMPLATES ===
  {
    id: 'catch_n_fish',
    type: TemplateType.COLLECTION,
    name: 'Catch {count} {fishType}',
    description: 'Catch {count} {fishName} for the market.',
    difficulty: 'medium',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'medium'];
      const count = Math.ceil((params.baseCount || 5) * scale.countMult * (1 + playerLevel * 0.05));
      return {
        id: `catch_${count}_${params.fishType}_${Date.now()}`,
        type: QuestType.DAILY,
        title: `Catch ${count} ${params.fishName}`,
        description: `Catch ${count} ${params.fishName} for the market.`,
        games: ['fishing'],
        objectives: [{
          id: 'catch_fish',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: count,
          required: count,
          conditions: { species: params.fishType }
        }],
        rewards: {
          experience: Math.ceil(50 * scale.xpMult * count / 5),
          currency: { coins: Math.ceil(100 * scale.creditMult * count / 5) }
        },
        timeLimit: { type: 'daily_reset' },
        repeatable: true
      };
    }
  },

  {
    id: 'catch_variety',
    type: TemplateType.COLLECTION,
    name: 'Eclectic Angler',
    description: 'Catch {count} different species of fish.',
    difficulty: 'medium',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'medium'];
      const count = Math.ceil((params.baseCount || 5) * scale.countMult);
      return {
        id: `catch_variety_${count}_${Date.now()}`,
        type: QuestType.DAILY,
        title: `Eclectic Angler`,
        description: `Catch ${count} different species of fish today.`,
        games: ['fishing'],
        objectives: [{
          id: 'catch_variety',
          type: ObjectiveType.COLLECTION,
          target: 'unique_fish_species',
          count: count,
          required: count
        }],
        rewards: {
          experience: Math.ceil(75 * scale.xpMult),
          currency: { coins: Math.ceil(150 * scale.creditMult), fisher_tokens: 10 }
        },
        timeLimit: { type: 'daily_reset' },
        repeatable: true
      };
    }
  },

  {
    id: 'total_catch',
    type: TemplateType.COLLECTION,
    name: 'Daily Haul',
    description: 'Catch {count} fish total.',
    difficulty: 'easy',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'easy'];
      const count = Math.ceil((params.baseCount || 10) * scale.countMult);
      return {
        id: `daily_haul_${count}_${Date.now()}`,
        type: QuestType.DAILY,
        title: `Daily Haul`,
        description: `Catch ${count} fish today for the market.`,
        games: ['fishing'],
        objectives: [{
          id: 'catch_total',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: count,
          required: count
        }],
        rewards: {
          experience: Math.ceil(50 * scale.xpMult),
          currency: { coins: Math.ceil(100 * scale.creditMult), fisher_tokens: 5 }
        },
        timeLimit: { type: 'daily_reset' },
        repeatable: true
      };
    }
  },

  // === MASTERY TEMPLATES ===
  {
    id: 'big_catch',
    type: TemplateType.MASTERY,
    name: 'The Big One',
    description: 'Catch a fish over {size}cm.',
    difficulty: 'hard',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'hard'];
      const size = Math.ceil((params.baseSize || 50) * scale.sizeMult);
      return {
        id: `big_catch_${size}cm_${Date.now()}`,
        type: QuestType.CHALLENGE,
        title: `The Big One`,
        description: `Catch a fish over ${size}cm in length.`,
        games: ['fishing'],
        difficulty: params.difficulty || 'hard',
        objectives: [{
          id: 'catch_big',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: 1,
          required: 1,
          conditions: { minSize: size }
        }],
        rewards: {
          experience: Math.ceil(200 * scale.xpMult),
          currency: { coins: Math.ceil(500 * scale.creditMult) },
          items: [{ id: 'golden_worm', count: 3 }]
        },
        timeLimit: null,
        repeatable: true
      };
    }
  },

  {
    id: 'size_record',
    type: TemplateType.MASTERY,
    name: 'Record Breaker',
    description: 'Catch a {fishName} over {size}cm.',
    difficulty: 'hard',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'hard'];
      const size = Math.ceil((params.baseSize || 30) * scale.sizeMult);
      return {
        id: `record_${params.fishType}_${size}cm_${Date.now()}`,
        type: QuestType.CHALLENGE,
        title: `Record Breaker: ${params.fishName}`,
        description: `Catch a ${params.fishName} over ${size}cm.`,
        games: ['fishing'],
        difficulty: params.difficulty || 'hard',
        objectives: [{
          id: 'catch_record',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: 1,
          required: 1,
          conditions: { species: params.fishType, minSize: size }
        }],
        rewards: {
          experience: Math.ceil(150 * scale.xpMult),
          currency: { coins: Math.ceil(300 * scale.creditMult) },
          items: [{ id: 'trophy_fish', nbt: `{FishType:"${params.fishType}",Size:${size}}` }]
        },
        timeLimit: null,
        repeatable: true
      };
    }
  },

  // === DISCOVERY TEMPLATES ===
  {
    id: 'new_species',
    type: TemplateType.DISCOVERY,
    name: 'Species Hunter',
    description: 'Discover {count} new fish species.',
    difficulty: 'medium',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'medium'];
      const count = Math.ceil((params.baseCount || 1) * scale.countMult);
      return {
        id: `species_hunter_${count}_${Date.now()}`,
        type: QuestType.DISCOVERY,
        title: `Species Hunter`,
        description: `Discover ${count} new fish species you haven't caught before.`,
        games: ['fishing'],
        objectives: [{
          id: 'discover_species',
          type: ObjectiveType.ACTION,
          target: 'discover_fish',
          count: count,
          required: count
        }],
        rewards: {
          experience: Math.ceil(100 * scale.xpMult * count),
          currency: { coins: Math.ceil(200 * scale.creditMult * count), fisher_tokens: 15 }
        },
        timeLimit: null,
        repeatable: true
      };
    }
  },

  {
    id: 'first_legendary',
    type: TemplateType.DISCOVERY,
    name: 'Legendary Quest',
    description: 'Catch your first legendary fish.',
    difficulty: 'legendary',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE.legendary;
      return {
        id: `first_legendary_${Date.now()}`,
        type: QuestType.MAIN_STORY,
        title: `Legendary Quest`,
        description: `Catch a legendary fish. These rare creatures only appear under special conditions.`,
        games: ['fishing'],
        difficulty: 'legendary',
        objectives: [{
          id: 'catch_legendary',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: 1,
          required: 1,
          conditions: { rarity: 'legendary' }
        }],
        rewards: {
          experience: 1000 * scale.xpMult,
          currency: { coins: 2000 * scale.creditMult },
          items: [{ id: 'legendary_rod_upgrade', count: 1 }],
          titles: ['Legendary Hunter']
        },
        timeLimit: null,
        repeatable: false
      };
    }
  },

  // === TIME LIMITED TEMPLATES ===
  {
    id: 'speed_fishing',
    type: TemplateType.TIME_LIMITED,
    name: 'Speed Fisher',
    description: 'Catch {count} fish in {minutes} minutes.',
    difficulty: 'hard',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'hard'];
      const count = Math.ceil((params.baseCount || 10) * scale.countMult);
      const minutes = params.minutes || 10;
      return {
        id: `speed_fishing_${count}_${minutes}m_${Date.now()}`,
        type: QuestType.CHALLENGE,
        title: `Speed Fisher`,
        description: `Catch ${count} fish in under ${minutes} minutes.`,
        games: ['fishing'],
        difficulty: params.difficulty || 'hard',
        objectives: [{
          id: 'speed_catch',
          type: ObjectiveType.TIMED,
          target: 'catch_fish',
          count: count,
          required: count,
          timeLimit: minutes * 60
        }],
        rewards: {
          experience: Math.ceil(300 * scale.xpMult),
          currency: { coins: Math.ceil(600 * scale.creditMult) },
          items: [{ id: 'speed_fisher_badge', count: 1 }]
        },
        timeLimit: { type: 'duration', value: minutes * 60 },
        repeatable: true
      };
    }
  },

  // === BIOME TEMPLATES ===
  {
    id: 'biome_master',
    type: TemplateType.BIOME,
    name: '{biomeName} Master',
    description: 'Catch {count} fish in {biomeName}.',
    difficulty: 'medium',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'medium'];
      const count = Math.ceil((params.baseCount || 5) * scale.countMult);
      return {
        id: `${params.biomeId}_master_${count}_${Date.now()}`,
        type: QuestType.DAILY,
        title: `${params.biomeName} Master`,
        description: `Catch ${count} fish in ${params.biomeName}.`,
        games: ['fishing'],
        objectives: [{
          id: 'biome_catch',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: count,
          required: count,
          conditions: { biome: params.biomeId }
        }],
        rewards: {
          experience: Math.ceil(75 * scale.xpMult),
          currency: { coins: Math.ceil(150 * scale.creditMult) }
        },
        timeLimit: { type: 'daily_reset' },
        repeatable: true
      };
    }
  },

  {
    id: 'biome_explorer',
    type: TemplateType.BIOME,
    name: 'Biome Explorer',
    description: 'Catch fish in {count} different biomes.',
    difficulty: 'medium',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'medium'];
      const count = Math.ceil((params.baseCount || 3) * scale.countMult);
      return {
        id: `biome_explorer_${count}_${Date.now()}`,
        type: QuestType.DISCOVERY,
        title: `Biome Explorer`,
        description: `Catch at least one fish in ${count} different biomes.`,
        games: ['fishing'],
        objectives: [{
          id: 'explore_biomes',
          type: ObjectiveType.COLLECTION,
          target: 'unique_biomes',
          count: count,
          required: count
        }],
        rewards: {
          experience: Math.ceil(100 * scale.xpMult),
          currency: { coins: Math.ceil(200 * scale.creditMult) },
          items: [{ id: 'explorer_compass', count: 1 }]
        },
        timeLimit: { type: 'daily_reset' },
        repeatable: true
      };
    }
  },

  // === RARITY TEMPLATES ===
  {
    id: 'rare_hunter',
    type: TemplateType.RARITY,
    name: 'Rare Hunter',
    description: 'Catch {count} rare fish.',
    difficulty: 'medium',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'medium'];
      const count = Math.ceil((params.baseCount || 1) * scale.countMult);
      return {
        id: `rare_hunter_${count}_${Date.now()}`,
        type: QuestType.DAILY,
        title: `Rare Hunter`,
        description: `Catch ${count} rare (or better) fish.`,
        games: ['fishing'],
        objectives: [{
          id: 'catch_rare',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: count,
          required: count,
          conditions: { minRarity: 'rare' }
        }],
        rewards: {
          experience: Math.ceil(150 * scale.xpMult * count),
          currency: { coins: Math.ceil(300 * scale.creditMult * count), fisher_tokens: 10 }
        },
        timeLimit: { type: 'daily_reset' },
        repeatable: true
      };
    }
  },

  {
    id: 'epic_quest',
    type: TemplateType.RARITY,
    name: 'Epic Pursuit',
    description: 'Catch an epic fish.',
    difficulty: 'hard',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE.hard;
      return {
        id: `epic_pursuit_${Date.now()}`,
        type: QuestType.CHALLENGE,
        title: `Epic Pursuit`,
        description: `Catch an epic rarity fish. These are very rare and valuable!`,
        games: ['fishing'],
        difficulty: 'hard',
        objectives: [{
          id: 'catch_epic',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: 1,
          required: 1,
          conditions: { rarity: 'epic' }
        }],
        rewards: {
          experience: 500 * scale.xpMult,
          currency: { coins: 1000 * scale.creditMult },
          items: [{ id: 'epic_trophy', count: 1 }],
          titles: ['Epic Angler']
        },
        timeLimit: null,
        repeatable: true
      };
    }
  },

  // === CHAIN TEMPLATES ===
  {
    id: 'fishing_career',
    type: TemplateType.CHAIN,
    name: 'Fishing Career',
    description: 'Complete your fishing training.',
    difficulty: 'easy',
    generator: (params, playerLevel) => {
      return {
        id: `fishing_career_${Date.now()}`,
        type: QuestType.MAIN_STORY,
        title: `Fishing Career`,
        description: `Complete your training as a professional angler.`,
        games: ['fishing'],
        chapter: 1,
        order: 1,
        objectives: [
          {
            id: 'catch_first',
            type: ObjectiveType.ACTION,
            target: 'catch_fish',
            count: 1,
            required: 1,
            description: 'Catch your first fish'
          },
          {
            id: 'catch_10',
            type: ObjectiveType.ACTION,
            target: 'catch_fish',
            count: 10,
            required: 10,
            description: 'Catch 10 fish total'
          },
          {
            id: 'buy_rod',
            type: ObjectiveType.ACTION,
            target: 'buy_item',
            count: 1,
            required: 1,
            conditions: { itemType: 'fishing_rod' },
            description: 'Purchase a fishing rod from the shop'
          }
        ],
        rewards: {
          experience: 200,
          currency: { coins: 100 },
          items: [{ id: 'fishing_rod', nbt: '{Enchantments:[{id:lure,lvl:1}]}' }],
          unlocks: ['fishing_lesson_2']
        },
        timeLimit: null,
        repeatable: false
      };
    }
  },

  {
    id: 'master_chain',
    type: TemplateType.CHAIN,
    name: 'Path to Mastery',
    description: 'Prove yourself as a master angler.',
    difficulty: 'hard',
    generator: (params, playerLevel) => {
      return {
        id: `master_chain_${Date.now()}`,
        type: QuestType.MAIN_STORY,
        title: `Path to Mastery`,
        description: `Complete the trials to become a Master Angler.`,
        games: ['fishing'],
        chapter: 3,
        order: 1,
        objectives: [
          {
            id: 'catch_100',
            type: ObjectiveType.ACTION,
            target: 'catch_fish',
            count: 100,
            required: 100,
            description: 'Catch 100 fish total'
          },
          {
            id: 'species_25',
            type: ObjectiveType.COLLECTION,
            target: 'unique_fish_species',
            count: 25,
            required: 25,
            description: 'Discover 25 different species'
          },
          {
            id: 'catch_rare',
            type: ObjectiveType.ACTION,
            target: 'catch_fish',
            count: 5,
            required: 5,
            conditions: { minRarity: 'rare' },
            description: 'Catch 5 rare fish'
          },
          {
            id: 'big_fish',
            type: ObjectiveType.ACTION,
            target: 'catch_fish',
            count: 1,
            required: 1,
            conditions: { minSize: 100 },
            description: 'Catch a fish over 100cm'
          }
        ],
        rewards: {
          experience: 2000,
          currency: { coins: 5000, fisher_tokens: 100 },
          items: [{ id: 'diamond_fishing_rod', count: 1 }],
          titles: ['Master Angler']
        },
        timeLimit: null,
        repeatable: false,
        prerequisites: ['fishing_career', 'fishing_lesson_2']
      };
    }
  },

  // === SPECIAL TEMPLATES ===
  {
    id: 'night_fishing',
    type: TemplateType.SPECIAL,
    name: 'Night Owl',
    description: 'Catch {count} fish at night.',
    difficulty: 'medium',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'medium'];
      const count = Math.ceil((params.baseCount || 5) * scale.countMult);
      return {
        id: `night_owl_${count}_${Date.now()}`,
        type: QuestType.DAILY,
        title: `Night Owl`,
        description: `Catch ${count} fish during nighttime (after sunset).`,
        games: ['fishing'],
        objectives: [{
          id: 'night_catch',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: count,
          required: count,
          conditions: { timeOfDay: 'night' }
        }],
        rewards: {
          experience: Math.ceil(100 * scale.xpMult),
          currency: { coins: Math.ceil(200 * scale.creditMult) },
          items: [{ id: 'night_vision_potion', count: 1 }]
        },
        timeLimit: { type: 'daily_reset' },
        repeatable: true
      };
    }
  },

  {
    id: 'rain_fisher',
    type: TemplateType.SPECIAL,
    name: 'Storm Chaser',
    description: 'Catch {count} fish during rain.',
    difficulty: 'medium',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE[params.difficulty || 'medium'];
      const count = Math.ceil((params.baseCount || 3) * scale.countMult);
      return {
        id: `storm_chaser_${count}_${Date.now()}`,
        type: QuestType.DAILY,
        title: `Storm Chaser`,
        description: `Catch ${count} fish during rain or thunderstorms.`,
        games: ['fishing'],
        objectives: [{
          id: 'rain_catch',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: count,
          required: count,
          conditions: { weather: ['rain', 'thunder'] }
        }],
        rewards: {
          experience: Math.ceil(125 * scale.xpMult),
          currency: { coins: Math.ceil(250 * scale.creditMult) },
          items: [{ id: 'storm_rod_skin', count: 1 }]
        },
        timeLimit: { type: 'daily_reset' },
        repeatable: true
      };
    }
  },

  {
    id: 'session_marathon',
    type: TemplateType.SPECIAL,
    name: 'Fishing Marathon',
    description: 'Catch {count} fish in one session.',
    difficulty: 'hard',
    generator: (params, playerLevel) => {
      const scale = DIFFICULTY_SCALE.hard;
      const count = Math.ceil((params.baseCount || 20) * scale.countMult);
      return {
        id: `fishing_marathon_${count}_${Date.now()}`,
        type: QuestType.CHALLENGE,
        title: `Fishing Marathon`,
        description: `Catch ${count} fish in a single fishing session.`,
        games: ['fishing'],
        difficulty: 'hard',
        objectives: [{
          id: 'marathon_catch',
          type: ObjectiveType.ACTION,
          target: 'catch_fish',
          count: count,
          required: count
        }],
        rewards: {
          experience: Math.ceil(500 * scale.xpMult),
          currency: { coins: Math.ceil(1000 * scale.creditMult) },
          items: [{ id: 'energy_potion', count: 2 }],
          titles: ['Marathon Angler']
        },
        timeLimit: { type: 'duration', value: 3600 }, // 1 hour
        repeatable: true
      };
    }
  }
];

class QuestTemplates {
  constructor() {
    this.templates = new Map();
    this.loadTemplates();
  }

  /**
   * Load all templates
   */
  loadTemplates() {
    for (const template of TEMPLATES) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @returns {Object|null} Template
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get templates by type
   * @param {string} type - Template type
   * @returns {Array} Templates
   */
  getTemplatesByType(type) {
    return Array.from(this.templates.values()).filter(t => t.type === type);
  }

  /**
   * Generate a quest from a template
   * @param {string} templateId - Template ID
   * @param {Object} params - Template parameters
   * @param {number} playerLevel - Player level for scaling
   * @returns {Object|null} Generated quest
   */
  generate(templateId, params = {}, playerLevel = 1) {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    return template.generator(params, playerLevel);
  }

  /**
   * Generate daily quests for a player
   * @param {string} playerUuid - Player UUID
   * @param {Object} playerStats - Player statistics for scaling
   * @returns {Array} Generated daily quests
   */
  generateDaily(playerUuid, playerStats = {}) {
    const playerLevel = playerStats.level || 1;
    const speciesDiscovered = playerStats.speciesDiscovered || 0;
    const totalCaught = playerStats.totalCaught || 0;

    const dailyQuests = [];

    // Always include a "daily haul" quest
    const haulQuest = this.generate('total_catch', {
      difficulty: totalCaught > 500 ? 'medium' : 'easy',
      baseCount: Math.min(10 + Math.floor(playerLevel / 5), 30)
    }, playerLevel);
    if (haulQuest) {
      haulQuest.id = `daily_${playerUuid}_haul_${new Date().toISOString().split('T')[0]}`;
      dailyQuests.push(haulQuest);
    }

    // Add a variety quest
    const varietyQuest = this.generate('catch_variety', {
      difficulty: speciesDiscovered > 20 ? 'medium' : 'easy',
      baseCount: Math.min(3 + Math.floor(playerLevel / 10), 8)
    }, playerLevel);
    if (varietyQuest) {
      varietyQuest.id = `daily_${playerUuid}_variety_${new Date().toISOString().split('T')[0]}`;
      dailyQuests.push(varietyQuest);
    }

    // Add a biome-specific or special quest
    const biomeOptions = [
      { biomeId: 'ocean', biomeName: 'Ocean', baseCount: 5 },
      { biomeId: 'river', biomeName: 'River', baseCount: 5 },
      { biomeId: 'deep_ocean', biomeName: 'Deep Ocean', baseCount: 3 }
    ];

    const randomBiome = biomeOptions[Math.floor(Math.random() * biomeOptions.length)];
    const biomeQuest = this.generate('biome_master', randomBiome, playerLevel);
    if (biomeQuest) {
      biomeQuest.id = `daily_${playerUuid}_biome_${new Date().toISOString().split('T')[0]}`;
      dailyQuests.push(biomeQuest);
    }

    return dailyQuests;
  }

  /**
   * Generate a challenge quest based on player progress
   * @param {Object} playerStats - Player statistics
   * @returns {Object|null} Generated challenge quest
   */
  generateChallenge(playerStats = {}) {
    const challenges = ['big_catch', 'speed_fishing', 'rare_hunter', 'epic_quest'];
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];

    const params = {};
    if (randomChallenge === 'big_catch') {
      params.baseSize = 50 + Math.floor((playerStats.level || 1) * 5);
      params.difficulty = playerStats.level > 30 ? 'hard' : 'medium';
    } else if (randomChallenge === 'speed_fishing') {
      params.baseCount = 10 + Math.floor((playerStats.level || 1) / 5);
      params.minutes = 10;
      params.difficulty = 'hard';
    }

    return this.generate(randomChallenge, params, playerStats.level || 1);
  }

  /**
   * Generate all templates for a specific type
   * @param {string} type - Template type
   * @param {Object} params - Default parameters
   * @param {number} playerLevel - Player level
   * @returns {Array} Generated quests
   */
  generateAllOfType(type, params = {}, playerLevel = 1) {
    const templates = this.getTemplatesByType(type);
    return templates.map(t => t.generator(params, playerLevel)).filter(q => q);
  }

  /**
   * Get all available template IDs
   * @returns {Array} Template IDs
   */
  getAllTemplateIds() {
    return Array.from(this.templates.keys());
  }

  /**
   * Get all templates
   * @returns {Array} All templates
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }
}

module.exports = {
  QuestTemplates,
  TemplateType,
  DIFFICULTY_SCALE,
  TEMPLATES
};
