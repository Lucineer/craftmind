/**
 * @module craftmind/npc/archetypes/mentor
 * @description Mentor Archetype - Gustav the grumpy fisherman NPC.
 *
 * Personality: Impatient but secretly caring, competitive, gives advice via complaints.
 * This is the "tough love" mentor who pushes players to improve.
 *
 * @example
 * const gustav = createGustav();
 * gustav.initialize(bot);
 * const response = gustav.handleChat('How do I catch salmon?', playerMemory, bot);
 */

const { DialogueEngine } = require('../dialogue');

/**
 * @typedef {Object} GustavConfig
 * @property {string} name - NPC name
 * @property {string} archetype - Primary archetype
 * @property {string} secondary - Secondary archetype modifier
 * @property {string} game - Associated game mode
 * @property {number} age - NPC age
 * @property {string} voice - Speech style description
 */

/** @type {GustavConfig} */
const GUSTAV_CONFIG = {
  name: 'Gustav',
  archetype: 'mentor',
  secondary: 'competitor',
  game: 'fishing',
  age: 67,
  voice: 'Gruff, uses old-fashioned phrases, speaks in short sentences with occasional grumbles',
};

/** @type {string[]} Gustav's catchphrases */
const GUSTAV_CATCHPHRASES = [
  'In my day, we did not need fancy rods.',
  'That fish would not feed a kitten.',
  'At least you are not as bad as the last one.',
  'Back in ninety-four, I caught a forty-pound chinook.',
  'Hmph.',
  'You call that casting?',
  'The fish are laughing at you.',
  'Practice makes adequate. Maybe.',
  'I have seen better from a toddler.',
  'Not terrible. Not good either.',
];

/** @type {Object} Dialogue templates for Gustav */
const GUSTAV_DIALOGUE = {
  greeting_stranger: [
    'New face. Let me guess - you think fishing is easy?',
    'Another one who thinks they can fish. We will see.',
    'You look green. First time on the water?',
  ],
  greeting_friend: [
    'Back again, {{player.name}}. Caught anything worth mentioning?',
    '{{player.name}}. Try not to embarrass yourself today.',
    'Oh, it is you. I suppose that is acceptable.',
    '{{time.greeting}}, {{player.name}}. The fish are waiting.',
  ],
  greeting_return: [
    'Where have you been, {{player.name}}? The fish missed you. Probably.',
    'Back after {{days}} days. I was not counting.',
    'You return. The village has been... quiet without you.',
  ],
  farewell: [
    'Off you go, then. Try not to forget everything I taught you.',
    'Leaving already? The fish will be relieved.',
    'Until next time. Catch something impressive.',
  ],
  help: [
    'You want help? Fine. Listen closely - I will not repeat myself.',
    'Need advice? I suppose I can spare a moment. A SHORT moment.',
    'Asking for tips? {{npc.catchphrase}} Let me show you something.',
    'The secret is patience. Which you clearly lack. But we will work on it.',
  ],
  competition: [
    'You think you can beat my records? Try it. I dare you.',
    'Competition is healthy. Losing builds character.',
    'I have held these records for thirty years. Good luck.',
  ],
  teaching: [
    'Watch. *demonstrates* Now you try. And do not tell me it is hard.',
    'The key is in the wrist. Feel the rhythm.',
    'Stop thinking so much. Just cast.',
    'Patience. The fish will come to you. Eventually.',
  ],
  encouragement: [
    'You are... improving. Slightly.',
    'That was almost acceptable.',
    'I have seen worse. Recently, even.',
    'You might actually become decent. Someday.',
  ],
  story: [
    'In ninety-four, I caught a chinook so big it pulled the boat.',
    'I was not always a fisherman. Used to be an accountant in the city.',
    'The storm of ninety-eight took my boat. But not my spirit.',
    'My daughter... she fished like you. Restless but determined.',
  ],
  secret: [
    'There is a spot past the eastern rocks. Tell no one I told you.',
    'The salmon run at high tide. During the full moon. Remember that.',
    'I have never told anyone this, but... I am proud of you.',
  ],
  default: [
    'Interesting.',
    'Is that so?',
    'Hmm.',
    'I see.',
    '{{npc.catchphrase}}',
  ],
};

