/**
 * @module craftmind/npc/archetypes/mystic
 * @description Mystic Archetype - Nana Kiko, the weather-wise elder NPC.
 *
 * Personality: Calm, cryptic, spiritual. Speaks in fishing metaphors
 * and weather wisdom. Predicts rare fish spawns and legendary locations.
 *
 * @example
 * const nana = createNanaKiko();
 * nana.initialize(bot);
 * const forecast = nana.predictWeather(context);
 * const response = nana.handleChat('Any tips for today?', playerMemory, bot);
 */

const { DialogueEngine } = require('../dialogue');

/**
 * @typedef {Object} NanaKikoConfig
 * @property {string} name - NPC name
 * @property {string} archetype - Primary archetype
 * @property {string} secondary - Secondary archetype modifier
 * @property {string} game - Associated game mode
 * @property {number} age - NPC age
 * @property {string} voice - Speech style description
 */

/** @type {NanaKikoConfig} */
const NANA_KIKO_CONFIG = {
  name: 'Nana Kiko',
  archetype: 'mystic',
  secondary: 'mentor',
  game: 'fishing',
  age: 103,
  voice: 'Calm, measured, uses metaphors and proverbs, speaks slowly with meaningful pauses',
};

/** @type {string[]} Nana Kiko's catchphrases */
const NANA_KIKO_CATCHPHRASES = [
  'The salmon know when the tides are turning. So should you.',
  'A storm is coming. The fish will be restless. That is when the legends show themselves.',
  'Patience is not waiting. It is listening.',
  'The water speaks. Few learn its language.',
  'What the sky hides, the water reveals.',
  'Time is like the tide. It comes and goes. Fish during the coming.',
  'The old fish are the wise fish. They know when to bite.',
  'Listen to the wind. It carries secrets.',
  'When the moon is full, so are the nets.',
  'The river remembers every fish that swam it.',
];

/** @type {Object} Dialogue templates for Nana Kiko */
const NANA_KIKO_DIALOGUE = {
  greeting_stranger: [
    'A new soul by the water. The currents have brought you here for a reason.',
    'I have seen your face in my dreams. Welcome to the shore.',
    'The waves whispered of your arrival. I am Nana Kiko.',
  ],
  greeting_friend: [
    '{{player.name}}. The water has been waiting for you.',
    'Ah, {{player.name}}. I sensed your footsteps before I heard them.',
    'The morning mist spoke your name. Good to see you, child.',
    '{{time.greeting}}, {{player.name}}. The fish are restless today. Or is it you?',
  ],
  greeting_return: [
    'You return after {{days}} days. The river has not forgotten you.',
    '{{player.name}}, the tides have missed you. As have I.',
    'The water asked about you. I told it to be patient. Now you are here.',
  ],
  farewell: [
    'Go with the current, not against it. Until we meet again.',
    'The water will still be here when you return. So will I.',
    'May your nets be full and your heart be light.',
    'The sunset calls you. Listen to it.',
  ],
  help: [
    'You seek knowledge? The fish know more than books. Watch them.',
    'I will share what the water has taught me. If you are ready to listen.',
    'Close your eyes. What do you hear? That is where the fish are.',
    'The answer you seek is not in my words. It is in the ripples.',
  ],
  prediction: [
    'I sense a rare spirit in the waters. Tomorrow, perhaps. Bring your best rod.',
    'The moon will be full in three days. The legendary ones will stir.',
    'A storm approaches from the west. The big fish feed before storms.',
    'The salmon run is beginning. I can feel it in my bones.',
  ],
  weather: [
    'Rain brings the salmon close to shore. They are not afraid of water from above.',
    'The wind speaks of change. The fish know this. They always know.',
    'Sun pushes the deep ones down. Patience, child. They will rise.',
    'When clouds gather over the eastern ridge, the crystal koi dance.',
  ],
  legendary: [
    'The Crystal Koi lives in the deep trench. It shows itself only during storms.',
    'The Ghost Salmon swims between worlds. Fish at dusk to find it.',
    'They say the Leviathan sleeps beneath the western reef. I have seen its shadow.',
    'The Golden Trout appears once per generation. This generation, perhaps.',
  ],
  philosophical: [
    'The fish does not wonder why it swims. It simply swims.',
    'To catch a fish, you must think like the water.',
    'Every cast is a question. Every bite is an answer.',
    'The river flows both ways, if you know how to see.',
  ],
  story: [
    'I have fished these waters for ninety years. The fish are my teachers.',
    'My grandmother taught me to read the waves. Her grandmother taught her.',
    'I once caught a fish that spoke. It thanked me and swam away. Some things are not meant to be kept.',
    'The village elders say I will live until I catch the One Fish. I have not caught it yet.',
  ],
  secret: [
    'There is a pool past the waterfall where time moves slower. The oldest fish live there.',
    'During the blue moon, fish with a silver lure. Trust me on this.',
    'I know where the legendary spawn. But the water made me promise not to tell. Until you are ready.',
    'The secret to eternal youth? Catch and release. Always release.',
  ],
  default: [
    'Hmm.',
    'The water speaks...',
    'Interesting.',
    'I see.',
    'Perhaps.',
    '{{npc.catchphrase}}',
  ],
};

