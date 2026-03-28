/**
 * @module craftmind/tournament/engine
 * @description TournamentEngine - Tournament lifecycle management.
 *
 * Manages tournament creation, registration, scoring, and prize distribution.
 * Supports daily, weekly, and seasonal tournaments with various themes.
 *
 * @example
 * const engine = new TournamentEngine(economy);
 * engine.createTournament({
 *   name: 'Daily Catch',
 *   type: 'daily',
 *   theme: 'most_fish',
 *   scoringRules: { metric: 'fish_count', higher_is_better: true }
 * });
 * engine.register('player-uuid', 'tournament-id');
 * engine.submitScore('player-uuid', 'tournament-id', 25);
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * @typedef {Object} Tournament
 * @property {string} id - Unique tournament ID
 * @property {string} name - Tournament name
 * @property {string} description - Tournament description
 * @property {string} type - Tournament type (daily, weekly, seasonal)
 * @property {string} theme - Tournament theme
 * @property {string} status - Current status (registration, countdown, active, results, cooldown)
 * @property {Object} scoringRules - Scoring configuration
 * @property {number} entryFee - Entry fee in credits
 * @property {number[]} prizeDistribution - Prize distribution percentages
 * @property {string} startsAt - Start timestamp
 * @property {string} endsAt - End timestamp
 * @property {Object.<string, Object>} participants - Participant data by UUID
 * @property {Object.<string, number>} scores - Scores by UUID
 * @property {Object} [results] - Final results after completion
 */

/**
 * @typedef {Object} TournamentConfig
 * @property {string} name - Tournament name
 * @property {string} description - Tournament description
 * @property {string} type - Tournament type
 * @property {string} theme - Tournament theme
 * @property {Object} scoringRules - Scoring rules
 * @property {number} [entryFee=0] - Entry fee
 * @property {number[]} [prizeDistribution=[0.7, 0.2, 0.1]] - Prize percentages
 * @property {number} [prizePool=0] - Base prize pool
 * @property {string} [startsAt] - Start time
 * @property {string} [endsAt] - End time
 * @property {number} [duration] - Duration in minutes
 */

/**
 * @typedef {Object} Participant
 * @property {string} uuid - Player UUID
 * @property {string} name - Player name
 * @property {string} registeredAt - Registration timestamp
 * @property {number} [score] - Current score
 * @property {number} [rank] - Final rank
 */

const TOURNAMENT_STATUS = {
  REGISTRATION: 'registration',
  COUNTDOWN: 'countdown',
  ACTIVE: 'active',
  RESULTS: 'results',
  COOLDOWN: 'cooldown',
  COMPLETED: 'completed',
};

const STATUS_TRANSITIONS = {
  [TOURNAMENT_STATUS.REGISTRATION]: [TOURNAMENT_STATUS.COUNTDOWN, TOURNAMENT_STATUS.ACTIVE],
  [TOURNAMENT_STATUS.COUNTDOWN]: [TOURNAMENT_STATUS.ACTIVE],
  [TOURNAMENT_STATUS.ACTIVE]: [TOURNAMENT_STATUS.RESULTS],
  [TOURNAMENT_STATUS.RESULTS]: [TOURNAMENT_STATUS.COOLDOWN, TOURNAMENT_STATUS.COMPLETED],
  [TOURNAMENT_STATUS.COOLDOWN]: [TOURNAMENT_STATUS.COMPLETED],
};

/**
 * TournamentEngine class for managing tournaments.
 */
class TournamentEngine {
  /**
   * Create a new TournamentEngine.
   * @param {Object} economy - GameEconomy instance
   * @param {string} [dataDir='./data/tournaments'] - Data directory
   */
  constructor(economy, dataDir = './data/tournaments') {
    /** @type {Object} Economy manager */
    this.economy = economy;

    /** @type {string} Data directory */
    this.dataDir = dataDir;

    /** @type {Map<string, Tournament>} Active tournaments by ID */
    this.tournaments = new Map();

    /** @type {Map<string, string[]>} Tournament IDs by type */
    this.byType = new Map();

    /** @type {Map<string, string[]>} Tournament IDs by status */
    this.byStatus = new Map();

    /** @type {Object} Tournament templates */
    this.templates = this._loadTemplates();

    /** @type {number} Status check interval */
    this._checkInterval = null;

    // Load from disk
    this.load();

    // Start status checker
    this._startStatusChecker();
  }