/** @type {Object} Mood triggers for Gustav */
const GUSTAV_MOOD_TRIGGERS = {
  rare_catch: 'excited',      // Actually shows grudging respect
  first_interaction: 'grumpy',
  long_absence: 'grumpy',
  rainy_weather: 'friendly',  // Gustav loves fishing in rain
};

/** @type {Object} Gift preferences for Gustav */
const GUSTAV_GIFT_PREFERENCES = {
  loved: ['rare_fish', 'legendary_fish', 'salmon', 'chinook', 'captain_logbook', 'coffee'],
  liked: ['any_fish', 'fishing_rod', 'bait', 'tackle'],
  neutral: ['bread', 'apple', 'coal', 'iron'],
  hated: ['fishing_book', 'enchanted_book', 'written_book'],  // "I don't need to READ about fishing"
};

/** @type {Object} Unlockables by friendship level */
const GUSTAV_UNLOCKS = {
  1: {
    description: 'Daily fishing tips',
    type: 'dialogue',
  },
  2: {
    description: 'Side quests available',
    type: 'quests',
    quests: ['salmon_run_watch', 'equipment_test'],
  },
  3: {
    description: 'Secret fishing spots revealed',
    type: 'locations',
    locations: ['eastern_rocks', 'deep_trench', 'moonlit_cove'],
  },
  4: {
    description: 'Rod upgrade schematics',
    type: 'items',
    items: ['reinforced_rod_schematic'],
  },
  5: {
    description: 'Personal story + lucky rod',
    type: 'story',
    story: 'daughter_story',
    items: ['gustavs_lucky_rod'],
  },
};

/**
 * MentorArchetype class - Gustav implementation.
 */
