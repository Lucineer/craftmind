/**
 * @module craftmind/agent-framework/agent-manager
 * @description Generic multi-agent orchestration. Spawns agents, ticks them,
 * resolves interactions, and fires events.
 */

import {EventEmitter} from 'events';
import {Agent} from './agent.js';

export class AgentManager extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {string} [options.dataDir]
   */
  constructor(options = {}) {
    super();
    this.agents = new Map();
    this.dataDir = options.dataDir || './data/memory';

    this.tickCount = 0;
    this.gameHour = 8;
    this.weather = 'clear';
    this.running = false;
    this._tickInterval = null;
    this.interactionHistory = [];
  }

  spawnAgent(config) {
    const agent = new Agent({...config, dataDir: this.dataDir});
    this.agents.set(config.name, agent);
    agent.start();
    this.emit('agent:spawned', {name: config.name, type: config.type});
    return agent;
  }

  removeAgent(name) {
    const agent = this.agents.get(name);
    if (!agent) return false;
    agent.stop();
    this.agents.delete(name);
    this.emit('agent:removed', {name});
    return true;
  }

  getAgent(name) { return this.agents.get(name); }
  getAgentNames() { return [...this.agents.keys()]; }
  get agentCount() { return this.agents.size; }

  tick(context = {}) {
    if (!this.running) return;
    this.tickCount++;
    if (context.gameHour !== undefined) this.gameHour = context.gameHour;
    if (context.weather !== undefined) this.weather = context.weather;

    const allEntities = this._getEntities();

    for (const agent of this.agents.values()) {
      try {
        const action = agent.tick({
          gameHour: this.gameHour,
          weather: this.weather,
          nearbyEntities: allEntities.filter(e => e.name !== agent.name),
          world: context.world || {},
        });
        if (action) this.emit('agent:action', {agent: agent.name, action});
      } catch (err) {
        this.emit('agent:error', {agent: agent.name, error: err.message});
      }
    }

    if (this.tickCount % 10 === 0) this._resolveInteractions();
  }

  start(intervalMs = 2000) {
    this.running = true;
    this._tickInterval = setInterval(() => {
      this.gameHour += (intervalMs / 1000) / 60;
      if (this.gameHour >= 24) { this.gameHour -= 24; this._newDay(); }
      this.tick({gameHour: this.gameHour, weather: this.weather});
    }, intervalMs);
    this.emit('manager:started');
  }

  stop() {
    this.running = false;
    if (this._tickInterval) clearInterval(this._tickInterval);
    for (const agent of this.agents.values()) agent.stop();
    this.emit('manager:stopped');
  }

  handleWorldEvent(event) {
    if (event.weather) this.weather = event.weather;
    for (const agent of this.agents.values()) agent.handleEvent(event);
    this.emit('world:event', event);
  }

  broadcast(message, type = 'general') {
    for (const agent of this.agents.values()) agent.handleEvent({type: 'broadcast', message, broadcastType: type});
    this.emit('broadcast', {message, type});
  }

  getStatus() {
    return {
      tickCount: this.tickCount,
      gameHour: this.gameHour,
      weather: this.weather,
      running: this.running,
      agentCount: this.agents.size,
      agents: [...this.agents.values()].map(a => a.getSummary()),
    };
  }

  getRecentInteractions(sinceMs = 300000) {
    const cutoff = Date.now() - sinceMs;
    return this.interactionHistory.filter(i => i.timestamp > cutoff);
  }

  _getEntities() {
    return [...this.agents.values()].map(a => ({name: a.name, type: 'agent', position: a.position, location: a.location}));
  }

  _resolveInteractions() {
    const agents = [...this.agents.values()];
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i], b = agents[j];
        const dist = this._distance(a.position, b.position);
        if (dist > 30) continue;
        const relA = a.relationships.get(b.name);
        if (relA.trust > 0.4) {
          const interaction = {type: 'chat', agents: [a.name, b.name], location: a.location, timestamp: Date.now()};
          this.interactionHistory.push(interaction);
          if (this.interactionHistory.length > 500) this.interactionHistory = this.interactionHistory.slice(-500);
          this.emit('interaction', interaction);
        }
      }
    }
  }

  _distance(a, b) {
    const dx = (a.x || 0) - (b.x || 0);
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dz * dz);
  }

  _newDay() {
    for (const agent of this.agents.values()) agent.handleEvent({type: 'new_day'});
    this.emit('world:new_day');
  }
}

export default AgentManager;