  /**
   * Load tournament templates.
   * @private
   * @returns {Object}
   */
  _loadTemplates() {
    const templatePath = path.join(this.dataDir, 'templates.json');
    try {
      if (fs.existsSync(templatePath)) {
        return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      }
    } catch (err) {
      console.warn(`[TournamentEngine] Failed to load templates: ${err.message}`);
    }

    // Default templates
    return {
      daily: {
        name: 'Daily Tournament',
        type: 'daily',
        description: 'Daily fishing competition',
        theme: 'most_fish',
        entryFee: 0,
        prizeDistribution: [0.5, 0.3, 0.2],
        prizePool: 150,
        scoringRules: { metric: 'fish_count', higherIsBetter: true },
        duration: 24 * 60, // 24 hours in minutes
      },
      weekly: {
        name: 'Weekly Tournament',
        type: 'weekly',
        description: 'Weekly fishing championship',
        theme: 'biggest_catch',
        entryFee: 100,
        prizeDistribution: [0.7, 0.2, 0.1],
        prizePool: 1000,
        scoringRules: { metric: 'biggest_fish', higherIsBetter: true },
        duration: 7 * 24 * 60, // 7 days in minutes
      },
    };
  }

  /**
   * Start the status checker interval.
   * @private
   */
  _startStatusChecker() {
    // Check every minute
    this._checkInterval = setInterval(() => {
      this._updateTournamentStatuses();
    }, 60 * 1000);
  }

  /**
   * Update tournament statuses based on time.
   * @private
   */
  _updateTournamentStatuses() {
    const now = new Date();

    for (const [id, tournament] of this.tournaments) {
      const startsAt = new Date(tournament.startsAt);
      const endsAt = new Date(tournament.endsAt);

      if (tournament.status === TOURNAMENT_STATUS.REGISTRATION && now >= startsAt) {
        this._transitionStatus(id, TOURNAMENT_STATUS.ACTIVE);
      } else if (tournament.status === TOURNAMENT_STATUS.ACTIVE && now >= endsAt) {
        this.completeTournament(id);
      }
    }
  }

  /**
   * Transition tournament to new status.
   * @private
   * @param {string} tournamentId
   * @param {string} newStatus
   * @returns {boolean}
   */
  _transitionStatus(tournamentId, newStatus) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return false;

    const allowed = STATUS_TRANSITIONS[tournament.status] || [];
    if (!allowed.includes(newStatus)) {
      console.warn(`[TournamentEngine] Cannot transition from ${tournament.status} to ${newStatus}`);
      return false;
    }

    const oldStatus = tournament.status;
    tournament.status = newStatus;
    tournament.statusChangedAt = new Date().toISOString();

    // Update indexes
    this._deindexByStatus(tournament, oldStatus);
    this._indexByStatus(tournament);

    console.log(`[TournamentEngine] Tournament ${tournamentId} transitioned: ${oldStatus} -> ${newStatus}`);

