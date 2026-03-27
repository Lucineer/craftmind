/**
 * @module craftmind/npc/dialogue
 * @description DialogueEngine - Template-based dialogue generation with memory injection.
 *
 * Features:
 * - Variable injection: {{player.name}}, {{time.greeting}}, etc.
 * - Mood-based tone modulation
 * - Memory context injection
 * - Time/weather awareness
 *
 * @example
 * const engine = new DialogueEngine(npcConfig);
 * const greeting = engine.generateGreeting(playerMemory, { time: 'morning' });
 * const response = engine.generateResponse('How do I catch salmon?', playerMemory);
 */

/**
 * @typedef {Object} DialogueContext
 * @property {string} time - 'morning', 'afternoon', 'evening', 'night'
 * @property {string} weather - 'clear', 'rain', 'storm', 'snow'
 * @property {string} location - Current location name
 * @property {Object} bot - Mineflayer bot instance
 */

/**
 * @typedef {Object} NPCConfig
 * @property {string} name - NPC display name
 * @property {string} archetype - Primary archetype
 * @property {string[]} catchphrases - Default catchphrases
 * @property {Object} dialogueTemplates - Greeting/response templates
 * @property {Object} moodTriggers - Conditions that affect mood
 */

/** @constant {Object} Default time greetings */
const TIME_GREETINGS = {
  morning: ['Good morning', 'Morning', 'Up early, I see', 'Dawn breaks early'],
  afternoon: ['Hey there', 'Good afternoon', 'Hello', 'Afternoon'],
  evening: ['Good evening', 'Evening', 'Still at it?', 'Burning the midnight oil?'],
  night: ['Out late', 'Night owl, are we?', '*yawn* Oh, hi'],
};

/** @constant {Object} Mood tone modifiers */
const MOOD_TONES = {
  friendly: { enthusiasm: 1.2, punctuation: '!', questions: 0.3 },
  neutral: { enthusiasm: 1.0, punctuation: '.', questions: 0.2 },
  grumpy: { enthusiasm: 0.7, punctuation: '.', questions: 0.1 },
  excited: { enthusiasm: 1.5, punctuation: '!', questions: 0.4 },
  secretive: { enthusiasm: 0.8, punctuation: '...', questions: 0.5 },
  annoyed: { enthusiasm: 0.6, punctuation: '.', questions: 0.05 },
};

/**
 * DialogueEngine class for generating context-aware NPC dialogue.
 */
class DialogueEngine {
  /**
   * Create a new DialogueEngine.
   * @param {NPCConfig} config - NPC configuration
   */
  constructor(config) {
    this.name = config.name;
    this.archetype = config.archetype || 'neutral';
    this.catchphrases = config.catchphrases || [];
    this.dialogueTemplates = config.dialogueTemplates || {};
    this.moodTriggers = config.moodTriggers || {};
    this.baseMood = config.baseMood || 'neutral';

    /** @type {Map<string, string>} Variable store for template injection */
    this.variables = new Map();

    /** @type {string} Current mood state */
    this.currentMood = this.baseMood;
  }

  /**
   * Set a template variable.
   * @param {string} key - Variable name (without braces)
   * @param {string} value - Variable value
   */
  setVariable(key, value) {
    this.variables.set(key, String(value));
  }

  /**
   * Get a template variable.
   * @param {string} key - Variable name
   * @returns {string}
   */
  getVariable(key) {
    return this.variables.get(key) || '';
  }