/** @type {Object} Mood triggers for Nana Kiko */
const NANA_KIKO_MOOD_TRIGGERS = {
  rare_weather: 'excited',
  player_asks_forecast: 'helpful',
  dawn: 'contemplative',
  dusk: 'contemplative',
  storm_approaching: 'energetic',
  full_moon: 'mystical',
  player_legendary_catch: 'proud',
};

/** @type {Object} Gift preferences for Nana Kiko */
const NANA_KIKO_GIFT_PREFERENCES = {
  loved: ['ancient_artifact', 'crystal', 'herbs', 'rare_flower', 'moonstone', 'ancient_scroll', 'spirit_charm'],
  liked: ['tea', 'candle', 'incense', 'any_fish', 'feather', 'shell', 'driftwood'],
  neutral: ['bread', 'apple', 'coal', 'iron', 'book'],
  hated: ['loud_item', 'tech_gadget', 'explosive', 'pollutant', 'plastic'],
};

/** @type {Object} Unlockables by friendship level */
const NANA_KIKO_UNLOCKS = {
  1: {
    description: 'Basic weather wisdom',
    type: 'dialogue',
  },
  2: {
    description: 'Daily fishing predictions',
    type: 'predictions',
    predictions: ['weather', 'fish_activity', 'best_time'],
  },
  3: {
    description: 'Weather forecasts',
    type: 'forecast',
    accuracy: 0.85,
    advanceHours: 24,
  },
  4: {
    description: 'Advanced predictions + fishing spots',
    type: 'locations',
    locations: ['moonlit_cove', 'deep_trench', 'spirit_pool'],
  },
  5: {
    description: 'Legendary fish hints',
    type: 'legendary',
    hints: ['crystal_koi', 'ghost_salmon', 'leviathan', 'golden_trout'],
  },
  6: {
    description: 'Secret fishing spots during special conditions',
    type: 'secret_spots',
    spots: ['timefall_pool', 'spirit_grove', 'ancient_reef'],
  },
  7: {
    description: 'All legendary locations revealed',
    type: 'mastery',
    legendaryLocations: ['crystal_koi_spawning', 'ghost_salmon_passage', 'leviathan_depths'],
  },
};

/**
 * MysticArchetype class - Nana Kiko implementation.
 */
class MysticArchetype {
  /**
   * Create a new MysticArchetype (Nana Kiko).
   */
  constructor() {
    this.config = NANA_KIKO_CONFIG;
    this.dialogue = new DialogueEngine({
      name: this.config.name,
      archetype: this.config.archetype,
      catchphrases: NANA_KIKO_CATCHPHRASES,
      dialogueTemplates: NANA_KIKO_DIALOGUE,
      moodTriggers: NANA_KIKO_MOOD_TRIGGERS,
      baseMood: 'contemplative',
    });

    /** @type {Object|null} Bot instance */
    this.bot = null;

    /** @type {Map<string, Object>} Player memory cache */
    this.playerMemories = new Map();

    /** @type {string} Current activity */
    this.currentActivity = 'idle';

    /** @type {Object} Weather and fish predictions */
    this.predictions = {
      nextRareSpawn: null,
      weatherForecast: null,
      legendaryWindow: null,
    };

    /** @type {Object} NPC relationships */
    this.relationships = {
      gustav: 'respectful',    // Respects his experience
      riley: 'wary',          // Dislikes the competitiveness
      gus: 'friendly',        // Appreciates his simple nature
      captain_marina: 'wary', // Does not trust "mystical nonsense"
    };
  }

  /**
   * Initialize the NPC with a bot instance.
   * @param {Object} bot - Mineflayer bot instance
   */
  initialize(bot) {
    this.bot = bot;

    // Set initial variables
    this.dialogue.setVariable('npc.name', this.config.name);
    this.dialogue.setVariable('npc.catchphrase', this.getRandomCatchphrase());

    this.currentActivity = 'meditating';
  }

