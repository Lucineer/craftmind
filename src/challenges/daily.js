/**
 * @module craftmind/challenges/daily
 * @description ChallengeManager - Daily challenge generation and tracking.
 *
 * Generates 3 daily challenges per player (easy, medium, hard) with
 * various types including catch_count, catch_rarity, catch_size,
 * catch_species, earn_credits, and talk_to_npc.
 *
 * @example
 * const challenges = new ChallengeManager('./data/challenges');
 * challenges.loadPool('./data/challenges/pool.json');
 * const daily = challenges.generateDailyChallenges('player-uuid-123');
 * challenges.updateProgress('player-uuid-123', 'challenge-id', 5);
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} Challenge
 * @property {string} id - Unique challenge identifier
 * @property {string} title - Challenge title
 * @property {string} description - Challenge description
 * @property {string} type - Challenge type
 * @property {number} target - Target value to complete
 * @property {number} progress - Current progress
 * @property {Object} reward - Reward for completion
 * @property {number} reward.xp - XP reward
 * @property {number} reward.credits - Credits reward
 * @property {string} timeLimit - Time limit (e.g., "24h")
 * @property {string} difficulty - "easy", "medium", or "hard"
 * @property {string} createdAt - ISO timestamp
 * @property {string} expiresAt - ISO timestamp
 * @property {boolean} completed - Whether challenge is completed
 * @property {boolean} claimed - Whether reward was claimed
 */

/**
 * @typedef {Object} ChallengeTemplate
 * @property {string} type - Challenge type
 * @property {string} difficulty - Difficulty level
 * @property {number[]} targetRange - [min, max] target values
 * @property {number[]} rewardRange - [min, max] reward values
 * @property {string[]} titleTemplates - Title templates with {target} placeholder
 * @property {string[]} descriptionTemplates - Description templates
 */

/** @constant {Object} Difficulty configurations */
const DIFFICULTY_CONFIG = {
  easy: {
    xpMultiplier: 1,
    creditsMultiplier: 1,
    targetMultiplier: 0.5,
    count: 1,
  },
  medium: {
    xpMultiplier: 2,
    creditsMultiplier: 2,
    targetMultiplier: 1,
    count: 1,
  },
  hard: {
    xpMultiplier: 4,
    creditsMultiplier: 3,
    targetMultiplier: 1.5,
    count: 1,
  },
};

/** @constant {Object} Challenge type configurations */
const CHALLENGE_TYPES = {
  catch_count: {
    titleTemplates: [
      'Catch {target} fish',
      'Reel in {target} catches',
      'Daily haul: {target} fish',
    ],
    descriptionTemplates: [
      'Catch any {target} fish today.',
      'Your goal: bring in {target} fish of any type.',
    ],
    unit: 'fish',
  },
  catch_rarity: {
    titleTemplates: [
      'Catch {target} rare fish',
      'Rare specimen hunt: {target}',
      'Legendary pursuit: {target}',
    ],
    descriptionTemplates: [
      'Catch {target} rare or legendary fish.',
      'Find and catch {target} fish of rare quality or higher.',
    ],
    unit: 'rare fish',
  },
  catch_size: {
    titleTemplates: [
      'Catch a {target}lb fish',
      'Big catch challenge: {target}lbs',
      'Trophy hunt: {target}lb monster',
    ],
    descriptionTemplates: [
      'Catch a fish weighing at least {target} pounds.',
      'Land a {target} pound trophy fish.',
    ],
    unit: 'lbs',
  },
  catch_species: {
    titleTemplates: [
      'Catch {target} different species',
      'Variety challenge: {target} species',
      'Collector: {target} unique fish',
    ],
    descriptionTemplates: [
      'Catch {target} different species of fish.',
      'Diversify your catch with {target} unique species.',
    ],
    unit: 'species',
  },
  earn_credits: {
    titleTemplates: [
      'Earn {target} credits',
      'Profit challenge: {target} credits',
      'Wealth builder: {target}',
    ],
    descriptionTemplates: [
      'Earn {target} credits from selling fish or completing tasks.',
      'Make {target} credits today through any means.',
    ],
    unit: 'credits',
  },
  talk_to_npc: {
    titleTemplates: [
      'Chat with {target} NPCs',
      'Social butterfly: {target} conversations',
      'Networker: {target} NPCs',
    ],
    descriptionTemplates: [
      'Have conversations with {target} different NPCs.',
      'Talk to {target} NPCs around the village.',
    ],
    unit: 'NPCs',
  },
};

