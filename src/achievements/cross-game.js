/**
 * @module craftmind/achievements/cross-game
 * @description Cross-game achievement system with meta-achievements spanning multiple games.
 *
 * This system defines achievements that can be unlocked through progress across multiple games.
 * Achievements are checked against BotIdentity stats and automatically unlock when conditions are met.
 *
 * @example
 * const { AchievementChecker } = require('./achievements/cross-game');
 * const checker = new AchievementChecker();
 * const unlocked = checker.check(identity); // Returns array of newly unlocked achievements
 */

/**
 * @typedef {Object} Achievement
 * @property {string} id - Unique achievement identifier
 * @property {string} name - Human-readable name
 * @property {string} description - Achievement description
 * @property {Function} condition - Function that checks if achievement is unlocked
 * @property {number} [reward] - Currency reward for unlocking
 * @property {string} [icon] - Icon identifier (for UI)
 */

/**
 * Cross-game achievement definitions.
 * Each achievement has a condition function that receives a BotIdentity instance.
 * @type {Achievement[]}
 */
const CROSS_GAME_ACHIEVEMENTS = [
  {
    id: 'polymath',
    name: 'Polymath',
    description: 'Demonstrate competence in 5 different games',
    condition: (identity) => {
      const gamesWithActivity = Object.entries(identity.getAllStats())
        .filter(([_, stats]) => stats.actions >= 10);
      return gamesWithActivity.length >= 5;
    },
    reward: 100,
    icon: '🎓',
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Build positive relationships with 10 different players',
    condition: (identity) => {
      const relationships = Object.values(identity.getRelationships());
      const positiveRelationships = relationships.filter(r => r.score > 20 && r.interactions >= 3);
      return positiveRelationships.length >= 10;
    },
    reward: 50,
    icon: '🦋',
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    description: 'Accumulate 500 currency across all games',
    condition: (identity) => {
      // This would need to check economy system, but we can estimate from stats
      const totalActions = Object.values(identity.getAllStats())
        .reduce((sum, stats) => sum + stats.actions, 0);
      return totalActions >= 500; // Rough estimate
    },
    reward: 200,
    icon: '💰',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Complete 50 lessons across courses game',
    condition: (identity) => {
      const coursesStats = identity.getStats('courses');
      return coursesStats?.custom?.lessons_completed >= 50;
    },
    reward: 75,
    icon: '📚',
  },
  {
    id: 'master_angler',
    name: 'Master Angler',
    description: 'Catch 200 fish in fishing game',
    condition: (identity) => {
      const fishingStats = identity.getStats('fishing');
      return fishingStats?.custom?.fish_caught >= 200;
    },
    reward: 100,
    icon: '🎣',
  },
  {
    id: 'filmmaker',
    name: 'Filmmaker',
    description: 'Create 20 films in studio game',
    condition: (identity) => {
      const studioStats = identity.getStats('studio');
      return studioStats?.custom?.films_created >= 20;
    },
    reward: 80,
    icon: '🎬',
  },
  {
    id: 'pioneer',
    name: 'Pioneer',
    description: 'Be among the first to explore 3 different game areas',
    condition: (identity) => {
      const curiosity = identity.getTrait('curiosity');
      const gamesExplored = Object.keys(identity.getAllStats()).length;
      return curiosity >= 0.7 && gamesExplored >= 3;
    },
    reward: 60,
    icon: '🗺️',
  },
  {
    id: 'evolutionary_genius',
    name: 'Evolutionary Genius',
    description: 'Evolve 10 creatures in ranch game',
    condition: (identity) => {
      const ranchStats = identity.getStats('ranch');
      return ranchStats?.custom?.evolutions >= 10;
    },
    reward: 90,
    icon: '🧬',
  },
  {
    id: 'circuit_architect',
    name: 'Circuit Architect',
    description: 'Complete 30 circuit challenges',
    condition: (identity) => {
      const circuitsStats = identity.getStats('circuits');
      return circuitsStats?.custom?.challenges_completed >= 30;
    },
    reward: 85,
    icon: '⚡',
  },
  {
    id: 'disc_golf_champion',
    name: 'Disc Golf Champion',
    description: 'Set 5 course records in disc golf',
    condition: (identity) => {
      const discgolfStats = identity.getStats('discgolf');
      return discgolfStats?.custom?.course_records >= 5;
    },
    reward: 70,
    icon: '🥏',
  },
  {
    id: 'persistent',
    name: 'Persistent',
    description: 'Fail 100 times but keep trying',
    condition: (identity) => {
      const totalFailures = Object.values(identity.getAllStats())
        .reduce((sum, stats) => sum + (stats.failures || 0), 0);
      return totalFailures >= 100;
    },
    reward: 40,
    icon: '💪',
  },
  {
    id: 'speedster',
    name: 'Speedster',
    description: 'Complete 50 actions with less than 5% failure rate',
    condition: (identity) => {
      for (const [game, stats] of Object.entries(identity.getAllStats())) {
        if (stats.actions >= 50) {
          const failureRate = stats.failures / stats.actions;
          if (failureRate < 0.05) return true;
        }
      }
      return false;
    },
    reward: 65,
    icon: '⚡',
  },
  {
    id: 'diplomat',
    name: 'Diplomat',
    description: 'Maintain positive relationships with everyone you\'ve met',
    condition: (identity) => {
      const relationships = Object.values(identity.getRelationships());
      if (relationships.length < 5) return false; // Need at least 5 relationships
      return relationships.every(r => r.score >= 0);
    },
    reward: 55,
    icon: '🤝',
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Play across 7 different days',
    condition: (identity) => {
      const history = identity.getHistory();
      const uniqueDays = new Set(
        history.map(entry => entry.timestamp.split('T')[0])
      );
      return uniqueDays.size >= 7;
    },
    reward: 45,
    icon: '🎖️',
  },
  {
    id: 'renaissance_bot',
    name: 'Renaissance Bot',
    description: 'Unlock all personality traits above 0.7 through actions',
    condition: (identity) => {
      const traits = identity.getTraits();
      return Object.values(traits).every(value => value >= 0.7);
    },
    reward: 150,
    icon: '🎨',
  },
];