class MentorArchetype {
  /**
   * Create a new MentorArchetype (Gustav).
   */
  constructor() {
    this.config = GUSTAV_CONFIG;
    this.dialogue = new DialogueEngine({
      name: this.config.name,
      archetype: this.config.archetype,
      catchphrases: GUSTAV_CATCHPHRASES,
      dialogueTemplates: GUSTAV_DIALOGUE,
      moodTriggers: GUSTAV_MOOD_TRIGGERS,
      baseMood: 'grumpy',
    });

    /** @type {Object|null} Bot instance */
    this.bot = null;

    /** @type {Map<string, Object>} Player memory cache */
    this.playerMemories = new Map();

    /** @type {string} Current activity */
    this.currentActivity = 'idle';

    /** @type {Object} NPC relationships */
    this.relationships = {
      captain_marina: 'rival',     // Old school vs new school
      luna: 'tolerant',            // Finds her data obsession tedious
      leo: 'protective',           // Secretly cares about the kid
      zara: 'indifferent',         // Wanderers confuse him
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

    this.currentActivity = 'fishing';  // Gustav is always fishing
  }

  /**
   * Get a random catchphrase.
   * @returns {string}
   */
  getRandomCatchphrase() {
    return GUSTAV_CATCHPHRASES[Math.floor(Math.random() * GUSTAV_CATCHPHRASES.length)];
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

    // Update dialogue variables
    this.dialogue.setVariable('player.name', summary.player.name);
    this.dialogue.setVariable('player.fishCaught', summary.achievements.filter(a => a.includes('catch')).length);

    // Calculate days since last interaction
    const daysSince = playerMemory.daysSinceLastInteraction();
    this.dialogue.setVariable('days', daysSince);

    // Generate contextual response
    return this.dialogue.generateResponse(message, playerMemory, {
      ...context,
      bot: this.bot,
    });
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
    // Record the achievement
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

    // Determine preference
    if (GUSTAV_GIFT_PREFERENCES.loved.some(g => lowerItem.includes(g))) {
      preference = 'loved';
    } else if (GUSTAV_GIFT_PREFERENCES.liked.some(g => lowerItem.includes(g))) {
      preference = 'liked';
    } else if (GUSTAV_GIFT_PREFERENCES.hated.some(g => lowerItem.includes(g))) {
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

    for (const [level, unlock] of Object.entries(GUSTAV_UNLOCKS)) {
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
    for (const [level, unlock] of Object.entries(GUSTAV_UNLOCKS)) {
      if (parseInt(level) <= friendshipLevel && unlock.type === unlockType) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get a fishing tip based on current conditions.
   * @param {Object} conditions - Weather, time, tide
   * @returns {string}
   */
  getFishingTip(conditions = {}) {
    const tips = [];

    if (conditions.weather === 'rain') {
      tips.push(
        'Rain makes the fish active. Good day for salmon.',
        'Do not mind the rain. The fish certainly do not.'
      );
    }

    if (conditions.time === 'morning') {
      tips.push(
        'Early morning. Best time for trout.',
        'Dawn fishing separates the serious from the casual.'
      );
    }

    if (conditions.tide === 'high') {
      tips.push(
        'High tide brings the big ones close to shore.',
        'The salmon run at high tide. Remember that.'
      );
    }

    // Generic tips
    tips.push(
      'Patience is everything. Wait for the bite.',
      'Feel the line, do not just watch it.',
      'Cast where the water moves differently.'
    );

    return tips[Math.floor(Math.random() * tips.length)];
  }

  /**
   * Share a story (unlocked at friendship level 3+).
   * @param {Object} playerMemory
   * @returns {string|null}
   */
  shareStory(playerMemory) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 3) {
      return 'You are not ready for my stories yet. Keep fishing.';
    }

    const stories = GUSTAV_DIALOGUE.story;
    return stories[Math.floor(Math.random() * stories.length)];
  }

  /**
   * Share a secret (unlocked at friendship level 4+).
   * @param {Object} playerMemory
   * @returns {string|null}
   */
  shareSecret(playerMemory) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 4) {
      return 'You think I tell my secrets to just anyone? Fish more.';
    }

    const secrets = GUSTAV_DIALOGUE.secret;
    return secrets[Math.floor(Math.random() * secrets.length)];
  }

  /**
   * Get the NPC's current mood description.
   * @returns {string}
   */
  getMoodDescription() {
    const descriptions = {
      friendly: 'Gustav seems almost pleased to see you.',
      neutral: 'Gustav is focused on the water.',
      grumpy: 'Gustav scowls at the horizon.',
      excited: 'Gustav\'s eyes narrow with interest.',
      secretive: 'Gustav glances around cautiously.',
      annoyed: 'Gustav pointedly ignores you.',
    };

    return descriptions[this.dialogue.currentMood] || descriptions.neutral;
  }

  /**
   * Get a description of the NPC.
   * @returns {string}
   */
  getDescription() {
    return `Gustav is a weathered old fisherman in his late sixties. His face is etched with decades of salt and sun. He wears a faded yellow raincoat and perpetually smells of fish. Despite his gruff exterior, those who earn his trust find a patient teacher and a loyal friend.`;
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
      return 'I do not have much to say about them.';
    }

    if (summary.relationship.level < 2) {
      return 'Get to know me better, and I might share more.';
    }

    const gossip = {
      captain_marina: 'Marina? She knows her way around a boat. I will give her that. But she relies too much on gadgets and not enough on instinct.',
      luna: 'The scientist. Always measuring, never feeling. Fish are more than numbers.',
      leo: 'That kid? He has potential. Reminds me of... someone. Just keep him away from the deep water.',
      zara: 'The wanderer comes and goes. I do not trust people who do not stay in one place.',
    };

    return gossip[npcName.toLowerCase()] || null;
  }
}

/**
 * Factory function to create a Gustav NPC instance.
 * @param {Object} [bot] - Optional bot instance to initialize with
 * @returns {MentorArchetype}
 */
function createGustav(bot = null) {
  const gustav = new MentorArchetype();
  if (bot) {
    gustav.initialize(bot);
  }
  return gustav;
}

module.exports = {
  MentorArchetype,
  createGustav,
  GUSTAV_CONFIG,
  GUSTAV_CATCHPHRASES,
  GUSTAV_DIALOGUE,
  GUSTAV_GIFT_PREFERENCES,
  GUSTAV_UNLOCKS,
};
