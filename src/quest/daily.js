/**
 * Daily Quest Manager - Generate and track daily quests for players
 *
 * Features:
 * - Generate 3 daily quests per player at midnight (or first login)
 * - Store in data/quests/daily/{uuid}-{date}.json
 * - Reset daily progress at rollover
 */

const fs = require('fs');
const path = require('path');
const { QuestTemplates } = require('./templates');
const { QuestEngine, QuestType } = require('./engine');

class DailyQuestManager {
  constructor(dataDir = null) {
    this.dataDir = dataDir || path.join(__dirname, '../../data/quests');
    this.dailyDir = path.join(this.dataDir, 'daily');

    this.questEngine = new QuestEngine(dataDir);
    this.templates = new QuestTemplates();

    // Ensure directories exist
    if (!fs.existsSync(this.dailyDir)) {
      fs.mkdirSync(this.dailyDir, { recursive: true });
    }
  }

  /**
   * Get today's date string
   * @returns {string} Date string (YYYY-MM-DD)
   */
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get daily quest file path for a player
   * @param {string} playerUuid - Player UUID
   * @param {string} date - Date string
   * @returns {string} File path
   */
  getDailyFilePath(playerUuid, date) {
    return path.join(this.dailyDir, `${playerUuid}-${date}.json`);
  }

  /**
   * Load daily quests for a player
   * @param {string} playerUuid - Player UUID
   * @param {string} date - Date string (optional, defaults to today)
   * @returns {Object} Daily quest data
   */
  loadDailyQuests(playerUuid, date = null) {
    const dateStr = date || this.getTodayString();
    const filePath = this.getDailyFilePath(playerUuid, dateStr);

    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    return null;
  }

