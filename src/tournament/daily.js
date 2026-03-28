/**
 * @module craftmind/tournament/daily
 * @description DailyTournament - Daily fishing competition management.
 *
 * Auto-generates and manages daily "Most Fish Caught" tournaments.
 * Resets at midnight with small rewards for top 3 players.
 *
 * @example
 * const daily = new DailyTournament(engine, economy);
 * daily.initialize(); // Create today's tournament
 * daily.recordCatch('player-uuid', 'PlayerName'); // Record a catch
 * const leaderboard = daily.getLeaderboard();
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} DailyTournamentConfig
 * @property {number} [prizePool=150] - Total prize pool in credits
 * @property {number[]} [prizeDistribution=[0.5, 0.3, 0.2]] - Prize percentages
 * @property {string} [timezone='UTC'] - Timezone for midnight reset
 * @property {string} [name='Daily Catch Challenge'] - Tournament name
 */

const DEFAULT_CONFIG = {
  prizePool: 150,
  prizeDistribution: [0.5, 0.3, 0.2], // 50%, 30%, 20%
  timezone: 'UTC',
  name: 'Daily Catch Challenge',
  description: 'Catch the most fish today to win prizes!',
};

/**
 * DailyTournament class for managing daily fishing competitions.
 */
class DailyTournament {
  /**
   * Create a new DailyTournament manager.
   * @param {Object} engine - TournamentEngine instance
   * @param {Object} economy - GameEconomy instance
   * @param {string} [dataDir='./data/tournaments'] - Data directory
   * @param {DailyTournamentConfig} [config={}] - Configuration
   */
  constructor(engine, economy, dataDir = './data/tournaments', config = {}) {
    /** @type {Object} Tournament engine */
    this.engine = engine;

    /** @type {Object} Economy manager */
    this.economy = economy;

    /** @type {string} Data directory */
    this.dataDir = dataDir;

    /** @type {DailyTournamentConfig} Configuration */
    this.config = { ...DEFAULT_CONFIG, ...config };

    /** @type {string|null} Current daily tournament ID */
    this.currentTournamentId = null;

    /** @type {string} Today's date (YYYY-MM-DD) */
    this.tournamentDate = null;

    /** @type {NodeJS.Timeout|null} Reset check interval */
    this._resetInterval = null;

    // Load state
    this.load();

    // Start reset checker
    this._startResetChecker();
  }

  /**
   * Get today's date string.
   * @private
   * @returns {string} YYYY-MM-DD
   */
  _getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get tomorrow's date at midnight.
   * @private
   * @returns {Date}
   */
  _getTomorrowMidnight() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Start the reset checker.
   * @private
   */
  _startResetChecker() {
    // Check every minute for midnight reset
    this._resetInterval = setInterval(() => {
      this._checkReset();
    }, 60 * 1000);
  }

