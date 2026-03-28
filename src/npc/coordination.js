/**
 * @module craftmind/npc/coordination
 * @description NPCCoordination - Multi-NPC coordination and group behaviors.
 *
 * Handles coordinated events, group reactions, and dialogue between NPCs.
 * Enables NPCs to reference each other and respond to shared events.
 *
 * @example
 * const coordination = new NPCCoordination(npcManager, relationshipManager);
 * coordination.triggerEvent('player_caught_legendary', { player: 'Steve', fish: 'King Salmon' });
 * const reactions = coordination.getReactions('tournament_won', 'Gustav');
 */

/**
 * @typedef {Object} CoordinationEvent
 * @property {string} type - Event type identifier
 * @property {Object} data - Event data
 * @property {string} timestamp - ISO timestamp
 * @property {string} [sourceNpc] - NPC that triggered the event
 */

/**
 * @typedef {Object} NPCReaction
 * @property {string} npc - NPC name
 * @property {string} dialogue - What the NPC says
 * @property {Object} [action] - Optional action to perform
 * @property {number} delay - Seconds before reacting
 * @property {string[]} [references] - Other NPCs referenced
 */

/** @constant {Object} Event type definitions with reaction patterns */
const EVENT_TYPES = {
  player_caught_legendary: {
    category: 'achievement',
    spreadRate: 0.8,
    reactions: {
      mentor: [
        'Incredible! {player} has caught a {fish}!',
        'I knew {player} had it in them.',
        'That {fish} is a once-in-a-lifetime catch!',
      ],
      competitor: [
        '{fish}?! Not bad, {player}... not bad at all.',
        "I'll beat that {fish} record someday.",
        'Lucky catch, {player}. Real lucky.',
      ],
      merchant: [
        'A {fish}! I\'d pay good credits for that!',
        '{player}, that\'s worth a fortune!',
        'Best catch I\'ve seen in ages!',
      ],
      mystic: [
        'The waters have favored {player}... the {fish} is a sign.',
        'I sensed something extraordinary today.',
      ],
      socialite: [
        'Everyone! {player} caught a {fish}!',
        'Did you hear? {player} got the legendary {fish}!',
      ],
    },
  },
  tournament_won: {
    category: 'competition',
    spreadRate: 1.0,
    reactions: {
      mentor: [
        'Well done, {player}! All that practice paid off!',
        'Congratulations on the victory!',
      ],
      competitor: [
        '{player} won?! I want a rematch!',
        '...Impressive. {player} earned that.',
        'Next time will be different.',
      ],
      merchant: [
        'Winner! {player}, I have something special for champions.',
        'The tournament winner! Drinks on the house... almost.',
      ],
      mystic: [
        'Victory flows like water. {player} found their path.',
      ],
      socialite: [
        '{player} WON THE TOURNAMENT! Amazing!',
        'I KNEW {player} would win! Called it!',
      ],
    },
  },
  new_player_joined: {
    category: 'social',
    spreadRate: 0.6,
    reactions: {
      mentor: [
        'Welcome, {player}! Let me show you around.',
        'A new face! Ready to learn?',
      ],
      competitor: [
        'Fresh competition? This should be interesting.',
        'Another challenger approaches.',
      ],
      merchant: [
        'Welcome, {player}! First-time customer discount!',
        'New to these waters? I have everything you need.',
      ],
      mystic: [
        'A new soul arrives... interesting.',
        'The tides bring new visitors.',
      ],
      socialite: [
        'Oh! {player}! You simply MUST meet everyone!',
        'A new friend! Welcome, welcome!',
      ],
    },
  },
  player_broke_record: {
    category: 'achievement',
    spreadRate: 0.9,
    reactions: {
      mentor: [
        'A new record! {player} is improving rapidly!',
        'That\'s the spirit, {player}!',
      ],
      competitor: [
        '{player} broke my record?! Time to train harder.',
        'New record by {player}... I\'ll get it back.',
      ],
      merchant: [
        'Record breaker! {player} deserves a reward!',
      ],
      mystic: [
        'The old ways give way to the new. {player} transcends.',
      ],
      socialite: [
        'RECORD BROKEN! {player} is amazing!',
      ],
    },
  },
  rare_fish_spawned: {
    category: 'world',
    spreadRate: 1.0,
    reactions: {
      mentor: [
        'I\'ve heard rumors of {species} in these waters...',
        'The conditions are perfect for {species}.',
      ],
      competitor: [
        '{species}?! I\'m going after it!',
        'Race you to the {species}!',
      ],
      merchant: [
        '{species} is worth triple right now!',
        'Anyone catching {species}? I\'m buying!',
      ],
      mystic: [
        'The {species} awakens... listen to the waters.',
        'I sense... {species}. Go. Now.',
      ],
      socialite: [
        'Did you hear? {species} are active!',
        'Everyone\'s talking about the {species}!',
      ],
    },
  },
  storm_approaching: {
    category: 'world',
    spreadRate: 1.0,
    reactions: {
      mentor: [
        'Storm\'s coming. Best secure your equipment.',
        'The fish bite well before storms, but be careful.',
      ],
      competitor: [
        'Perfect fishing weather! Storms drive fish up.',
        'A real angler fishes in any weather.',
      ],
      merchant: [
        'Storm supplies on sale! Stock up now!',
        'I\'ve got rain gear if anyone needs it.',
      ],
      mystic: [
        'The storm speaks. Listen to its wisdom.',
        'Change approaches on wind and rain.',
      ],
      socialite: [
        'Storm party at the tavern tonight!',
        'Everyone come inside, storm\'s coming!',
      ],
    },
  },
};

