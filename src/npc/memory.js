/**
 * @module craftmind/npc/memory
 * @description PlayerMemory - Persistent memory system for NPC-player relationships.
 *
 * Stores per-player data including conversations, preferences, achievements, and gifts.
 * Implements memory compression: full detail for 30 days, summarized for older entries.
 *
 * @example
 * const memory = new PlayerMemory('player-uuid-123', './memory/npcs/gustav');
 * memory.load();
 * memory.updateFromChat('I love fishing for salmon!', bot);
 * memory.recordAchievement('first_catch', { species: 'pink_salmon' });
 * memory.save();
 */

const fs = require('fs');
const path = require('path');

/** @constant {number} Days to keep full conversation detail */
const FULL_DETAIL_DAYS = 30;

/** @constant {number} Days to keep summarized conversation history */
const SUMMARY_RETENTION_DAYS = 365;

/**
 * @typedef {Object} ConversationEntry
 * @property {string} date - ISO date string
 * @property {string} location - In-game location
 * @property {string[]} topics - Subjects discussed
 * @property {string} mood - Player's emotional state
 * @property {string[]} keyPhrases - Memorable quotes
 */

/**
 * @typedef {Object} PlayerPreferences
 * @property {string} playStyle - "competitive", "casual", "explorer"
 * @property {string} communicationStyle - "chatty", "quiet", "emote-only"
 * @property {string[]} favoriteActivities
 * @property {string[]} dislikedActivities
 */

/**
 * @typedef {Object} AchievementEntry
 * @property {string} type - Achievement identifier
 * @property {string} date - ISO date string
 * @property {Object} details - Achievement-specific data
 * @property {string} npcReaction - How this NPC reacted
 */

/**
 * @typedef {Object} GiftEntry
 * @property {string} item - Item name
 * @property {string} date - ISO date string
 * @property {string} reaction - "loved", "liked", "neutral", "hated"
 * @property {number} friendshipDelta - Points changed
 */

/**
 * @typedef {Object} OffenseEntry
 * @property {string} type - "theft", "insult", "promise_broken"
 * @property {string} date - ISO date string
 * @property {boolean} forgiven
 * @property {string} [forgiveDate] - ISO date string
 */

/**
 * PlayerMemory class - manages persistent memory for a single player with an NPC.
 */
class PlayerMemory {
  /**
   * Create a new PlayerMemory instance.
   * @param {string} playerUuid - Player's Minecraft UUID
   * @param {string} npcName - NPC identifier (e.g., "gustav")
   * @param {string} [memoryDir='./memory/npcs'] - Directory for memory files
   */
  constructor(playerUuid, npcName, memoryDir = './memory/npcs') {
    this.playerUuid = playerUuid;
    this.npcName = npcName.toLowerCase();
    this.memoryDir = memoryDir;

    /** @type {Object} Player information */
    this.player = {
      uuid: playerUuid,
      displayName: '',
      firstMet: null,
      lastInteraction: null,
      interactionCount: 0,
    };

    /** @type {ConversationEntry[]} */
    this.conversations = [];

    /** @type {PlayerPreferences} */
    this.preferences = {
      playStyle: null,
      communicationStyle: null,
      favoriteActivities: [],
      dislikedActivities: [],
    };

    /** @type {AchievementEntry[]} */
    this.achievements = [];

    /** @type {GiftEntry[]} */
    this.gifts = [];

    /** @type {OffenseEntry[]} */
    this.offenses = [];

    /** @type {Object} Additional relationship data */
    this.relationship = {
      friendshipPoints: 0,
      friendshipLevel: 0,
      trust: 0,
      lastGiftDate: null,
      lastAchievementDate: null,
    };

    this._loaded = false;
  }

  /**
   * Get the file path for this memory.
   * @returns {string}
   */
  get filePath() {
    return path.join(this.memoryDir, this.npcName, `${this.playerUuid}.json`);
  }

