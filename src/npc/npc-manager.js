/**
 * @module craftmind/npc/npc-manager
 * @description NPCManager - Manages NPC lifecycle, spawning, and coordination.
 *
 * Handles registration, spawning, chat routing, and periodic updates for NPCs.
 * Coordinates between NPC archetypes, player memory, and the bot instance.
 *
 * @example
 * const manager = new NPCManager();
 * manager.registerNpc(gustavDefinition);
 * manager.spawnNpc('Gustav', bot);
 * manager.handlePlayerChat(playerUuid, 'Hello Gustav!');
 */

const fs = require('fs');
const path = require('path');
const { PlayerMemory } = require('./memory');
const { createGustav } = require('./archetypes/mentor');

/**
 * @typedef {Object} NPCDefinition
 * @property {string} name - NPC display name
 * @property {string} archetype - Archetype identifier (mentor, merchant, etc.)
 * @property {Object} position - Spawn position {x, y, z}
 * @property {string} world - World name
 * @property {Object} schedule - Time-based location schedule
 * @property {Object} dialogueTemplates - Dialogue templates by context
 * @property {Object} giftPreferences - Loved/liked/neutral/hated items
 * @property {Object} friendshipThresholds - Unlock tiers by friendship level
 */

/**
 * @typedef {Object} SpawnedNPC
 * @property {string} name - NPC name
 * @property {Object} instance - Archetype instance
 * @property {Object} bot - Mineflayer bot instance
 * @property {Object} definition - Original NPC definition
 * @property {Map<string, PlayerMemory>} playerMemories - Per-player memories
 * @property {boolean} online - Whether NPC is currently spawned
 * @property {string} currentLocation - Current location name
 */

/**
 * NPCManager class - manages NPC lifecycle and interactions.
 */
class NPCManager {
  /**
   * Create a new NPCManager.
   * @param {Object} [options]
   * @param {string} [options.memoryDir='./memory/npcs'] - Directory for memory files
   * @param {number} [options.tickInterval=5000] - Tick interval in ms
   */
  constructor(options = {}) {
    /** @type {Map<string, NPCDefinition>} Registered NPC definitions */
    this.definitions = new Map();

    /** @type {Map<string, SpawnedNPC>} Currently spawned NPCs */
    this.spawned = new Map();

    /** @type {Map<string, Function>} Archetype factories */
    this.archetypeFactories = new Map();

    /** @type {string} Memory directory */
    this.memoryDir = options.memoryDir || './memory/npcs';

    /** @type {number} Tick interval in ms */
    this.tickInterval = options.tickInterval || 5000;

    /** @type {NodeJS.Timeout|null} Tick timer */
    this._tickTimer = null;

    /** @type {Object} Global bot reference for command routing */
    this.bot = null;

    // Register built-in archetypes
    this._registerBuiltinArchetypes();
  }

  /**
   * Register built-in archetype factories.
   * @private
   */
  _registerBuiltinArchetypes() {
    this.archetypeFactories.set('mentor', (def) => {
      const gustav = createGustav();
      // Override config with definition values if needed
      return gustav;
    });

    // Future archetypes would be registered here:
    // this.archetypeFactories.set('merchant', (def) => createMerchant(def));
    // this.archetypeFactories.set('quest_giver', (def) => createQuestGiver(def));
  }

  /**
   * Register an NPC definition.
   * @param {NPCDefinition} definition - NPC definition
   * @returns {boolean} True if registered successfully
   */
  registerNpc(definition) {
    if (!definition.name) {
      console.warn('[NPCManager] NPC definition missing name');
      return false;
    }

    const key = definition.name.toLowerCase();
    this.definitions.set(key, definition);
    console.log(`[NPCManager] Registered NPC: ${definition.name}`);
    return true;
  }

