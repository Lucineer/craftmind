/**
 * @module craftmind/challenges/weekly
 * @description WeeklyChallenge - Weekly challenge generation with themes.
 *
 * Generates 1 weekly challenge with higher rewards (5x daily) and
 * rotating themes like "Salmon Week", "Deep Sea Challenge", etc.
 * Includes bonus rewards for early completion.
 *
 * @example
 * const weekly = new WeeklyChallenge('./data/challenges');
 * weekly.loadPool('./data/challenges/pool.json');
 * const challenge = weekly.generateWeeklyChallenge('player-uuid-123');
 * weekly.updateProgress('player-uuid-123', 10);
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} WeeklyChallengeData
 * @property {string} id - Unique challenge identifier
 * @property {string} title - Challenge title
 * @property {string} description - Challenge description
 * @property {string} type - Challenge type
 * @property {number} target - Target value
 * @property {number} progress - Current progress
 * @property {Object} reward - Base reward
 * @property {Object} bonusReward - Early completion bonus
 * @property {string} theme - Weekly theme name
 * @property {string} weekStart - ISO timestamp of week start
 * @property {string} weekEnd - ISO timestamp of week end
 * @property {boolean} completed - Whether completed
 * @property {boolean} claimed - Whether claimed
 * @property {number} [completionDay] - Day of week completed (0-6)
 */

/**
 * @typedef {Object} WeeklyTheme
 * @property {string} id - Theme identifier
 * @property {string} name - Display name
 * @property {string} description - Theme description
 * @property {string[]} challengeTypes - Allowed challenge types
 * @property {number} targetMultiplier - Target value multiplier
 * @property {Object} bonusRewards - Extra rewards for theme
 */

/** @constant {WeeklyTheme[]} Available weekly themes */
const WEEKLY_THEMES = [
  {
    id: 'salmon_week',
    name: 'Salmon Week',
    description: 'The salmon are running! Focus on catching various salmon species.',
    challengeTypes: ['catch_species', 'catch_count', 'catch_size'],
    targetMultiplier: 1.2,
    bonusRewards: {
      xp: 100,
      credits: 150,
      item: 'golden_lure',
    },
  },
  {
    id: 'deep_sea_challenge',
    name: 'Deep Sea Challenge',
    description: 'Venture into the deep waters for legendary catches.',
    challengeTypes: ['catch_rarity', 'catch_size', 'catch_species'],
    targetMultiplier: 1.5,
    bonusRewards: {
      xp: 200,
      credits: 250,
      item: 'deep_sea_rod',
    },
  },
  {
    id: 'speed_fisher',
    name: 'Speed Fisher Championship',
    description: 'How many fish can you catch this week?',
    challengeTypes: ['catch_count', 'earn_credits'],
    targetMultiplier: 1.8,
    bonusRewards: {
      xp: 150,
      credits: 200,
      item: 'speed_reel',
    },
  },
  {
    id: 'variety_hunter',
    name: 'Variety Hunter',
    description: 'Catch as many different species as possible.',
    challengeTypes: ['catch_species', 'catch_rarity'],
    targetMultiplier: 1.0,
    bonusRewards: {
      xp: 180,
      credits: 180,
      item: 'encyclopedia',
    },
  },
  {
    id: 'trophy_week',
    name: 'Trophy Week',
    description: 'Only the biggest catches count this week.',
    challengeTypes: ['catch_size', 'catch_rarity'],
    targetMultiplier: 1.3,
    bonusRewards: {
      xp: 250,
      credits: 300,
      item: 'trophy_case',
    },
  },
  {
    id: 'entrepreneur',
    name: 'Fishing Entrepreneur',
    description: 'Build your fortune through fishing.',
    challengeTypes: ['earn_credits', 'catch_count'],
    targetMultiplier: 1.4,
    bonusRewards: {
      xp: 120,
      credits: 400,
      item: 'gold_scales',
    },
  },
  {
    id: 'social_angler',
    name: 'Social Angler',
    description: 'Connect with the community while fishing.',
    challengeTypes: ['talk_to_npc', 'catch_count'],
    targetMultiplier: 1.0,
    bonusRewards: {
      xp: 100,
      credits: 100,
      item: 'friendship_badge',
    },
  },
];

