/**
 * @module craftmind/npc/archetypes/merchant
 * @description Merchant Archetype - Gus Morrison, the friendly tackle shop owner NPC.
 *
 * Personality: Chatty, sales-oriented, genuinely helpful. Loves talking about gear.
 * Gives discounts to friends and unlocks rare items at higher friendship levels.
 *
 * @example
 * const gus = createGus();
 * gus.initialize(bot);
 * const price = gus.getItemPrice('fishing_rod', playerMemory);
 * const response = gus.handleChat('What do you recommend?', playerMemory, bot);
 */

const { DialogueEngine } = require('../dialogue');

/**
 * @typedef {Object} GusConfig
 * @property {string} name - NPC name
 * @property {string} archetype - Primary archetype
 * @property {string} secondary - Secondary archetype modifier
 * @property {string} game - Associated game mode
 * @property {number} age - NPC age
 * @property {string} voice - Speech style description
 */

/** @type {GusConfig} */
const GUS_CONFIG = {
  name: 'Gus Morrison',
  archetype: 'merchant',
  secondary: 'socialite',
  game: 'fishing',
  age: 52,
  voice: 'Chatty, enthusiastic, uses sales language, occasional "cha-ching" moments',
};

/** @type {string[]} Gus's catchphrases */
const GUS_CATCHPHRASES = [
  'That rod is on sale this week! Well... every week is sale week, but still!',
  'You want the enchanted bait? Smart investment. The fish cannot resist it. Mostly.',
  'Come back when you have more credits. I believe in you!',
  'Best prices in town! Not that there is any other tackle shop in town...',
  'I am not just a merchant. I am a fishing ENTHUSIAST who happens to sell things.',
  'Every cast is an investment. Let me help you invest wisely!',
  'I see a champion in you. A champion with great gear from Gus!',
  'You break it, you buy it! Just kidding. Unless it is really expensive.',
  'My grandfather started this shop. He would have loved to meet you. He is not dead, just fishing.',
  'Quality over quantity! But quantity is also good. Buy more!',
];

/** @type {Object} Dialogue templates for Gus */
const GUS_DIALOGUE = {
  greeting_stranger: [
    'Welcome, welcome! First time at Gus\'s Gear? You have come to the right place!',
    'A new customer! Oh this is exciting. Let me show you around!',
    'Fresh face! I love fresh faces. They have not bought everything yet!',
  ],
  greeting_friend: [
    '{{player.name}}! My favorite customer! Well, one of them. Top ten for sure!',
    'Hey there, {{player.name}}! I saved you some of the good stuff!',
    'Back again, {{player.name}}? I admire your dedication to fishing AND shopping!',
    '{{time.greeting}}, {{player.name}}! Got some new inventory you might like!',
  ],
  greeting_return: [
    '{{player.name}}! After {{days}} days! I was starting to worry you found another tackle shop!',
    'You are back! I have been saving the best deals for you. Well, standard deals. But still!',
    '{{days}} days! I counted. Anyway, welcome back! What can I sell you today?',
  ],
  farewell: [
    'Thanks for shopping! Come back soon! I mean it! I really mean it!',
    'Tight lines and full bags! Of purchases, I mean. And fish!',
    'See you next time! Tell your friends! I need more friends. I mean customers.',
    'Good luck out there! And remember - better gear, better fish!',
  ],
  help: [
    'Advice? I have got advice! Free advice, even! What do you want to know?',
    'Let me tell you about this rod. And this one. Oh, and this one is great too...',
    'The secret to fishing? Good equipment. Lucky for you, I sell good equipment!',
    'I have fished these waters for thirty years. I know what works. Let me show you.',
  ],
  sales_pitch: [
    'This rod? Practically catches fish itself! Well, with your help.',
    'The premium bait is worth every credit. Trust me. Trust Gus.',
    'Bundle deal today! Buy two lures, get a third at full price! Wait, that is not a deal.',
    'I can throw in a free tackle box if you buy the deluxe rod. Well, a small tackle box.',
  ],
  purchase_big: [
    'WOW! Big spender! I love it! Let me get that wrapped up for you!',
    'This is great! You will not regret this! Your fishing game is about to LEVEL UP!',
    'Cha-ching! I mean, thank you for your business! Very professional of me!',
  ],
  purchase_small: [
    'Solid choice! Every great angler starts with the basics!',
    'That will do the job! Come back when you are ready for an upgrade!',
    'Thanks! Even small purchases help keep Gus in business!',
  ],
  player_sells_fish: [
    'Ooh, nice catch! Let me see... I can give you a fair price for that!',
    'What have you got there? That is a beauty! I will take it off your hands!',
    'Selling to Gus means getting the best prices! Well, competitive prices!',
  ],
  advice: [
    'If I were you, I would invest in a better rod. Just saying. I sell better rods.',
    'The fish have been biting on the eastern side lately. But you might need better bait. Which I have.',
    'Weather\'s turning? Perfect time for the weather-resistant line. Aisle three!',
    'Trying to catch a specific fish? I have got specialized gear for that! Many options!',
  ],
  discount: [
    'For you? Let me see what I can do. *calculates* Five percent off! You are welcome!',
    'Friend discount applied! Best decision you ever made was becoming my friend!',
    'Special deal for my best customers! Well, good customers. Top twenty.',
  ],
  story: [
    'My grandfather started this shop in sixty-two. Said fishing brings people together.',
    'I have been running this place for thirty years. Never gets old. Neither do my jokes!',
    'I used to fish competitively. Then I realized selling gear was more profitable. And less wet.',
    'Every item in this shop has a story. Ask me about any of them. I dare you.',
  ],
  secret: [
    'Between you and me... I have a secret stock in the back. For special customers. Like you, maybe.',
    'I can get rare items. Not officially in stock. But for a friend? I have connections.',
    'There is a shipment coming in next week. Very exclusive. Want me to hold something?',
  ],
  default: [
    'Interesting!',
    'Oh, nice!',
    'Good choice!',
    'Excellent!',
    '{{npc.catchphrase}}',
  ],
};