/** @constant {Object} Cross-NPC dialogue patterns */
const CROSS_NPC_DIALOGUE = {
  // Reference patterns: NPC A mentions NPC B
  references: {
    gustav_about_riley: [
      "That Riley... always pushing too hard.",
      "Riley could learn patience.",
      "Did you see Riley's technique? Effective, but lacks soul.",
    ],
    gustav_about_nanakiko: [
      "Nana Kiko sees things others don't.",
      "The old ways... Nana Kiko understands them.",
      "Listen to Nana Kiko. She knows.",
    ],
    riley_about_gustav: [
      "Gustav's methods are outdated.",
      "Gus has the best prices - tell him Riley sent you.",
      "Old Gustav doesn't understand modern fishing.",
    ],
    riley_about_gus: [
      "Gus always has what I need.",
      "Tell Gus I need more bait.",
    ],
    nanakiko_about_gustav: [
      "Gustav... a kind soul beneath the gruffness.",
      "The mentor knows more than he speaks.",
    ],
    nanakiko_about_riley: [
      "The competitor... so much fire. Too much.",
      "Riley rushes. The fish wait.",
    ],
    gus_about_everyone: [
      "Everyone's welcome at my shop!",
      "Tell your friends about Gus's deals!",
      "I've got what everyone needs.",
    ],
  },

  // Joint reactions: multiple NPCs react together
  jointReactions: {
    player_first_legendary: {
      participants: ['Gustav', 'NanaKiko'],
      dialogue: [
        { speaker: 'NanaKiko', text: 'The waters have spoken...', delay: 0 },
        { speaker: 'Gustav', text: 'And they say {player} has caught something extraordinary!', delay: 2 },
        { speaker: 'NanaKiko', text: 'A legendary catch. The signs were there.', delay: 4 },
      ],
    },
    tournament_finalists: {
      participants: ['Gustav', 'Riley', 'Gus'],
      dialogue: [
        { speaker: 'Riley', text: 'The finals! This is what it\'s all about!', delay: 0 },
        { speaker: 'Gus', text: 'Special discounts for finalists!', delay: 1 },
        { speaker: 'Gustav', text: 'May the best angler win. Good luck to all.', delay: 2 },
      ],
    },
  },

  // Chained dialogue: one NPC triggers another
  chains: {
    gossip_chain: {
      trigger: 'npc_mentioned',
      delay: 5,
      chain: [
        { speaker: 'source', text: 'Have you heard what {other_npc} said?', references: ['other_npc'] },
        { speaker: 'other_npc', text: 'I stand by my words!', delay: 3 },
      ],
    },
  },
};

/**
 * NPCCoordination class - manages multi-NPC behaviors.
 */
class NPCCoordination {
  /**
   * Create a new NPCCoordination instance.
   * @param {Object} npcManager - NPC manager instance
   * @param {Object} relationshipManager - Relationship manager instance
   */
  constructor(npcManager = null, relationshipManager = null) {
    /** @type {Object} NPC manager reference */
    this.npcManager = npcManager;

    /** @type {Object} Relationship manager reference */
    this.relationshipManager = relationshipManager;

    /** @type {CoordinationEvent[]} Recent events */
    this.recentEvents = [];

    /** @type {Map<string, Function>} Custom event handlers */
    this.eventHandlers = new Map();

    /** @type {Map<string, number>} Cooldown timers per event type */
    this.cooldowns = new Map();

    /** @type {number} Maximum recent events to store */
    this.maxRecentEvents = 50;
  }