  /**
   * Get a random catchphrase.
   * @returns {string}
   */
  getRandomCatchphrase() {
    return NANA_KIKO_CATCHPHRASES[Math.floor(Math.random() * NANA_KIKO_CATCHPHRASES.length)];
  }

  /**
   * Handle incoming chat message.
   * @param {string} message - Player's message
   * @param {Object} playerMemory - PlayerMemory instance
   * @param {Object} context - Additional context
   * @returns {string} Response
   */
  handleChat(message, playerMemory, context = {}) {
    const summary = playerMemory.getSummary();
    const lowerMsg = message.toLowerCase();

    // Update dialogue variables
    this.dialogue.setVariable('player.name', summary.player.name);
    this.dialogue.setVariable('player.fishCaught', summary.achievements.filter(a => a.includes('catch')).length);

    // Calculate days since last interaction
    const daysSince = playerMemory.daysSinceLastInteraction();
    this.dialogue.setVariable('days', daysSince);

    // Check for prediction requests
    if (lowerMsg.includes('predict') || lowerMsg.includes('forecast') ||
        lowerMsg.includes('weather') || lowerMsg.includes('will') ||
        lowerMsg.includes('coming')) {
      return this._generatePredictionResponse(summary, playerMemory);
    }

    // Check for legendary fish questions
    if (lowerMsg.includes('legendary') || lowerMsg.includes('rare') ||
        lowerMsg.includes('special') || lowerMsg.includes('crystal') ||
        lowerMsg.includes('ghost') || lowerMsg.includes('leviathan')) {
      return this._generateLegendaryResponse(summary, playerMemory);
    }

    // Generate contextual response
    return this.dialogue.generateResponse(message, playerMemory, {
      ...context,
      bot: this.bot,
    });
  }

  /**
   * Generate a prediction-based response.
   * @private
   * @param {Object} summary - Player summary
   * @param {Object} playerMemory
   * @returns {string}
   */
  _generatePredictionResponse(summary, playerMemory) {
    // Check if player has unlock
    if (summary.relationship.level < 2) {
      return 'You ask about the future? The water will tell you, but you must learn to listen first.';
    }

    const templates = NANA_KIKO_DIALOGUE.prediction;
    let response = templates[Math.floor(Math.random() * templates.length)];
    response = this.dialogue.resolveTemplate(response);
    return this.dialogue._applyMoodTone(response, 'helpful');
  }

  /**
   * Generate a legendary fish hint response.
   * @private
   * @param {Object} summary - Player summary
   * @param {Object} playerMemory
   * @returns {string}
   */
  _generateLegendaryResponse(summary, playerMemory) {
    if (summary.relationship.level < 4) {
      return 'The legendary ones... they choose who sees them. Prove yourself worthy first.';
    }

    const templates = NANA_KIKO_DIALOGUE.legendary;
    let response = templates[Math.floor(Math.random() * templates.length)];
    response = this.dialogue.resolveTemplate(response);
    return this.dialogue._applyMoodTone(response, 'mystical');
  }

  /**
   * Generate a greeting for a player.
   * @param {Object} playerMemory - PlayerMemory instance
   * @param {Object} context - Current context
   * @returns {string}
   */
  generateGreeting(playerMemory, context = {}) {
    const summary = playerMemory.getSummary();
    const daysSince = playerMemory.daysSinceLastInteraction();

    this.dialogue.setVariable('player.name', summary.player.name);
    this.dialogue.setVariable('days', daysSince);

    return this.dialogue.generateGreeting(playerMemory, context);
  }

  /**
   * React to a player achievement.
   * @param {string} achievementType
   * @param {Object} details
   * @param {Object} playerMemory
   * @returns {string}
   */
  reactToAchievement(achievementType, details, playerMemory) {
    const reaction = this.dialogue.generateAchievementReaction(achievementType, details, playerMemory);
    playerMemory.recordAchievement(achievementType, details, reaction);

    return reaction;
  }

