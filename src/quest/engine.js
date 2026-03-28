/**
 * Quest Engine - Core quest management system for CraftMind
 *
 * Quest states: locked, available, active, completed, expired
 * Supports: main_story, daily, challenge, discovery, social quest types
 */

const fs = require('fs');
const path = require('path');

// Quest states
const QuestState = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  FAILED: 'failed'
};

// Quest types
const QuestType = {
  MAIN_STORY: 'main_story',
  DAILY: 'daily',
  CHALLENGE: 'challenge',
  DISCOVERY: 'discovery',
  SOCIAL: 'social'
};

// Objective types
const ObjectiveType = {
  ACTION: 'action',
  SCORE: 'score',
  TIMED: 'timed',
  DISCOVERY: 'discovery',
  COLLECTION: 'collection',
  INTERACTION: 'interaction',
  SOCIAL: 'social',
  COMPETITION: 'competition',
  COOPERATIVE: 'cooperative',
  LOCATION: 'location'
};

class QuestEngine {
  constructor(dataDir = null) {
    this.dataDir = dataDir || path.join(__dirname, '../../data/quests');
    this.playerDataDir = path.join(this.dataDir, 'players');
    this.registryFile = path.join(this.dataDir, 'registry.json');
    this.quests = new Map(); // questId -> quest definition
    this.playerQuests = new Map(); // playerUuid -> player quest data (cached)

    // Ensure directories exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.playerDataDir)) {
      fs.mkdirSync(this.playerDataDir, { recursive: true });
    }

