/**
 * @module craftmind/tournament/weekly
 * @description WeeklyTournament - Weekly fishing championship management.
 *
 * Manages weekly tournaments with alternating themes:
 * - Biggest Catch (largest fish)
 * - Rarest Fish (highest rarity points)
 * - Speed Fishing (most fish in 1 hour)
 *
 * Entry fee: 100 credits
 * Prize pool: 70% to 1st, 20% to 2nd, 10% to 3rd
 *
 * @example
 * const weekly = new WeeklyTournament(engine, economy);
 * weekly.initialize(); // Create this week's tournament
 * weekly.recordCatch('player-uuid', 'PlayerName', fishData);
 * const theme = weekly.getCurrentTheme();
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} WeeklyTheme
 * @property {string} id - Theme ID
 * @property {string} name - Theme name
 * @property {string} description - Theme description
 * @property {Object} scoringRules - Scoring configuration
 */

/**
 * @typedef {Object} WeeklyTournamentConfig
 * @property {number} [entryFee=100] - Entry fee in credits
 * @property {number} [basePrizePool=1000] - Base prize pool
 * @property {number[]} [prizeDistribution=[0.7, 0.2, 0.1]] - Prize percentages
 */

const WEEKLY_THEMES = [
  {
    id: 'most_fish',
    name: 'Catch Master',
    description: 'Catch the most fish this week!',
    scoringRules: { metric: 'fish_count', higherIsBetter: true },
  },
  {
    id: 'biggest_catch',
    name: 'Trophy Hunter',
    description: 'Catch the biggest fish this week!',
    scoringRules: { metric: 'biggest_fish', higherIsBetter: true },
  },
  {
    id: 'rarest_fish',
    name: 'Rare Collector',
    description: 'Catch the rarest fish this week!',
    scoringRules: { metric: 'rarity_score', higherIsBetter: true },
  },
  {
    id: 'speed_fishing',
    name: 'Speed Demon',
    description: 'Catch the most fish in a single hour!',
    scoringRules: { metric: 'hourly_catch', higherIsBetter: true, timeWindow: 3600 },
  },
];

const RARITY_POINTS = {
  common: 1,
  uncommon: 3,
  rare: 10,
  epic: 25,
  legendary: 50,
  mythic: 100,
};

const DEFAULT_CONFIG = {
  entryFee: 100,
  basePrizePool: 1000,
  prizeDistribution: [0.7, 0.2, 0.1], // 70%, 20%, 10%
};

/**
 * WeeklyTournament class for managing weekly fishing championships.
 */
class WeeklyTournament {
  /**
   * Create a new WeeklyTournament manager.
   * @param {Object} engine - TournamentEngine instance
   * @param {Object} economy - GameEconomy instance
   * @param {string} [dataDir='./data/tournaments'] - Data directory
   * @param {WeeklyTournamentConfig} [config={}] - Configuration
   */
  constructor(engine, economy, dataDir = './data/tournaments', config = {}) {
    /** @type {Object} Tournament engine */
    this.engine = engine;

    /** @type {Object} Economy manager */
    this.economy = economy;

    /** @type {string} Data directory */
    this.dataDir = dataDir;

    /** @type {WeeklyTournamentConfig} Configuration */
    this.config = { ...DEFAULT_CONFIG, ...config };

    /** @type {string|null} Current weekly tournament ID */
    this.currentTournamentId = null;

    /** @type {number} Current week number */
    this.currentWeek = null;

    /** @type {WeeklyTheme} Current theme */
    this.currentTheme = null;

    /** @type {Object} Player hourly catch tracking (for speed fishing) */
    this.hourlyCatches = new Map();

    /** @type {NodeJS.Timeout|null} Reset check interval */
    this._resetInterval = null;

    // Load state
    this.load();

    // Start reset checker
    this._startResetChecker();
  }