/**
 * Achievement checker class.
 * Evaluates bot identities against achievement conditions.
 */
class AchievementChecker {
  /**
   * @param {Achievement[]} [achievements] - Custom achievements (uses default if not provided)
   */
  constructor(achievements = CROSS_GAME_ACHIEVEMENTS) {
    this._achievements = achievements;
  }

  /**
   * Check identity for newly unlocked achievements.
   * @param {BotIdentity} identity - Bot identity to check
   * @returns {Achievement[]} Array of newly unlocked achievements
   */
  check(identity) {
    const newlyUnlocked = [];

    for (const achievement of this._achievements) {
      // Skip if already unlocked
      if (identity.hasAchievement(achievement.id)) continue;

      // Check condition
      try {
        if (achievement.condition(identity)) {
          newlyUnlocked.push(achievement);
          identity.addAchievement(achievement.id);
        }
      } catch (error) {
        console.error(`[Achievements] Error checking ${achievement.id}: ${error.message}`);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Get all achievement definitions.
   * @returns {Achievement[]} Copy of achievements array
   */
  getAchievements() {
    return [...this._achievements];
  }

  /**
   * Get achievement by ID.
   * @param {string} id - Achievement ID
   * @returns {Achievement|undefined} Achievement or undefined if not found
   */
  getAchievement(id) {
    return this._achievements.find(a => a.id === id);
  }

  /**
   * Get unlocked achievements for an identity.
   * @param {BotIdentity} identity - Bot identity
   * @returns {Achievement[]} Array of unlocked achievement definitions
   */
  getUnlockedAchievements(identity) {
    const unlockedIds = identity.getAchievements();
    return this._achievements.filter(a => unlockedIds.includes(a.id));
  }

  /**
   * Get locked achievements for an identity.
   * @param {BotIdentity} identity - Bot identity
   * @returns {Achievement[]} Array of locked achievement definitions
   */
  getLockedAchievements(identity) {
    const unlockedIds = identity.getAchievements();
    return this._achievements.filter(a => !unlockedIds.includes(a.id));
  }

  /**
   * Get progress percentage for achievements.
   * @param {BotIdentity} identity - Bot identity
   * @returns {number} Progress percentage (0-100)
   */
  getProgress(identity) {
    const total = this._achievements.length;
    const unlocked = identity.getAchievements().length;
    return total > 0 ? Math.round((unlocked / total) * 100) : 0;
  }

  /**
   * Get achievements by game.
   * @param {string} game - Game identifier
   * @returns {Achievement[]} Array of relevant achievements
   */
  getAchievementsByGame(game) {
    // This is a heuristic mapping based on achievement conditions
    const gameMap = {
      fishing: ['master_angler'],
      courses: ['scholar'],
      studio: ['filmmaker'],
      ranch: ['evolutionary_genius'],
      circuits: ['circuit_architect'],
      discgolf: ['disc_golf_champion'],
    };

    const relevantIds = gameMap[game] || [];
    return this._achievements.filter(a => relevantIds.includes(a.id));
  }

  /**
   * Get achievement hints for an identity.
   * @param {BotIdentity} identity - Bot identity
   * @returns {Object.<string, string>} Hints for locked achievements
   */
  getHints(identity) {
    const hints = {};
    const locked = this.getLockedAchievements(identity);

    for (const achievement of locked) {
      hints[achievement.id] = this._generateHint(achievement, identity);
    }

    return hints;
  }

  /**
   * Generate a hint for an achievement based on current progress.
   * @param {Achievement} achievement - Achievement to generate hint for
   * @param {BotIdentity} identity - Bot identity
   * @returns {string} Hint text
   * @private
   */
  _generateHint(achievement, identity) {
    // Simple heuristic hints based on achievement ID
    const hintMap = {
      polymath: `Try ${5 - Object.keys(identity.getAllStats()).length} more games`,
      social_butterfly: `Interact with more players positively`,
      entrepreneur: `Keep earning currency through game actions`,
      scholar: `Complete more lessons in the courses game`,
      master_angler: `Catch more fish`,
      filmmaker: `Create more films`,
      pioneer: `Explore new game areas with high curiosity`,
      evolutionary_genius: `Evolve more creatures in the ranch`,
      circuit_architect: `Complete more circuit challenges`,
      disc_golf_champion: `Set more course records`,
      persistent: `Don't give up! Keep trying despite failures`,
      speedster: `Aim for high success rates in your actions`,
      diplomat: `Maintain positive relationships with all players`,
      veteran: `Keep playing across different days`,
      renaissance_bot: `Develop all personality traits through diverse actions`,
    };

    return hintMap[achievement.id] || 'Keep playing to unlock this achievement!';
  }

  /**
   * Calculate total reward from unlocked achievements.
   * @param {BotIdentity} identity - Bot identity
   * @returns {number} Total currency reward
   */
  getTotalReward(identity) {
    const unlocked = this.getUnlockedAchievements(identity);
    return unlocked.reduce((sum, a) => sum + (a.reward || 0), 0);
  }

  /**
   * Get summary of achievement progress for an identity.
   * @param {BotIdentity} identity - Bot identity
   * @returns {string} Summary string
   */
  getSummary(identity) {
    const unlocked = this.getUnlockedAchievements(identity);
    const locked = this.getLockedAchievements(identity);
    const progress = this.getProgress(identity);
    const totalReward = this.getTotalReward(identity);

    return `Achievements for ${identity.name}:
  Progress: ${progress}% (${unlocked.length}/${this._achievements.length})
  Total Rewards Earned: ${totalReward} currency
  Recent Unlocks: ${unlocked.slice(-3).map(a => a.name).join(', ') || 'none'}
  Next Goals: ${locked.slice(0, 3).map(a => a.name).join(', ') || 'all complete!'}`;
  }
}

module.exports = {
  AchievementChecker,
  CROSS_GAME_ACHIEVEMENTS,
};