  /**
   * Save daily quests for a player
   * @param {string} playerUuid - Player UUID
   * @param {Object} data - Daily quest data
   * @param {string} date - Date string (optional)
   */
  saveDailyQuests(playerUuid, data, date = null) {
    const dateStr = date || this.getTodayString();
    const filePath = this.getDailyFilePath(playerUuid, dateStr);

    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Generate daily quests for a player
   * @param {string} playerUuid - Player UUID
   * @param {Object} playerStats - Player statistics for scaling
   * @returns {Object} Generated daily quests data
   */
  generateDaily(playerUuid, playerStats = {}) {
    const today = this.getTodayString();

    // Check if already generated today
    const existing = this.loadDailyQuests(playerUuid, today);
    if (existing && existing.quests && existing.quests.length > 0) {
      return existing;
    }

    // Generate new daily quests using templates
    const generatedQuests = this.templates.generateDaily(playerUuid, playerStats);

    // Register quests with the engine and assign to player
    const assignedQuests = [];
    for (const quest of generatedQuests) {
      // Register the quest
      this.questEngine.register(quest);

      // Assign to player
      const assignResult = this.questEngine.assignQuest(playerUuid, quest.id);
      if (assignResult.success) {
        assignedQuests.push({
          questId: quest.id,
          title: quest.title,
          description: quest.description,
          objectives: quest.objectives,
          rewards: quest.rewards
        });
      }
    }

    // Save daily quest data
    const dailyData = {
      playerUuid,
      date: today,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      quests: assignedQuests,
      completed: 0,
      claimed: false
    };

    this.saveDailyQuests(playerUuid, dailyData);

    return dailyData;
  }

  /**
   * Get daily quests for a player (generates if needed)
   * @param {string} playerUuid - Player UUID
   * @param {Object} playerStats - Player statistics
   * @returns {Object} Daily quest data with progress
   */
  getDailyQuests(playerUuid, playerStats = {}) {
    const today = this.getTodayString();
    let dailyData = this.loadDailyQuests(playerUuid, today);

    // Generate if not exists
    if (!dailyData || !dailyData.quests || dailyData.quests.length === 0) {
      dailyData = this.generateDaily(playerUuid, playerStats);
    }

    // Get current progress from quest engine
    const activeQuests = this.questEngine.getActiveQuests(playerUuid);

    // Merge progress into daily data
    const questsWithProgress = dailyData.quests.map(dailyQuest => {
      const active = activeQuests.find(aq => aq.id === dailyQuest.questId);
      if (active && active.playerQuest) {
        return {
          ...dailyQuest,
          progress: active.playerQuest.objectives.map(o => ({
            id: o.id,
            current: o.current,
            required: o.required,
            completed: o.completed
          })),
          allComplete: active.playerQuest.objectives.every(o => o.completed)
        };
      }
      return {
        ...dailyQuest,
        progress: dailyQuest.objectives.map(o => ({
          id: o.id,
          current: 0,
          required: o.required || o.count || 1,
          completed: false
        })),
        allComplete: false
      };
    });

    return {
      ...dailyData,
      quests: questsWithProgress,
      allComplete: questsWithProgress.every(q => q.allComplete),
      completionCount: questsWithProgress.filter(q => q.allComplete).length
    };
  }

  /**
   * Reset daily progress for all players
   * Called at midnight server time
   */
  resetDaily() {
    const today = this.getTodayString();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Get all daily files from yesterday
    const files = fs.readdirSync(this.dailyDir)
      .filter(f => f.endsWith(`-${yesterday}.json`));

    // Archive and clean up
    for (const file of files) {
      const filePath = path.join(this.dailyDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Check for incomplete quests and mark as expired
      for (const quest of data.quests || []) {
        const activeQuests = this.questEngine.loadPlayerData(data.playerUuid).activeQuests;
        const isActive = activeQuests.some(aq => aq.questId === quest.questId);
        if (isActive) {
          this.questEngine.abandonQuest(data.playerUuid, quest.questId);
        }
      }

      // Archive to history
      const archiveDir = path.join(this.dailyDir, 'archive');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      fs.renameSync(filePath, path.join(archiveDir, file));
    }
  }

  /**
   * Check if player has completed all daily quests
   * @param {string} playerUuid - Player UUID
   * @returns {boolean} True if all completed
   */
  hasCompletedAllDailies(playerUuid) {
    const dailyData = this.getDailyQuests(playerUuid);
    return dailyData.quests.every(q => q.allComplete);
  }

  /**
   * Claim daily quest rewards
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Claim result
   */
  claimDailyRewards(playerUuid) {
    const dailyData = this.loadDailyQuests(playerUuid);

    if (!dailyData) {
      return { success: false, error: 'No daily quests found' };
    }

    if (dailyData.claimed) {
      return { success: false, error: 'Rewards already claimed' };
    }

    const completedCount = dailyData.completed || 0;

    // Calculate bonus rewards
    let bonusRewards = {
      experience: 0,
      currency: { coins: 0, fisher_tokens: 0 }
    };

    // Bonus for completing all 3
    if (completedCount === 3) {
      bonusRewards.experience += 100;
      bonusRewards.currency.coins += 200;
      bonusRewards.currency.fisher_tokens += 20;
    }
    // Bonus for completing 2
    else if (completedCount >= 2) {
      bonusRewards.experience += 50;
      bonusRewards.currency.coins += 100;
      bonusRewards.currency.fisher_tokens += 10;
    }

    // Mark as claimed
    dailyData.claimed = true;
    dailyData.claimedAt = new Date().toISOString();
    this.saveDailyQuests(playerUuid, dailyData);

    return {
      success: true,
      completedCount,
      bonusRewards,
      claimedAt: dailyData.claimedAt
    };
  }

  /**
   * Update progress on daily quests
   * @param {string} playerUuid - Player UUID
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @returns {Object} Update result
   */
  updateProgress(playerUuid, eventType, data) {
    // Update quest engine progress
    const result = this.questEngine.updateProgress(playerUuid, eventType, data);

    // Check if any daily quests were completed
    const today = this.getTodayString();
    let dailyData = this.loadDailyQuests(playerUuid, today);

    if (dailyData && result.completions.length > 0) {
      for (const completion of result.completions) {
        const dailyQuest = dailyData.quests.find(q => q.questId === completion.questId);
        if (dailyQuest) {
          dailyData.completed = (dailyData.completed || 0) + 1;
        }
      }
      this.saveDailyQuests(playerUuid, dailyData);
    }

    return result;
  }

  /**
   * Get daily quest statistics for a player
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Statistics
   */
  getDailyStats(playerUuid) {
    // Get last 7 days of daily quest data
    const stats = {
      streak: 0,
      totalCompleted: 0,
      bestDay: { date: null, completed: 0 },
      weeklyProgress: []
    };

    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const data = this.loadDailyQuests(playerUuid, date);

      if (data) {
        const completed = data.completed || 0;
        stats.weeklyProgress.push({ date, completed });

        stats.totalCompleted += completed;

        if (completed > stats.bestDay.completed) {
          stats.bestDay = { date, completed };
        }

        // Check streak (only count days with all 3 completed)
        if (completed === 3) {
          stats.streak++;
        } else if (i > 0) {
          // Break streak if not today
          break;
        }
      }
    }

    return stats;
  }

  /**
   * Get next daily reset time
   * @returns {Date} Next reset time
   */
  getNextResetTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Get time until next reset
   * @returns {Object} Hours, minutes, seconds
   */
  getTimeUntilReset() {
    const now = new Date();
    const reset = this.getNextResetTime();
    const diff = reset - now;

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return { hours, minutes, seconds, total: diff };
  }

  /**
   * Force regenerate daily quests (admin function)
   * @param {string} playerUuid - Player UUID
   * @param {Object} playerStats - Player statistics
   * @returns {Object} New daily quests
   */
  forceRegenerate(playerUuid, playerStats = {}) {
    const today = this.getTodayString();
    const filePath = this.getDailyFilePath(playerUuid, today);

    // Remove existing file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Clean up existing active daily quests
    const dailyData = this.loadDailyQuests(playerUuid);
    if (dailyData && dailyData.quests) {
      for (const quest of dailyData.quests) {
        this.questEngine.abandonQuest(playerUuid, quest.questId);
      }
    }

    // Generate new quests
    return this.generateDaily(playerUuid, playerStats);
  }

  /**
   * Check if player has unclaimed daily rewards
   * @param {string} playerUuid - Player UUID
   * @returns {boolean} True if has unclaimed
   */
  hasUnclaimedRewards(playerUuid) {
    const dailyData = this.loadDailyQuests(playerUuid);
    if (!dailyData) return false;

    const completedCount = dailyData.completed || 0;
    return !dailyData.claimed && completedCount > 0;
  }

  /**
   * Get summary of daily quests for UI
   * @param {string} playerUuid - Player UUID
   * @param {Object} playerStats - Player statistics
   * @returns {Object} Summary for UI display
   */
  getDailySummary(playerUuid, playerStats = {}) {
    const dailyData = this.getDailyQuests(playerUuid, playerStats);
    const timeUntilReset = this.getTimeUntilReset();
    const stats = this.getDailyStats(playerUuid);

    return {
      date: dailyData.date,
      quests: dailyData.quests.map(q => ({
        id: q.questId,
        title: q.title,
        description: q.description,
        progress: q.progress,
        allComplete: q.allComplete,
        rewards: q.rewards
      })),
      completed: dailyData.completionCount,
      total: dailyData.quests.length,
      claimed: dailyData.claimed,
      timeUntilReset,
      streak: stats.streak,
      allComplete: dailyData.allComplete
    };
  }
}

module.exports = {
  DailyQuestManager
};
