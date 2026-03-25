/**
 * @module craftmind/bot
 * @description CraftMind Bot — main bot factory that creates a mineflayer bot
 * equipped with pathfinding, state machine, command registry, plugin system,
 * persistent memory, structured logging, error recovery, and an LLM brain.
 *
 * @example
 * const bot = createBot({ host: 'localhost', username: 'Cody' });
 * bot.craftmind.followPlayer('SafeArtist2047');
 */

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { PERSONALITIES, BrainHandler } = require('./brain');
const { CraftMindEvents } = require('./events');
const { BotStateMachine } = require('./state-machine');
const { CommandRegistry } = require('./commands');
const { builtinCommands } = require('./commands/builtin');
const { PluginManager } = require('./plugins');
const { BotMemory } = require('./memory');
const { loadConfig, validateConfig } = require('./config');
const logger = require('./log');

// Built-in plugins
const autoEat = require('./plugins/auto-eat');
const playerTracker = require('./plugins/player-tracker');
const deathTracker = require('./plugins/death-tracker');
const fleeOnDanger = require('./plugins/flee-on-danger');

const BUILTIN_PLUGINS = [autoEat, playerTracker, deathTracker, fleeOnDanger];

/**
 * Create a fully-wired CraftMind bot.
 *
 * @param {Object} options
 * @param {string} [options.host='localhost']       - Server hostname.
 * @param {number} [options.port=25565]             - Server port.
 * @param {string} [options.username='CraftBot']     - In-game username.
 * @param {string} [options.version='1.21.4']        - Minecraft version.
 * @param {string} [options.personality]             - Personality key from PERSONALITIES.
 * @param {string} [options.llmApiKey]               - Override API key for the LLM brain.
 * @param {string} [options.llmModel]                - Override model name.
 * @param {boolean}[options.useBrain=true]           - Set false to disable the LLM brain.
 * @param {Object} [options.behavior]                - Behavior config overrides.
 * @param {Object} [options.pathfinding]             - Pathfinding config overrides.
 * @param {Object} [options.llm]                     - LLM config overrides.
 * @param {Array}  [options.plugins]                 - Additional plugins to load.
 * @param {string} [options.memoryDir='./memory']    - Directory for persistent memory.
 * @param {function} [options.onStart]               - Fired once after spawn.
 * @param {function} [options.onChat]                - Fired on every chat message.
 * @param {function} [options.onEnd]                 - Fired on disconnect.
 *
 * @returns {import('mineflayer').Bot & { craftmind: BotActions }} The bot instance.
 */