  /**
   * Load memory from disk.
   * @returns {boolean} True if loaded successfully
   */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));

        // Merge loaded data
        this.player = { ...this.player, ...data.player };
        this.conversations = data.conversations || [];
        this.preferences = { ...this.preferences, ...data.preferences };
        this.achievements = data.achievements || [];
        this.gifts = data.gifts || [];
        this.offenses = data.offenses || [];
        this.relationship = { ...this.relationship, ...data.relationship };

        this._loaded = true;
        return true;
      }
    } catch (err) {
      console.warn(`[PlayerMemory] Failed to load ${this.filePath}: ${err.message}`);
    }
    return false;
  }

  /**
   * Save memory to disk.
   * @returns {boolean} True if saved successfully
   */
  save() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        player: this.player,
        conversations: this.conversations,
        preferences: this.preferences,
        achievements: this.achievements,
        gifts: this.gifts,
        offenses: this.offenses,
        relationship: this.relationship,
        savedAt: new Date().toISOString(),
      };

      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.warn(`[PlayerMemory] Failed to save ${this.filePath}: ${err.message}`);
      return false;
    }
  }

  /**
   * Update player info from a bot instance.
   * @param {Object} bot - Mineflayer bot instance
   * @param {string} displayName - Player's display name
   */
  updatePlayerInfo(bot, displayName) {
    this.player.displayName = displayName;
    this.player.lastInteraction = new Date().toISOString();
    this.player.interactionCount++;

    if (!this.player.firstMet) {
      this.player.firstMet = this.player.lastInteraction;
    }
  }

  /**
   * Extract topics, mood, and preferences from chat message.
   * @param {string} message - Player's chat message
   * @param {Object} bot - Mineflayer bot instance (for location context)
   * @returns {Object} Extracted data: { topics, mood, keyPhrases }
   */
  updateFromChat(message, bot) {
    const lowerMsg = message.toLowerCase();
    const result = {
      topics: [],
      mood: 'neutral',
      keyPhrases: [],
    };

    // Extract topics (fishing-related)
    const topicPatterns = {
      fishing: /\b(fish|fishing|catch|rod|bait|hook|cast|reel)\b/i,
      fish_species: /\b(salmon|trout|bass|cod|tuna|shark|whale)\b/i,
      weather: /\b(weather|rain|storm|sun|sunny|cloudy|wind)\b/i,
      time: /\b(morning|evening|night|dawn|dusk|tide|moon)\b/i,
      equipment: /\b(rod|net|boat|bait|lure|hook|line)\b/i,
      help: /\b(help|teach|show|how|learn|tip|advice)\b/i,
      competition: /\b(beat|win|tournament|record|challenge|compete)\b/i,
      story: /\b(remember|last time|yesterday|story|tale)\b/i,
      greeting: /\b(hi|hello|hey|morning|evening|yo)\b/i,
      farewell: /\b(bye|goodbye|leaving|quit|exit|later)\b/i,
    };

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(message)) {
        result.topics.push(topic);
      }
    }

    // Detect mood
    const moodPatterns = {
      excited: /\b(wow|amazing|awesome|incredible|yes!|finally)\b/i,
      happy: /\b(happy|glad|great|good|nice|love|enjoy)\b/i,
      frustrated: /\b(ugh|annoying|stupid|hate|frustrated|can't)\b/i,
      sad: /\b(sad|sorry|miss|gone|lost|alone)\b/i,
      curious: /\b(what|why|how|where|when|curious|wonder)\b/i,
      grateful: /\b(thank|thanks|appreciate|grateful)\b/i,
      impatient: /\b(hurry|faster|quick|waiting|longer)\b/i,
    };

    for (const [mood, pattern] of Object.entries(moodPatterns)) {
      if (pattern.test(message)) {
        result.mood = mood;
        break;
      }
    }

    // Extract key phrases (quoted text, exclamations, questions about self)
    const quoteMatch = message.match(/"([^"]+)"/);
    if (quoteMatch) result.keyPhrases.push(quoteMatch[1]);

    if (message.includes('!')) result.keyPhrases.push(message);

    // Update preferences based on patterns
    this._inferPreferences(message, result.topics);

    // Record conversation
    this.recordConversation(result, bot);

    return result;
  }

  /**
   * Infer player preferences from message content.
   * @private
   * @param {string} message
   * @param {string[]} topics
   */
  _inferPreferences(message, topics) {
    const lowerMsg = message.toLowerCase();

    // Infer play style
    if (topics.includes('competition')) {
      this.preferences.playStyle = 'competitive';
    } else if (topics.includes('help') || topics.includes('story')) {
      this.preferences.playStyle = 'explorer';
    } else if (topics.includes('fishing') && !topics.includes('competition')) {
      this.preferences.playStyle = 'casual';
    }

    // Infer communication style
    const wordCount = message.split(/\s+/).length;
    if (wordCount < 5) {
      this.preferences.communicationStyle = 'quiet';
    } else if (wordCount > 20 || topics.includes('story')) {
      this.preferences.communicationStyle = 'chatty';
    }

    // Track favorite activities
    if (topics.includes('fishing') && !this.preferences.favoriteActivities.includes('fishing')) {
      this.preferences.favoriteActivities.push('fishing');
    }
  }

  /**
   * Record a conversation entry.
   * @param {Object} data - { topics, mood, keyPhrases }
   * @param {Object} bot - Mineflayer bot instance
   */
  recordConversation(data, bot) {
    const entry = {
      date: new Date().toISOString(),
      location: this._getLocation(bot),
      topics: data.topics,
      mood: data.mood,
      keyPhrases: data.keyPhrases,
    };

    this.conversations.push(entry);

    // Prune old conversations
    this._pruneConversations();
  }

  /**
   * Get current location string from bot.
   * @private
   * @param {Object} bot
   * @returns {string}
   */
  _getLocation(bot) {
    if (!bot?.entity?.position) return 'unknown';
    const pos = bot.entity.position;
    return `${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`;
  }

  /**
   * Record an achievement witnessed by this NPC.
   * @param {string} type - Achievement type
   * @param {Object} details - Achievement details
   * @param {string} [npcReaction] - How the NPC reacted
   */
  recordAchievement(type, details, npcReaction = 'acknowledged') {
    const entry = {
      type,
      date: new Date().toISOString(),
      details,
      npcReaction,
    };

    this.achievements.push(entry);
    this.relationship.lastAchievementDate = entry.date;

    // Add friendship points based on achievement type
    const points = this._getAchievementPoints(type);
    this.addFriendshipPoints(points);
  }

  /**
   * Get friendship points for an achievement type.
   * @private
   * @param {string} type
   * @returns {number}
   */
  _getAchievementPoints(type) {
    const points = {
      first_catch: 3,
      rare_catch: 10,
      legendary_catch: 25,
      tournament_win: 15,
      competition_record: 20,
      learned_skill: 5,
      helped_npc: 10,
    };
    return points[type] || 5;
  }

  /**
   * Record a gift given to this NPC.
   * @param {string} item - Item name
   * @param {string} reaction - "loved", "liked", "neutral", "hated"
   * @param {number} friendshipDelta - Points changed
   */
  recordGift(item, reaction, friendshipDelta) {
    const entry = {
      item,
      date: new Date().toISOString(),
      reaction,
      friendshipDelta,
    };

    this.gifts.push(entry);
    this.relationship.lastGiftDate = entry.date;
    this.addFriendshipPoints(friendshipDelta);
  }

  /**
   * Record an offense against this NPC.
   * @param {string} type - Offense type
   */
  recordOffense(type) {
    const entry = {
      type,
      date: new Date().toISOString(),
      forgiven: false,
    };

    this.offenses.push(entry);

    // Deduct friendship points
    const penalties = {
      theft: -20,
      insult: -15,
      promise_broken: -10,
    };
    this.addFriendshipPoints(penalties[type] || -5);
  }

  /**
   * Forgive an offense.
   * @param {string} type - Offense type to forgive
   */
  forgiveOffense(type) {
    const offense = this.offenses.find(o => o.type === type && !o.forgiven);
    if (offense) {
      offense.forgiven = true;
      offense.forgiveDate = new Date().toISOString();
    }
  }

  /**
   * Add friendship points and update level.
   * @param {number} points
   */
  addFriendshipPoints(points) {
    this.relationship.friendshipPoints = Math.max(0, this.relationship.friendshipPoints + points);
    this._updateFriendshipLevel();
  }

  /**
   * Update friendship level based on points.
   * @private
   */
  _updateFriendshipLevel() {
    const points = this.relationship.friendshipPoints;
    let level = 0;

    if (points >= 200) level = 5;
    else if (points >= 100) level = 4;
    else if (points >= 50) level = 3;
    else if (points >= 25) level = 2;
    else if (points >= 10) level = 1;

    this.relationship.friendshipLevel = level;
  }

  /**
   * Check if player has unforgiven offenses.
   * @returns {boolean}
   */
  hasUnforgivenOffense() {
    return this.offenses.some(o => !o.forgiven);
  }

  /**
   * Prune old conversations, keeping full detail for 30 days.
   * @private
   */
  _pruneConversations() {
    const now = Date.now();
    const fullDetailCutoff = now - FULL_DETAIL_DAYS * 24 * 60 * 60 * 1000;
    const summaryCutoff = now - SUMMARY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Keep full detail for recent, summarize older
    const recent = this.conversations.filter(c => new Date(c.date).getTime() > fullDetailCutoff);
    const old = this.conversations.filter(c => {
      const t = new Date(c.date).getTime();
      return t <= fullDetailCutoff && t > summaryCutoff;
    });

    // Summarize old conversations
    if (old.length > 10) {
      const summary = this._summarizeConversations(old);
      // Keep a summary entry instead of individual entries
      this.conversations = [
        {
          date: new Date(fullDetailCutoff).toISOString(),
          location: 'various',
          topics: summary.topics,
          mood: summary.dominantMood,
          keyPhrases: [],
          summary: true,
          conversationCount: old.length,
        },
        ...recent,
      ];
    } else {
      this.conversations = recent;
    }
  }

  /**
   * Summarize a set of conversations.
   * @private
   * @param {ConversationEntry[]} conversations
   * @returns {Object}
   */
  _summarizeConversations(conversations) {
    const topicCounts = {};
    const moodCounts = {};

    for (const conv of conversations) {
      for (const topic of conv.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
      if (conv.mood) {
        moodCounts[conv.mood] = (moodCounts[conv.mood] || 0) + 1;
      }
    }

    const topics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    const dominantMood = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    return { topics, dominantMood };
  }

  /**
   * Get a compressed summary for dialogue generation.
   * @returns {Object} Summary object
   */
  getSummary() {
    const recentConversations = this.conversations
      .filter(c => !c.summary)
      .slice(-5);

    const summaryEntry = this.conversations.find(c => c.summary);

    return {
      player: {
        name: this.player.displayName || 'stranger',
        firstMet: this.player.firstMet,
        interactionCount: this.player.interactionCount,
      },
      relationship: {
        level: this.relationship.friendshipLevel,
        points: this.relationship.friendshipPoints,
        hasOffense: this.hasUnforgivenOffense(),
      },
      preferences: this.preferences,
      recentTopics: recentConversations.flatMap(c => c.topics).slice(-10),
      recentMood: recentConversations[recentConversations.length - 1]?.mood || 'neutral',
      pastSummary: summaryEntry ? {
        topics: summaryEntry.topics,
        mood: summaryEntry.dominantMood,
        count: summaryEntry.conversationCount,
      } : null,
      achievements: this.achievements.slice(-5).map(a => a.type),
      lastGift: this.gifts[this.gifts.length - 1] || null,
    };
  }

  /**
   * Get friendship level name.
   * @returns {string}
   */
  getFriendshipName() {
    const names = ['Stranger', 'Acquaintance', 'Friendly', 'Friend', 'Close Friend', 'Best Friend'];
    return names[this.relationship.friendshipLevel] || 'Stranger';
  }

  /**
   * Calculate days since last interaction.
   * @returns {number}
   */
  daysSinceLastInteraction() {
    if (!this.player.lastInteraction) return Infinity;
    const last = new Date(this.player.lastInteraction).getTime();
    return Math.floor((Date.now() - last) / (24 * 60 * 60 * 1000));
  }

  /**
   * Apply relationship decay if no recent contact.
   */
  applyDecay() {
    const daysSince = this.daysSinceLastInteraction();
    if (daysSince > 7) {
      // Decay 1 point per week of no contact, but never drop below level threshold
      const decayPoints = Math.floor(daysSince / 7);
      const currentLevel = this.relationship.friendshipLevel;
      const levelThresholds = [0, 10, 25, 50, 100, 200];
      const floor = levelThresholds[currentLevel];

      this.relationship.friendshipPoints = Math.max(
        floor,
        this.relationship.friendshipPoints - decayPoints
      );
      this._updateFriendshipLevel();
    }
  }
}

module.exports = {
  PlayerMemory,
  FULL_DETAIL_DAYS,
  SUMMARY_RETENTION_DAYS,
};
