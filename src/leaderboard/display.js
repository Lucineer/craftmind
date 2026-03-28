/**
 * Leaderboard Display - Formatting for chat output
 *
 * Provides paginated, formatted leaderboard displays
 * optimized for Minecraft chat.
 *
 * @module leaderboard/display
 */

const { getCategoryDef, formatValue } = require('./categories');

// Minecraft color codes
const COLORS = {
  gold: '§6',
  yellow: '§e',
  green: '§a',
  aqua: '§b',
  red: '§c',
  lightPurple: '§d',
  white: '§f',
  gray: '§7',
  darkGray: '§8',
  black: '§0',
  bold: '§l',
  italic: '§o',
  reset: '§r'
};

// Rank medal emojis/colors
const RANK_STYLES = [
  { medal: '🥇', color: COLORS.gold, prefix: '1st' },
  { medal: '🥈', color: COLORS.lightPurple, prefix: '2nd' },
  { medal: '🥉', color: COLORS.aqua, prefix: '3rd' }
];

/**
 * Format a complete leaderboard for chat display
 * @param {string} category - Category ID
 * @param {Array} entries - Leaderboard entries
 * @param {Object} options
 * @param {number} [options.page=1] - Page number (1-indexed)
 * @param {number} [options.perPage=10] - Entries per page
 * @param {string} [options.playerUuid] - Highlight this player if in top 25
 * @param {string} [options.period='alltime'] - 'alltime' or 'weekly'
 * @returns {Object} { lines, totalPages, currentPage, hasPlayer }
 */
function formatLeaderboard(category, entries, options = {}) {
  const {
    page = 1,
    perPage = 10,
    playerUuid = null,
    period = 'alltime'
  } = options;

  const catDef = getCategoryDef(category);
  if (!catDef) {
    return {
      lines: [`${COLORS.red}Invalid category`],
      totalPages: 0,
      currentPage: 1,
      hasPlayer: false
    };
  }

  const totalPages = Math.ceil(entries.length / perPage);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const startIndex = (currentPage - 1) * perPage;
  const pageEntries = entries.slice(startIndex, startIndex + perPage);

  const lines = [];
  const periodLabel = period === 'weekly' ? 'Weekly' : 'All-Time';

  // Header
  lines.push('');
  lines.push(`${COLORS.bold}${COLORS.gold}=== ${catDef.icon} ${catDef.name} (${periodLabel}) ===${COLORS.reset}`);
  lines.push(`${COLORS.gray}${catDef.description}${COLORS.reset}`);
  lines.push('');

  if (pageEntries.length === 0) {
    lines.push(`${COLORS.gray}No entries yet!${COLORS.reset}`);
    return { lines, totalPages: 0, currentPage: 1, hasPlayer: false };
  }

  // Entries
  let hasPlayer = false;
  for (let i = 0; i < pageEntries.length; i++) {
    const entry = pageEntries[i];
    const globalRank = startIndex + i + 1;
    const isPlayer = entry.uuid === playerUuid;

    if (isPlayer) {
      hasPlayer = true;
    }

    const formatted = formatEntry(entry, globalRank, catDef, isPlayer);
    lines.push(formatted);
  }

  // Footer with pagination
  lines.push('');
  if (totalPages > 1) {
    lines.push(`${COLORS.gray}--- Page ${currentPage}/${totalPages} ---${COLORS.reset}`);
  }

  return { lines, totalPages, currentPage, hasPlayer };
}

/**
 * Format a single leaderboard entry
 * @private
 */
function formatEntry(entry, rank, catDef, highlight) {
  const rankStyle = RANK_STYLES[rank - 1];
  let rankDisplay;

  if (rankStyle) {
    rankDisplay = `${rankStyle.color}${COLORS.bold}${rankStyle.medal}${COLORS.reset}`;
  } else {
    rankDisplay = `${COLORS.gray}${rank}.${COLORS.reset}`;
  }

  const nameColor = highlight ? COLORS.yellow : COLORS.white;
  const highlightPrefix = highlight ? `${COLORS.bold}${COLORS.green}> ${COLORS.reset}` : '  ';
  const formattedValue = formatValue(catDef.id, entry.value);

  return `${highlightPrefix}${rankDisplay} ${nameColor}${entry.name}${COLORS.reset} ${COLORS.gray}-${COLORS.reset} ${COLORS.aqua}${formattedValue}${COLORS.reset}`;
}

