/**
 * Milestone Tracker - Achievement milestones for fish collection
 *
 * Tracks major achievements in the fishing game:
 * - First Catch, Species counts, Rare finds, Master achievements
 * - Rewards: credits, titles, cosmetic items
 */

const fs = require('fs');
const path = require('path');

// Define all milestones
const MILESTONES = [
  // First catches
  {
    id: 'first_catch',
    name: 'First Catch',
    description: 'Catch your first fish',
    type: 'first',
    icon: '🎣',
    check: (stats) => stats.totalCaught >= 1,
    rewards: { credits: 50, xp: 100, items: [], titles: [] }
  },
  {
    id: 'first_rare',
    name: 'Rare Find',
    description: 'Catch your first rare fish',
    type: 'rarity',
    icon: '💎',
    check: (stats) => stats.rareCaught >= 1,
    rewards: { credits: 200, xp: 500, items: ['golden_worm'], titles: [] }
  },
  {
    id: 'first_epic',
    name: 'Epic Discovery',
    description: 'Catch your first epic fish',
    type: 'rarity',
    icon: '💜',
    check: (stats) => stats.epicCaught >= 1,
    rewards: { credits: 500, xp: 1000, items: ['diamond_fishing_rod'], titles: ['Epic Angler'] }
  },
  {
    id: 'first_legendary',
    name: 'Legendary Hunter',
    description: 'Catch your first legendary fish',
    type: 'rarity',
    icon: '✨',
    check: (stats) => stats.legendaryCaught >= 1,
    rewards: { credits: 2000, xp: 5000, items: ['enchanted_book_luck_3'], titles: ['Legendary Hunter'] }
  },

  // Species discovery milestones
  {
    id: 'species_10',
    name: 'Beginner Angler',
    description: 'Discover 10 different species',
    type: 'collection',
    icon: '📚',
    check: (stats) => stats.speciesDiscovered >= 10,
    rewards: { credits: 100, xp: 250, items: ['bamboo_fishing_rod'], titles: [] }
  },
  {
    id: 'species_25',
    name: 'Hobbyist Collector',
    description: 'Discover 25 different species',
    type: 'collection',
    icon: '📖',
    check: (stats) => stats.speciesDiscovered >= 25,
    rewards: { credits: 300, xp: 750, items: ['iron_fishing_rod'], titles: ['Hobbyist'] }
  },
  {
    id: 'species_50',
    name: 'Expert Naturalist',
    description: 'Discover 50 different species',
    type: 'collection',
    icon: '🔬',
    check: (stats) => stats.speciesDiscovered >= 50,
    rewards: { credits: 750, xp: 2000, items: ['treasure_hunter_book'], titles: ['Expert Angler'] }
  },
  {
    id: 'species_75',
    name: 'Master Collector',
    description: 'Discover 75 different species',
    type: 'collection',
    icon: '🏆',
    check: (stats) => stats.speciesDiscovered >= 75,
    rewards: { credits: 1500, xp: 4000, items: ['diamond_fishing_rod'], titles: ['Master Angler'] }
  },
  {
    id: 'species_100',
    name: 'Grandmaster',
    description: 'Discover 100 different species',
    type: 'collection',
    icon: '👑',
    check: (stats) => stats.speciesDiscovered >= 100,
    rewards: { credits: 3000, xp: 8000, items: ['legendary_rod_skin'], titles: ['Grandmaster Angler'] }
  },
  {
    id: 'species_all',
    name: 'Complete Encyclopedia',
    description: 'Discover all fish species',
    type: 'collection',
    icon: '🌟',
    check: (stats) => stats.speciesDiscovered >= stats.totalSpecies,
    rewards: { credits: 10000, xp: 25000, items: ['golden_rod_skin', 'encyclopedia_badge'], titles: ['Encyclopedia Master'] }
  },

  // Mastery milestones (catching 10+ of a species)
  {
    id: 'mastery_first',
    name: 'Species Expert',
    description: 'Master your first species (catch 10)',
    type: 'mastery',
    icon: '🎯',
    check: (stats) => stats.speciesMastered >= 1,
    rewards: { credits: 200, xp: 500, items: [], titles: [] }
  },
  {
    id: 'mastery_10',
    name: 'Prolific Angler',
    description: 'Master 10 different species',
    type: 'mastery',
    icon: '🎖️',
    check: (stats) => stats.speciesMastered >= 10,
    rewards: { credits: 1000, xp: 2500, items: ['master_bait_kit'], titles: ['Prolific Angler'] }
  },
  {
    id: 'mastery_25',
    name: 'True Master',
    description: 'Master 25 different species',
    type: 'mastery',
    icon: '🏅',
    check: (stats) => stats.speciesMastered >= 25,
    rewards: { credits: 2500, xp: 6000, items: ['netherite_fishing_rod'], titles: ['True Master'] }
  },

  // Biome-specific milestones
  {
    id: 'ocean_explorer',
    name: 'Ocean Explorer',
    description: 'Catch 10 different ocean species',
    type: 'biome',
    icon: '🌊',
    check: (stats) => stats.biomeSpecies?.ocean >= 10,
    rewards: { credits: 300, xp: 750, items: ['ocean_rod_skin'], titles: ['Ocean Explorer'] }
  },
  {
    id: 'river_master',
    name: 'River Master',
    description: 'Catch 10 different river species',
    type: 'biome',
    icon: '🏞️',
    check: (stats) => stats.biomeSpecies?.river >= 10,
    rewards: { credits: 300, xp: 750, items: ['river_rod_skin'], titles: ['River Master'] }
  },
  {
    id: 'nether_fisher',
    name: 'Lava Fisher',
    description: 'Catch your first fish from lava',
    type: 'biome',
    icon: '🔥',
    check: (stats) => stats.biomeSpecies?.nether_lava >= 1,
    rewards: { credits: 500, xp: 1500, items: ['fire_resistance_potion'], titles: ['Lava Fisher'] }
  },
  {
    id: 'end_fisher',
    name: 'Void Fisher',
    description: 'Catch your first fish from the End',
    type: 'biome',
    icon: '🌌',
    check: (stats) => stats.biomeSpecies?.end_void >= 1,
    rewards: { credits: 500, xp: 1500, items: ['void_pearl'], titles: ['Void Fisher'] }
  },

  // Size records
  {
    id: 'big_catch',
    name: 'Big Catch',
    description: 'Catch a fish over 100cm',
    type: 'size',
    icon: '🐋',
    check: (stats) => stats.largestCatch >= 100,
    rewards: { credits: 200, xp: 500, items: [], titles: [] }
  },
  {
    id: 'monster_hunter',
    name: 'Monster Hunter',
    description: 'Catch a fish over 200cm',
    type: 'size',
    icon: '🦈',
    check: (stats) => stats.largestCatch >= 200,
    rewards: { credits: 500, xp: 1500, items: ['monster_trophy'], titles: ['Monster Hunter'] }
  },
  {
    id: 'leviathan_slayer',
    name: 'Leviathan Slayer',
    description: 'Catch a fish over 300cm',
    type: 'size',
    icon: '🐉',
    check: (stats) => stats.largestCatch >= 300,
    rewards: { credits: 2000, xp: 5000, items: ['leviathan_trophy'], titles: ['Leviathan Slayer'] }
  },

  // Total catch milestones
  {
    id: 'catches_100',
    name: 'Century Club',
    description: 'Catch 100 fish total',
    type: 'total',
    icon: '💯',
    check: (stats) => stats.totalCaught >= 100,
    rewards: { credits: 250, xp: 600, items: [], titles: [] }
  },
  {
    id: 'catches_500',
    name: 'Half Thousand',
    description: 'Catch 500 fish total',
    type: 'total',
    icon: '🔥',
    check: (stats) => stats.totalCaught >= 500,
    rewards: { credits: 750, xp: 2000, items: ['lure_2_book'], titles: ['Dedicated Angler'] }
  },
  {
    id: 'catches_1000',
    name: 'Millennium Fisher',
    description: 'Catch 1000 fish total',
    type: 'total',
    icon: '⭐',
    check: (stats) => stats.totalCaught >= 1000,
    rewards: { credits: 2000, xp: 5000, items: ['diamond_fishing_rod', 'lure_3_book'], titles: ['Millennium Fisher'] }
  },
  {
    id: 'catches_5000',
    name: 'Fish Whisperer',
    description: 'Catch 5000 fish total',
    type: 'total',
    icon: '🌟',
    check: (stats) => stats.totalCaught >= 5000,
    rewards: { credits: 5000, xp: 15000, items: ['netherite_fishing_rod', 'auto_reel_enchant'], titles: ['Fish Whisperer'] }
  },

  // Session achievements
  {
    id: 'session_20',
    name: 'Productive Day',
    description: 'Catch 20 fish in a single session',
    type: 'session',
    icon: '📅',
    check: (stats) => stats.sessionCatch >= 20,
    rewards: { credits: 100, xp: 250, items: [], titles: [] }
  },
  {
    id: 'session_50',
    name: 'Fishing Marathon',
    description: 'Catch 50 fish in a single session',
    type: 'session',
    icon: '🏃',
    check: (stats) => stats.sessionCatch >= 50,
    rewards: { credits: 300, xp: 750, items: ['energy_potion'], titles: [] }
  },

  // Special milestones
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Catch 50 fish at night',
    type: 'special',
    icon: '🦉',
    check: (stats) => stats.nightCatches >= 50,
    rewards: { credits: 200, xp: 500, items: ['night_vision_potion'], titles: ['Night Owl'] }
  },
  {
    id: 'rain_fisher',
    name: 'Storm Chaser',
    description: 'Catch 20 fish during rain or storms',
    type: 'special',
    icon: '⛈️',
    check: (stats) => stats.rainCatches >= 20,
    rewards: { credits: 300, xp: 750, items: ['storm_rod_skin'], titles: ['Storm Chaser'] }
  },
  {
    id: 'seasonal_collector',
    name: 'Seasonal Collector',
    description: 'Catch a fish from each season',
    type: 'special',
    icon: '🍂',
    check: (stats) => stats.seasonalFish?.spring >= 1 && stats.seasonalFish?.summer >= 1 &&
                        stats.seasonalFish?.fall >= 1 && stats.seasonalFish?.winter >= 1,
    rewards: { credits: 500, xp: 1200, items: ['seasonal_bait_box'], titles: ['Seasonal Collector'] }
  }
];

