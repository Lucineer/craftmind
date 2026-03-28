/**
 * Fish Encyclopedia - Collection tracking system for CraftMind
 *
 * Tracks player-specific fish collections with discovery states:
 * - undiscovered: Player has never encountered this species
 * - seen: Another player caught it nearby (partial discovery)
 * - caught: Player has caught at least one
 * - mastered: Player has caught 10+ of this species
 */

const fs = require('fs');
const path = require('path');

// Discovery states
const DiscoveryState = {
  UNDISCOVERED: 'undiscovered',
  SEEN: 'seen',
  CAUGHT: 'caught',
  MASTERED: 'mastered'
};

// Tier thresholds based on species discovered
const TIERS = [
  { name: 'Novice', min: 0, max: 9 },
  { name: 'Beginner', min: 10, max: 24 },
  { name: 'Hobbyist', min: 25, max: 49 },
  { name: 'Expert', min: 50, max: 74 },
  { name: 'Master', min: 75, max: 99 },
  { name: 'Grandmaster', min: 100, max: Infinity }
];

// All fish species in the game (based on FISHING-MASTERY.md)
const FISH_SPECIES = [
  // Ocean - Common
  { id: 'mackerel', name: 'Mackerel', category: 'saltwater', rarity: 'common', biomes: ['ocean'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: null },
  { id: 'sardine', name: 'Sardine', category: 'saltwater', rarity: 'common', biomes: ['ocean'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: { start: 0, end: 12000 } },
  // Ocean - Uncommon
  { id: 'sea_bass', name: 'Sea Bass', category: 'saltwater', rarity: 'uncommon', biomes: ['ocean'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: null },
  // Ocean - Rare
  { id: 'bluefin_tuna', name: 'Bluefin Tuna', category: 'saltwater', rarity: 'rare', biomes: ['ocean', 'deep_ocean'], seasons: ['summer'], timeRange: { start: 0, end: 12000 } },
  // Ocean - Epic
  { id: 'swordfish', name: 'Swordfish', category: 'saltwater', rarity: 'epic', biomes: ['ocean', 'deep_ocean'], seasons: ['summer'], timeRange: { start: 0, end: 3000 } },
  // Ocean - Legendary
  { id: 'coelacanth', name: 'Coelacanth', category: 'legendary', rarity: 'legendary', biomes: ['deep_ocean'], seasons: ['winter'], timeRange: { start: 13000, end: 24000 } },
  { id: 'kraken_tentacle', name: 'Kraken Tentacle', category: 'legendary', rarity: 'legendary', biomes: ['deep_ocean'], seasons: ['spring', 'summer', 'fall', 'winter'], weather: ['thunder'] },

  // Deep Ocean
  { id: 'anglerfish', name: 'Anglerfish', category: 'saltwater', rarity: 'rare', biomes: ['deep_ocean'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: { start: 13000, end: 24000 } },
  { id: 'gulper_eel', name: 'Gulper Eel', category: 'saltwater', rarity: 'epic', biomes: ['deep_ocean'], seasons: ['spring', 'summer', 'fall', 'winter'], depthMin: 100 },
  { id: 'leviathan_scale', name: 'Leviathan Scale', category: 'legendary', rarity: 'legendary', biomes: ['deep_ocean'], special: true },

  // River - Common
  { id: 'trout', name: 'Trout', category: 'freshwater', rarity: 'common', biomes: ['river'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: { start: 0, end: 3000 } },
  { id: 'salmon', name: 'Salmon', category: 'freshwater', rarity: 'common', biomes: ['river'], seasons: ['fall'], timeRange: null },
  // River - Uncommon
  { id: 'catfish', name: 'Catfish', category: 'freshwater', rarity: 'uncommon', biomes: ['river'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: { start: 13000, end: 24000 } },
  // River - Rare
  { id: 'sturgeon', name: 'Sturgeon', category: 'freshwater', rarity: 'rare', biomes: ['river'], seasons: ['spring'], timeRange: { start: 0, end: 3000 } },
  // River - Epic
  { id: 'golden_carp', name: 'Golden Carp', category: 'freshwater', rarity: 'epic', biomes: ['river'], seasons: ['spring'], timeRange: { start: 0, end: 12000 } },
  // River - Legendary
  { id: 'river_spirit', name: 'River Spirit', category: 'legendary', rarity: 'legendary', biomes: ['river'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: { start: 18000, end: 19000 } },

  // Jungle - Common
  { id: 'piranha', name: 'Piranha', category: 'tropical', rarity: 'common', biomes: ['jungle_pond'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: { start: 0, end: 12000 } },
  { id: 'tetra', name: 'Tetra', category: 'tropical', rarity: 'common', biomes: ['jungle_pond'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: null },
  // Jungle - Uncommon
  { id: 'discus', name: 'Discus', category: 'tropical', rarity: 'uncommon', biomes: ['jungle_pond'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: { start: 0, end: 12000 } },
  // Jungle - Rare
  { id: 'electric_eel', name: 'Electric Eel', category: 'tropical', rarity: 'rare', biomes: ['jungle_pond'], seasons: ['spring', 'summer', 'fall', 'winter'], weather: ['rain'], timeRange: { start: 13000, end: 24000 } },
  // Jungle - Epic
  { id: 'arapaima', name: 'Arapaima', category: 'tropical', rarity: 'epic', biomes: ['jungle_pond'], seasons: ['summer'], timeRange: null },
  // Jungle - Legendary
  { id: 'amazonian_queen', name: 'Amazonian Queen', category: 'legendary', rarity: 'legendary', biomes: ['jungle_pond'], seasons: ['spring'], timeRange: { start: 0, end: 3000 } },

  // Swamp - Common
  { id: 'mudfish', name: 'Mudfish', category: 'special', rarity: 'common', biomes: ['swamp'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: null },
  // Swamp - Uncommon
  { id: 'bowfin', name: 'Bowfin', category: 'special', rarity: 'uncommon', biomes: ['swamp'], seasons: ['spring', 'summer', 'fall', 'winter'], timeRange: { start: 13000, end: 24000 } },
  // Swamp - Rare
  { id: 'gar', name: 'Gar', category: 'special', rarity: 'rare', biomes: ['swamp'], seasons: ['summer'], timeRange: { start: 0, end: 3000 } },
  // Swamp - Epic
  { id: 'swamp_monster', name: 'Swamp Monster', category: 'special', rarity: 'epic', biomes: ['swamp'], seasons: ['fall'], timeRange: { start: 13000, end: 24000 } },
  // Swamp - Legendary
  { id: 'bog_lurker', name: 'Bog Lurker', category: 'legendary', rarity: 'legendary', biomes: ['swamp'], seasons: ['spring', 'summer', 'fall', 'winter'], weather: ['fog'] },

  // Nether - Common
  { id: 'magma_minnow', name: 'Magma Minnow', category: 'special', rarity: 'common', biomes: ['nether_lava'], seasons: null, timeRange: null },
  // Nether - Uncommon
  { id: 'flamefin', name: 'FlameFin', category: 'special', rarity: 'uncommon', biomes: ['nether_lava'], seasons: null, timeRange: null },
  // Nether - Rare
  { id: 'blaze_eel', name: 'Blaze Eel', category: 'special', rarity: 'rare', biomes: ['nether_lava'], seasons: null, nearFortress: true },
  // Nether - Epic
  { id: 'ember_serpent', name: 'Ember Serpent', category: 'special', rarity: 'epic', biomes: ['nether_lava'], seasons: null, depthMin: 50 },
  // Nether - Legendary
  { id: 'phoenix_koi', name: 'Phoenix Koi', category: 'legendary', rarity: 'legendary', biomes: ['nether_lava'], seasons: null, basaltDeltas: true },

  // End - Common
  { id: 'chorus_guppy', name: 'Chorus Guppy', category: 'special', rarity: 'common', biomes: ['end_void'], seasons: null, timeRange: null },
  // End - Uncommon
  { id: 'void_leech', name: 'Void Leech', category: 'special', rarity: 'uncommon', biomes: ['end_void'], seasons: null, timeRange: null },
  // End - Rare
  { id: 'ender_serpent', name: 'Ender Serpent', category: 'special', rarity: 'rare', biomes: ['end_void'], seasons: null, nearCity: true },
  // End - Epic
  { id: 'shulker_shell', name: 'Shulker Shell', category: 'special', rarity: 'epic', biomes: ['end_void'], seasons: null, nearCity: true },
  // End - Legendary
  { id: 'dragon_scale', name: 'Dragon Scale', category: 'legendary', rarity: 'legendary', biomes: ['end_void'], seasons: null, mainIsland: true },

  // Seasonal/Special fish
  { id: 'cherry_blossom_koi', name: 'Cherry Blossom Koi', category: 'special', rarity: 'epic', biomes: ['river', 'ocean'], seasonal: 'spring_festival' },
  { id: 'rainbow_trout', name: 'Rainbow Trout', category: 'special', rarity: 'rare', biomes: ['river'], seasonal: 'spring_festival' },
  { id: 'sunfish', name: 'Sunfish', category: 'saltwater', rarity: 'epic', biomes: ['ocean'], seasonal: 'summer_slam' },
  { id: 'electric_marlin', name: 'Electric Marlin', category: 'legendary', rarity: 'legendary', biomes: ['deep_ocean'], seasonal: 'summer_slam' },
  { id: 'autumn_salmon', name: 'Autumn Salmon', category: 'freshwater', rarity: 'rare', biomes: ['river'], seasonal: 'harvest_moon' },
  { id: 'ghost_fish', name: 'Ghost Fish', category: 'special', rarity: 'epic', biomes: ['swamp', 'ocean'], seasonal: 'harvest_moon', timeRange: { start: 13000, end: 24000 } },
  { id: 'ice_cod', name: 'Ice Cod', category: 'special', rarity: 'uncommon', biomes: ['frozen_ocean', 'frozen_river'], seasonal: 'winter_wonderland' },
  { id: 'frost_flounder', name: 'Frost Flounder', category: 'special', rarity: 'rare', biomes: ['frozen_ocean'], seasonal: 'winter_wonderland' },
  { id: 'snow_serpent', name: 'Snow Serpent', category: 'legendary', rarity: 'legendary', biomes: ['frozen_ocean'], seasonal: 'winter_wonderland', weather: ['snow'] },
  { id: 'bloodfin_shark', name: 'Bloodfin Shark', category: 'legendary', rarity: 'legendary', biomes: ['ocean'], special: 'blood_moon' },
  { id: 'void_ray', name: 'Void Ray', category: 'epic', rarity: 'epic', biomes: ['end_void'], special: 'solar_eclipse' },
  { id: 'starfish', name: 'Starfish', category: 'special', rarity: 'rare', biomes: ['ocean'], special: 'meteor_shower' },
  { id: 'comet_koi', name: 'Comet Koi', category: 'legendary', rarity: 'legendary', biomes: ['ocean', 'river'], special: 'meteor_shower' },

  // Additional common fish for variety
  { id: 'cod', name: 'Cod', category: 'saltwater', rarity: 'common', biomes: ['ocean'], seasons: null, timeRange: null },
  { id: 'haddock', name: 'Haddock', category: 'saltwater', rarity: 'common', biomes: ['ocean'], seasons: null, timeRange: null },
  { id: 'flounder', name: 'Flounder', category: 'saltwater', rarity: 'common', biomes: ['ocean'], seasons: null, timeRange: null },
  { id: 'perch', name: 'Perch', category: 'freshwater', rarity: 'common', biomes: ['river'], seasons: null, timeRange: null },
  { id: 'carp', name: 'Carp', category: 'freshwater', rarity: 'common', biomes: ['river'], seasons: null, timeRange: null },
  { id: 'minnow', name: 'Minnow', category: 'freshwater', rarity: 'common', biomes: ['river'], seasons: null, timeRange: null },
  { id: 'bluegill', name: 'Bluegill', category: 'freshwater', rarity: 'common', biomes: ['river'], seasons: null, timeRange: null },
  { id: 'bass', name: 'Bass', category: 'freshwater', rarity: 'uncommon', biomes: ['river'], seasons: null, timeRange: null },
  { id: 'pike', name: 'Pike', category: 'freshwater', rarity: 'uncommon', biomes: ['river'], seasons: null, timeRange: null },
  { id: 'walleye', name: 'Walleye', category: 'freshwater', rarity: 'uncommon', biomes: ['river'], seasons: null, timeRange: null },
  { id: 'anchovy', name: 'Anchovy', category: 'saltwater', rarity: 'common', biomes: ['ocean'], seasons: null, timeRange: null },
  { id: 'halibut', name: 'Halibut', category: 'saltwater', rarity: 'uncommon', biomes: ['ocean'], seasons: null, timeRange: null },
  { id: 'snapper', name: 'Snapper', category: 'saltwater', rarity: 'uncommon', biomes: ['ocean'], seasons: null, timeRange: null },
  { id: 'grouper', name: 'Grouper', category: 'saltwater', rarity: 'uncommon', biomes: ['ocean', 'deep_ocean'], seasons: null, timeRange: null },
  { id: 'marlin', name: 'Marlin', category: 'saltwater', rarity: 'rare', biomes: ['ocean', 'deep_ocean'], seasons: ['summer'], timeRange: null },
  { id: 'mahimahi', name: 'Mahi-Mahi', category: 'saltwater', rarity: 'rare', biomes: ['ocean'], seasons: ['summer'], timeRange: null },
  { id: 'ocean_sunfish', name: 'Ocean Sunfish', category: 'saltwater', rarity: 'rare', biomes: ['ocean'], seasons: null, timeRange: null }
];

class FishEncyclopedia {
  constructor(dataDir = null) {
    this.dataDir = dataDir || path.join(__dirname, '../../data/collections');
    this.species = FISH_SPECIES;
    this.totalSpecies = FISH_SPECIES.length;

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a player's collection data
   * @param {string} playerUuid - Player UUID
   * @returns {string} File path
   */
  getPlayerFilePath(playerUuid) {
    return path.join(this.dataDir, `${playerUuid}.json`);
  }

  /**
   * Load player collection data
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Collection data
   */
  loadPlayerData(playerUuid) {
    const filePath = this.getPlayerFilePath(playerUuid);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return this.createNewPlayerData(playerUuid);
  }

  /**
   * Save player collection data
   * @param {string} playerUuid - Player UUID
   * @param {Object} data - Collection data
   */
  savePlayerData(playerUuid, data) {
    const filePath = this.getPlayerFilePath(playerUuid);
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Create new player collection data
   * @param {string} playerUuid - Player UUID
   * @returns {Object} New collection data
   */
  createNewPlayerData(playerUuid) {
    const entries = {};
    for (const fish of this.species) {
      entries[fish.id] = {
        state: DiscoveryState.UNDISCOVERED,
        timesCaught: 0,
        firstCaughtAt: null,
        largestSize: null,
        smallestSize: null
      };
    }

    return {
      playerUuid,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      entries,
      statistics: {
        totalCaught: 0,
        speciesDiscovered: 0,
        speciesMastered: 0
      }
    };
  }

  /**
   * Record a fish catch for a player
   * @param {string} playerUuid - Player UUID
   * @param {string} fishId - Fish species ID
   * @param {number} size - Fish size in cm
   * @returns {Object} Result with state change info
   */
  addEntry(playerUuid, fishId, size) {
    const data = this.loadPlayerData(playerUuid);
    const entry = data.entries[fishId];

    if (!entry) {
      return { success: false, error: `Unknown fish: ${fishId}` };
    }

    const previousState = entry.state;
    const isNewDiscovery = entry.state === DiscoveryState.UNDISCOVERED || entry.state === DiscoveryState.SEEN;

    // Update entry
    entry.timesCaught++;

    if (isNewDiscovery) {
      entry.state = DiscoveryState.CAUGHT;
      entry.firstCaughtAt = new Date().toISOString();
    }

    // Check for mastery (10+ catches)
    if (entry.timesCaught >= 10 && entry.state !== DiscoveryState.MASTERED) {
      entry.state = DiscoveryState.MASTERED;
    }

    // Update size records
    if (size !== null && size !== undefined) {
      if (entry.largestSize === null || size > entry.largestSize) {
        entry.largestSize = size;
      }
      if (entry.smallestSize === null || size < entry.smallestSize) {
        entry.smallestSize = size;
      }
    }

    // Update statistics
    data.statistics.totalCaught++;
    if (isNewDiscovery) {
      data.statistics.speciesDiscovered++;
    }
    if (entry.state === DiscoveryState.MASTERED && previousState !== DiscoveryState.MASTERED) {
      data.statistics.speciesMastered++;
    }

    this.savePlayerData(playerUuid, data);

    return {
      success: true,
      fishId,
      previousState,
      newState: entry.state,
      isNewDiscovery,
      isMasteryAchieved: entry.state === DiscoveryState.MASTERED && previousState !== DiscoveryState.MASTERED,
      timesCaught: entry.timesCaught
    };
  }

  /**
   * Mark a fish as "seen" (another player caught it nearby)
   * @param {string} playerUuid - Player UUID
   * @param {string} fishId - Fish species ID
   * @returns {Object} Result
   */
  markAsSeen(playerUuid, fishId) {
    const data = this.loadPlayerData(playerUuid);
    const entry = data.entries[fishId];

    if (!entry) {
      return { success: false, error: `Unknown fish: ${fishId}` };
    }

    if (entry.state === DiscoveryState.UNDISCOVERED) {
      entry.state = DiscoveryState.SEEN;
      this.savePlayerData(playerUuid, data);
      return { success: true, wasUpdated: true };
    }

    return { success: true, wasUpdated: false };
  }

  /**
   * Get player's collection progress
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Progress information
   */
  getProgress(playerUuid) {
    const data = this.loadPlayerData(playerUuid);

    const categoryProgress = {
      freshwater: { discovered: 0, total: 0 },
      saltwater: { discovered: 0, total: 0 },
      tropical: { discovered: 0, total: 0 },
      special: { discovered: 0, total: 0 },
      legendary: { discovered: 0, total: 0 }
    };

    let discovered = 0;
    let caught = 0;
    let mastered = 0;

    for (const fish of this.species) {
      const category = fish.category;
      if (categoryProgress[category]) {
        categoryProgress[category].total++;
      }

      const entry = data.entries[fish.id];
      if (entry && entry.state !== DiscoveryState.UNDISCOVERED) {
        discovered++;
        if (categoryProgress[category]) {
          categoryProgress[category].discovered++;
        }
      }
      if (entry && entry.state !== DiscoveryState.UNDISCOVERED && entry.state !== DiscoveryState.SEEN) {
        caught++;
      }
      if (entry && entry.state === DiscoveryState.MASTERED) {
        mastered++;
      }
    }

    const percentage = this.totalSpecies > 0
      ? Math.round((discovered / this.totalSpecies) * 1000) / 10
      : 0;

    return {
      totalSpecies: this.totalSpecies,
      discovered,
      caught,
      mastered,
      percentage,
      tier: this.getTierFromCount(discovered),
      categoryProgress
    };
  }

  /**
   * Get player's tier based on species discovered
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Tier information
   */
  getTier(playerUuid) {
    const progress = this.getProgress(playerUuid);
    return {
      name: progress.tier,
      discovered: progress.discovered,
      ...this.getTierDetails(progress.tier)
    };
  }

  /**
   * Get tier from count
   * @param {number} count - Number of species discovered
   * @returns {string} Tier name
   */
  getTierFromCount(count) {
    for (const tier of TIERS) {
      if (count >= tier.min && count <= tier.max) {
        return tier.name;
      }
    }
    return TIERS[0].name;
  }

  /**
   * Get tier details
   * @param {string} tierName - Tier name
   * @returns {Object} Tier details
   */
  getTierDetails(tierName) {
    const tier = TIERS.find(t => t.name === tierName);
    const nextTier = TIERS.find(t => t.min > (tier?.max || 0));

    return {
      range: tier ? `${tier.min}-${tier.max === Infinity ? '∞' : tier.max}` : '0-9',
      nextTier: nextTier ? nextTier.name : null,
      speciesToNextTier: nextTier ? nextTier.min - (tier?.min || 0) : 0
    };
  }

  /**
   * Get list of undiscovered species with hints
   * @param {string} playerUuid - Player UUID
   * @returns {Array} List of undiscovered fish with hints
   */
  getMissing(playerUuid) {
    const data = this.loadPlayerData(playerUuid);
    const missing = [];

    for (const fish of this.species) {
      const entry = data.entries[fish.id];
      if (!entry || entry.state === DiscoveryState.UNDISCOVERED) {
        missing.push({
          id: fish.id,
          name: fish.name,
          rarity: fish.rarity,
          hint: this.generateHint(fish)
        });
      } else if (entry.state === DiscoveryState.SEEN) {
        missing.push({
          id: fish.id,
          name: fish.name,
          rarity: fish.rarity,
          seen: true,
          hint: this.generateHint(fish)
        });
      }
    }

    return missing;
  }

  /**
   * Generate a hint for finding a fish
   * @param {Object} fish - Fish species data
   * @returns {string} Hint text
   */
  generateHint(fish) {
    const hints = [];

    if (fish.biomes && fish.biomes.length > 0) {
      const biomeNames = fish.biomes.map(b => this.formatBiome(b)).join(' or ');
      hints.push(`Found in ${biomeNames}`);
    }

    if (fish.seasons && fish.seasons.length > 0 && fish.seasons.length < 4) {
      hints.push(`Available in ${fish.seasons.join(', ')}`);
    }

    if (fish.timeRange) {
      const timeHint = this.formatTimeRange(fish.timeRange);
      hints.push(timeHint);
    }

    if (fish.weather) {
      hints.push(`During ${fish.weather.join(' or ')} weather`);
    }

    if (fish.seasonal) {
      hints.push(`Seasonal event: ${fish.seasonal.replace(/_/g, ' ')}`);
    }

    if (fish.special) {
      hints.push(`Special event: ${fish.special.replace(/_/g, ' ')}`);
    }

    if (fish.depthMin) {
      hints.push(`Requires depth > ${fish.depthMin} blocks`);
    }

    return hints.join('. ') || 'Location unknown';
  }

  /**
   * Format biome name for display
   * @param {string} biome - Biome ID
   * @returns {string} Formatted name
   */
  formatBiome(biome) {
    const biomeNames = {
      'ocean': 'ocean waters',
      'deep_ocean': 'deep ocean',
      'river': 'rivers',
      'jungle_pond': 'jungle ponds',
      'swamp': 'swamps',
      'frozen_ocean': 'frozen oceans',
      'frozen_river': 'frozen rivers',
      'nether_lava': 'Nether lava',
      'end_void': 'End void'
    };
    return biomeNames[biome] || biome;
  }

  /**
   * Format time range for display
   * @param {Object} timeRange - Time range {start, end}
   * @returns {string} Formatted time hint
   */
  formatTimeRange(timeRange) {
    if (!timeRange) return '';

    const startHour = Math.floor(timeRange.start / 1000);
    const endHour = Math.floor(timeRange.end / 1000);

    if (timeRange.start === 0 && timeRange.end === 12000) {
      return 'During daytime';
    }
    if (timeRange.start === 13000 && timeRange.end === 24000) {
      return 'During nighttime';
    }
    if (timeRange.start >= 0 && timeRange.start < 3000) {
      return 'At dawn';
    }
    if (timeRange.start === 18000) {
      return 'At midnight';
    }

    return `Between ${startHour}:00 and ${endHour}:00`;
  }

  /**
   * Get discovered fish entries for a player
   * @param {string} playerUuid - Player UUID
   * @returns {Array} List of discovered fish
   */
  getDiscovered(playerUuid) {
    const data = this.loadPlayerData(playerUuid);
    const discovered = [];

    for (const fish of this.species) {
      const entry = data.entries[fish.id];
      if (entry && entry.state !== DiscoveryState.UNDISCOVERED) {
        discovered.push({
          ...fish,
          playerData: entry
        });
      }
    }

    return discovered;
  }

  /**
   * Get fish species data by ID
   * @param {string} fishId - Fish species ID
   * @returns {Object|null} Fish data
   */
  getFishById(fishId) {
    return this.species.find(f => f.id === fishId) || null;
  }

  /**
   * Get all fish species
   * @returns {Array} All species
   */
  getAllSpecies() {
    return [...this.species];
  }

  /**
   * Get fish by category
   * @param {string} category - Category name
   * @returns {Array} Fish in category
   */
  getFishByCategory(category) {
    return this.species.filter(f => f.category === category);
  }

  /**
   * Get fish by rarity
   * @param {string} rarity - Rarity level
   * @returns {Array} Fish of that rarity
   */
  getFishByRarity(rarity) {
    return this.species.filter(f => f.rarity === rarity);
  }
}

module.exports = {
  FishEncyclopedia,
  DiscoveryState,
  TIERS,
  FISH_SPECIES
};