  /**
   * React to receiving a gift.
   * @param {string} item - Item name
   * @param {Object} playerMemory
   * @returns {Object} { reaction, friendshipDelta, preference }
   */
  receiveGift(item, playerMemory) {
    const lowerItem = item.toLowerCase();
    let preference = 'neutral';

    if (NANA_KIKO_GIFT_PREFERENCES.loved.some(g => lowerItem.includes(g))) {
      preference = 'loved';
    } else if (NANA_KIKO_GIFT_PREFERENCES.liked.some(g => lowerItem.includes(g))) {
      preference = 'liked';
    } else if (NANA_KIKO_GIFT_PREFERENCES.hated.some(g => lowerItem.includes(g))) {
      preference = 'hated';
    }

    const result = this.dialogue.generateGiftReaction(item, preference, playerMemory);
    playerMemory.recordGift(item, preference, result.friendshipDelta);

    return {
      ...result,
      preference,
    };
  }

  /**
   * Get unlockables available at current friendship level.
   * @param {number} friendshipLevel
   * @returns {Object[]}
   */
  getAvailableUnlocks(friendshipLevel) {
    const unlocks = [];

    for (const [level, unlock] of Object.entries(NANA_KIKO_UNLOCKS)) {
      if (parseInt(level) <= friendshipLevel) {
        unlocks.push({
          level: parseInt(level),
          ...unlock,
        });
      }
    }

    return unlocks;
  }

  /**
   * Check if a specific unlock is available.
   * @param {number} friendshipLevel
   * @param {string} unlockType
   * @returns {boolean}
   */
  hasUnlock(friendshipLevel, unlockType) {
    for (const [level, unlock] of Object.entries(NANA_KIKO_UNLOCKS)) {
      if (parseInt(level) <= friendshipLevel && unlock.type === unlockType) {
        return true;
      }
    }
    return false;
  }