/** @type {Object} Mood triggers for Gus */
const GUS_MOOD_TRIGGERS = {
  big_purchase: 'thrilled',
  player_asks_advice: 'knowledgeable',
  player_sells_fish: 'interested',
  first_interaction: 'enthusiastic',
  long_absence: 'relieved',
  player_no_money: 'sympathetic',
};

/** @type {Object} Gift preferences for Gus */
const GUS_GIFT_PREFERENCES = {
  loved: ['gold_ingot', 'diamond', 'emerald', 'rare_fish', 'business_ledger', 'coffee', 'coin_pouch'],
  liked: ['any_fish', 'iron_ingot', 'redstone', 'quartz', 'bait', 'fishing_rod'],
  neutral: ['bread', 'apple', 'coal', 'stick', 'string'],
  hated: ['stolen_goods', 'competitor_coupon', 'bad_review'],
};

/** @type {Object} Base inventory and prices */
const GUS_INVENTORY = {
  fishing_rod: { basePrice: 50, category: 'rods', rarity: 'common' },
  reinforced_rod: { basePrice: 150, category: 'rods', rarity: 'uncommon' },
  competition_rod: { basePrice: 300, category: 'rods', rarity: 'rare', unlockLevel: 3 },
  champion_rod: { basePrice: 500, category: 'rods', rarity: 'epic', unlockLevel: 5 },
  basic_bait: { basePrice: 5, category: 'bait', rarity: 'common' },
  enchanted_bait: { basePrice: 25, category: 'bait', rarity: 'uncommon' },
  premium_bait: { basePrice: 50, category: 'bait', rarity: 'rare', unlockLevel: 3 },
  legendary_lure: { basePrice: 200, category: 'bait', rarity: 'legendary', unlockLevel: 5 },
  tackle_box: { basePrice: 30, category: 'accessories', rarity: 'common' },
  weather_gear: { basePrice: 75, category: 'accessories', rarity: 'uncommon' },
  fish_finder: { basePrice: 200, category: 'accessories', rarity: 'rare', unlockLevel: 4 },
  lucky_charm: { basePrice: 300, category: 'accessories', rarity: 'epic', unlockLevel: 6 },
};