  /**
   * Load NPC definitions from a directory.
   * @param {string} dirPath - Directory containing NPC definition files
   * @returns {number} Number of NPCs loaded
   */
  loadFromDirectory(dirPath) {
    let count = 0;

    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const definition = this._parseYamlDefinition(
            path.join(dirPath, file)
          );
          if (definition && this.registerNpc(definition)) {
            count++;
          }
        } else if (file.endsWith('.json')) {
          const definition = JSON.parse(
            fs.readFileSync(path.join(dirPath, file), 'utf8')
          );
          if (this.registerNpc(definition)) {
            count++;
          }
        }
      }
    } catch (err) {
      console.warn(`[NPCManager] Failed to load from ${dirPath}: ${err.message}`);
    }

    return count;
  }

  /**
   * Parse a YAML NPC definition file.
   * @private
   * @param {string} filePath
   * @returns {NPCDefinition|null}
   */
  _parseYamlDefinition(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Simple YAML parser for NPC definitions
      // Supports basic key: value and nested structures
      const definition = this._parseSimpleYaml(content);
      return definition;
    } catch (err) {
      console.warn(`[NPCManager] Failed to parse ${filePath}: ${err.message}`);
      return null;
    }
  }

  /**
   * Simple YAML parser for NPC definitions.
   * @private
   * @param {string} content
   * @returns {Object}
   */
  _parseSimpleYaml(content) {
    const result = {};
    const lines = content.split('\n');
    let currentKey = null;
    let currentArray = null;
    let indent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      const currentIndent = line.search(/\S/);

      // Check for array item
      if (trimmed.startsWith('- ')) {
        if (currentArray) {
          currentArray.push(trimmed.slice(2).replace(/['"]/g, ''));
        }
        continue;
      }

      // Parse key: value
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Check if next lines are indented (nested object or array)
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.search(/\S/) > currentIndent) {
        if (nextLine.trim().startsWith('- ')) {
          // Array
          currentArray = [];
          result[key] = currentArray;
        } else {
          // Nested object
          result[key] = {};
          currentArray = null;
        }
        currentKey = key;
        indent = currentIndent;
      } else if (value === '') {
        // Empty value, expect nested content
        result[key] = {};
        currentKey = key;
        indent = currentIndent;
        currentArray = null;
      } else {
        // Simple value
        // Try to parse as number
        const num = parseFloat(value);
        if (!isNaN(num) && isFinite(num)) {
          value = num;
        }
        result[key] = value;
        currentArray = null;
      }
    }

    return result;
  }

  /**
   * Spawn an NPC by name.
   * @param {string} name - NPC name
   * @param {Object} bot - Mineflayer bot instance
   * @returns {SpawnedNPC|null} Spawned NPC or null if failed
   */
  spawnNpc(name, bot) {
    const key = name.toLowerCase();
    const definition = this.definitions.get(key);

    if (!definition) {
      console.warn(`[NPCManager] Unknown NPC: ${name}`);
      return null;
    }

    // Check if already spawned
    if (this.spawned.has(key)) {
      console.log(`[NPCManager] NPC ${name} already spawned`);
      return this.spawned.get(key);
    }

    // Get archetype factory
    const factory = this.archetypeFactories.get(definition.archetype);
    if (!factory) {
      console.warn(`[NPCManager] Unknown archetype: ${definition.archetype}`);
      return null;
    }

    // Create NPC instance
    const instance = factory(definition);
    instance.initialize(bot);

    /** @type {SpawnedNPC} */
    const spawnedNpc = {
      name: definition.name,
      instance,
      bot,
      definition,
      playerMemories: new Map(),
      online: true,
      currentLocation: this._getCurrentLocation(definition),
    };

    this.spawned.set(key, spawnedNpc);
    this.bot = bot;

    console.log(`[NPCManager] Spawned NPC: ${definition.name} at ${spawnedNpc.currentLocation}`);

    return spawnedNpc;
  }

  /**
   * Despawn an NPC.
   * @param {string} name - NPC name
   */
  despawnNpc(name) {
    const key = name.toLowerCase();
    const npc = this.spawned.get(key);

    if (npc) {
      // Save all player memories
      for (const memory of npc.playerMemories.values()) {
        memory.save();
      }

      npc.online = false;
      this.spawned.delete(key);
      console.log(`[NPCManager] Despawned NPC: ${name}`);
    }
  }

  /**
   * Get current location based on schedule.
   * @private
   * @param {NPCDefinition} definition
   * @returns {string}
   */
  _getCurrentLocation(definition) {
    if (!definition.schedule) {
      return 'default';
    }

    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour < 18;

    // Check schedule for current time
    for (const [period, location] of Object.entries(definition.schedule)) {
      if (period === 'dawn' && hour >= 5 && hour < 7) return location;
      if (period === 'day' && hour >= 7 && hour < 17) return location;
      if (period === 'dusk' && hour >= 17 && hour < 19) return location;
      if (period === 'night' && (hour >= 19 || hour < 5)) return location;
    }

    return isDaytime ? 'dock' : 'tavern';
  }

  /**
   * Get an NPC by name.
   * @param {string} name - NPC name
   * @returns {SpawnedNPC|null}
   */
  getNpcByName(name) {
    return this.spawned.get(name.toLowerCase()) || null;
  }

  /**
   * Get all spawned NPCs.
   * @returns {SpawnedNPC[]}
   */
  getAllNpcs() {
    return Array.from(this.spawned.values());
  }

  /**
   * Get all online NPCs.
   * @returns {SpawnedNPC[]}
   */
  getOnlineNpcs() {
    return this.getAllNpcs().filter(npc => npc.online);
  }

  /**
   * Get or create player memory for an NPC.
   * @param {string} npcName - NPC name
   * @param {string} playerUuid - Player UUID
   * @param {string} displayName - Player display name
   * @returns {PlayerMemory|null}
   */
  getPlayerMemory(npcName, playerUuid, displayName = '') {
    const npc = this.getNpcByName(npcName);
    if (!npc) return null;

    let memory = npc.playerMemories.get(playerUuid);

    if (!memory) {
      memory = new PlayerMemory(
        playerUuid,
        npcName.toLowerCase(),
        this.memoryDir
      );
      memory.load();
      npc.playerMemories.set(playerUuid, memory);
    }

    if (displayName) {
      memory.player.displayName = displayName;
    }

    return memory;
  }

  /**
   * Handle player chat and route to appropriate NPCs.
   * @param {string} playerUuid - Player UUID
   * @param {string} playerName - Player display name
   * @param {string} message - Chat message
   * @returns {Object[]} Array of {npc, response} for NPCs that responded
   */
  handlePlayerChat(playerUuid, playerName, message) {
    const responses = [];
    const lowerMessage = message.toLowerCase();

    for (const npc of this.getOnlineNpcs()) {
      // Check if message mentions this NPC
      const npcMentioned = lowerMessage.includes(npc.name.toLowerCase());

      // Check if player is near this NPC (within 30 blocks)
      const isNearby = this._isPlayerNearNpc(playerUuid, npc);

      if (npcMentioned || isNearby) {
        const memory = this.getPlayerMemory(npc.name, playerUuid, playerName);
        memory.updatePlayerInfo(npc.bot, playerName);

        // Generate response
        let response;
        if (memory.player.interactionCount <= 1) {
          response = npc.instance.generateGreeting(memory, {
            bot: npc.bot,
            time: this._getTimeOfDay(),
          });
        } else {
          response = npc.instance.handleChat(message, memory, {
            bot: npc.bot,
            time: this._getTimeOfDay(),
          });
        }

        memory.save();

        responses.push({
          npc: npc.name,
          response,
          friendship: memory.getFriendshipName(),
        });
      }
    }

    return responses;
  }

  /**
   * Check if a player is near an NPC.
   * @private
   * @param {string} playerUuid
   * @param {SpawnedNPC} npc
   * @param {number} [range=30]
   * @returns {boolean}
   */
  _isPlayerNearNpc(playerUuid, npc, range = 30) {
    if (!npc.bot) return false;

    const player = npc.bot.players ?
      Object.values(npc.bot.players).find(p => p.uuid === playerUuid) : null;

    if (!player?.entity) return false;

    const npcPos = npc.bot.entity?.position;
    const playerPos = player.entity.position;

    if (!npcPos || !playerPos) return false;

    const distance = npcPos.distanceTo(playerPos);
    return distance <= range;
  }

  /**
   * Get time of day.
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
   * Handle a player joining the server.
   * @param {string} playerUuid
   * @param {string} playerName
   * @returns {Object|null} Welcome message from nearby NPC
   */
  handlePlayerJoin(playerUuid, playerName) {
    for (const npc of this.getOnlineNpcs()) {
      // NPCs don't greet immediately, wait until player is nearby
      // But we can prepare their memory
      const memory = this.getPlayerMemory(npc.name, playerUuid, playerName);
      memory.applyDecay();
      memory.save();
    }

    return null;
  }

  /**
   * Handle a gift given to an NPC.
   * @param {string} npcName
   * @param {string} playerUuid
   * @param {string} playerName
   * @param {string} item
   * @returns {Object|null} {reaction, friendshipDelta, preference}
   */
  handleGift(npcName, playerUuid, playerName, item) {
    const npc = this.getNpcByName(npcName);
    if (!npc) return null;

    const memory = this.getPlayerMemory(npcName, playerUuid, playerName);
    const result = npc.instance.receiveGift(item, memory);

    memory.save();

    return result;
  }

  /**
   * Handle a player achievement.
   * @param {string} playerUuid
   * @param {string} playerName
   * @param {string} achievementType
   * @param {Object} details
   * @returns {Object[]} Reactions from nearby NPCs
   */
  handlePlayerAchievement(playerUuid, playerName, achievementType, details) {
    const reactions = [];

    for (const npc of this.getOnlineNpcs()) {
      if (this._isPlayerNearNpc(playerUuid, npc, 50)) {
        const memory = this.getPlayerMemory(npc.name, playerUuid, playerName);
        const reaction = npc.instance.reactToAchievement(
          achievementType,
          details,
          memory
        );
        memory.save();

        reactions.push({
          npc: npc.name,
          reaction,
        });
      }
    }

    return reactions;
  }

  /**
   * Start the tick loop for periodic updates.
   */
  startTick() {
    if (this._tickTimer) return;

    this._tickTimer = setInterval(() => {
      this.tick();
    }, this.tickInterval);
  }

  /**
   * Stop the tick loop.
   */
  stopTick() {
    if (this._tickTimer) {
      clearInterval(this._tickTimer);
      this._tickTimer = null;
    }
  }

  /**
   * Perform periodic updates for all NPCs.
   */
  tick() {
    for (const npc of this.getOnlineNpcs()) {
      // Update location based on schedule
      npc.currentLocation = this._getCurrentLocation(npc.definition);

      // Perform idle behaviors
      this._performIdleBehavior(npc);

      // Save memories periodically (every 5th tick)
      if (Math.random() < 0.2) {
        for (const memory of npc.playerMemories.values()) {
          memory.save();
        }
      }
    }
  }

  /**
   * Perform idle behavior for an NPC.
   * @private
   * @param {SpawnedNPC} npc
   */
  _performIdleBehavior(npc) {
    if (!npc.bot?.entity) return;

    // Random small movements
    if (Math.random() < 0.1) {
      const yaw = npc.bot.entity.yaw + (Math.random() - 0.5) * 0.5;
      const pitch = npc.bot.entity.pitch + (Math.random() - 0.5) * 0.2;
      npc.bot.look(yaw, pitch, false);
    }

    // Occasional idle chat (very rare)
    if (Math.random() < 0.01) {
      const idlePhrases = [
        '...',
        '*sigh*',
        'Where did everyone go?',
        'The fish are quiet today.',
      ];
      const phrase = idlePhrases[Math.floor(Math.random() * idlePhrases.length)];
      // Don't actually send - would be spam. Just log it.
      console.log(`[${npc.name}] ${phrase}`);
    }
  }

  /**
   * Get NPC status summary.
   * @returns {Object}
   */
  getStatus() {
    return {
      registered: this.definitions.size,
      spawned: this.spawned.size,
      online: this.getOnlineNpcs().length,
      npcs: this.getAllNpcs().map(npc => ({
        name: npc.name,
        online: npc.online,
        location: npc.currentLocation,
        players: npc.playerMemories.size,
      })),
    };
  }

  /**
   * Clean up all NPCs and save memories.
   */
  destroy() {
    this.stopTick();

    for (const npc of this.getAllNpcs()) {
      for (const memory of npc.playerMemories.values()) {
        memory.save();
      }
      this.despawnNpc(npc.name);
    }

    console.log('[NPCManager] Destroyed');
  }
}

module.exports = {
  NPCManager,
};