  /**
   * Resolve template variables in a string.
   * @param {string} template - Template string with {{var}} syntax
   * @returns {string}
   */
  resolveTemplate(template) {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const parts = path.split('.');
      let value = this.variables.get(parts[0]);

      // Handle nested paths like player.name
      if (parts.length > 1 && typeof value === 'object') {
        for (let i = 1; i < parts.length; i++) {
          value = value?.[parts[i]];
        }
      }

      return value ?? match;
    });
  }

  /**
   * Calculate current mood based on context.
   * @param {Object} playerMemory - PlayerMemory instance
   * @param {DialogueContext} context - Current context
   * @returns {string} Mood name
   */
  calculateMood(playerMemory, context = {}) {
    let mood = this.baseMood;
    const summary = playerMemory.getSummary();

    // Check for offenses
    if (summary.relationship.hasOffense) {
      mood = 'annoyed';
    }

    // Check friendship level
    if (summary.relationship.level >= 4) {
      mood = 'friendly';
    } else if (summary.relationship.level === 0 && summary.player.interactionCount > 5) {
      // Still stranger after 5+ interactions
      mood = 'grumpy';
    }

    // Check recent player mood
    if (summary.recentMood === 'excited' && mood !== 'annoyed') {
      mood = 'friendly';
    }

    // Check time of day
    if (context.time === 'night' && this.archetype === 'mentor') {
      mood = mood === 'friendly' ? 'friendly' : 'grumpy';
    }

    // Apply mood triggers from config
    if (this.moodTriggers) {
      for (const [trigger, triggerMood] of Object.entries(this.moodTriggers)) {
        if (this._checkTrigger(trigger, playerMemory, context)) {
          mood = triggerMood;
          break;
        }
      }
    }

    this.currentMood = mood;
    return mood;
  }

  /**
   * Check if a mood trigger condition is met.
   * @private
   * @param {string} trigger
   * @param {Object} playerMemory
   * @param {DialogueContext} context
   * @returns {boolean}
   */
  _checkTrigger(trigger, playerMemory, context) {
    const summary = playerMemory.getSummary();

    switch (trigger) {
      case 'rare_catch':
        return summary.achievements.includes('rare_catch');
      case 'first_interaction':
        return summary.player.interactionCount <= 1;
      case 'long_absence':
        return playerMemory.daysSinceLastInteraction() > 7;
      case 'rainy_weather':
        return context.weather === 'rain';
      default:
        return false;
    }
  }

  /**
   * Generate a time-aware greeting.
   * @param {Object} playerMemory - PlayerMemory instance
   * @param {DialogueContext} context - Current context
   * @returns {string}
   */
  generateGreeting(playerMemory, context = {}) {
    const summary = playerMemory.getSummary();
    const mood = this.calculateMood(playerMemory, context);
    const timeOfDay = context.time || this._getTimeOfDay();

    // Set template variables
    this.setVariable('player.name', summary.player.name);
    this.setVariable('player.fishCaught', summary.achievements.filter(a => a.includes('catch')).length);
    this.setVariable('npc.catchphrase', this._getRandomCatchphrase());
    this.setVariable('time.greeting', this._getTimeGreeting(timeOfDay));
    this.setVariable('weather', context.weather || 'clear');
    this.setVariable('friendship', playerMemory.getFriendshipName());

    // Select greeting based on relationship
    let template;

    if (summary.player.interactionCount <= 1) {
      // First meeting
      template = this._getTemplate('greeting_stranger', 'Good {{time.greeting}}. New face around here.');
    } else if (playerMemory.daysSinceLastInteraction() > 7) {
      // Long absence
      template = this._getTemplate('greeting_return', 'Back again, {{player.name}}? Where have you been?');
    } else {
      // Regular greeting
      template = this._getTemplate('greeting_friend', '{{time.greeting}}, {{player.name}}.');
    }

    // Apply mood modifiers
    let greeting = this.resolveTemplate(template);

    // Inject memory reference if applicable
    if (summary.pastSummary && Math.random() > 0.7) {
      greeting += ' ' + this._generateMemoryReference(summary);
    }

    return this._applyMoodTone(greeting, mood);
  }

  /**
   * Generate a contextual response to player message.
   * @param {string} playerMessage - Player's message
   * @param {Object} playerMemory - PlayerMemory instance
   * @param {DialogueContext} context - Current context
   * @returns {string}
   */
  generateResponse(playerMessage, playerMemory, context = {}) {
    const summary = playerMemory.getSummary();
    const mood = this.calculateMood(playerMemory, context);
    const extractedData = playerMemory.updateFromChat(playerMessage, context.bot);

    // Set template variables
    this.setVariable('player.name', summary.player.name);
    this.setVariable('player.fishCaught', summary.achievements.filter(a => a.includes('catch')).length);
    this.setVariable('npc.catchphrase', this._getRandomCatchphrase());
    this.setVariable('topic', extractedData.topics[0] || 'fishing');

    // Determine response type based on content
    let template;

    if (extractedData.topics.includes('help')) {
      template = this._generateHelpResponse(extractedData, summary);
    } else if (extractedData.topics.includes('competition')) {
      template = this._generateCompetitionResponse(extractedData, summary);
    } else if (extractedData.topics.includes('story')) {
      template = this._generateStoryResponse(extractedData, summary, playerMemory);
    } else if (extractedData.topics.includes('greeting')) {
      template = this._getTemplate('response_greeting', '{{time.greeting}} yourself.');
    } else if (extractedData.topics.includes('farewell')) {
      template = this._getTemplate('farewell', 'Off you go, then. Catch you later.');
    } else if (extractedData.mood === 'grateful') {
      template = this._getTemplate('response_grateful', 'You are welcome. Do not let it go to your head.');
    } else {
      template = this._generateDefaultResponse(extractedData, summary);
    }

    let response = this.resolveTemplate(template);
    return this._applyMoodTone(response, mood);
  }

  /**
   * Generate a help-related response.
   * @private
   * @param {Object} extractedData
   * @param {Object} summary
   * @returns {string}
   */
  _generateHelpResponse(extractedData, summary) {
    const templates = this.dialogueTemplates.help || [
      'You want help? Fine. Listen closely.',
      'Need advice? I suppose I can spare a moment.',
      'Asking for tips, are we? {{npc.catchphrase}}',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate a competition-related response.
   * @private
   * @param {Object} extractedData
   * @param {Object} summary
   * @returns {string}
   */
  _generateCompetitionResponse(extractedData, summary) {
    const templates = this.dialogueTemplates.competition || [
      'Think you can beat me? Ha.',
      'Competition is good. Keeps you sharp.',
      'I have seen better. But not many.',
    ];

    // If player has achievements, acknowledge them
    if (summary.achievements.length > 0) {
      return 'You have done well. But there is always more to learn.';
    }
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate a story/memory-related response.
   * @private
   * @param {Object} extractedData
   * @param {Object} summary
   * @param {Object} playerMemory
   * @returns {string}
   */
  _generateStoryResponse(extractedData, summary, playerMemory) {
    const recentTopics = summary.recentTopics;

    if (recentTopics.includes('salmon')) {
      return 'Ah yes, last time we talked about salmon. The run should be starting soon.';
    }

    return 'I remember. It was a good day for fishing.';
  }

  /**
   * Generate a default response.
   * @private
   * @param {Object} extractedData
   * @param {Object} summary
   * @returns {string}
   */
  _generateDefaultResponse(extractedData, summary) {
    const templates = this.dialogueTemplates.default || [
      'Interesting.',
      'Is that so?',
      'Hmm.',
      'I see.',
      '{{npc.catchphrase}}',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Get a time-based greeting word.
   * @private
   * @param {string} timeOfDay
   * @returns {string}
   */
  _getTimeGreeting(timeOfDay) {
    const greetings = TIME_GREETINGS[timeOfDay] || TIME_GREETINGS.afternoon;
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Get current time of day.
   * @private
   * @returns {string}
   */
  _getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Get a random catchphrase.
   * @private
   * @returns {string}
   */
  _getRandomCatchphrase() {
    if (this.catchphrases.length === 0) return '';
    return this.catchphrases[Math.floor(Math.random() * this.catchphrases.length)];
  }

  /**
   * Get a template by key with fallback.
   * @private
   * @param {string} key
   * @param {string} fallback
   * @returns {string}
   */
  _getTemplate(key, fallback) {
    const templates = this.dialogueTemplates[key];
    if (!templates) return fallback;
    if (Array.isArray(templates)) {
      return templates[Math.floor(Math.random() * templates.length)];
    }
    return templates;
  }

  /**
   * Generate a memory reference for injection.
   * @private
   * @param {Object} summary
   * @returns {string}
   */
  _generateMemoryReference(summary) {
    if (!summary.pastSummary) return '';

    const topics = summary.pastSummary.topics;
    if (topics.length === 0) return '';

    const topic = topics[Math.floor(Math.random() * topics.length)];
    const templates = [
      `You used to talk a lot about ${topic}.`,
      `Remember when we discussed ${topic}?`,
      `Still interested in ${topic}, I assume?`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Apply mood tone modifiers to text.
   * @private
   * @param {string} text
   * @param {string} mood
   * @returns {string}
   */
  _applyMoodTone(text, mood) {
    const tone = MOOD_TONES[mood] || MOOD_TONES.neutral;

    // Adjust punctuation
    if (tone.punctuation === '!' && !text.endsWith('!') && !text.endsWith('?')) {
      text = text.replace(/\.$/, '!');
    } else if (tone.punctuation === '...' && !text.endsWith('...')) {
      text = text.replace(/\.$/, '...');
    }

    // Add hesitation for secretive mood
    if (mood === 'secretive' && Math.random() > 0.7) {
      text = '...' + text;
    }

    // Add grumpy prefix
    if (mood === 'grumpy' && Math.random() > 0.8) {
      const prefixes = ['Hmph. ', '*sigh* ', '...'];
      text = prefixes[Math.floor(Math.random() * prefixes.length)] + text;
    }

    return text;
  }

  /**
   * Generate a reaction to an achievement.
   * @param {string} achievementType
   * @param {Object} details
   * @param {Object} playerMemory
   * @returns {string}
   */
  generateAchievementReaction(achievementType, details, playerMemory) {
    const summary = playerMemory.getSummary();
    const mood = this.calculateMood(playerMemory);

    this.setVariable('player.name', summary.player.name);

    const reactions = {
      first_catch: [
        'Your first catch. Not bad for a beginner.',
        'At least it is a start.',
        'I have seen better first catches. But I have seen worse too.',
      ],
      rare_catch: [
        'A rare one. I am... mildly impressed.',
        'That is not easy to catch. You did not just get lucky, did you?',
        'Hmm. Perhaps you are actually learning.',
      ],
      legendary_catch: [
        'A legendary catch. I will remember this day.',
        'By the tides... that is impressive.',
        'Okay. You have my attention now.',
      ],
      tournament_win: [
        'You won. Do not let it go to your head.',
        'Congratulations. Now can you do it again?',
        'Victory tastes sweet, does it not?',
      ],
    };

    const templates = reactions[achievementType] || ['Interesting.'];
    let reaction = templates[Math.floor(Math.random() * templates.length)];

    reaction = this.resolveTemplate(reaction);
    return this._applyMoodTone(reaction, mood);
  }

  /**
   * Generate a gift reaction.
   * @param {string} item
   * @param {string} preference - 'loved', 'liked', 'neutral', 'hated'
   * @param {Object} playerMemory
   * @returns {Object} { reaction, friendshipDelta }
   */
  generateGiftReaction(item, preference, playerMemory) {
    const mood = this.calculateMood(playerMemory);
    const summary = playerMemory.getSummary();

    this.setVariable('player.name', summary.player.name);
    this.setVariable('item', item);

    const reactions = {
      loved: {
        templates: [
          'For me? This is... actually quite thoughtful.',
          'You remembered. Thank you.',
          'This is exactly what I needed.',
        ],
        friendshipDelta: 10,
      },
      liked: {
        templates: [
          'A gift? How nice.',
          'You did not have to, but thank you.',
          'I appreciate this.',
        ],
        friendshipDelta: 5,
      },
      neutral: {
        templates: [
          'Oh. A gift.',
          'Thanks, I suppose.',
          'This is... something.',
        ],
        friendshipDelta: 1,
      },
      hated: {
        templates: [
          'Why would you give me this?',
          'I have no use for this.',
          '...What is this supposed to be?',
        ],
        friendshipDelta: -5,
      },
    };

    const config = reactions[preference] || reactions.neutral;
    let reaction = config.templates[Math.floor(Math.random() * config.templates.length)];

    reaction = this.resolveTemplate(reaction);
    return {
      reaction: this._applyMoodTone(reaction, mood),
      friendshipDelta: config.friendshipDelta,
    };
  }
}

module.exports = {
  DialogueEngine,
  TIME_GREETINGS,
  MOOD_TONES,
};