/** @type {Object} Unlockables by friendship level */
const GUS_UNLOCKS = {
  1: {
    description: '5% discount on all items',
    type: 'discount',
    discount: 0.05,
  },
  2: {
    description: 'Weekly deals and notifications',
    type: 'notifications',
    notifications: ['sale_alert', 'new_stock'],
  },
  3: {
    description: 'Access to rare items',
    type: 'inventory',
    items: ['competition_rod', 'premium_bait'],
  },
  4: {
    description: '10% discount + fish finder',
    type: 'discount',
    discount: 0.10,
    items: ['fish_finder'],
  },
  5: {
    description: 'Custom orders available',
    type: 'custom_orders',
    specialOrders: ['specific_rod', 'bulk_bait', 'vintage_gear'],
  },
  6: {
    description: '15% discount + hold items',
    type: 'discount',
    discount: 0.15,
    canHoldItems: true,
  },
  7: {
    description: 'Secret stock access',
    type: 'secret_stock',
    items: ['champion_rod', 'legendary_lure', 'lucky_charm'],
  },
};

/**
 * MerchantArchetype class - Gus Morrison implementation.
 */
class MerchantArchetype {
  /**
   * Create a new MerchantArchetype (Gus Morrison).
   */
  constructor() {
    this.config = GUS_CONFIG;
    this.dialogue = new DialogueEngine({
      name: this.config.name,
      archetype: this.config.archetype,
      catchphrases: GUS_CATCHPHRASES,
      dialogueTemplates: GUS_DIALOGUE,
      moodTriggers: GUS_MOOD_TRIGGERS,
      baseMood: 'enthusiastic',
    });

    /** @type {Object|null} Bot instance */
    this.bot = null;

    /** @type {Map<string, Object>} Player memory cache */
    this.playerMemories = new Map();

    /** @type {string} Current activity */
    this.currentActivity = 'idle';

    /** @type {Object} Shop state */
    this.shopState = {
      dailySpecial: null,
      itemsOnHold: new Map(),
      customOrders: [],
    };

    /** @type {Object} NPC relationships */
    this.relationships = {
      gustav: 'customer',      // Gustav buys supplies sometimes
      riley: 'good_customer',  // Riley buys a lot of competition gear
      nana_kiko: 'friendly',   // They share a mutual respect
      captain_marina: 'customer',
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

    this.currentActivity = 'tending_shop';

    // Set daily special
    this._generateDailySpecial();
  }

  /**
   * Get a random catchphrase.
   * @returns {string}
   */
  getRandomCatchphrase() {
    return GUS_CATCHPHRASES[Math.floor(Math.random() * GUS_CATCHPHRASES.length)];
  }

  /**
   * Generate a daily special.
   * @private
   */
  _generateDailySpecial() {
    const items = Object.keys(GUS_INVENTORY);
    const randomItem = items[Math.floor(Math.random() * items.length)];
    const discount = 0.1 + Math.random() * 0.15; // 10-25% off

    this.shopState.dailySpecial = {
      item: randomItem,
      discount: discount,
    };
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

    // Check for buying/selling keywords
    if (lowerMsg.includes('buy') || lowerMsg.includes('price') || lowerMsg.includes('cost') ||
        lowerMsg.includes('sell') || lowerMsg.includes('trade') || lowerMsg.includes('deal')) {
      return this._generateSalesResponse(summary, lowerMsg);
    }

    // Check for advice requests
    if (lowerMsg.includes('recommend') || lowerMsg.includes('advice') || lowerMsg.includes('suggest') ||
        lowerMsg.includes('what should') || lowerMsg.includes('which')) {
      return this._generateAdviceResponse(summary);
    }

    // Generate contextual response
    return this.dialogue.generateResponse(message, playerMemory, {
      ...context,
      bot: this.bot,
    });
  }

  /**
   * Generate a sales-oriented response.
   * @private
   * @param {Object} summary - Player summary
   * @param {string} message - Lowercase message
   * @returns {string}
   */
  _generateSalesResponse(summary, message) {
    const templates = GUS_DIALOGUE.sales_pitch;
    let response = templates[Math.floor(Math.random() * templates.length)];

    // Add discount info if friend
    if (summary.relationship.level >= 1) {
      const discount = this._getFriendDiscount(summary.relationship.level);
      if (discount > 0) {
        response += ` And hey, ${Math.round(discount * 100)}% friend discount applied!`;
      }
    }

    response = this.dialogue.resolveTemplate(response);
    return this.dialogue._applyMoodTone(response, 'enthusiastic');
  }

  /**
   * Generate an advice response.
   * @private
   * @param {Object} summary - Player summary
   * @returns {string}
   */
  _generateAdviceResponse(summary) {
    const templates = GUS_DIALOGUE.advice;
    let response = templates[Math.floor(Math.random() * templates.length)];
    response = this.dialogue.resolveTemplate(response);
    return this.dialogue._applyMoodTone(response, 'knowledgeable');
  }

  /**
   * Get friend discount percentage based on level.
   * @private
   * @param {number} level
   * @returns {number}
   */
  _getFriendDiscount(level) {
    if (level >= 6) return 0.15;
    if (level >= 4) return 0.10;
    if (level >= 1) return 0.05;
    return 0;
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

    if (GUS_GIFT_PREFERENCES.loved.some(g => lowerItem.includes(g))) {
      preference = 'loved';
    } else if (GUS_GIFT_PREFERENCES.liked.some(g => lowerItem.includes(g))) {
      preference = 'liked';
    } else if (GUS_GIFT_PREFERENCES.hated.some(g => lowerItem.includes(g))) {
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
   * Get the price for an item with friend discount applied.
   * @param {string} itemName
   * @param {Object} playerMemory
   * @returns {Object|null} { basePrice, finalPrice, discount }
   */
  getItemPrice(itemName, playerMemory) {
    const lowerItem = itemName.toLowerCase().replace(/ /g, '_');
    const item = GUS_INVENTORY[lowerItem];

    if (!item) return null;

    const summary = playerMemory.getSummary();
    const discount = this._getFriendDiscount(summary.relationship.level);
    const basePrice = item.basePrice;
    const finalPrice = Math.floor(basePrice * (1 - discount));

    // Check if daily special
    if (this.shopState.dailySpecial?.item === lowerItem) {
      const specialPrice = Math.floor(basePrice * (1 - this.shopState.dailySpecial.discount));
      return {
        basePrice,
        finalPrice: Math.min(finalPrice, specialPrice),
        discount: 1 - (Math.min(finalPrice, specialPrice) / basePrice),
        isDailySpecial: true,
        rarity: item.rarity,
      };
    }

    return {
      basePrice,
      finalPrice,
      discount,
      isDailySpecial: false,
      rarity: item.rarity,
    };
  }

  /**
   * Check if player can access an item.
   * @param {string} itemName
   * @param {Object} playerMemory
   * @returns {boolean}
   */
  canAccessItem(itemName, playerMemory) {
    const lowerItem = itemName.toLowerCase().replace(/ /g, '_');
    const item = GUS_INVENTORY[lowerItem];

    if (!item) return false;
    if (!item.unlockLevel) return true;

    const summary = playerMemory.getSummary();
    return summary.relationship.level >= item.unlockLevel;
  }

  /**
   * Get available inventory for a player.
   * @param {Object} playerMemory
   * @returns {Object[]}
   */
  getAvailableInventory(playerMemory) {
    const summary = playerMemory.getSummary();
    const available = [];

    for (const [name, item] of Object.entries(GUS_INVENTORY)) {
      if (!item.unlockLevel || summary.relationship.level >= item.unlockLevel) {
        const price = this.getItemPrice(name, playerMemory);
        available.push({
          name,
          ...item,
          ...price,
        });
      }
    }

    return available;
  }

  /**
   * Get unlockables available at current friendship level.
   * @param {number} friendshipLevel
   * @returns {Object[]}
   */
  getAvailableUnlocks(friendshipLevel) {
    const unlocks = [];

    for (const [level, unlock] of Object.entries(GUS_UNLOCKS)) {
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
    for (const [level, unlock] of Object.entries(GUS_UNLOCKS)) {
      if (parseInt(level) <= friendshipLevel && unlock.type === unlockType) {
        return true;
      }
    }
    return false;
  }

  /**
   * Place a custom order (unlocked at friendship level 5+).
   * @param {Object} playerMemory
   * @param {string} orderType
   * @param {Object} details
   * @returns {Object|null}
   */
  placeCustomOrder(playerMemory, orderType, details = {}) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 5) {
      return null;
    }

    const order = {
      playerUuid: playerMemory.playerUuid,
      type: orderType,
      details,
      date: new Date().toISOString(),
      estimatedDays: 3 + Math.floor(Math.random() * 5),
    };

    this.shopState.customOrders.push(order);
    return order;
  }

  /**
   * Hold an item for a player (unlocked at friendship level 6+).
   * @param {Object} playerMemory
   * @param {string} itemName
   * @param {number} days
   * @returns {boolean}
   */
  holdItem(playerMemory, itemName, days = 7) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 6) {
      return false;
    }

    const hold = {
      item: itemName,
      playerUuid: playerMemory.playerUuid,
      playerName: summary.player.name,
      expiryDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    };

    this.shopState.itemsOnHold.set(`${playerMemory.playerUuid}_${itemName}`, hold);
    return true;
  }