class MilestoneTracker {
  constructor(dataDir = null) {
    this.dataDir = dataDir || path.join(__dirname, '../../data/collections');
    this.milestones = MILESTONES;

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a player's milestones
   * @param {string} playerUuid - Player UUID
   * @returns {string} File path
   */
  getPlayerFilePath(playerUuid) {
    return path.join(this.dataDir, `${playerUuid}_milestones.json`);
  }

  /**
   * Load player milestone data
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Milestone data
   */
  loadPlayerData(playerUuid) {
    const filePath = this.getPlayerFilePath(playerUuid);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return this.createNewPlayerData(playerUuid);
  }

  /**
   * Save player milestone data
   * @param {string} playerUuid - Player UUID
   * @param {Object} data - Milestone data
   */
  savePlayerData(playerUuid, data) {
    const filePath = this.getPlayerFilePath(playerUuid);
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Create new player milestone data
   * @param {string} playerUuid - Player UUID
   * @returns {Object} New milestone data
   */
  createNewPlayerData(playerUuid) {
    const earned = {};
    for (const milestone of this.milestones) {
      earned[milestone.id] = {
        unlocked: false,
        unlockedAt: null,
        rewardsClaimed: false
      };
    }

    return {
      playerUuid,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      earned,
      statistics: {
        totalMilestones: this.milestones.length,
        earnedMilestones: 0,
        totalCreditsEarned: 0,
        totalXpEarned: 0
      }
    };
  }

  /**
   * Check if any milestones are triggered by new fish catch
   * @param {string} playerUuid - Player UUID
   * @param {Object} fishData - Fish catch data {fishId, rarity, size, biome, etc.}
   * @param {Object} stats - Current player statistics
   * @returns {Array} List of newly earned milestones
   */
  check(playerUuid, fishData, stats) {
    const data = this.loadPlayerData(playerUuid);
    const newMilestones = [];

    // Merge fishData into stats for checking
    const checkStats = {
      ...stats,
      // Add fish-specific data
      largestCatch: Math.max(stats.largestCatch || 0, fishData.size || 0)
    };

    for (const milestone of this.milestones) {
      const earned = data.earned[milestone.id];

      if (!earned.unlocked && milestone.check(checkStats)) {
        // Milestone unlocked!
        earned.unlocked = true;
        earned.unlockedAt = new Date().toISOString();

        data.statistics.earnedMilestones++;
        data.statistics.totalCreditsEarned += milestone.rewards.credits || 0;
        data.statistics.totalXpEarned += milestone.rewards.xp || 0;

        newMilestones.push({
          ...milestone,
          unlockedAt: earned.unlockedAt
        });
      }
    }

    if (newMilestones.length > 0) {
      this.savePlayerData(playerUuid, data);
    }

    return newMilestones;
  }

  /**
   * Get all milestones for a player (earned and available)
   * @param {string} playerUuid - Player UUID
   * @returns {Object} {earned: [], next: [], all: []}
   */
  getMilestones(playerUuid) {
    const data = this.loadPlayerData(playerUuid);
    const earned = [];
    const next = [];

    for (const milestone of this.milestones) {
      const earnedData = data.earned[milestone.id];

      if (earnedData.unlocked) {
        earned.push({
          ...milestone,
          unlockedAt: earnedData.unlockedAt,
          rewardsClaimed: earnedData.rewardsClaimed
        });
      } else {
        next.push(milestone);
      }
    }

    return {
      earned,
      next: next.slice(0, 5), // Next 5 achievable milestones
      all: this.milestones,
      statistics: data.statistics
    };
  }

  /**
   * Get earned milestones for a player
   * @param {string} playerUuid - Player UUID
   * @returns {Array} Earned milestones
   */
  getEarnedMilestones(playerUuid) {
    const { earned } = this.getMilestones(playerUuid);
    return earned;
  }

  /**
   * Get next achievable milestones
   * @param {string} playerUuid - Player UUID
   * @param {Object} stats - Current stats for progress calculation
   * @returns {Array} Next milestones with progress
   */
  getNextMilestones(playerUuid, stats = {}) {
    const data = this.loadPlayerData(playerUuid);
    const next = [];

    for (const milestone of this.milestones) {
      const earnedData = data.earned[milestone.id];

      if (!earnedData.unlocked) {
        const progress = this.calculateProgress(milestone, stats);
        next.push({
          ...milestone,
          progress
        });
      }
    }

    // Sort by progress percentage (descending)
    next.sort((a, b) => (b.progress?.percentage || 0) - (a.progress?.percentage || 0));

    return next.slice(0, 5);
  }

  /**
   * Calculate progress towards a milestone
   * @param {Object} milestone - Milestone definition
   * @param {Object} stats - Current stats
   * @returns {Object} Progress info
   */
  calculateProgress(milestone, stats) {
    // Parse the milestone to determine progress
    const id = milestone.id;

    if (id.startsWith('species_')) {
      const target = parseInt(id.split('_')[1]) || 100;
      const current = stats.speciesDiscovered || 0;
      return { current, target, percentage: Math.min(100, (current / target) * 100) };
    }

    if (id.startsWith('mastery_')) {
      const target = parseInt(id.split('_')[1]) || 1;
      const current = stats.speciesMastered || 0;
      return { current, target, percentage: Math.min(100, (current / target) * 100) };
    }

    if (id.startsWith('catches_')) {
      const target = parseInt(id.split('_')[1]) || 100;
      const current = stats.totalCaught || 0;
      return { current, target, percentage: Math.min(100, (current / target) * 100) };
    }

    if (id === 'first_rare' || id === 'first_epic' || id === 'first_legendary') {
      const rarityMap = {
        'first_rare': { current: stats.rareCaught || 0, target: 1 },
        'first_epic': { current: stats.epicCaught || 0, target: 1 },
        'first_legendary': { current: stats.legendaryCaught || 0, target: 1 }
      };
      const { current, target } = rarityMap[id];
      return { current, target, percentage: Math.min(100, (current / target) * 100) };
    }

    // Binary milestones (first catch, etc)
    return { current: 0, target: 1, percentage: 0 };
  }

  /**
   * Claim rewards for a milestone
   * @param {string} playerUuid - Player UUID
   * @param {string} milestoneId - Milestone ID
   * @returns {Object} Claim result with rewards
   */
  claimRewards(playerUuid, milestoneId) {
    const data = this.loadPlayerData(playerUuid);
    const earned = data.earned[milestoneId];

    if (!earned) {
      return { success: false, error: 'Milestone not found' };
    }

    if (!earned.unlocked) {
      return { success: false, error: 'Milestone not yet unlocked' };
    }

    if (earned.rewardsClaimed) {
      return { success: false, error: 'Rewards already claimed' };
    }

    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      return { success: false, error: 'Milestone definition not found' };
    }

    earned.rewardsClaimed = true;
    earned.claimedAt = new Date().toISOString();

    this.savePlayerData(playerUuid, data);

    return {
      success: true,
      milestone,
      rewards: milestone.rewards,
      claimedAt: earned.claimedAt
    };
  }

  /**
   * Get milestone definition by ID
   * @param {string} milestoneId - Milestone ID
   * @returns {Object|null} Milestone definition
   */
  getMilestoneById(milestoneId) {
    return this.milestones.find(m => m.id === milestoneId) || null;
  }

  /**
   * Get all milestone definitions
   * @returns {Array} All milestones
   */
  getAllMilestones() {
    return [...this.milestones];
  }

  /**
   * Get milestones by type
   * @param {string} type - Milestone type
   * @returns {Array} Milestones of that type
   */
  getMilestonesByType(type) {
    return this.milestones.filter(m => m.type === type);
  }

  /**
   * Check if player has earned a specific milestone
   * @param {string} playerUuid - Player UUID
   * @param {string} milestoneId - Milestone ID
   * @returns {boolean} True if earned
   */
  hasEarned(playerUuid, milestoneId) {
    const data = this.loadPlayerData(playerUuid);
    return data.earned[milestoneId]?.unlocked || false;
  }
}

module.exports = {
  MilestoneTracker,
  MILESTONES
};