    this.save();
    return true;
  }

  /**
   * Generate a unique tournament ID.
   * @private
   * @returns {string}
   */
  _generateId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(3).toString('hex');
    return `tourn_${timestamp}_${random}`;
  }

  /**
   * Load tournaments from disk.
   * @returns {boolean}
   */
  load() {
    const filePath = path.join(this.dataDir, 'tournaments.json');
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (data.tournaments) {
          for (const tournament of data.tournaments) {
            this.tournaments.set(tournament.id, tournament);
            this._indexTournament(tournament);
          }
        }

        console.log(`[TournamentEngine] Loaded ${this.tournaments.size} tournaments`);
        return true;
      }
    } catch (err) {
      console.warn(`[TournamentEngine] Failed to load: ${err.message}`);
    }
    return false;
  }

  /**
   * Index a tournament for lookups.
   * @private
   * @param {Tournament} tournament
   */
  _indexTournament(tournament) {
    // Index by type
    if (!this.byType.has(tournament.type)) {
      this.byType.set(tournament.type, []);
    }
    if (!this.byType.get(tournament.type).includes(tournament.id)) {
      this.byType.get(tournament.type).push(tournament.id);
    }

    // Index by status
    this._indexByStatus(tournament);
  }

  /**
   * Index tournament by status.
   * @private
   * @param {Tournament} tournament
   */
  _indexByStatus(tournament) {
    if (!this.byStatus.has(tournament.status)) {
      this.byStatus.set(tournament.status, []);
    }
    if (!this.byStatus.get(tournament.status).includes(tournament.id)) {
      this.byStatus.get(tournament.status).push(tournament.id);
    }
  }

  /**
   * Deindex tournament by status.
   * @private
   * @param {Tournament} tournament
   * @param {string} status
   */
  _deindexByStatus(tournament, status) {
    const ids = this.byStatus.get(status);
    if (ids) {
      const idx = ids.indexOf(tournament.id);
      if (idx >= 0) {
        ids.splice(idx, 1);
      }
    }
  }

  /**
   * Save tournaments to disk.
   * @returns {boolean}
   */
  save() {
    const filePath = path.join(this.dataDir, 'tournaments.json');
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      const data = {
        tournaments: Array.from(this.tournaments.values()),
        savedAt: new Date().toISOString(),
        version: 1,
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.warn(`[TournamentEngine] Failed to save: ${err.message}`);
      return false;
    }
  }

  /**
   * Create a new tournament.
   * @param {TournamentConfig} config - Tournament configuration
   * @returns {{ success: boolean, tournament?: Tournament, error?: string }}
   */
  createTournament(config) {
    const now = new Date();
    const startsAt = config.startsAt ? new Date(config.startsAt) : now;
    const endsAt = config.endsAt
      ? new Date(config.endsAt)
      : new Date(startsAt.getTime() + (config.duration || 1440) * 60 * 1000);

    const tournament = {
      id: this._generateId(),
      name: config.name || 'Tournament',
      description: config.description || '',
      type: config.type || 'daily',
      theme: config.theme || 'most_fish',
      status: TOURNAMENT_STATUS.REGISTRATION,
      scoringRules: config.scoringRules || { metric: 'fish_count', higherIsBetter: true },
      entryFee: config.entryFee || 0,
      prizeDistribution: config.prizeDistribution || [0.7, 0.2, 0.1],
      prizePool: config.prizePool || 0,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      participants: {},
      scores: {},
      createdAt: now.toISOString(),
    };

    this.tournaments.set(tournament.id, tournament);
    this._indexTournament(tournament);
    this.save();

    console.log(`[TournamentEngine] Created tournament ${tournament.id}: ${tournament.name}`);

    return { success: true, tournament };
  }

  /**
   * Create tournament from template.
   * @param {string} templateName - Template name (daily, weekly)
   * @param {Object} [overrides={}] - Configuration overrides
   * @returns {{ success: boolean, tournament?: Tournament, error?: string }}
   */
  createFromTemplate(templateName, overrides = {}) {
    const template = this.templates[templateName];
    if (!template) {
      return { success: false, error: `Template not found: ${templateName}` };
    }

    return this.createTournament({ ...template, ...overrides });
  }

  /**
   * Register a player for a tournament.
   * @param {string} playerUuid - Player UUID
   * @param {string} playerName - Player display name
   * @param {string} tournamentId - Tournament ID
   * @returns {{ success: boolean, error?: string }}
   */
  register(playerUuid, playerName, tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return { success: false, error: 'Tournament not found' };
    }

    if (tournament.status !== TOURNAMENT_STATUS.REGISTRATION) {
      return { success: false, error: `Registration is closed (status: ${tournament.status})` };
    }

    if (tournament.participants[playerUuid]) {
      return { success: false, error: 'Already registered' };
    }

    // Check entry fee
    if (tournament.entryFee > 0) {
      const balance = this.economy.getBalance(playerName);
      if (balance < tournament.entryFee) {
        return { success: false, error: `Insufficient funds: need ${tournament.entryFee}, have ${balance}` };
      }

      // Deduct entry fee
      this.economy.spendCurrency(playerName, tournament.entryFee, `tournament:entry:${tournamentId}`);
      tournament.prizePool += tournament.entryFee;
    }

    tournament.participants[playerUuid] = {
      uuid: playerUuid,
      name: playerName,
      registeredAt: new Date().toISOString(),
      score: 0,
    };

    tournament.scores[playerUuid] = 0;

    this.save();
    this.economy.save();

    console.log(`[TournamentEngine] ${playerName} registered for tournament ${tournamentId}`);

    return { success: true };
  }

  /**
   * Submit a score for a tournament.
   * @param {string} playerUuid - Player UUID
   * @param {string} tournamentId - Tournament ID
   * @param {number} score - Score value
   * @param {boolean} [replace=false] - Replace existing score (vs accumulate)
   * @returns {{ success: boolean, error?: string, score?: number }}
   */
  submitScore(playerUuid, tournamentId, score, replace = false) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return { success: false, error: 'Tournament not found' };
    }

    if (tournament.status !== TOURNAMENT_STATUS.ACTIVE) {
      return { success: false, error: `Tournament is not active (status: ${tournament.status})` };
    }

    if (!tournament.participants[playerUuid]) {
      return { success: false, error: 'Not registered for this tournament' };
    }

    // Update score
    if (replace) {
      tournament.scores[playerUuid] = score;
    } else {
      // For accumulating scores, use the higher value if scoringRules.higherIsBetter
      const higherIsBetter = tournament.scoringRules?.higherIsBetter !== false;
      if (higherIsBetter) {
        tournament.scores[playerUuid] = Math.max(tournament.scores[playerUuid] || 0, score);
      } else {
        tournament.scores[playerUuid] = Math.min(tournament.scores[playerUuid] || Infinity, score);
      }
    }

    tournament.participants[playerUuid].score = tournament.scores[playerUuid];
    tournament.participants[playerUuid].lastUpdated = new Date().toISOString();

    this.save();

    return { success: true, score: tournament.scores[playerUuid] };
  }

  /**
   * Complete a tournament and distribute prizes.
   * @param {string} tournamentId - Tournament ID
   * @returns {{ success: boolean, results?: Object, error?: string }}
   */
  completeTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return { success: false, error: 'Tournament not found' };
    }

    if (tournament.status === TOURNAMENT_STATUS.COMPLETED) {
      return { success: false, error: 'Tournament already completed' };
    }

    // Transition to results status
    this._transitionStatus(tournamentId, TOURNAMENT_STATUS.RESULTS);

    // Calculate rankings
    const higherIsBetter = tournament.scoringRules?.higherIsBetter !== false;
    const sortedParticipants = Object.values(tournament.participants)
      .filter(p => p.score > 0 || tournament.scores[p.uuid] > 0)
      .sort((a, b) => {
        const scoreA = tournament.scores[a.uuid] || 0;
        const scoreB = tournament.scores[b.uuid] || 0;
        return higherIsBetter ? scoreB - scoreA : scoreA - scoreB;
      });

    // Assign ranks
    sortedParticipants.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    // Distribute prizes
    const prizes = [];
    const prizeCount = Math.min(tournament.prizeDistribution.length, sortedParticipants.length);

    for (let i = 0; i < prizeCount; i++) {
      const participant = sortedParticipants[i];
      const prizePercent = tournament.prizeDistribution[i];
      const prizeAmount = Math.floor(tournament.prizePool * prizePercent);

      if (prizeAmount > 0) {
        this.economy.addCurrency(
          participant.name,
          prizeAmount,
          `tournament:prize:${tournamentId}`
        );

        prizes.push({
          rank: i + 1,
          player: participant.name,
          score: participant.score,
          prize: prizeAmount,
        });
      }
    }

    // Set final results
    tournament.results = {
      rankings: sortedParticipants.map(p => ({
        rank: p.rank,
        name: p.name,
        uuid: p.uuid,
        score: p.score,
      })),
      prizes,
      totalPrizePool: tournament.prizePool,
      participantCount: Object.keys(tournament.participants).length,
      completedAt: new Date().toISOString(),
    };

    // Transition to completed
    tournament.status = TOURNAMENT_STATUS.COMPLETED;
    this._indexByStatus(tournament);

    this.save();
    this.economy.save();

    console.log(`[TournamentEngine] Tournament ${tournamentId} completed. Prize pool: ${tournament.prizePool}`);

    return { success: true, results: tournament.results };
  }

  /**
   * Get a tournament by ID.
   * @param {string} tournamentId
   * @returns {Tournament|null}
   */
  getTournament(tournamentId) {
    return this.tournaments.get(tournamentId) || null;
  }

  /**
   * Get tournaments by type.
   * @param {string} type - Tournament type
   * @param {boolean} [activeOnly=true] - Only return active tournaments
   * @returns {Tournament[]}
   */
  getTournamentsByType(type, activeOnly = true) {
    const ids = this.byType.get(type) || [];
    return ids
      .map(id => this.tournaments.get(id))
      .filter(t => t && (!activeOnly || t.status !== TOURNAMENT_STATUS.COMPLETED));
  }

  /**
   * Get tournaments by status.
   * @param {string} status - Tournament status
   * @returns {Tournament[]}
   */
  getTournamentsByStatus(status) {
    const ids = this.byStatus.get(status) || [];
    return ids.map(id => this.tournaments.get(id)).filter(Boolean);
  }

  /**
   * Get active tournament for a type.
   * @param {string} type - Tournament type
   * @returns {Tournament|null}
   */
  getActiveTournament(type) {
    const active = this.getTournamentsByStatus(TOURNAMENT_STATUS.ACTIVE);
    return active.find(t => t.type === type) || null;
  }

  /**
   * Get leaderboard for a tournament.
   * @param {string} tournamentId
   * @param {number} [limit=10]
   * @returns {Object[]}
   */
  getLeaderboard(tournamentId, limit = 10) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return [];

    const higherIsBetter = tournament.scoringRules?.higherIsBetter !== false;
    return Object.values(tournament.participants)
      .filter(p => tournament.scores[p.uuid] > 0)
      .sort((a, b) => {
        const scoreA = tournament.scores[a.uuid] || 0;
        const scoreB = tournament.scores[b.uuid] || 0;
        return higherIsBetter ? scoreB - scoreA : scoreA - scoreB;
      })
      .slice(0, limit)
      .map((p, idx) => ({
        rank: idx + 1,
        name: p.name,
        score: tournament.scores[p.uuid],
      }));
  }

  /**
   * Get player's tournament participation.
   * @param {string} playerUuid
   * @returns {Object[]}
   */
  getPlayerTournaments(playerUuid) {
    const participations = [];

    for (const tournament of this.tournaments.values()) {
      if (tournament.participants[playerUuid]) {
        participations.push({
          id: tournament.id,
          name: tournament.name,
          type: tournament.type,
          status: tournament.status,
          score: tournament.scores[playerUuid] || 0,
          rank: tournament.participants[playerUuid].rank,
        });
      }
    }

    return participations;
  }

  /**
   * Get engine statistics.
   * @returns {Object}
   */
  getStats() {
    const byType = {};
    const byStatus = {};

    for (const [type, ids] of this.byType) {
      byType[type] = ids.length;
    }

    for (const [status, ids] of this.byStatus) {
      byStatus[status] = ids.length;
    }

    return {
      totalTournaments: this.tournaments.size,
      byType,
      byStatus,
      templates: Object.keys(this.templates),
    };
  }

  /**
   * Stop the status checker.
   */
  shutdown() {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
    this.save();
  }

  /**
   * Clear all tournaments (for testing).
   */
  clear() {
    this.tournaments.clear();
    this.byType.clear();
    this.byStatus.clear();
  }
}

module.exports = {
  TournamentEngine,
  TOURNAMENT_STATUS,
};