/**
 * Format a player's rank display
 * @param {string} category
 * @param {Object} rankData - Result from getPlayerRank
 * @param {string} playerName
 * @returns {string}
 */
function formatPlayerRank(category, rankData, playerName) {
  const catDef = getCategoryDef(category);
  if (!catDef || !rankData.rank) {
    return `${COLORS.gray}Not ranked in ${category}${COLORS.reset}`;
  }

  const rankStyle = RANK_STYLES[rankData.rank - 1];
  const rankDisplay = rankStyle
    ? `${rankStyle.color}${rankStyle.medal}${COLORS.reset}`
    : `#${rankData.rank}`;

  const formattedValue = formatValue(category, rankData.entry.value);

  return `${COLORS.white}${playerName}${COLORS.reset} ${COLORS.gray}is ${COLORS.reset}${rankDisplay} ${COLORS.gray}in ${COLORS.reset}${COLORS.gold}${catDef.shortName}${COLORS.reset} ${COLORS.gray}with ${COLORS.reset}${COLORS.aqua}${formattedValue}${COLORS.reset}`;
}

/**
 * Format top 3 podium display
 * @param {string} category
 * @param {Array} entries - Top 3 entries
 * @returns {string[]}
 */
function formatPodium(category, entries) {
  const catDef = getCategoryDef(category);
  if (!catDef) return [];

  const lines = [];
  lines.push('');
  lines.push(`${COLORS.bold}${COLORS.gold}=== ${catDef.icon} ${catDef.shortName} Top 3 ===${COLORS.reset}`);

  const medals = ['🥇', '🥈', '🥉'];
  const colors = [COLORS.gold, COLORS.lightPurple, COLORS.aqua];

  for (let i = 0; i < Math.min(3, entries.length); i++) {
    const entry = entries[i];
    const formattedValue = formatValue(category, entry.value);
    lines.push(`${medals[i]} ${colors[i]}${entry.name}${COLORS.reset} ${COLORS.gray}-${COLORS.reset} ${COLORS.aqua}${formattedValue}${COLORS.reset}`);
  }

  return lines;
}

/**
 * Format compact leaderboard summary (for sidebar/hud)
 * @param {string} category
 * @param {Array} entries - Top 5 entries
 * @returns {string[]}
 */
function formatCompact(category, entries) {
  const catDef = getCategoryDef(category);
  if (!catDef) return [];

  const lines = [];
  lines.push(`${COLORS.gold}${catDef.icon} ${catDef.shortName}${COLORS.reset}`);

  for (let i = 0; i < Math.min(5, entries.length); i++) {
    const entry = entries[i];
    const num = i + 1;
    const formattedValue = formatValue(category, entry.value);
    lines.push(`${COLORS.gray}${num}.${COLORS.reset} ${COLORS.white}${entry.name} ${COLORS.gray}${formattedValue}${COLORS.reset}`);
  }

  return lines;
}

/**
 * Format personal stats summary
 * @param {Object} ranks - Result from getAllPlayerRanks
 * @param {string} playerName
 * @returns {string[]}
 */
function formatPersonalStats(ranks, playerName) {
  const lines = [];

  lines.push('');
  lines.push(`${COLORS.bold}${COLORS.gold}=== ${playerName}'s Rankings ===${COLORS.reset}`);

  for (const [category, rankData] of Object.entries(ranks)) {
    const catDef = getCategoryDef(category);
    if (!catDef) continue;

    if (rankData.rank) {
      const rankStyle = RANK_STYLES[rankData.rank - 1];
      const rankDisplay = rankStyle
        ? `${rankStyle.color}${rankStyle.medal}${COLORS.reset}`
        : `#${rankData.rank}`;
      const formattedValue = formatValue(category, rankData.entry.value);

      lines.push(`${COLORS.gray}${catDef.icon} ${catDef.shortName}:${COLORS.reset} ${rankDisplay} ${COLORS.aqua}${formattedValue}${COLORS.reset}`);
    } else {
      lines.push(`${COLORS.gray}${catDef.icon} ${catDef.shortName}:${COLORS.reset} ${COLORS.darkGray}Not ranked${COLORS.reset}`);
    }
  }

  return lines;
}

/**
 * Strip color codes for plain text output
 * @param {string} text
 * @returns {string}
 */
function stripColors(text) {
  return text.replace(/§[0-9a-fk-or]/gi, '');
}

module.exports = {
  formatLeaderboard,
  formatPlayerRank,
  formatPodium,
  formatCompact,
  formatPersonalStats,
  stripColors,
  COLORS
};