    // Load registry
    this.loadRegistry();
  }

  /**
   * Load quest registry from disk
   */
  loadRegistry() {
    if (fs.existsSync(this.registryFile)) {
      const data = JSON.parse(fs.readFileSync(this.registryFile, 'utf8'));
      for (const quest of data.quests || []) {
        this.quests.set(quest.id, quest);
      }
    }
  }

  /**
   * Save quest registry to disk
   */
  saveRegistry() {
    const data = {
      lastUpdated: new Date().toISOString(),
      quests: Array.from(this.quests.values())
    };
    fs.writeFileSync(this.registryFile, JSON.stringify(data, null, 2));
  }

  /**
   * Get player data file path
   * @param {string} playerUuid - Player UUID
   * @returns {string} File path
   */
  getPlayerFilePath(playerUuid) {
    return path.join(this.playerDataDir, `${playerUuid}.json`);
  }

  /**
   * Load player quest data
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Player quest data
   */
  loadPlayerData(playerUuid) {
    // Check cache first
    if (this.playerQuests.has(playerUuid)) {
      return this.playerQuests.get(playerUuid);
    }

    const filePath = this.getPlayerFilePath(playerUuid);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.playerQuests.set(playerUuid, data);
      return data;
    }
    return this.createNewPlayerData(playerUuid);
  }

  /**
   * Save player quest data
   * @param {string} playerUuid - Player UUID
   * @param {Object} data - Player quest data
   */
  savePlayerData(playerUuid, data) {
    data.lastUpdated = new Date().toISOString();
    const filePath = this.getPlayerFilePath(playerUuid);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    this.playerQuests.set(playerUuid, data);
  }

  /**
   * Create new player quest data
   * @param {string} playerUuid - Player UUID
   * @returns {Object} New player data
   */
  createNewPlayerData(playerUuid) {
    return {
      playerUuid,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      activeQuests: [],
      completedQuests: [],
      failedQuests: [],
      statistics: {
        totalCompleted: 0,
        byType: {},
        byGame: {},
        streakDays: 0,
        longestStreak: 0,
        totalExperienceEarned: 0
      },
      dailyResetTime: null
    };
  }

  // ==================== Quest Registration ====================

  /**
   * Register a quest definition
   * @param {Object} quest - Quest definition
   * @returns {Object} Registration result
   */
  register(quest) {
    // Validate quest
    const validation = this.validate(quest);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Add timestamps
    quest.createdAt = quest.createdAt || new Date().toISOString();
    quest.updatedAt = new Date().toISOString();

    // Store quest
    this.quests.set(quest.id, quest);
    this.saveRegistry();

    return { success: true, questId: quest.id };
  }

  /**
   * Unregister a quest
   * @param {string} questId - Quest ID
   * @returns {boolean} Success
   */
  unregister(questId) {
    if (this.quests.has(questId)) {
      this.quests.delete(questId);
      this.saveRegistry();
      return true;
    }
    return false;
  }

  /**
   * Validate a quest definition
   * @param {Object} quest - Quest to validate
   * @returns {Object} Validation result
   */
  validate(quest) {
    const errors = [];

    if (!quest.id) {
      errors.push('Quest must have an id');
    }
    if (!quest.title) {
      errors.push('Quest must have a title');
    }
    if (!quest.type || !Object.values(QuestType).includes(quest.type)) {
      errors.push(`Quest must have a valid type: ${Object.values(QuestType).join(', ')}`);
    }
    if (!quest.objectives || !Array.isArray(quest.objectives) || quest.objectives.length === 0) {
      errors.push('Quest must have at least one objective');
    }
    if (!quest.rewards) {
      errors.push('Quest must have rewards defined');
    }

    // Validate objectives
    if (quest.objectives) {
      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (!obj.id) {
          errors.push(`Objective ${i} must have an id`);
        }
        if (!obj.type) {
          errors.push(`Objective ${i} must have a type`);
        }
        if (!obj.target) {
          errors.push(`Objective ${i} must have a target`);
        }
        if (obj.required === undefined) {
          obj.required = obj.count || 1; // Default to count or 1
        }
        if (obj.current === undefined) {
          obj.current = 0;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get quest by ID
   * @param {string} questId - Quest ID
   * @returns {Object|null} Quest definition
   */
  get(questId) {
    return this.quests.get(questId) || null;
  }

  /**
   * Get all quests
   * @returns {Array} All quests
   */
  getAll() {
    return Array.from(this.quests.values());
  }

  /**
   * Query quests by filters
   * @param {Object} filters - Query filters
   * @returns {Array} Matching quests
   */
  query(filters = {}) {
    let results = Array.from(this.quests.values());

    if (filters.type) {
      results = results.filter(q => q.type === filters.type);
    }
    if (filters.game) {
      results = results.filter(q => q.games && q.games.includes(filters.game));
    }
    if (filters.difficulty) {
      results = results.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters.hidden !== undefined) {
      results = results.filter(q => !!q.hidden === !!filters.hidden);
    }

    return results;
  }

  // ==================== Quest Assignment ====================

  /**
   * Assign a quest to a player
   * @param {string} playerUuid - Player UUID
   * @param {string} questId - Quest ID
   * @returns {Object} Assignment result
   */
  assignQuest(playerUuid, questId) {
    const quest = this.quests.get(questId);
    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }

    const playerData = this.loadPlayerData(playerUuid);

    // Check if already active
    if (playerData.activeQuests.some(aq => aq.questId === questId)) {
      return { success: false, error: 'Quest already active' };
    }

    // Check if already completed (and not repeatable)
    if (!quest.repeatable && playerData.completedQuests.some(cq => cq.questId === questId)) {
      return { success: false, error: 'Quest already completed' };
    }

    // Check prerequisites
    const prereqResult = this.checkPrerequisites(playerUuid, quest);
    if (!prereqResult.met) {
      return { success: false, error: 'Prerequisites not met', missing: prereqResult.missing };
    }

    // Create active quest entry
    const activeQuest = {
      questId,
      startedAt: new Date().toISOString(),
      expiresAt: this.calculateExpiry(quest),
      objectives: quest.objectives.map(obj => ({
        id: obj.id,
        type: obj.type,
        target: obj.target,
        current: 0,
        required: obj.required || obj.count || 1,
        completed: false,
        metadata: {}
      })),
      currentStage: 1,
      flags: {}
    };

    playerData.activeQuests.push(activeQuest);
    this.savePlayerData(playerUuid, playerData);

    return {
      success: true,
      quest: {
        ...quest,
        playerQuest: activeQuest
      }
    };
  }

  /**
   * Calculate quest expiry time
   * @param {Object} quest - Quest definition
   * @returns {string|null} ISO timestamp or null
   */
  calculateExpiry(quest) {
    if (!quest.timeLimit) return null;

    switch (quest.timeLimit.type) {
      case 'duration':
        const expires = new Date(Date.now() + (quest.timeLimit.value * 1000));
        return expires.toISOString();
      case 'daily_reset':
        // Next midnight
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
      case 'weekly_reset':
        // Next Sunday midnight
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek.toISOString();
      case 'absolute':
        return quest.timeLimit.absolute;
      default:
        return null;
    }
  }

  /**
   * Check if player meets quest prerequisites
   * @param {string} playerUuid - Player UUID
   * @param {Object} quest - Quest definition
   * @returns {Object} {met: boolean, missing: []}
   */
  checkPrerequisites(playerUuid, quest) {
    const playerData = this.loadPlayerData(playerUuid);
    const missing = [];

    if (!quest.prerequisites || quest.prerequisites.length === 0) {
      return { met: true, missing: [] };
    }

    for (const prereq of quest.prerequisites) {
      // Simple string prereq = quest ID that must be completed
      if (typeof prereq === 'string') {
        if (!playerData.completedQuests.some(cq => cq.questId === prereq)) {
          missing.push({ type: 'quest', id: prereq });
        }
      } else if (typeof prereq === 'object') {
        // Complex prereq object
        switch (prereq.type) {
          case 'quest_complete':
            if (!playerData.completedQuests.some(cq => cq.questId === prereq.target)) {
              missing.push(prereq);
            }
            break;
          case 'level':
            if ((playerData.level || 1) < prereq.value) {
              missing.push(prereq);
            }
            break;
          // Add more prereq types as needed
        }
      }
    }

    return {
      met: missing.length === 0,
      missing
    };
  }

  // ==================== Progress Tracking ====================

  /**
   * Update quest progress based on game event
   * @param {string} playerUuid - Player UUID
   * @param {string} eventType - Event type (e.g., 'catch_fish', 'complete_course')
   * @param {Object} data - Event data
   * @returns {Object} Updated quests and completions
   */
  updateProgress(playerUuid, eventType, data) {
    const playerData = this.loadPlayerData(playerUuid);
    const updates = [];
    const completions = [];

    for (const activeQuest of playerData.activeQuests) {
      const quest = this.quests.get(activeQuest.questId);
      if (!quest) continue;

      let questUpdated = false;

      for (const objective of activeQuest.objectives) {
        if (objective.completed) continue;

        const progressResult = this.updateObjective(objective, eventType, data, quest);
        if (progressResult.updated) {
          questUpdated = true;
          objective.current = progressResult.current;

          if (progressResult.completed && !objective.completed) {
            objective.completed = true;
          }
        }
      }

      if (questUpdated) {
        updates.push({
          questId: activeQuest.questId,
          title: quest.title,
          objectives: activeQuest.objectives.map(o => ({
            id: o.id,
            current: o.current,
            required: o.required,
            completed: o.completed
          }))
        });
      }
    }

    // Check for completions
    const completedIds = [];
    for (const activeQuest of playerData.activeQuests) {
      const allComplete = activeQuest.objectives.every(o => o.completed);
      if (allComplete && !completedIds.includes(activeQuest.questId)) {
        const completion = this.completeQuest(playerUuid, activeQuest.questId);
        if (completion.success) {
          completions.push(completion);
          completedIds.push(activeQuest.questId);
        }
      }
    }

    this.savePlayerData(playerUuid, playerData);

    return { updates, completions };
  }

  /**
   * Update a single objective based on event
   * @param {Object} objective - Objective to update
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @param {Object} quest - Quest definition for context
   * @returns {Object} {updated: boolean, current: number, completed: boolean}
   */
  updateObjective(objective, eventType, data, quest) {
    const result = { updated: false, current: objective.current, completed: objective.completed };

    // Check if this event is relevant to this objective
    switch (objective.type) {
      case ObjectiveType.ACTION:
        if (objective.target === eventType) {
          // Check conditions if any
          const questObj = quest.objectives.find(o => o.id === objective.id);
          if (this.matchesConditions(questObj, data)) {
            result.current++;
            result.updated = true;
          }
        }
        break;

      case ObjectiveType.COLLECTION:
        if (objective.target === eventType) {
          // Track unique items
          const questObj = quest.objectives.find(o => o.id === objective.id);
          if (!objective.metadata.collected) {
            objective.metadata.collected = new Set();
          }
          const key = data.species || data.itemType || data.id;
          if (key && !objective.metadata.collected.has(key)) {
            objective.metadata.collected.add(key);
            result.current = objective.metadata.collected.size;
            result.updated = true;
          }
        }
        break;

      case ObjectiveType.SCORE:
        // Score objectives update to the new value if higher
        if (objective.target === eventType) {
          const score = data.score || data.value || 0;
          if (score > result.current) {
            result.current = score;
            result.updated = true;
          }
        }
        break;

      case ObjectiveType.DISCOVERY:
        if (objective.target === eventType || eventType === 'discover') {
          if (data.location === objective.target || data.fishType === objective.target) {
            result.current = 1;
            result.updated = true;
          }
        }
        break;

      case ObjectiveType.LOCATION:
        if (eventType === 'reach_location' && data.locationId === objective.target) {
          result.current = 1;
          result.updated = true;
        }
        break;

      case ObjectiveType.TIMED:
        if (objective.target === eventType) {
          result.current = data.time || result.current;
          result.updated = true;
        }
        break;

      case ObjectiveType.INTERACTION:
        if ((eventType === 'interact' || eventType === 'interaction') && data.target === objective.target) {
          result.current++;
          result.updated = true;
        }
        break;

      default:
        // Generic matching
        if (objective.target === eventType) {
          result.current++;
          result.updated = true;
        }
    }

    // Check completion
    if (result.current >= objective.required) {
      result.completed = true;
    }

    return result;
  }

  /**
   * Check if event data matches objective conditions
   * @param {Object} objective - Objective with conditions
   * @param {Object} data - Event data
   * @returns {boolean} True if conditions match
   */
  matchesConditions(objective, data) {
    if (!objective.conditions) return true;

    for (const [key, value] of Object.entries(objective.conditions)) {
      if (data[key] !== value) {
        // Check for array membership
        if (Array.isArray(value) && !value.includes(data[key])) {
          return false;
        }
        // Check for range
        if (typeof value === 'object' && (value.min !== undefined || value.max !== undefined)) {
          const num = data[key];
          if (value.min !== undefined && num < value.min) return false;
          if (value.max !== undefined && num > value.max) return false;
        }
        if (typeof value !== 'object') {
          return false;
        }
      }
    }

    return true;
  }

  // ==================== Quest Completion ====================

  /**
   * Complete a quest
   * @param {string} playerUuid - Player UUID
   * @param {string} questId - Quest ID
   * @returns {Object} Completion result
   */
  completeQuest(playerUuid, questId) {
    const playerData = this.loadPlayerData(playerUuid);
    const quest = this.quests.get(questId);

    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }

    const activeIndex = playerData.activeQuests.findIndex(aq => aq.questId === questId);
    if (activeIndex === -1) {
      return { success: false, error: 'Quest not active' };
    }

    const activeQuest = playerData.activeQuests[activeIndex];

    // Verify all objectives complete
    const allComplete = activeQuest.objectives.every(o => o.completed);
    if (!allComplete) {
      return { success: false, error: 'Not all objectives completed' };
    }

    // Remove from active
    playerData.activeQuests.splice(activeIndex, 1);

    // Add to completed
    const completedQuest = {
      questId,
      completedAt: new Date().toISOString(),
      completionTime: Math.floor((Date.now() - new Date(activeQuest.startedAt).getTime()) / 1000),
      rewards: {
        ...quest.rewards,
        claimed: false,
        claimedAt: null
      }
    };
    playerData.completedQuests.push(completedQuest);

    // Update statistics
    playerData.statistics.totalCompleted++;
    playerData.statistics.byType[quest.type] = (playerData.statistics.byType[quest.type] || 0) + 1;
    if (quest.games) {
      for (const game of quest.games) {
        playerData.statistics.byGame[game] = (playerData.statistics.byGame[game] || 0) + 1;
      }
    }
    playerData.statistics.totalExperienceEarned += quest.rewards.experience || 0;

    this.savePlayerData(playerUuid, playerData);

    // Unlock dependent quests
    const unlocked = this.unlockDependentQuests(playerUuid, questId);

    return {
      success: true,
      quest,
      completedQuest,
      unlocked
    };
  }

  /**
   * Unlock quests that depend on a completed quest
   * @param {string} playerUuid - Player UUID
   * @param {string} completedQuestId - Completed quest ID
   * @returns {Array} Newly available quest IDs
   */
  unlockDependentQuests(playerUuid, completedQuestId) {
    const unlocked = [];

    for (const [questId, quest] of this.quests) {
      if (quest.prerequisites && quest.prerequisites.includes(completedQuestId)) {
        const prereqResult = this.checkPrerequisites(playerUuid, quest);
        if (prereqResult.met) {
          unlocked.push(questId);
        }
      }
    }

    return unlocked;
  }

  /**
   * Check completion status for all active quests
   * @param {string} playerUuid - Player UUID
   * @returns {Array} List of completed quest results
   */
  checkCompletion(playerUuid) {
    const playerData = this.loadPlayerData(playerUuid);
    const completions = [];

    for (const activeQuest of playerData.activeQuests) {
      const allComplete = activeQuest.objectives.every(o => o.completed);
      if (allComplete) {
        const completion = this.completeQuest(playerUuid, activeQuest.questId);
        if (completion.success) {
          completions.push(completion);
        }
      }
    }

    return completions;
  }

  // ==================== Query Methods ====================

  /**
   * Get active quests for a player
   * @param {string} playerUuid - Player UUID
   * @returns {Array} Active quests with progress
   */
  getActiveQuests(playerUuid) {
    const playerData = this.loadPlayerData(playerUuid);
    const active = [];

    for (const activeQuest of playerData.activeQuests) {
      const quest = this.quests.get(activeQuest.questId);
      if (quest) {
        active.push({
          ...quest,
          playerQuest: activeQuest
        });
      }
    }

    return active;
  }

  /**
   * Get available quests for a player
   * @param {string} playerUuid - Player UUID
   * @returns {Array} Available quests
   */
  getAvailableQuests(playerUuid) {
    const playerData = this.loadPlayerData(playerUuid);
    const available = [];

    for (const [questId, quest] of this.quests) {
      // Skip hidden quests
      if (quest.hidden) continue;

      // Skip if already active
      if (playerData.activeQuests.some(aq => aq.questId === questId)) continue;

      // Skip if completed and not repeatable
      if (!quest.repeatable && playerData.completedQuests.some(cq => cq.questId === questId)) continue;

      // Check prerequisites
      const prereqResult = this.checkPrerequisites(playerUuid, quest);
      if (prereqResult.met) {
        available.push(quest);
      }
    }

    return available;
  }

  /**
   * Get completed quests for a player
   * @param {string} playerUuid - Player UUID
   * @returns {Array} Completed quests
   */
  getCompletedQuests(playerUuid) {
    const playerData = this.loadPlayerData(playerUuid);
    return playerData.completedQuests.map(cq => ({
      ...this.quests.get(cq.questId),
      completionInfo: cq
    })).filter(q => q.id);
  }

  /**
   * Abandon an active quest
   * @param {string} playerUuid - Player UUID
   * @param {string} questId - Quest ID
   * @returns {Object} Result
   */
  abandonQuest(playerUuid, questId) {
    const playerData = this.loadPlayerData(playerUuid);
    const index = playerData.activeQuests.findIndex(aq => aq.questId === questId);

    if (index === -1) {
      return { success: false, error: 'Quest not active' };
    }

    playerData.activeQuests.splice(index, 1);
    this.savePlayerData(playerUuid, playerData);

    return { success: true, questId };
  }

  /**
   * Claim rewards for a completed quest
   * @param {string} playerUuid - Player UUID
   * @param {string} questId - Quest ID
   * @returns {Object} Claim result
   */
  claimRewards(playerUuid, questId) {
    const playerData = this.loadPlayerData(playerUuid);
    const completed = playerData.completedQuests.find(cq => cq.questId === questId);

    if (!completed) {
      return { success: false, error: 'Quest not completed' };
    }

    if (completed.rewards.claimed) {
      return { success: false, error: 'Rewards already claimed' };
    }

    const quest = this.quests.get(questId);

    completed.rewards.claimed = true;
    completed.rewards.claimedAt = new Date().toISOString();

    this.savePlayerData(playerUuid, playerData);

    return {
      success: true,
      rewards: quest.rewards,
      claimedAt: completed.rewards.claimedAt
    };
  }

  /**
   * Get player statistics
   * @param {string} playerUuid - Player UUID
   * @returns {Object} Statistics
   */
  getStatistics(playerUuid) {
    const playerData = this.loadPlayerData(playerUuid);
    return playerData.statistics;
  }

  /**
   * Clean up expired quests
   * @param {string} playerUuid - Player UUID
   * @returns {Array} Expired quest IDs
   */
  cleanupExpiredQuests(playerUuid) {
    const playerData = this.loadPlayerData(playerUuid);
    const now = new Date();
    const expired = [];

    playerData.activeQuests = playerData.activeQuests.filter(activeQuest => {
      if (activeQuest.expiresAt && new Date(activeQuest.expiresAt) < now) {
        playerData.failedQuests.push({
          questId: activeQuest.questId,
          failedAt: new Date().toISOString(),
          reason: 'expired'
        });
        expired.push(activeQuest.questId);
        return false;
      }
      return true;
    });

    if (expired.length > 0) {
      this.savePlayerData(playerUuid, playerData);
    }

    return expired;
  }
}

module.exports = {
  QuestEngine,
  QuestState,
  QuestType,
  ObjectiveType
};