  /**
   * Get current week number.
   * @private
   * @returns {number}
   */
  _getWeekNumber() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }

  /**
   * Get start of current week (Monday).
   * @private
   * @returns {Date}
   */
  _getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Get end of current week (Sunday).
   * @private
   * @returns {Date}
   */
  _getWeekEnd() {
    const monday = this._getWeekStart();
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }

  /**
   * Get theme for current week.
   * @private
   * @returns {WeeklyTheme}
   */
  _getThemeForWeek() {
    const weekNumber = this._getWeekNumber();
    const themeIndex = weekNumber % WEEKLY_THEMES.length;
    return WEEKLY_THEMES[themeIndex];
  }

  /**
   * Start the reset checker.
   * @private
   */
  _startResetChecker() {
    // Check every 5 minutes for week change
    this._resetInterval = setInterval(() => {
      this._checkReset();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if we need to reset the tournament.
   * @private
   */
  _checkReset() {
    const currentWeek = this._getWeekNumber();

    if (this.currentWeek !== currentWeek) {
      console.log(`[WeeklyTournament] New week detected: ${currentWeek}`);
      this._completeAndReset();
    }
  }

  /**
   * Complete current tournament and create new one.
   * @private
   */
  _completeAndReset() {
    // Complete current tournament if exists
    if (this.currentTournamentId) {
      this.engine.completeTournament(this.currentTournamentId);
    }

    // Clear hourly catches
    this.hourlyCatches.clear();

    // Create new tournament
    this.initialize();
  }

  /**
   * Load state from disk.
   * @returns {boolean}
   */
  load() {
    const filePath = path.join(this.dataDir, 'weekly-state.json');
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.currentTournamentId = data.currentTournamentId;
        this.currentWeek = data.currentWeek;
        this.currentTheme = data.currentTheme;
        return true;
      }
    } catch (err) {
      console.warn(`[WeeklyTournament] Failed to load: ${err.message}`);
    }
    return false;
  }

  /**
   * Save state to disk.
   * @returns {boolean}
   */
  save() {
    const filePath = path.join(this.dataDir, 'weekly-state.json');
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      const data = {
        currentTournamentId: this.currentTournamentId,
        currentWeek: this.currentWeek,
        currentTheme: this.currentTheme,
        savedAt: new Date().toISOString(),
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.warn(`[WeeklyTournament] Failed to save: ${err.message}`);
      return false;
    }
  }

  /**
   * Initialize this week's tournament.
   * @returns {{ success: boolean, tournamentId?: string, error?: string }}
   */
  initialize() {
    const weekNumber = this._getWeekNumber();
    const theme = this._getThemeForWeek();

    // Check if already exists for this week
    if (this.currentWeek === weekNumber && this.currentTournamentId) {
      const existing = this.engine.getTournament(this.currentTournamentId);
      if (existing) {
        console.log(`[WeeklyTournament] Tournament already exists for week ${weekNumber}`);
        return { success: true, tournamentId: this.currentTournamentId };
      }
    }

    const weekStart = this._getWeekStart();
    const weekEnd = this._getWeekEnd();

    // Create tournament
    const result = this.engine.createTournament({
      name: `${theme.name} - Week ${weekNumber}`,
      description: theme.description,
      type: 'weekly',
      theme: theme.id,
      scoringRules: theme.scoringRules,
      entryFee: this.config.entryFee,
      prizePool: this.config.basePrizePool,
      prizeDistribution: this.config.prizeDistribution,
      startsAt: weekStart.toISOString(),
      endsAt: weekEnd.toISOString(),
    });

    if (result.success) {
      this.currentTournamentId = result.tournament.id;
      this.currentWeek = weekNumber;
      this.currentTheme = theme;
      this.save();

      console.log(`[WeeklyTournament] Created tournament for week ${weekNumber}: ${result.tournament.id}`);

      return { success: true, tournamentId: this.currentTournamentId };
    }

    return { success: false, error: result.error };
  }

  /**
   * Record a catch for a player.
   * @param {string} playerUuid - Player UUID
   * @param {string} playerName - Player name
   * @param {Object} fishData - Fish data
   * @param {string} fishData.rarity - Fish rarity
   * @param {number} [fishData.size] - Fish size (for biggest catch)
   * @returns {{ success: boolean, score?: number, error?: string }}
   */
  recordCatch(playerUuid, playerName, fishData) {
    if (!this.currentTournamentId) {
      this.initialize();
    }

    const tournament = this.engine.getTournament(this.currentTournamentId);
    if (!tournament) {
      return { success: false, error: 'No active weekly tournament' };
    }

    // Check if registered
    if (!tournament.participants[playerUuid]) {
      return { success: false, error: 'Not registered. Pay entry fee first.' };
    }

    // Calculate score based on theme
    let score = 0;
    const themeId = this.currentTheme?.id || tournament.theme;

    switch (themeId) {
      case 'most_fish':
        score = 1; // Each fish counts as 1
        break;

      case 'biggest_catch':
        score = fishData.size || 1;
        break;

      case 'rarest_fish':
        score = RARITY_POINTS[fishData.rarity] || 1;
        break;

      case 'speed_fishing':
        // Track hourly catches
        score = this._trackHourlyCatch(playerUuid);
        break;

      default:
        score = 1;
    }

    // Submit score (use max for biggest/rarest, accumulate for most_fish)
    const useMax = themeId === 'biggest_catch' || themeId === 'rarest_fish';
    const currentScore = tournament.scores[playerUuid] || 0;

    if (useMax) {
      return this.engine.submitScore(playerUuid, this.currentTournamentId, Math.max(currentScore, score), true);
    } else if (themeId === 'speed_fishing') {
      // For speed fishing, track best hourly session
      return this.engine.submitScore(playerUuid, this.currentTournamentId, score, true);
    } else {
      return this.engine.submitScore(playerUuid, this.currentTournamentId, currentScore + score, false);
    }
  }

  /**
   * Track hourly catches for speed fishing theme.
   * @private
   * @param {string} playerUuid
   * @returns {number} Best hourly count
   */
  _trackHourlyCatch(playerUuid) {
    const now = Date.now();
    const hourAgo = now - 3600000;

    if (!this.hourlyCatches.has(playerUuid)) {
      this.hourlyCatches.set(playerUuid, []);
    }

    const catches = this.hourlyCatches.get(playerUuid);

    // Add new catch
    catches.push(now);

    // Remove catches older than 1 hour
    while (catches.length > 0 && catches[0] < hourAgo) {
      catches.shift();
    }

    // Return count in last hour
    return catches.length;
  }

  /**
   * Register a player for the weekly tournament.
   * @param {string} playerUuid
   * @param {string} playerName
   * @returns {{ success: boolean, error?: string }}
   */
  register(playerUuid, playerName) {
    if (!this.currentTournamentId) {
      this.initialize();
    }

    return this.engine.register(playerUuid, playerName, this.currentTournamentId);
  }

  /**
   * Get current theme.
   * @returns {WeeklyTheme|null}
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get all available themes.
   * @returns {WeeklyTheme[]}
   */
  getAllThemes() {
    return [...WEEKLY_THEMES];
  }

  /**
   * Get current weekly tournament.
   * @returns {Object|null}
   */
  getCurrentTournament() {
    if (!this.currentTournamentId) return null;
    return this.engine.getTournament(this.currentTournamentId);
  }

  /**
   * Get leaderboard for current tournament.
   * @param {number} [limit=10]
   * @returns {Object[]}
   */
  getLeaderboard(limit = 10) {
    if (!this.currentTournamentId) return [];
    return this.engine.getLeaderboard(this.currentTournamentId, limit);
  }

  /**
   * Get player's current rank and score.
   * @param {string} playerUuid
   * @returns {{ rank: number, score: number }|null}
   */
  getPlayerStats(playerUuid) {
    const tournament = this.getCurrentTournament();
    if (!tournament) return null;

    if (!tournament.participants[playerUuid]) {
      return null;
    }

    const leaderboard = this.getLeaderboard(100);
    const entry = leaderboard.find(e => {
      const participant = tournament.participants[playerUuid];
      return participant && e.name === participant.name;
    });

    return {
      rank: entry ? entry.rank : null,
      score: tournament.scores[playerUuid] || 0,
      registered: true,
    };
  }

  /**
   * Get time remaining in current tournament.
   * @returns {{ days: number, hours: number, minutes: number, total: number }|null}
   */
  getTimeRemaining() {
    const tournament = this.getCurrentTournament();
    if (!tournament) return null;

    const now = new Date();
    const endsAt = new Date(tournament.endsAt);
    const remaining = Math.max(0, endsAt - now);

    return {
      days: Math.floor(remaining / (1000 * 60 * 60 * 24)),
      hours: Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
      total: remaining,
    };
  }

  /**
   * Get weekly tournament statistics.
   * @returns {Object}
   */
  getStats() {
    const tournament = this.getCurrentTournament();

    if (!tournament) {
      return {
        active: false,
        week: this.currentWeek,
        tournamentId: this.currentTournamentId,
        theme: this.currentTheme,
      };
    }

    const participantCount = Object.keys(tournament.participants).length;
    const totalPrizePool = tournament.prizePool;

    return {
      active: tournament.status === 'active',
      week: this.currentWeek,
      tournamentId: this.currentTournamentId,
      name: tournament.name,
      theme: this.currentTheme,
      status: tournament.status,
      entryFee: tournament.entryFee,
      participantCount,
      prizePool: totalPrizePool,
      timeRemaining: this.getTimeRemaining(),
    };
  }

  /**
   * Force complete current tournament (admin).
   * @returns {{ success: boolean, results?: Object, error?: string }}
   */
  forceComplete() {
    if (!this.currentTournamentId) {
      return { success: false, error: 'No active tournament' };
    }

    const result = this.engine.completeTournament(this.currentTournamentId);

    if (result.success) {
      this.currentTournamentId = null;
      this.currentWeek = null;
      this.currentTheme = null;
      this.hourlyCatches.clear();
      this.save();
    }

    return result;
  }

  /**
   * Shutdown the weekly tournament manager.
   */
  shutdown() {
    if (this._resetInterval) {
      clearInterval(this._resetInterval);
      this._resetInterval = null;
    }
    this.save();
  }
}

module.exports = {
  WeeklyTournament,
  WEEKLY_THEMES,
  RARITY_POINTS,
};