function createBot(options = {}) {
  // ── Configuration ──────────────────────────────────────────────────────────
  const config = loadConfig(options);
  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid config:\n  ${validation.errors.join('\n  ')}`);
  }

  const log = logger.create(config.username);
  const events = new CraftMindEvents();
  const stateMachine = new BotStateMachine();
  const commands = new CommandRegistry();
  const plugins = new PluginManager();
  const memory = new BotMemory(config.username, options.memoryDir || './memory');

  // Register built-in commands
  for (const cmd of builtinCommands) {
    commands.register(cmd);
  }

  // ── Create mineflayer bot ─────────────────────────────────────────────────
  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    version: config.version,
    hideErrors: false,
  });

  bot.loadPlugin(pathfinder);

  // ── Reconnection ───────────────────────────────────────────────────────────
  let reconnectAttempts = 0;
  const maxReconnect = config.behavior?.maxReconnectAttempts ?? 10;
  const reconnectDelay = config.behavior?.reconnectDelay ?? 5000;

  function attemptReconnect() {
    if (!config.behavior?.autoReconnect) return;
    if (reconnectAttempts >= maxReconnect) {
      log.error('Max reconnection attempts reached, giving up');
      events.emit('DISCONNECT', { reason: 'max_reconnects' });
      options.onEnd?.(bot);
      return;
    }
    reconnectAttempts++;
    const delay = reconnectDelay * Math.min(reconnectAttempts, 5); // Exponential backoff, capped
    log.info(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnect})`);
    events.emit('RECONNECT', { attempt: reconnectAttempts, delay });

    setTimeout(() => {
      log.info(`Reconnecting...`);
      try {
        const newBot = createBot(options);
        // Transfer state
        Object.assign(bot, newBot);
      } catch (err) {
        log.error(`Reconnect failed: ${err.message}`);
        attemptReconnect();
      }
    }, delay);
  }

  // ── Core Events ────────────────────────────────────────────────────────────

  bot.once('spawn', () => {
    log.info(`Spawned at ${formatPos(bot.entity.position)}`);

    const mcData = require('minecraft-data')(bot.version);
    const moves = new Movements(bot, mcData);
    moves.allowSprinting = config.pathfinding?.allowSprinting !== false;
    moves.allowParkour = config.pathfinding?.allowParkour !== false;
    bot.pathfinder.setMovements(moves);

    // Load built-in + custom plugins
    for (const plugin of BUILTIN_PLUGINS) {
      plugins.load(plugin, events, commands, bot);
    }
    for (const plugin of (options.plugins || [])) {
      plugins.load(plugin, events, commands, bot);
    }

    stateMachine.reset();
    reconnectAttempts = 0;
    events.emit('SPAWN');

    if (options.onStart) options.onStart(bot);
  });

  bot.on('health', () => {
    events.emit('HEALTH', { health: bot.health, food: bot.food });
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    log.info(`[CHAT] <${username}> ${message}`);

    // Track player
    events.emit('PLAYER_SEEN', username);

    // Emit generic chat event
    events.emit('CHAT', username, message);

    // Try command dispatch
    if (message.startsWith('!')) {
      const ctx = {
        bot,
        sender: username,
        raw: message,
        reply: (msg) => bot.chat(msg),
        permission: 'anyone', // Could be expanded with op checking
      };
      const handled = commands.execute(message, ctx);
      events.emit('COMMAND', { sender: username, message, handled });
      if (handled) {
        if (options.onChat) options.onChat(bot, username, message);
        return;
      }
    }

    // Brain handles non-command chat
    if (brain && !message.startsWith('!')) {
      brain.handleChat(username, message);
    }

    if (options.onChat) options.onChat(bot, username, message);
  });

  bot.on('kicked', (reason) => {
    log.warn(`Kicked: ${reason}`);
    events.emit('KICKED', { reason });
  });

  bot.on('error', (err) => {
    log.error(`Error: ${err.message}`);
    events.emit('ERROR', { error: err });
  });

  bot.on('end', (reason) => {
    log.info(`Disconnected: ${reason || 'unknown'}`);
    stateMachine.transition('IDLE');
    events.emit('DISCONNECT', { reason });
    plugins.unloadAll();

    if (options.onEnd) options.onEnd(bot);
    if (config.behavior?.autoReconnect !== false) {
      attemptReconnect();
    }
  });

  // ── Navigation state tracking ─────────────────────────────────────────────

  bot.on('goal_reached', () => {
    const state = stateMachine.current;
    if (state === 'NAVIGATING' || state === 'FOLLOWING') {
      stateMachine.transition('IDLE');
      events.emit('NAVIGATION_COMPLETE');
    }
  });

  bot.on('path_update', (result) => {
    if (result === 'noPath') {
      events.emit('NAVIGATION_FAILED');
    }
  });

  // ── Agent Actions Namespace ───────────────────────────────────────────────

  /**
   * @typedef {Object} BotActions
   * Collection of agent actions available as `bot.craftmind.*`.
   */
  bot.craftmind = {
    /**
     * Follow a named player, staying within the given distance.
     * @param {string} playerName
     * @param {number} [distance]
     */
    followPlayer(playerName, distance = 3) {
      const player = bot.players[playerName];
      if (!player || !player.entity) {
        bot.chat(`I can't find ${playerName}`);
        return;
      }
      bot.pathfinder.setGoal(new goals.GoalFollow(player.entity, distance), true);
      stateMachine.transition('FOLLOWING', { target: playerName });
      bot.chat(`Following ${playerName}`);
      events.emit('FOLLOW_START', { target: playerName, distance });
    },

    /** Cancel any active pathfinding goal and clear control states. */
    stop() {
      const prevState = stateMachine.current;
      bot.pathfinder.setGoal(null);
      bot.clearControlStates();
      stateMachine.transition('IDLE');
      bot.chat('Stopping');
      if (prevState === 'FOLLOWING') {
        events.emit('FOLLOW_STOP');
      }
    },

    /**
     * Navigate to specific world coordinates.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    goTo(x, y, z) {
      bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));
      stateMachine.transition('NAVIGATING', { x, y, z });
      bot.chat(`Heading to ${x}, ${y}, ${z}`);
      events.emit('NAVIGATION_START', { x, y, z });
    },

    /** @param {string} message */
    say(message) {
      bot.chat(message);
    },

    /**
     * Find blocks of a given type within range.
     * @param {number|string|function} blockType
     * @param {number} [range=32]
     * @returns {Array}
     */
    findBlock(blockType, range = 32) {
      const blocks = bot.findBlocks({ matching: blockType, maxDistance: range, count: 10 });
      return blocks.map((b) => bot.blockAt(b));
    },

    /** @returns {Object.<string, number>} */
    inventorySummary() {
      const items = bot.inventory.items();
      const summary = {};
      items.forEach((item) => {
        const name = item.name.replace('minecraft:', '');
        summary[name] = (summary[name] || 0) + item.count;
      });
      return summary;
    },

    /** @returns {{x: number, y: number, z: number}} */
    position() {
      const pos = bot.entity.position;
      return { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
    },

    /**
     * List nearby entities within range.
     * @param {number} [range=16]
     * @returns {Array<{name: string, type: string, distance: number}>}
     */
    nearbyEntities(range = 16) {
      return Object.values(bot.entities)
        .filter((e) => e !== bot.entity && e.position.distanceTo(bot.entity.position) < range)
        .map((e) => ({
          name: e.name || e.username || e.type,
          type: e.type,
          distance: Math.floor(e.position.distanceTo(bot.entity.position)),
        }));
    },

    /** @param {string} playerName */
    lookAt(playerName) {
      const player = bot.players[playerName];
      if (player?.entity) {
        const pos = player.entity.position.offset(0, 1.6, 0);
        bot.lookAt(pos);
        bot.chat(`Looking at ${playerName}`);
      }
    },

    /**
     * Dig the block at the given coordinates.
     * @param {number} x @param {number} y @param {number} z
     */
    dig(x, y, z) {
      const vec3 = require('vec3');
      const block = bot.blockAt(vec3(x, y, z));
      if (block) {
        stateMachine.transition('MINING', { x, y, z, block: block.name });
        bot.chat(`Mining ${block.name}`);
        events.emit('DIG_START', { x, y, z, block: block.name });
        bot.dig(block, () => {
          events.emit('DIG_COMPLETE', { x, y, z, block: block.name });
          stateMachine.transition('IDLE');
        });
      }
    },

    /**
     * Place a block from inventory onto a reference block.
     * @param {string} blockName @param {number} x @param {number} y @param {number} z
     */
    place(blockName, x, y, z) {
      const vec3 = require('vec3');
      const item = bot.inventory.items().find((i) => i.name.includes(blockName));
      if (!item) {
        bot.chat(`I don't have any ${blockName}`);
        return;
      }
      const refBlock = bot.blockAt(vec3(x, y, z));
      if (refBlock) {
        stateMachine.transition('BUILDING', { x, y, z, block: blockName });
        bot.equip(item, 'hand').then(() => {
          bot.placeBlock(refBlock, vec3(0, 1, 0));
          bot.chat(`Placed ${blockName}`);
          events.emit('PLACE_BLOCK', { x, y, z, block: blockName });
          stateMachine.transition('IDLE');
        });
      }
    },

    // ── System access (for plugins and advanced use) ──────────────────────

    /** @type {CraftMindEvents} */
    _events: events,
    /** @type {BotStateMachine} */
    _stateMachine: stateMachine,
    /** @type {CommandRegistry} */
    _commands: commands,
    /** @type {PluginManager} */
    _plugins: plugins,
    /** @type {BotMemory} */
    _memory: memory,
    /** @type {Object} */
    _config: config,
    /** @type {ReturnType<import('../log').create>} */
    _logger: log,
  };

  // ── Attach Brain ──────────────────────────────────────────────────────────
  let brain = null;
  const personalityName = config.personality;
  const personality = PERSONALITIES[personalityName] || null;

  if (personality && config.useBrain !== false) {
    brain = new BrainHandler(bot, personality, {
      apiKey: config.llm?.apiKey,
      model: config.llm?.model || 'glm-4-flash',
      apiUrl: config.llm?.apiUrl,
      maxHistory: config.llm?.maxHistory,
      timeout: config.llm?.timeout,
      minInterval: config.llm?.minInterval,
    });
    bot.craftmind._brain = brain;
  }

  // ── Save memory on graceful shutdown ──────────────────────────────────────
  const saveAndQuit = () => {
    memory.save();
    log.info('Memory saved, shutting down');
  };
  process.on('SIGINT', () => {
    saveAndQuit();
    bot.quit();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    saveAndQuit();
    bot.quit();
    process.exit(0);
  });

  // Periodic memory save (every 60s)
  const memorySaveInterval = setInterval(() => {
    if (bot.entity) {
      memory.save();
    }
  }, 60_000);
  bot.on('end', () => clearInterval(memorySaveInterval));

  return bot;
}

function formatPos(pos) {
  return `${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`;
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const host = args[0] || 'localhost';
  const port = parseInt(args[1]) || 25565;
  const username = args[2] || 'Cody';

  require('dotenv').config();

  logger.info(`Connecting to ${host}:${port} as ${username}...`);

  createBot({
    host,
    port,
    username,
    personality: username.toLowerCase(),
    llmApiKey: process.env.ZAI_API_KEY,
    onStart(bot) {
      setTimeout(() => {
        const hasBrain = !!bot.craftmind._brain;
        if (hasBrain) {
          bot.chat(`Hey! I'm ${username}. My brain is online — just talk to me!`);
          bot.chat('Use !help for commands.');
        } else {
          bot.chat(`Hey! I spawned. Use !help for commands.`);
        }
      }, 2000);
    },
    onEnd() {
      process.exit(0);
    },
  });
}

module.exports = { createBot };
