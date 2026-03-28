/**
 * @module craftmind/npc/archetypes/competitor
 * @description Competitor Archetype - Riley Chen, the ambitious rival fisher NPC.
 *
 * Personality: Driven, competitive, show-off, secretly insecure. Brags constantly,
 * gets flustered when outperformed. Starts dismissive, grows into friendly rivalry.
 *
 * @example
 * const riley = createRiley();
 * riley.initialize(bot);
 * const response = riley.handleChat('I just caught a huge salmon!', playerMemory, bot);
 */

const { DialogueEngine } = require('../dialogue');

/**
 * @typedef {Object} RileyConfig
 * @property {string} name - NPC name
 * @property {string} archetype - Primary archetype
 * @property {string} secondary - Secondary archetype modifier
 * @property {string} game - Associated game mode
 * @property {number} age - NPC age
 * @property {string} voice - Speech style description
 */

/** @type {RileyConfig} */
const RILEY_CONFIG = {
  name: 'Riley Chen',
  archetype: 'competitor',
  secondary: 'socialite',
  game: 'fishing',
  age: 28,
  voice: 'Confident, boastful, uses sports metaphors, occasional nervous laughter when outdone',
};

/** @type {string[]} Riley's catchphrases */
const RILEY_CATCHPHRASES = [
  'New personal record! Oh wait, you did not see that.',
  'I would offer tips but... I do not want the competition getting any better.',
  'That fish? I caught one twice as big yesterday.',
  'Nice try. Better luck next time.',
  'Is that all you have got?',
  'Not bad... for a rookie.',
  'Watch and learn.',
  'I am just warming up.',
  'You almost had me there. Almost.',
  'Practice makes perfect. Too bad I am already perfect.',
];

/** @type {Object} Dialogue templates for Riley */
const RILEY_DIALOGUE = {
  greeting_stranger: [
    'Oh great, another fisher. Try not to get in my way.',
    'New face. Let me guess - you are here to watch a pro?',
    'Fresh competition? Please. Show me what you have got.',
  ],
  greeting_friend: [
    'Back again, {{player.name}}? Ready to lose again?',
    '{{player.name}}! About time. I was getting bored without someone to beat.',
    'Oh look, my favorite rival. How many fish today? I bet I caught more.',
    'Hey {{player.name}}. You been practicing? Good. Makes beating you more satisfying.',
  ],
  greeting_return: [
    'Where have you been, {{player.name}}? I have been setting records without an audience!',
    'Back after {{days}} days? I was NOT counting. Okay maybe I was.',
    'You return! Finally, someone who can almost keep up with me.',
  ],
  farewell: [
    'Leaving already? Probably for the best. I was about to embarrass you anyway.',
    'See you next time. Try to catch something impressive so I have a reason to try.',
    'Off you go. Do not forget who the champion is.',
    'Later, {{player.name}}. I will save some records for you to chase.',
  ],
  help: [
    'You want MY tips? Fine. But do not blame me when you still cannot beat me.',
    'Asking the champ for help? Smart move. Listen up.',
    'I guess I can spare a moment. A SHORT moment. I have records to set.',
    'Okay, here is a secret: practice. A lot. Like I do. Every day. All day.',
  ],
  competition: [
    'Think you can beat MY records? Ha! I dare you to try.',
    'You won this round. But I will be back stronger.',
    'Losing builds character. You should have lots of character by now.',
    'I am not competitive. I am just... enthusiastically superior.',
  ],
  defeated: [
    'You... you actually beat me? That was... impressive. I mean, lucky.',
    'Okay. Okay! Fine. That was good. Really good. Do not let it go to your head!',
    'Well played. But do not get comfortable. I will be back.',
    '*nervous laugh* Wow, you actually did it. Rematch. Now.',
  ],
  bragging: [
    'My record today? Only my best day ever. No big deal.',
    'The fish basically jump into my boat at this point.',
    'I could catch fish blindfolded. Actually, I have.',
    'Personal best? More like personal REST. I make it look easy.',
  ],
  encouragement: [
    'You are getting better. Still behind me, but better.',
    'That was almost impressive. Keep trying.',
    'I see potential. Do not waste it.',
    'Not terrible. For you, that is progress.',
  ],
  story: [
    'I started fishing when I was eight. Beat my dad within a year. He still brings it up.',
    'Competed in the nationals once. Did not win, but I learned a lot about losing gracefully. Kidding!',
    'My biggest catch was a chinook the size of a small car. Okay, maybe a large dog.',
    'People think I am overconfident. They are just under-observant.',
  ],
  secret: [
    'I actually keep a journal of everyone who beats me. You are... on page one. Only page one.',
    'Sometimes I practice at 4am. No one knows. Now you do.',
    'I get nervous before every competition. Do not tell anyone.',
    'The truth? I am scared of getting old and slow. That is why I push so hard.',
  ],
  default: [
    'Interesting.',
    'Is that so?',
    'Hmm.',
    'Sure.',
    '{{npc.catchphrase}}',
  ],
};