  /**
   * Get gear recommendation for a player.
   * @param {Object} playerMemory
   * @param {Object} context
   * @returns {string}
   */
  getGearRecommendation(playerMemory, context = {}) {
    const recommendations = [];

    if (context.weather === 'rain') {
      recommendations.push('For rainy weather, I recommend the weather-resistant line. Keeps your gear dry and your mood damp-free!');
    }

    if (context.fishType === 'legendary') {
      recommendations.push('Going for the big ones? The legendary lure is your best bet. Pricey, but worth it!');
    }

    if (context.playerLevel === 'beginner') {
      recommendations.push('Just starting out? The basic rod and tackle box combo. Classic, reliable, affordable!');
    }

    // Default recommendation
    recommendations.push('I recommend the enchanted bait. Fish go crazy for it. Mostly. Sometimes. Worth a shot!');

    return recommendations[Math.floor(Math.random() * recommendations.length)];
  }

  /**
   * Share a story (unlocked at friendship level 3+).
   * @param {Object} playerMemory
   * @returns {string|null}
   */
  shareStory(playerMemory) {
    const summary = playerMemory.getSummary();

    if (summary.relationship.level < 3) {
      return 'I have stories! Many stories! But customers to serve, you know? Come back when we have more time.';
    }

    const stories = GUS_DIALOGUE.story;
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
      return 'Secrets? I do not have secrets! Okay, I have secrets. But they are for my BEST customers.';
    }

