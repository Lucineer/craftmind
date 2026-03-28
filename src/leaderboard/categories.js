/**
 * Leaderboard Category Definitions
 *
 * Defines all leaderboard categories with display names,
 * sort orders, and formatting rules.
 *
 * @module leaderboard/categories
 */

/**
 * Category definitions
 */
const CATEGORIES = {
  most_fish: {
    id: 'most_fish',
    name: 'Most Fish Caught',
    shortName: 'Fish Caught',
    description: 'Total number of fish caught',
    sortOrder: 'desc', // Higher is better
    format: 'number',
    icon: '🐟',
    unit: 'fish'
  },
  biggest_fish: {
    id: 'biggest_fish',
    name: 'Biggest Fish',
    shortName: 'Biggest',
    description: 'Largest fish ever caught by size (in kg)',
    sortOrder: 'desc', // Higher is better
    format: 'decimal',
    icon: '🐋',
    unit: 'kg',
    decimals: 2
  },
  rarest_catch: {
    id: 'rarest_catch',
    name: 'Rarest Catch',
    shortName: 'Rarest',
    description: 'Rarest fish caught (by tier)',
    sortOrder: 'desc', // Higher tier is better
    format: 'rarity',
    icon: '✨',
    rarityOrder: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
  },
  fastest_100: {
    id: 'fastest_100',
    name: 'Fastest 100 Fish',
    shortName: 'Speed Run',
    description: 'Time to catch 100 fish (in seconds)',
    sortOrder: 'asc', // Lower is better
    format: 'duration',
    icon: '⚡',
    unit: 's'
  },
  total_earnings: {
    id: 'total_earnings',
    name: 'Total Earnings',
    shortName: 'Earnings',
    description: 'Total credits earned from fishing',
    sortOrder: 'desc', // Higher is better
    format: 'currency',
    icon: '💰',
    unit: 'credits'
  },
  highest_level: {
    id: 'highest_level',
    name: 'Highest Level',
    shortName: 'Level',
    description: 'Current player level',
    sortOrder: 'desc', // Higher is better
    format: 'number',
    icon: '⭐',
    unit: ''
  }
};

/**
 * Rarity tier values for sorting
 */
const RARITY_VALUES = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6
};

/**
 * Get category definition
 * @param {string} categoryId
 * @returns {Object|null}
 */
function getCategoryDef(categoryId) {
  return CATEGORIES[categoryId] || null;
}

/**
 * Get all category definitions
 * @returns {Object}
 */
function getAllCategories() {
  return { ...CATEGORIES };
}

/**
 * Get category IDs in order
 * @returns {string[]}
 */
function getCategoryIds() {
  return Object.keys(CATEGORIES);
}

/**
 * Check if higher is better for a category
 * @param {string} categoryId
 * @returns {boolean}
 */
function isHigherBetter(categoryId) {
  const cat = CATEGORIES[categoryId];
  return cat ? cat.sortOrder === 'desc' : true;
}

/**
 * Format a value for display based on category
 * @param {string} categoryId
 * @param {number} value
 * @returns {string}
 */
function formatValue(categoryId, value) {
  const cat = CATEGORIES[categoryId];
  if (!cat) return String(value);

  switch (cat.format) {
    case 'number':
      return value.toLocaleString() + (cat.unit ? ` ${cat.unit}` : '');

    case 'decimal':
      const decimals = cat.decimals || 2;
      return value.toFixed(decimals) + (cat.unit ? ` ${cat.unit}` : '');

    case 'currency':
      return '🪙 ' + value.toLocaleString();

    case 'duration':
      return formatDuration(value);

    case 'rarity':
      return formatRarity(value);

    default:
      return String(value);
  }
}

/**
 * Format duration in seconds to readable string
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

/**
 * Format rarity value to display name
 * @param {number} value - Rarity tier value
 * @returns {string}
 */
function formatRarity(value) {
  for (const [name, val] of Object.entries(RARITY_VALUES)) {
    if (val === value) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  return 'Unknown';
}

/**
 * Convert rarity name to value
 * @param {string} rarityName
 * @returns {number}
 */
function rarityToValue(rarityName) {
  return RARITY_VALUES[rarityName.toLowerCase()] || 0;
}

module.exports = {
  CATEGORIES,
  RARITY_VALUES,
  getCategoryDef,
  getAllCategories,
  getCategoryIds,
  isHigherBetter,
  formatValue,
  formatDuration,
  formatRarity,
  rarityToValue
};