/**
 * Generate a unique ID.
 * @private
 * @returns {string}
 */
function generateId() {
  return `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get today's date string for file naming.
 * @private
 * @returns {string}
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * ChallengeManager class - manages daily challenges.
 */
class ChallengeManager {
  /**
   * Create a new ChallengeManager.
   * @param {string} [dataDir='./data/challenges'] - Directory for challenge data
   */
  constructor(dataDir = './data/challenges') {
    /** @type {string} Data directory */
    this.dataDir = dataDir;

    /** @type {Map<string, ChallengeTemplate[]>} Templates by difficulty */
    this.templates = new Map();

    /** @type {Map<string, Challenge[]>} Active challenges by player UUID */
    this.activeChallenges = new Map();

    /** @type {Map<string, Object>} Challenge pool loaded from file */
    this.pool = new Map();

    /** @type {boolean} Whether templates have been loaded */
    this._loaded = false;
  }

  /**
   * Load challenge templates from pool file.
   * @param {string} poolPath - Path to challenge pool JSON
   * @returns {boolean}
   */
  loadPool(poolPath) {
    try {
      if (!fs.existsSync(poolPath)) {
        console.warn(`[ChallengeManager] Pool file not found: ${poolPath}`);
        return false;
      }

      const data = JSON.parse(fs.readFileSync(poolPath, 'utf8'));

      // Index templates by difficulty
      this.templates.set('easy', data.filter(t => t.difficulty === 'easy'));
      this.templates.set('medium', data.filter(t => t.difficulty === 'medium'));
      this.templates.set('hard', data.filter(t => t.difficulty === 'hard'));

      // Also index by type for quick lookup
      for (const template of data) {
        const key = `${template.type}_${template.difficulty}`;
        this.pool.set(key, template);
      }

      this._loaded = true;
      console.log(`[ChallengeManager] Loaded ${data.length} challenge templates`);
      return true;
    } catch (err) {
      console.warn(`[ChallengeManager] Failed to load pool: ${err.message}`);
      return false;
    }
  }

  /**
   * Get file path for player's daily challenges.
   * @private
   * @param {string} playerUuid
   * @returns {string}
   */
  _getPlayerFilePath(playerUuid) {
    const today = getTodayString();
    return path.join(this.dataDir, `${playerUuid}-${today}.json`);
  }

  /**
   * Load player's daily challenges.
   * @param {string} playerUuid
   * @returns {Challenge[]}
   */
  loadPlayerChallenges(playerUuid) {
    const filePath = this._getPlayerFilePath(playerUuid);

    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const challenges = data.challenges || [];

        // Check for expired challenges
        const now = new Date().toISOString();
        const active = challenges.filter(c => c.expiresAt > now && !c.completed);

        this.activeChallenges.set(playerUuid, active);
        return active;
      }
    } catch (err) {
      console.warn(`[ChallengeManager] Failed to load player challenges: ${err.message}`);
    }

    return [];
  }

  /**
   * Save player's daily challenges.
   * @private
   * @param {string} playerUuid
   */
  _savePlayerChallenges(playerUuid) {
    const challenges = this.activeChallenges.get(playerUuid) || [];
    const filePath = this._getPlayerFilePath(playerUuid);

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        playerUuid,
        date: getTodayString(),
        challenges,
        savedAt: new Date().toISOString(),
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn(`[ChallengeManager] Failed to save: ${err.message}`);
    }
  }

  /**
   * Generate daily challenges for a player.
   * @param {string} playerUuid
   * @param {Object} [options]
   * @param {boolean} [options.forceNew=false] - Force regeneration
   * @returns {Challenge[]}
   */
  generateDailyChallenges(playerUuid, options = {}) {
    // Check for existing challenges
    if (!options.forceNew) {
      const existing = this.loadPlayerChallenges(playerUuid);
      if (existing.length > 0) {
        return existing;
      }
    }

    const challenges = [];
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Generate one of each difficulty
    for (const [difficulty, config] of Object.entries(DIFFICULTY_CONFIG)) {
      const challenge = this._generateChallenge(difficulty, config, now, endOfDay);
      if (challenge) {
        challenges.push(challenge);
      }
    }

    this.activeChallenges.set(playerUuid, challenges);
    this._savePlayerChallenges(playerUuid);

    return challenges;
  }

  /**
   * Generate a single challenge.
   * @private
   * @param {string} difficulty
   * @param {Object} config
   * @param {Date} now
   * @param {Date} expiresAt
   * @returns {Challenge|null}
   */
  _generateChallenge(difficulty, config, now, expiresAt) {
    // Get templates for this difficulty
    const templates = this.templates.get(difficulty);
    if (!templates || templates.length === 0) {
      // Use built-in types if no templates loaded
      return this._generateFromBuiltin(difficulty, config, now, expiresAt);
    }

    // Select random template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Calculate target
    const targetRange = template.targetRange || [5, 20];
    const target = Math.round(
      (Math.random() * (targetRange[1] - targetRange[0]) + targetRange[0]) * config.targetMultiplier
    );

    // Calculate reward
    const rewardRange = template.rewardRange || [10, 50];
    const baseReward = Math.round(
      Math.random() * (rewardRange[1] - rewardRange[0]) + rewardRange[0]
    );

    // Select title and description
    const titleTemplate = template.titleTemplates[0];
    const descTemplate = template.descriptionTemplates[0];

    const typeConfig = CHALLENGE_TYPES[template.type] || {};

    return {
      id: generateId(),
      title: titleTemplate.replace('{target}', target),
      description: descTemplate.replace('{target}', target),
      type: template.type,
      target,
      progress: 0,
      reward: {
        xp: baseReward * config.xpMultiplier,
        credits: baseReward * config.creditsMultiplier,
      },
      timeLimit: '24h',
      difficulty,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      completed: false,
      claimed: false,
    };
  }

  /**
   * Generate challenge from built-in types.
   * @private
   * @param {string} difficulty
   * @param {Object} config
   * @param {Date} now
   * @param {Date} expiresAt
   * @returns {Challenge}
   */
  _generateFromBuiltin(difficulty, config, now, expiresAt) {
    // Select random type
    const types = Object.keys(CHALLENGE_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const typeConfig = CHALLENGE_TYPES[type];

    // Calculate target based on difficulty
    let target;
    switch (type) {
      case 'catch_count':
        target = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 15 : 30;
        break;
      case 'catch_rarity':
        target = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 3 : 5;
        break;
      case 'catch_size':
        target = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 15 : 30;
        break;
      case 'catch_species':
        target = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6;
        break;
      case 'earn_credits':
        target = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 200 : 500;
        break;
      case 'talk_to_npc':
        target = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
        break;
      default:
        target = 5;
    }

    target = Math.round(target * config.targetMultiplier);

    // Select title and description
    const titleIdx = Math.floor(Math.random() * typeConfig.titleTemplates.length);
    const descIdx = Math.floor(Math.random() * typeConfig.descriptionTemplates.length);

    return {
      id: generateId(),
      title: typeConfig.titleTemplates[titleIdx].replace('{target}', target),
      description: typeConfig.descriptionTemplates[descIdx].replace('{target}', target),
      type,
      target,
      progress: 0,
      reward: {
        xp: target * 5 * config.xpMultiplier,
        credits: target * 3 * config.creditsMultiplier,
      },
      timeLimit: '24h',
      difficulty,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      completed: false,
      claimed: false,
    };
  }

  /**
   * Update progress on a challenge.
   * @param {string} playerUuid
   * @param {string} challengeId
   * @param {number} progress
   * @returns {Challenge|null}
   */
  updateProgress(playerUuid, challengeId, progress) {
    const challenges = this.activeChallenges.get(playerUuid) || [];
    const challenge = challenges.find(c => c.id === challengeId);

    if (!challenge || challenge.completed) {
      return null;
    }

    challenge.progress = Math.min(challenge.progress + progress, challenge.target);

    // Check for completion
    if (challenge.progress >= challenge.target) {
      challenge.completed = true;
      challenge.completedAt = new Date().toISOString();
    }

    this._savePlayerChallenges(playerUuid);
    return challenge;
  }

  /**
   * Update progress by challenge type.
   * @param {string} playerUuid
   * @param {string} challengeType
   * @param {number} amount
   * @returns {Challenge[]}
   */
  updateProgressByType(playerUuid, challengeType, amount) {
    const challenges = this.activeChallenges.get(playerUuid) || [];
    const updated = [];

    for (const challenge of challenges) {
      if (challenge.type === challengeType && !challenge.completed) {
        challenge.progress = Math.min(challenge.progress + amount, challenge.target);

        if (challenge.progress >= challenge.target) {
          challenge.completed = true;
          challenge.completedAt = new Date().toISOString();
        }

        updated.push(challenge);
      }
    }

    if (updated.length > 0) {
      this._savePlayerChallenges(playerUuid);
    }

    return updated;
  }

  /**
   * Claim reward for a completed challenge.
   * @param {string} playerUuid
   * @param {string} challengeId
   * @returns {Object|null} Reward object or null
   */
  claimReward(playerUuid, challengeId) {
    const challenges = this.activeChallenges.get(playerUuid) || [];
    const challenge = challenges.find(c => c.id === challengeId);

    if (!challenge || !challenge.completed || challenge.claimed) {
      return null;
    }

    challenge.claimed = true;
    challenge.claimedAt = new Date().toISOString();

    this._savePlayerChallenges(playerUuid);
    return challenge.reward;
  }

  /**
   * Get all challenges for a player.
   * @param {string} playerUuid
   * @returns {Challenge[]}
   */
  getChallenges(playerUuid) {
    return this.activeChallenges.get(playerUuid) || [];
  }

  /**
   * Get a specific challenge.
   * @param {string} playerUuid
   * @param {string} challengeId
   * @returns {Challenge|null}
   */
  getChallenge(playerUuid, challengeId) {
    const challenges = this.activeChallenges.get(playerUuid) || [];
    return challenges.find(c => c.id === challengeId) || null;
  }

  /**
   * Check if player can claim any rewards.
   * @param {string} playerUuid
   * @returns {Challenge[]}
   */
  getClaimableChallenges(playerUuid) {
    const challenges = this.activeChallenges.get(playerUuid) || [];
    return challenges.filter(c => c.completed && !c.claimed);
  }

  /**
   * Get challenge completion statistics.
   * @param {string} playerUuid
   * @returns {Object}
   */
  getStats(playerUuid) {
    const challenges = this.activeChallenges.get(playerUuid) || [];

    return {
      total: challenges.length,
      completed: challenges.filter(c => c.completed).length,
      claimed: challenges.filter(c => c.claimed).length,
      pending: challenges.filter(c => !c.completed).length,
      byDifficulty: {
        easy: challenges.filter(c => c.difficulty === 'easy').length,
        medium: challenges.filter(c => c.difficulty === 'medium').length,
        hard: challenges.filter(c => c.difficulty === 'hard').length,
      },
    };
  }

  /**
   * Clear expired challenges for all players.
   */
  clearExpired() {
    const now = new Date().toISOString();

    for (const [playerUuid, challenges] of this.activeChallenges) {
      const active = challenges.filter(c => c.expiresAt > now || c.completed);
      if (active.length !== challenges.length) {
        this.activeChallenges.set(playerUuid, active);
        this._savePlayerChallenges(playerUuid);
      }
    }
  }

  /**
   * Get manager status.
   * @returns {Object}
   */
  getStatus() {
    return {
      templatesLoaded: this._loaded,
      easyTemplates: (this.templates.get('easy') || []).length,
      mediumTemplates: (this.templates.get('medium') || []).length,
      hardTemplates: (this.templates.get('hard') || []).length,
      activePlayers: this.activeChallenges.size,
    };
  }
}

module.exports = {
  ChallengeManager,
  DIFFICULTY_CONFIG,
  CHALLENGE_TYPES,
};