/** @type {Object} Mood triggers for Riley */
const RILEY_MOOD_TRIGGERS = {
  rare_catch: 'excited',
  player_beats_record: 'determined',
  daily_best: 'smug',
  player_bigger_fish: 'jealous',
  first_interaction: 'dismissive',
  long_absence: 'dismissive',
  tournament_win: 'ecstatic',
  player_loses: 'smug',
};

/** @type {Object} Gift preferences for Riley */
const RILEY_GIFT_PREFERENCES = {
  loved: ['trophy', 'gold_medal', 'competition_rod', 'champion_belt', 'energy_drink', 'protein_bar'],
  liked: ['fishing_rod', 'any_fish', 'bait', 'tackle', 'stopwatch', 'fitness_item'],
  neutral: ['bread', 'apple', 'coal', 'iron', 'book'],
  hated: ['participation_trophy', 'consolation_prize', 'pity_gift', 'handkerchief'],
};

/** @type {Object} Unlockables by friendship level */
const RILEY_UNLOCKS = {
  1: {
    description: 'Competition tips',
    type: 'dialogue',
  },
  2: {
    description: 'Weekly tournaments unlocked',
    type: 'events',
    events: ['weekly_tournament', 'speed_fishing'],
  },
  3: {
    description: 'Competition equipment discount',
    type: 'discount',
    discount: 0.15,
    items: ['competition_rod', 'speed_reel', 'pro_bait'],
  },
  4: {
    description: 'Personal training sessions',
    type: 'activities',
    activities: ['training_session', 'technique_lesson'],
  },
  5: {
    description: 'Championship rod + rivalry respect',
    type: 'items',
    items: ['rileys_championship_rod'],
    story: 'true_rival',
  },
};

/**
 * CompetitorArchetype class - Riley Chen implementation.
 */