  /**
   * Check if we need to reset the tournament.
   * @private
   */
  _checkReset() {
    const today = this._getTodayString();

    if (this.tournamentDate !== today) {
      console.log(`[DailyTournament] New day detected: ${today}`);
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

    // Create new tournament
    this.initialize();
  }

  /**
   * Load state from disk.
   * @returns {boolean}
   */
  load() {
    const filePath = path.join(this.dataDir, 'daily-state.json');
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.currentTournamentId = data.currentTournamentId;
        this.tournamentDate = data.tournamentDate;
        return true;
      }
    } catch (err) {
      console.warn(`[DailyTournament] Failed to load: ${err.message}`);
    }
    return false;
  }

  /**
   * Save state to disk.
   * @returns {boolean}
   */
  save() {
    const filePath = path.join(this.dataDir, 'daily-state.json');
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      const data = {
        currentTournamentId: this.currentTournamentId,
        tournamentDate: this.tournamentDate,
        savedAt: new Date().toISOString(),
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.warn(`[DailyTournament] Failed to save: ${err.message}`);
      return false;
    }
  }

  /**
   * Initialize today's daily tournament.
   * @returns {{ success: boolean, tournamentId?: string, error?: string }}
   */
  initialize() {
    const today = this._getTodayString();

    // Check if already exists for today
    if (this.tournamentDate === today && this.currentTournamentId) {
      const existing = this.engine.getTournament(this.currentTournamentId);
      if (existing) {
        console.log(`[DailyTournament] Tournament already exists for ${today}`);
        return { success: true, tournamentId: this.currentTournamentId };
      }
    }

    // Calculate start/end times
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Create tournament
    const result = this.engine.createTournament({
      name: `${this.config.name} - ${today}`,
      description: this.config.description,
      type: 'daily',
      theme: 'most_fish',
      scoringRules: {
        metric: 'fish_count',
        higherIsBetter: true,
      },
      entryFee: 0,
      prizePool: this.config.prizePool,
      prizeDistribution: this.config.prizeDistribution,
      startsAt: startOfDay.toISOString(),
      endsAt: endOfDay.toISOString(),
    });

    if (result.success) {
      this.currentTournamentId = result.tournament.id;
      this.tournamentDate = today;
      this.save();

      console.log(`[DailyTournament] Created tournament for ${today}: ${result.tournament.id}`);

      return { success: true, tournamentId: this.currentTournamentId };
    }

    return { success: false, error: result.error };
  }

  /**
   * Record a catch for a player.
   * @param {string} playerUuid - Player UUID
   * @param {string} playerName - Player name
   * @param {number} [count=1] - Number of fish caught
   * @returns {{ success: boolean, score?: number, error?: string }}
   */
  recordCatch(playerUuid, playerName, count = 1) {
    if (!this.currentTournamentId) {
      // Auto-initialize if needed
      this.initialize();
    }

    const tournament = this.engine.getTournament(this.currentTournamentId);
    if (!tournament) {
      return { success: false, error: 'No active daily tournament' };
    }

    // Auto-register if not registered
    if (!tournament.participants[playerUuid]) {
      const regResult = this.engine.register(playerUuid, playerName, this.currentTournamentId);
      if (!regResult.success) {
        return { success: false, error: regResult.error };
      }
    }

    // Submit score (accumulate)
    const currentScore = tournament.scores[playerUuid] || 0;
    return this.engine.submitScore(playerUuid, this.currentTournamentId, currentScore + count, true);
  }

  /**
   * Get current daily tournament.
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

    // Calculate rank
    const leaderboard = this.getLeaderboard(100);
    const entry = leaderboard.find(e => {
      const participant = tournament.participants[playerUuid];
      return participant && e.name === participant.name;
    });

    return {
      rank: entry ? entry.rank : null,
      score: tournament.scores[playerUuid] || 0,
    };
  }

  /**
   * Get time remaining in current tournament.
   * @returns {{ hours: number, minutes: number, total: number }|null}
   */
  getTimeRemaining() {
    const tournament = this.getCurrentTournament();
    if (!tournament) return null;

    const now = new Date();
    const endsAt = new Date(tournament.endsAt);
    const remaining = Math.max(0, endsAt - now);

    return {
      hours: Math.floor(remaining / (1000 * 60 * 60)),
      minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
      total: remaining,
    };
  }

  /**
   * Get daily tournament statistics.
   * @returns {Object}
   */
  getStats() {
    const tournament = this.getCurrentTournament();

    if (!tournament) {
      return {
        active: false,
        date: this.tournamentDate,
        tournamentId: this.currentTournamentId,
      };
    }

    const participantCount = Object.keys(tournament.participants).length;
    const totalFishCaught = Object.values(tournament.scores).reduce((a, b) => a + b, 0);

    return {
      active: tournament.status === 'active',
      date: this.tournamentDate,
      tournamentId: this.currentTournamentId,
      name: tournament.name,
      status: tournament.status,
      participantCount,
      totalFishCaught,
      prizePool: tournament.prizePool,
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
      this.tournamentDate = null;
      this.save();
    }

    return result;
  }

  /**
   * Shutdown the daily tournament manager.
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
  DailyTournament,
};