  /**
   * Set the NPC manager.
   * @param {Object} npcManager
   */
  setNpcManager(npcManager) {
    this.npcManager = npcManager;
  }

  /**
   * Set the relationship manager.
   * @param {Object} relationshipManager
   */
  setRelationshipManager(relationshipManager) {
    this.relationshipManager = relationshipManager;
  }

  /**
   * Trigger a coordinated event.
   * @param {string} eventType - Event type identifier
   * @param {Object} data - Event data
   * @param {string} [sourceNpc] - NPC that triggered the event
   * @returns {NPCReaction[]} Reactions from NPCs
   */
  triggerEvent(eventType, data, sourceNpc = null) {
    const eventConfig = EVENT_TYPES[eventType];
    if (!eventConfig) {
      console.warn(`[NPCCoordination] Unknown event type: ${eventType}`);
      return [];
    }

    // Check cooldown
    if (this._isOnCooldown(eventType, data.player)) {
      return [];
    }

    // Record event
    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      sourceNpc,
    };
    this._recordEvent(event);

    // Set cooldown
    this._setCooldown(eventType, data.player);

    // Generate reactions
    const reactions = this._generateReactions(event, eventConfig);

    // Update relationships based on shared experience
    if (this.relationshipManager && data.player) {
      this._updateRelationshipsFromEvent(event);
    }