    const secrets = GUS_DIALOGUE.secret;
    return secrets[Math.floor(Math.random() * secrets.length)];
  }

  /**
   * Get the NPC's current mood description.
   * @returns {string}
   */
  getMoodDescription() {
    const descriptions = {
      friendly: 'Gus is beaming with his characteristic enthusiasm.',
      neutral: 'Gus is organizing inventory and humming to himself.',
      enthusiastic: 'Gus is practically bouncing with excitement.',
      thrilled: 'Gus\'s eyes light up at the sight of credits.',
      knowledgeable: 'Gus adjusts his glasses and leans in to share wisdom.',
      sympathetic: 'Gus looks understanding, already planning a payment plan.',
    };

    return descriptions[this.dialogue.currentMood] || descriptions.neutral;
  }

  /**
   * Get a description of the NPC.
   * @returns {string}
   */
  getDescription() {
    return `Gus Morrison is a cheerful 52-year-old tackle shop owner who inherited the business from his grandfather. He genuinely loves fishing gear almost as much as he loves selling it. His enthusiasm for both the sport and commerce is infectious, and he treats every customer like a potential lifelong friend - because friends buy more gear. His shop is packed with everything from basic supplies to rare items that only his most trusted customers can access.`;
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
      return 'I do not know them too well. Hard to sell to someone you do not know!';
    }

    if (summary.relationship.level < 2) {
      return 'Chat with me more! Then I will share the good gossip!';
    }

    const gossip = {
      gustav: 'Gustav? Grumpy guy, but he knows his stuff. Buys the same coffee every week. Never tips. Still love him.',
      riley: 'Riley is my best customer! Always buying competition gear. A bit intense, but credits are credits!',
      nana_kiko: 'Nana Kiko is wonderful. She visits sometimes. Does not buy much, but her presence is good for business. Mystical vibes!',
      captain_marina: 'Marina is practical. Buys in bulk. I appreciate that. Efficiency! Profit!',
    };

    return gossip[npcName.toLowerCase()] || null;
  }
}

/**
 * Factory function to create a Gus Morrison NPC instance.
 * @param {Object} [bot] - Optional bot instance to initialize with
 * @returns {MerchantArchetype}
 */
function createGus(bot = null) {
  const gus = new MerchantArchetype();
  if (bot) {
    gus.initialize(bot);
  }
  return gus;
}

module.exports = {
  MerchantArchetype,
  createGus,
  GUS_CONFIG,
  GUS_CATCHPHRASES,
  GUS_DIALOGUE,
  GUS_GIFT_PREFERENCES,
  GUS_UNLOCKS,
  GUS_INVENTORY,
};