/** @constant {number} Reward multiplier compared to daily challenges */
const WEEKLY_REWARD_MULTIPLIER = 5;

/** @constant {number[]} Days for early completion bonus (0 = Sunday) */
const EARLY_COMPLETION_DAYS = [0, 1, 2, 3]; // Complete by Wednesday for bonus

/** @constant {number} Early completion bonus multiplier */
const EARLY_BONUS_MULTIPLIER = 1.5;

/**
 * Get the current week number of the year.
 * @private
 * @returns {number}
 */
function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

/**
 * Get the start of the current week (Sunday).
 * @private
 * @returns {Date}
 */
function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get the end of the current week (Saturday).
 * @private
 * @returns {Date}
 */
function getWeekEnd() {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Generate a unique ID.
 * @private
 * @returns {string}
 */
function generateId() {
  return `weekly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * WeeklyChallenge class - manages weekly challenges.
 */
class WeeklyChallenge {
  /**
   * Create a new WeeklyChallenge manager.
   * @param {string} [dataDir='./data/challenges'] - Directory for challenge data
   */
  constructor(dataDir = './data/challenges') {
    /** @type {string} Data directory */
    this.dataDir = dataDir;

    /** @type {Map<string, WeeklyChallengeData>} Active weekly challenges by player UUID */
    this.activeChallenges = new Map();

    /** @type {WeeklyTheme} Current week's theme */
    this.currentTheme = null;

    /** @type {number} Current week number */
    this.currentWeek = getWeekNumber();
  }

  /**
   * Get the theme for the current week.
   * @returns {WeeklyTheme}
   */
  getCurrentTheme() {
    const weekNum = getWeekNumber();

    // Update theme if week changed
    if (this.currentWeek !== weekNum || !this.currentTheme) {
      const themeIndex = weekNum % WEEKLY_THEMES.length;
      this.currentTheme = WEEKLY_THEMES[themeIndex];
      this.currentWeek = weekNum;
    }

    return this.currentTheme;
  }

  /**
   * Get file path for player's weekly challenge.
   * @private
   * @param {string} playerUuid
   * @returns {string}
   */
  _getPlayerFilePath(playerUuid) {
    const weekNum = getWeekNumber();
    return path.join(this.dataDir, `weekly_${playerUuid}-week${weekNum}.json`);
  }

  /**
   * Load player's weekly challenge.
   * @param {string} playerUuid
   * @returns {WeeklyChallengeData|null}
   */
  loadPlayerChallenge(playerUuid) {
    const filePath = this._getPlayerFilePath(playerUuid);

    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const challenge = data.challenge;

        // Check if still valid for current week
        if (challenge && new Date(challenge.weekEnd) > new Date()) {
          this.activeChallenges.set(playerUuid, challenge);
          return challenge;
        }
      }
    } catch (err) {
      console.warn(`[WeeklyChallenge] Failed to load: ${err.message}`);
    }

    return null;
  }

  /**
   * Save player's weekly challenge.
   * @private
   * @param {string} playerUuid
   */
  _savePlayerChallenge(playerUuid) {
    const challenge = this.activeChallenges.get(playerUuid);
    if (!challenge) return;

    const filePath = this._getPlayerFilePath(playerUuid);

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        playerUuid,
        week: getWeekNumber(),
        challenge,
        savedAt: new Date().toISOString(),
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn(`[WeeklyChallenge] Failed to save: ${err.message}`);
    }
  }

  /**
   * Generate weekly challenge for a player.
   * @param {string} playerUuid
   * @param {Object} [options]
   * @param {boolean} [options.forceNew=false] - Force regeneration
   * @returns {WeeklyChallengeData}
   */
  generateWeeklyChallenge(playerUuid, options = {}) {
    // Check for existing challenge
    if (!options.forceNew) {
      const existing = this.loadPlayerChallenge(playerUuid);
      if (existing) {
        return existing;
      }
    }

    const theme = this.getCurrentTheme();
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // Select challenge type from theme
    const type = theme.challengeTypes[
      Math.floor(Math.random() * theme.challengeTypes.length)
    ];

    // Calculate target
    let target;
    switch (type) {
      case 'catch_count':
        target = 100 * theme.targetMultiplier;
        break;
      case 'catch_rarity':
        target = 15 * theme.targetMultiplier;
        break;
      case 'catch_size':
        target = 50 * theme.targetMultiplier; // lbs
        break;
      case 'catch_species':
        target = 10 * theme.targetMultiplier;
        break;
      case 'earn_credits':
        target = 1000 * theme.targetMultiplier;
        break;
      case 'talk_to_npc':
        target = 7 * theme.targetMultiplier;
        break;
      default:
        target = 50;
    }

    target = Math.round(target);

    // Calculate rewards (5x daily multiplier)
    const baseXp = target * 10 * WEEKLY_REWARD_MULTIPLIER;
    const baseCredits = target * 5 * WEEKLY_REWARD_MULTIPLIER;

    // Early completion bonus (complete by Wednesday)
    const bonusXp = Math.round(baseXp * (EARLY_BONUS_MULTIPLIER - 1));
    const bonusCredits = Math.round(baseCredits * (EARLY_BONUS_MULTIPLIER - 1));

    // Generate title and description
    const title = `${theme.name}: ${this._getTypeLabel(type, target)}`;
    const description = `${theme.description} Target: ${this._getTypeDescription(type, target)}. Complete by Wednesday for bonus rewards!`;

    const challenge = {
      id: generateId(),
      title,
      description,
      type,
      target,
      progress: 0,
      reward: {
        xp: baseXp,
        credits: baseCredits,
      },
      bonusReward: {
        xp: bonusXp,
        credits: bonusCredits,
        item: theme.bonusRewards.item,
        condition: 'Complete by Wednesday',
      },
      theme: theme.id,
      themeName: theme.name,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      completed: false,
      claimed: false,
      completionDay: null,
    };

    this.activeChallenges.set(playerUuid, challenge);
    this._savePlayerChallenge(playerUuid);

    return challenge;
  }

  /**
   * Get label for challenge type.
   * @private
   * @param {string} type
   * @param {number} target
   * @returns {string}
   */
  _getTypeLabel(type, target) {
    const labels = {
      catch_count: `${target} Fish`,
      catch_rarity: `${target} Rare Fish`,
      catch_size: `${target}lb Trophy`,
      catch_species: `${target} Species`,
      earn_credits: `${target} Credits`,
      talk_to_npc: `${target} NPCs`,
    };
    return labels[type] || `${target}`;
  }

  /**
   * Get description for challenge type.
   * @private
   * @param {string} type
   * @param {number} target
   * @returns {string}
   */
  _getTypeDescription(type, target) {
    const descriptions = {
      catch_count: `catch ${target} fish`,
      catch_rarity: `catch ${target} rare or legendary fish`,
      catch_size: `catch a fish weighing ${target} pounds`,
      catch_species: `catch ${target} different species`,
      earn_credits: `earn ${target} credits`,
      talk_to_npc: `talk to ${target} different NPCs`,
    };
    return descriptions[type] || `reach ${target}`;
  }

  /**
   * Update progress on the weekly challenge.
   * @param {string} playerUuid
   * @param {number} amount
   * @returns {WeeklyChallengeData|null}
   */
  updateProgress(playerUuid, amount) {
    const challenge = this.activeChallenges.get(playerUuid);

    if (!challenge || challenge.completed) {
      // Try to load
      const loaded = this.loadPlayerChallenge(playerUuid);
      if (!loaded || loaded.completed) {
        return null;
      }
    }

    challenge.progress = Math.min(challenge.progress + amount, challenge.target);

    // Check for completion
    if (challenge.progress >= challenge.target) {
      challenge.completed = true;
      challenge.completedAt = new Date().toISOString();
      challenge.completionDay = new Date().getDay();
    }

    this._savePlayerChallenge(playerUuid);
    return challenge;
  }

  /**
   * Update progress by challenge type.
   * @param {string} playerUuid
   * @param {string} challengeType
   * @param {number} amount
   * @returns {WeeklyChallengeData|null}
   */
  updateProgressByType(playerUuid, challengeType, amount) {
    const challenge = this.activeChallenges.get(playerUuid) || this.loadPlayerChallenge(playerUuid);

    if (!challenge || challenge.completed || challenge.type !== challengeType) {
      return null;
    }

    return this.updateProgress(playerUuid, amount);
  }

  /**
   * Claim reward for the weekly challenge.
   * @param {string} playerUuid
   * @returns {Object|null} Reward object including bonus if applicable
   */
  claimReward(playerUuid) {
    const challenge = this.activeChallenges.get(playerUuid);

    if (!challenge || !challenge.completed || challenge.claimed) {
      return null;
    }

    // Check for early completion bonus
    const eligibleForBonus = EARLY_COMPLETION_DAYS.includes(challenge.completionDay);

    const totalReward = {
      xp: challenge.reward.xp,
      credits: challenge.reward.credits,
      bonus: false,
      item: null,
    };

    if (eligibleForBonus) {
      totalReward.xp += challenge.bonusReward.xp;
      totalReward.credits += challenge.bonusReward.credits;
      totalReward.bonus = true;
      totalReward.item = challenge.bonusReward.item;
      totalReward.bonusMessage = `Early completion bonus! Extra ${challenge.bonusReward.xp} XP and ${challenge.bonusReward.credits} credits!`;
    }

    challenge.claimed = true;
    challenge.claimedAt = new Date().toISOString();
    challenge.totalReward = totalReward;

    this._savePlayerChallenge(playerUuid);
    return totalReward;
  }

  /**
   * Get the weekly challenge for a player.
   * @param {string} playerUuid
   * @returns {WeeklyChallengeData|null}
   */
  getChallenge(playerUuid) {
    return this.activeChallenges.get(playerUuid) || this.loadPlayerChallenge(playerUuid);
  }

  /**
   * Get time remaining in the week.
   * @returns {Object} { days, hours, minutes }
   */
  getTimeRemaining() {
    const now = new Date();
    const weekEnd = getWeekEnd();
    const diff = weekEnd - now;

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    };
  }

  /**
   * Get days until early bonus expires.
   * @returns {number} Days until Wednesday ends (or 0 if expired)
   */
  getDaysUntilBonusExpires() {
    const now = new Date();
    const day = now.getDay();

    if (day <= 3) {
      // Wednesday or earlier
      return 3 - day;
    }

    return 0; // Bonus period expired
  }

  /**
   * Get weekly challenge status.
   * @param {string} playerUuid
   * @returns {Object}
   */
  getStatus(playerUuid) {
    const challenge = this.getChallenge(playerUuid);
    const timeRemaining = this.getTimeRemaining();
    const bonusExpires = this.getDaysUntilBonusExpires();

    return {
      hasChallenge: !!challenge,
      theme: this.getCurrentTheme(),
      progress: challenge ? {
        current: challenge.progress,
        target: challenge.target,
        percent: Math.round((challenge.progress / challenge.target) * 100),
        completed: challenge.completed,
        claimed: challenge.claimed,
      } : null,
      timeRemaining,
      bonusEligible: bonusExpires > 0,
      bonusExpiresIn: bonusExpires,
    };
  }

  /**
   * Get leaderboard-ready data for the week.
   * @returns {Object}
   */
  getWeeklyLeaderboardInfo() {
    const theme = this.getCurrentTheme();

    return {
      theme: theme.name,
      description: theme.description,
      weekNumber: getWeekNumber(),
      bonusItem: theme.bonusRewards.item,
    };
  }

  /**
   * Clear expired weekly challenges.
   */
  clearExpired() {
    const now = new Date();

    for (const [playerUuid, challenge] of this.activeChallenges) {
      if (new Date(challenge.weekEnd) < now) {
        this.activeChallenges.delete(playerUuid);
      }
    }
  }
}

module.exports = {
  WeeklyChallenge,
  WEEKLY_THEMES,
  WEEKLY_REWARD_MULTIPLIER,
  EARLY_COMPLETION_DAYS,
};