class CompetitorArchetype {
  /**
   * Create a new CompetitorArchetype (Riley Chen).
   */
  constructor() {
    this.config = RILEY_CONFIG;
    this.dialogue = new DialogueEngine({
      name: this.config.name,
      archetype: this.config.archetype,
      catchphrases: RILEY_CATCHPHRASES,
      dialogueTemplates: RILEY_DIALOGUE,
      moodTriggers: RILEY_MOOD_TRIGGERS,
      baseMood: 'dismissive',
    });

    /** @type {Object|null} Bot instance */
    this.bot = null;

    /** @type {Map<string, Object>} Player memory cache */
    this.playerMemories = new Map();

    /** @type {string} Current activity */
    this.currentActivity = 'idle';

    /** @type {Object} Personal records for bragging */
    this.personalRecords = {
      biggestCatch: null,
      fastestCatch: null,
      dailyBest: 0,
      weeklyBest: 0,
    };

    /** @type {Object} NPC relationships */
    this.relationships = {
      gustav: 'rival',          // Old vs new school
      nana_kiko: 'dismissive',  // Does not believe in "mystical nonsense"
      gus: 'friendly',          // Good customer relationship
      captain_marina: 'student',// Marina taught Riley
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

    this.currentActivity = 'fishing';
  }

  /**
   * Get a random catchphrase.
   * @returns {string}
   */
  getRandomCatchphrase() {
    return RILEY_CATCHPHRASES[Math.floor(Math.random() * RILEY_CATCHPHRASES.length)];
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

    // Check if player has beaten Riley recently
    if (context.playerBeatRecord) {
      return this._generateDefeatedResponse(summary);
    }

    // Generate contextual response
    return this.dialogue.generateResponse(message, playerMemory, {
      ...context,
      bot: this.bot,
    });
  }

  /**
   * Generate a response when player beats Riley's record.
   * @private
   * @param {Object} summary - Player summary
   * @returns {string}
   */
  _generateDefeatedResponse(summary) {
    const templates = RILEY_DIALOGUE.defeated;
    let response = templates[Math.floor(Math.random() * templates.length)];
    response = this.dialogue.resolveTemplate(response);
    return this.dialogue._applyMoodTone(response, 'determined');
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

    // Update personal records if needed
    if (details.size && details.size > this.personalRecords.dailyBest) {
      this.personalRecords.dailyBest = details.size;
    }

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

    // Check for pity gifts (hated)
    if (lowerItem.includes('participation') || lowerItem.includes('consolation') ||
        lowerItem.includes('pity') || lowerItem.includes('handkerchief')) {
      preference = 'hated';
    } else if (RILEY_GIFT_PREFERENCES.loved.some(g => lowerItem.includes(g))) {
      preference = 'loved';
    } else if (RILEY_GIFT_PREFERENCES.liked.some(g => lowerItem.includes(g))) {
      preference = 'liked';
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

    for (const [level, unlock] of Object.entries(RILEY_UNLOCKS)) {
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
    for (const [level, unlock] of Object.entries(RILEY_UNLOCKS)) {
      if (parseInt(level) <= friendshipLevel && unlock.type === unlockType) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get a competition tip based on current conditions.
   * @param {Object} conditions - Weather, time, competition type
   * @returns {string}
   */
  getCompetitionTip(conditions = {}) {
    const tips = [];

    if (conditions.type === 'speed') {
      tips.push(
        'Speed fishing is all about rhythm. Cast, wait, reel. No hesitation.',
        'I can land a fish in under thirty seconds. Watch my form.',
        'Speed comes from confidence. Doubt slows you down.'
      );
    }

    if (conditions.type === 'size') {
      tips.push(
        'Big fish require patience. Let them tire themselves out.',
        'The secret to big catches? Fish where the big ones live. Obvious but true.',
        'Quality over quantity. Every time. Almost every time.'
      );
    }

    // Generic tips
    tips.push(
      'Confidence is half the battle. The other half is skill.',
      'I visualize every catch before it happens. Try it.',
      'Never let them see you sweat. Even when you are sweating.'
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
      return 'My stories are for people who stick around. Keep competing.';
    }

    const stories = RILEY_DIALOGUE.story;
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
      return 'You want my secrets? Beat me in a tournament first.';
    }

    const secrets = RILEY_DIALOGUE.secret;
    return secrets[Math.floor(Math.random() * secrets.length)];
  }

  /**
   * Get the NPC's current mood description.
   * @returns {string}
   */
  getMoodDescription() {
    const descriptions = {
      friendly: 'Riley seems genuinely pleased to see you.',
      neutral: 'Riley is flexing and adjusting their gear.',
      dismissive: 'Riley barely acknowledges your presence.',
      excited: 'Riley\'s eyes light up with competitive fire.',
      determined: 'Riley has a focused, intense expression.',
      smug: 'Riley is wearing a self-satisfied grin.',
      jealous: 'Riley looks a bit flustered and defensive.',
    };

    return descriptions[this.dialogue.currentMood] || descriptions.neutral;
  }

  /**
   * Get a description of the NPC.
   * @returns {string}
   */
  getDescription() {
    return `Riley Chen is a driven 28-year-old competitive fisher with an impressive track record and an ego to match. Always ready with a boast or a challenge, Riley's competitive exterior hides a deeply insecure perfectionist who fears mediocrity more than anything. Those who earn Riley's respect find a fiercely loyal rival who celebrates their victories almost as much as their own.`;
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
      return 'I do not really know them. Not interested either.';
    }

    if (summary.relationship.level < 2) {
      return 'Prove yourself first. Then maybe I will share.';
    }

    const gossip = {
      gustav: 'Gustav? Old school. Stubborn. But I will admit he knows his stuff. Does not mean I have to like his attitude.',
      nana_kiko: 'The mystic? Please. I believe in SKILL, not fortune telling. Her predictions are probably just educated guesses.',
      gus: 'Gus is great. Always has the best gear. And he gives me a discount because he knows I am his best customer.',
      captain_marina: 'Marina taught me everything. Everything important anyway. I have surpassed her now, obviously. Obviously.',
    };

    return gossip[npcName.toLowerCase()] || null;
  }

  /**
   * Update personal records.
   * @param {string} recordType
   * @param {*} value
   */
  updateRecord(recordType, value) {
    if (recordType === 'biggestCatch' &&
        (!this.personalRecords.biggestCatch || value > this.personalRecords.biggestCatch)) {
      this.personalRecords.biggestCatch = value;
    }
    if (recordType === 'fastestCatch' &&
        (!this.personalRecords.fastestCatch || value < this.personalRecords.fastestCatch)) {
      this.personalRecords.fastestCatch = value;
    }
    if (recordType === 'dailyBest' && value > this.personalRecords.dailyBest) {
      this.personalRecords.dailyBest = value;
    }
  }

  /**
   * Get current bragging rights.
   * @returns {string}
   */
  getBrag() {
    const brags = RILEY_DIALOGUE.bragging;
    return brags[Math.floor(Math.random() * brags.length)];
  }
}

/**
 * Factory function to create a Riley Chen NPC instance.
 * @param {Object} [bot] - Optional bot instance to initialize with
 * @returns {CompetitorArchetype}
 */
function createRiley(bot = null) {
  const riley = new CompetitorArchetype();
  if (bot) {
    riley.initialize(bot);
  }
  return riley;
}

module.exports = {
  CompetitorArchetype,
  createRiley,
  RILEY_CONFIG,
  RILEY_CATCHPHRASES,
  RILEY_DIALOGUE,
  RILEY_GIFT_PREFERENCES,
  RILEY_UNLOCKS,
};
