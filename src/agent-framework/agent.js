/**
 * @module craftmind/agent-framework/agent
 * @description Generic agent with personality, memory, relationships, and scheduling.
 * Works for any domain — fishing NPCs, film actors, students, research assistants.
 */

export class Agent {
  /**
   * @param {object} config
   * @param {string} config.name
   * @param {string} config.type - 'bot' | 'npc'
   * @param {object} [config.personality] - {traits: {}, opinions: {}}
   * @param {object} [config.schedule]
   * @param {object} [config.home] - {x, y, z} or generic location
   * @param {string} [config.location]
   * @param {string[]} [config.skills]
   * @param {object} [config.bot] - platform bot instance
   * @param {object} [config.dataDir]
   */
  constructor(config) {
    this.name = config.name;
    this.type = config.type || 'npc';
    this.bot = config.bot || null;

    // Personality
    this.traits = config.personality?.traits || {};
    this.opinions = config.personality?.opinions || {};
    this.mood = {
      energy: 0.5, satisfaction: 0.5, frustration: 0.1, social: 0.5,
      update(event) {
        if (event.type === 'success') { this.satisfaction = Math.min(1, this.satisfaction + 0.1); this.frustration = Math.max(0, this.frustration - 0.1); }
        if (event.type === 'failure') { this.frustration = Math.min(1, this.frustration + 0.1); this.satisfaction = Math.max(0, this.satisfaction - 0.05); }
        if (event.type === 'new_day') { this.energy = 0.5; this.satisfaction = 0.5; this.frustration = 0.1; }
      },
      snapshot() { return {...this}; },
      resetDay() { this.energy = 0.5; this.satisfaction = 0.5; this.frustration = 0.1; },
    };

    // Memory
    this.memory = {episodes: [], addEpisode(e) { this.episodes.push({...e, time: Date.now()}); if (this.episodes.length > 100) this.episodes.shift(); }};

    // Relationships
    this.relationships = {
      players: {},
      get(name) { return this.players[name] || {trust: 0.3, interactions: 0, lastSeen: null}; },
      interact(name, type) { if (!this.players[name]) this.players[name] = {trust: 0.3, interactions: 0, lastSeen: null}; this.players[name].interactions++; this.players[name].lastSeen = Date.now(); if (type === 'positive') this.players[name].trust = Math.min(1, this.players[name].trust + 0.02); if (type === 'negative') this.players[name].trust = Math.max(0, this.players[name].trust - 0.03); },
    };

    // Schedule (simplified)
    this.schedule = {
      _blocks: config.schedule || [],
      getCurrentBlock(hour, context = {}) {
        if (this._blocks.length === 0) return {action: 'idle', location: 'home'};
        for (const block of this._blocks) {
          if (hour >= block.startHour && hour < block.endHour) return block;
        }
        return {action: 'idle', location: 'home'};
      },
      resetDay() {},
      applyWeather() {},
    };

    // Location
    this.home = config.home || {x: 0, y: 0, z: 0};
    this.location = config.location || 'unknown';
    this.position = {...this.home};
    this.skills = config.skills || [];

    // State
    this.currentAction = null;
    this.currentBlock = null;
    this.active = false;
    this.lastInteractedWith = new Map();
    this.conversationCooldown = 0;

    // Domain-specific data
    this.domainData = {};
  }

  start() { this.active = true; this.currentAction = 'idle'; }
  stop() { this.active = false; this.currentAction = null; }

  tick(context = {}) {
    if (!this.active) return null;
    const {gameHour = 12, weather = 'clear', nearbyEntities = [], world = {}} = context;

    if (this.conversationCooldown > 0) this.conversationCooldown--;

    this.currentBlock = this.schedule.getCurrentBlock(gameHour, {weather, ...world});
    const nearby = this._filterNearby(nearbyEntities);

    if (nearby.length > 0 && this.conversationCooldown <= 0 && this._wantsToSocialize()) {
      return this._handleSocial(nearby, context);
    }

    const action = {type: this.currentBlock?.action || 'idle', location: this.currentBlock?.location || this.location};
    this.currentAction = action;
    return action;
  }

  _filterNearby(entities) {
    return entities.filter(e => e.name !== this.name && this._distance(e) < 30);
  }

  _distance(other) {
    const pos = other.position || other;
    const dx = (this.position.x || 0) - (pos.x || 0);
    const dz = (this.position.z || 0) - (pos.z || 0);
    return Math.sqrt(dx * dx + dz * dz);
  }

  _wantsToSocialize() {
    const talk = this.traits.talkativeness || 0.5;
    return Math.random() < talk * 0.15;
  }

  _handleSocial(nearby, context) {
    const target = nearby[0];
    const targetName = target.name || 'someone';
    const lastTime = this.lastInteractedWith.get(targetName) || 0;
    if (Date.now() - lastTime < 15000) {
      const action = {type: this.currentBlock?.action || 'idle', location: this.location};
      this.currentAction = action;
      return action;
    }

    this.lastInteractedWith.set(targetName, Date.now());
    this.conversationCooldown = 60;

    const rel = this.relationships.get(targetName);
    let type = 'greeting';
    if (rel.trust > 0.7) type = 'share';
    else if (rel.trust > 0.4) type = 'chat';

    this.relationships.interact(targetName, 'positive');
    this.memory.addEpisode({type: 'social', target: targetName, interaction: type, location: this.location});

    const action = {type, target: targetName};
    this.currentAction = action;
    return action;
  }

  handleEvent(event) {
    this.mood.update(event);
    this.memory.addEpisode(event);
    if (event.type === 'new_day') {
      this.schedule.resetDay();
      this.mood.resetDay();
    }
  }

  moveTo(location, position) {
    this.location = location;
    if (position) this.position = {...position};
  }

  getSummary() {
    return {
      name: this.name,
      type: this.type,
      active: this.active,
      location: this.location,
      currentAction: this.currentAction?.type || 'idle',
      mood: this.mood.snapshot(),
      relationshipCount: Object.keys(this.relationships.players).length,
      skills: this.skills,
    };
  }

  getResponse(type) {
    const responses = {
      greeting: ['Hey there.', 'Hello.', 'Morning.'],
      general: ['Interesting.', 'Hmm.', 'Right.'],
      fishing_chat: ['Fish are biting today.', 'Try the north side.'],
    };
    const pool = responses[type] || responses.general;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

export default Agent;