    return reactions;
  }

  /**
   * Check if an event type is on cooldown for a player.
   * @private
   * @param {string} eventType
   * @param {string} player
   * @returns {boolean}
   */
  _isOnCooldown(eventType, player) {
    if (!player) return false;
    const key = `${eventType}:${player}`;
    const lastTime = this.cooldowns.get(key) || 0;
    const cooldownMs = 60000; // 1 minute cooldown
    return Date.now() - lastTime < cooldownMs;
  }

  /**
   * Set cooldown for an event.
   * @private
   * @param {string} eventType
   * @param {string} player
   */
  _setCooldown(eventType, player) {
    if (!player) return;
    const key = `${eventType}:${player}`;
    this.cooldowns.set(key, Date.now());
  }

  /**
   * Record an event.
   * @private
   * @param {CoordinationEvent} event
   */
  _recordEvent(event) {
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.shift();
    }
  }

  /**
   * Generate reactions for an event.
   * @private
   * @param {CoordinationEvent} event
   * @param {Object} config
   * @returns {NPCReaction[]}
   */
  _generateReactions(event, config) {
    const reactions = [];
    const onlineNpcs = this.npcManager ? this.npcManager.getOnlineNpcs() : [];

    for (const npc of onlineNpcs) {
      // Skip source NPC
      if (event.sourceNpc && npc.name.toLowerCase() === event.sourceNpc.toLowerCase()) {
        continue;
      }

      // Get archetype (simplified mapping)
      const archetype = this._getNpcArchetype(npc.name);
      const templates = config.reactions[archetype];

      if (!templates || templates.length === 0) continue;

      // Select random template
      const template = templates[Math.floor(Math.random() * templates.length)];

      // Interpolate variables
      const dialogue = this._interpolate(template, event.data);

      // Determine references to other NPCs
      const references = this._findNpcReferences(dialogue);

      reactions.push({
        npc: npc.name,
        dialogue,
        delay: Math.random() * 3 + 1, // 1-4 second delay
        references,
      });
    }

    return reactions;
  }

  /**
   * Get NPC archetype from name.
   * @private
   * @param {string} npcName
   * @returns {string}
   */
  _getNpcArchetype(npcName) {
    const archetypes = {
      gustav: 'mentor',
      riley: 'competitor',
      gus: 'merchant',
      nanakiko: 'mystic',
      bella: 'socialite',
    };
    return archetypes[npcName.toLowerCase()] || 'neutral';
  }

  /**
   * Interpolate variables in a template string.
   * @private
   * @param {string} template
   * @param {Object} data
   * @returns {string}
   */
  _interpolate(template, data) {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Find NPC names referenced in dialogue.
   * @private
   * @param {string} dialogue
   * @returns {string[]}
   */
  _findNpcReferences(dialogue) {
    const npcNames = ['Gustav', 'Riley', 'NanaKiko', 'Gus', 'Bella'];
    const found = [];

    for (const name of npcNames) {
      if (dialogue.toLowerCase().includes(name.toLowerCase())) {
        found.push(name);
      }
    }

    return found;
  }

  /**
   * Update relationships based on shared event.
   * @private
   * @param {CoordinationEvent} event
   */
  _updateRelationshipsFromEvent(event) {
    if (!this.relationshipManager) return;

    // NPCs who witnessed an achievement together bond slightly
    if (EVENT_TYPES[event.type]?.category === 'achievement') {
      const witnesses = this.npcManager ? this.npcManager.getOnlineNpcs() : [];
      for (let i = 0; i < witnesses.length; i++) {
        for (let j = i + 1; j < witnesses.length; j++) {
          this.relationshipManager.updateRelationship(
            witnesses[i].name,
            witnesses[j].name,
            `witnessed_${event.type}`,
            1
          );
        }
      }
    }
  }

  /**
   * Get reactions for a specific NPC to an event.
   * @param {string} eventType - Event type
   * @param {string} npcName - NPC name
   * @returns {NPCReaction|null}
   */
  getReactions(eventType, npcName) {
    const eventConfig = EVENT_TYPES[eventType];
    if (!eventConfig) return null;

    // Find recent event of this type
    const recentEvent = this.recentEvents
      .filter(e => e.type === eventType)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (!recentEvent) return null;

    const archetype = this._getNpcArchetype(npcName);
    const templates = eventConfig.reactions[archetype];

    if (!templates || templates.length === 0) return null;

    const template = templates[Math.floor(Math.random() * templates.length)];
    const dialogue = this._interpolate(template, recentEvent.data);

    return {
      npc: npcName,
      dialogue,
      delay: 0,
      references: this._findNpcReferences(dialogue),
    };
  }

  /**
   * Get cross-NPC dialogue for a context.
   * @param {string} sourceNpc - Source NPC name
   * @param {string} targetNpc - Target NPC name
   * @returns {string|null}
   */
  getCrossNpcDialogue(sourceNpc, targetNpc) {
    const key = `${sourceNpc.toLowerCase()}_about_${targetNpc.toLowerCase()}`;
    const templates = CROSS_NPC_DIALOGUE.references[key];

    if (!templates || templates.length === 0) return null;

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Get joint reaction dialogue for multiple NPCs.
   * @param {string} reactionType - Joint reaction type
   * @param {Object} data - Interpolation data
   * @returns {Array<{speaker: string, text: string, delay: number}>}
   */
  getJointReaction(reactionType, data = {}) {
    const config = CROSS_NPC_DIALOGUE.jointReactions[reactionType];
    if (!config) return [];

    return config.dialogue.map(d => ({
      speaker: d.speaker,
      text: this._interpolate(d.text, data),
      delay: d.delay,
    }));
  }

  /**
   * Register a custom event type.
   * @param {string} eventType
   * @param {Object} config
   */
  registerEventType(eventType, config) {
    EVENT_TYPES[eventType] = config;
  }

  /**
   * Register a custom event handler.
   * @param {string} eventType
   * @param {Function} handler
   */
  registerEventHandler(eventType, handler) {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Get recent events for context.
   * @param {number} [limit=10]
   * @returns {CoordinationEvent[]}
   */
  getRecentEvents(limit = 10) {
    return this.recentEvents.slice(-limit);
  }

  /**
   * Get recent events for a specific player.
   * @param {string} playerName
   * @param {number} [limit=5]
   * @returns {CoordinationEvent[]}
   */
  getPlayerEvents(playerName, limit = 5) {
    return this.recentEvents
      .filter(e => e.data.player === playerName)
      .slice(-limit);
  }

  /**
   * Clear old cooldowns.
   */
  clearStaleCooldowns() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [key, time] of this.cooldowns) {
      if (now - time > maxAge) {
        this.cooldowns.delete(key);
      }
    }
  }

  /**
   * Get coordination status.
   * @returns {Object}
   */
  getStatus() {
    return {
      recentEvents: this.recentEvents.length,
      eventTypes: Object.keys(EVENT_TYPES).length,
      customHandlers: this.eventHandlers.size,
      activeCooldowns: this.cooldowns.size,
    };
  }
}

module.exports = {
  NPCCoordination,
  EVENT_TYPES,
  CROSS_NPC_DIALOGUE,
};