  /**
   * Predict weather conditions (unlocked at friendship level 3+).
   * @param {Object} playerMemory
   * @param {Object} currentConditions
   * @returns {Object|null}
   */
  predictWeather(playerMemory, currentConditions = {}) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 3) {
      return null;
    }

    // Generate a mystical prediction
    const predictions = [
      { condition: 'rain', confidence: 0.85, timing: 'within 6 hours', advice: 'The fish will be active.' },
      { condition: 'clear', confidence: 0.9, timing: 'rest of day', advice: 'Deep waters will be productive.' },
      { condition: 'storm', confidence: 0.7, timing: 'within 12 hours', advice: 'Legendary ones may appear.' },
      { condition: 'fog', confidence: 0.8, timing: 'morning', advice: 'The shy fish come out in fog.' },
    ];

    return predictions[Math.floor(Math.random() * predictions.length)];
  }

  /**
   * Predict rare fish spawn (unlocked at friendship level 4+).
   * @param {Object} playerMemory
   * @param {Object} conditions
   * @returns {Object|null}
   */
  predictRareSpawn(playerMemory, conditions = {}) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 4) {
      return null;
    }

    // Mystical rare fish prediction
    const rareFish = [
      { species: 'crystal_koi', probability: 0.15, location: 'deep trench', time: 'during storms' },
      { species: 'ghost_salmon', probability: 0.1, location: 'moonlit cove', time: 'at dusk' },
      { species: 'golden_trout', probability: 0.05, location: 'spirit pool', time: 'dawn, full moon' },
      { species: 'shadow_bass', probability: 0.2, location: 'anywhere', time: 'during fog' },
    ];

    // Randomly select one to predict
    return rareFish[Math.floor(Math.random() * rareFish.length)];
  }

  /**
   * Get legendary fish hint (unlocked at friendship level 5+).
   * @param {Object} playerMemory
   * @param {string} fishType
   * @returns {string|null}
   */
  getLegendaryHint(playerMemory, fishType) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 5) {
      return 'The legendary ones reveal themselves only to those who have proven themselves. Continue your journey.';
    }

    const hints = {
      crystal_koi: 'The Crystal Koi dwells in the deepest part of the eastern trench. It emerges only when lightning touches the water.',
      ghost_salmon: 'The Ghost Salmon swims between worlds at the boundary of day and night. Fish at the moonlit cove as the sun sets.',
      leviathan: 'The Leviathan sleeps beneath the western reef. Only the most patient anglers can wake it. Use the ancient lure.',
      golden_trout: 'The Golden Trout appears once per generation at the spirit pool during the blue moon. This generation is now.',
    };

    return hints[fishType.toLowerCase()] || 'That creature... I sense it exists, but its location eludes even me.';
  }

  /**
   * Get secret fishing spot (unlocked at friendship level 6+).
   * @param {Object} playerMemory
   * @param {string} conditions - Special conditions (storm, full_moon, etc.)
   * @returns {Object|null}
   */
  getSecretSpot(playerMemory, conditions) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 6) {
      return null;
    }

    const spots = {
      storm: { name: 'timefall_pool', description: 'Where time slows during storms', location: { x: -150, y: 45, z: 200 } },
      full_moon: { name: 'spirit_grove', description: 'The spirits dance on full moon nights', location: { x: 300, y: 62, z: -100 } },
      fog: { name: 'ancient_reef', description: 'Lost to memory, found in fog', location: { x: 0, y: 30, z: 400 } },
    };

    return spots[conditions.toLowerCase()] || null;
  }

  /**
   * Share a story (unlocked at friendship level 3+).
   * @param {Object} playerMemory
   * @returns {string|null}
   */
  shareStory(playerMemory) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 3) {
      return 'My stories are long. Very long. Return when you have time to listen.';
    }

    const stories = NANA_KIKO_DIALOGUE.story;
    return stories[Math.floor(Math.random() * stories.length)];
  }

  /**
   * Share a secret (unlocked at friendship level 5+).
   * @param {Object} playerMemory
   * @returns {string|null}
   */
  shareSecret(playerMemory) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 5) {
      return 'The water has secrets. So do I. But not for you. Not yet.';
    }

    const secrets = NANA_KIKO_DIALOGUE.secret;
    return secrets[Math.floor(Math.random() * secrets.length)];
  }

  /**
   * Get the NPC's current mood description.
   * @returns {string}
   */
  getMoodDescription() {
    const descriptions = {
      friendly: 'Nana Kiko\'s eyes twinkle with ancient warmth.',
      neutral: 'Nana Kiko sits motionless, watching the water.',
      contemplative: 'Nana Kiko seems lost in thought, or perhaps in conversation with the waves.',
      excited: 'Nana Kiko\'s eyes widen with rare energy.',
      helpful: 'Nana Kiko leans forward with knowing eyes.',
      mystical: 'Nana Kiko\'s presence seems to shimmer slightly.',
    };

    return descriptions[this.dialogue.currentMood] || descriptions.neutral;
  }

  /**
   * Get a description of the NPC.
   * @returns {string}
   */
  getDescription() {
    return `Nana Kiko is an elder of indeterminate age - some say over 100 years - who has fished these waters longer than anyone can remember. She speaks in riddles and weather wisdom, claiming to hear the voices of fish and water. Many dismiss her as eccentric, but her predictions have an uncanny accuracy. Those who earn her trust gain access to knowledge of legendary fish and secret fishing spots.`;
  }

  /**
   * Check if this NPC has a relationship with another NPC.
   * @param {string} npcName
   * @returns {string|null}
   */
  getRelationship(npcName) {
    return this.relationships[npcName.toLowerCase()] || null;
  }

  /**
   * Get gossip about another NPC.
   * @param {string} npcName
   * @param {Object} playerMemory
   * @returns {string|null}
   */
  getGossip(npcName, playerMemory) {
    const summary = playerMemory.getSummary();
    const relationship = this.getRelationship(npcName);

    if (!relationship) {
      return 'I do not know this one well. The water does not speak of them.';
    }

    if (summary.relationship.level < 2) {
      return 'Learn the water\'s language first. Then I will share what I know.';
    }

    const gossip = {
      gustav: 'Gustav... he has old wisdom, even if he does not show it. The fish respect him. So do I.',
      riley: 'The competitive one. So much energy spent on winning. The fish do not care about records.',
      gus: 'Gus has a good heart. Simple, but good. He listens, which is rare these days.',
      captain_marina: 'Marina does not believe in what she cannot see. A limitation. The invisible is often the most important.',
    };

    return gossip[npcName.toLowerCase()] || null;
  }

  /**
   * Get a philosophical quote.
   * @returns {string}
   */
  getPhilosophy() {
    const quotes = NANA_KIKO_DIALOGUE.philosophical;
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
}

/**
 * Factory function to create a Nana Kiko NPC instance.
 * @param {Object} [bot] - Optional bot instance to initialize with
 * @returns {MysticArchetype}
 */
function createNanaKiko(bot = null) {
  const nana = new MysticArchetype();
  if (bot) {
    nana.initialize(bot);
  }
  return nana;
}

module.exports = {
  MysticArchetype,
  createNanaKiko,
  NANA_KIKO_CONFIG,
  NANA_KIKO_CATCHPHRASES,
  NANA_KIKO_DIALOGUE,
  NANA_KIKO_GIFT_PREFERENCES,
  NANA_KIKO_UNLOCKS,
};
