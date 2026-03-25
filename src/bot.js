/**
 * @module bot
 * @description CraftMind Bot — main bot factory that creates a mineflayer bot
 * equipped with pathfinding, an LLM brain, and an extensible `craftmind` namespace
 * of agent actions (follow, goto, dig, place, inventory, etc.).
 */

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { PERSONALITIES, BrainHandler } = require('./brain');

/**
 * Create a fully-wired CraftMind bot.
 *
 * @param {Object} options
 * @param {string} [options.host='localhost']   - Server hostname.
 * @param {number} [options.port=25565]         - Server port.
 * @param {string} [options.username='CraftBot'] - In-game username.
 * @param {string} [options.version='1.21.4']   - Minecraft version.
 * @param {string} [options.personality]        - Personality key from {@link PERSONALITIES}. Defaults to `username.toLowerCase()`.
 * @param {string} [options.llmApiKey]          - Override API key for the LLM brain.
 * @param {string} [options.llmModel]           - Override model name.
 * @param {boolean}[options.useBrain=true]      - Set `false` to disable the LLM brain entirely.
 * @param {function(import('mineflayer').Bot): void} [options.onStart]  - Fired once after spawn.
 * @param {function(import('mineflayer').Bot, string, string): void} [options.onChat] - Fired on every chat message.
 * @param {function(import('mineflayer').Bot): void} [options.onEnd]   - Fired on disconnect.
 *
 * @returns {import('mineflayer').Bot & { craftmind: BotActions }} The bot instance with a `.craftmind` namespace.
 *
 * @example
 * const bot = createBot({ host: 'localhost', username: 'Cody' });
 *
 * // Later — agent actions are on bot.craftmind
 * bot.craftmind.followPlayer('SafeArtist2047');
 * bot.craftmind.goTo(100, 64, -200);
 * bot.craftmind.stop();
 */
function createBot(options) {
  const bot = mineflayer.createBot({
    host: options.host || 'localhost',
    port: options.port || 25565,
    username: options.username || 'CraftBot',
    version: options.version || '1.21.4',
    hideErrors: false,
  });

  bot.loadPlugin(pathfinder);

  // ── LLM brain (resolved after craftmind namespace exists) ──
  let brain = null;
  const personalityName = options.personality || options.username?.toLowerCase();
  const personality = PERSONALITIES[personalityName] || null;

  // ── Core Events ─────────────────────────────────────────────────────────────

  bot.once('spawn', () => {
    console.log(`[${bot.username}] Spawned at ${bot.entity.position}`);

    const mcData = require('minecraft-data')(bot.version);
    const moves = new Movements(bot, mcData);
    moves.allowSprinting = true;
    moves.allowParkour = true;
    bot.pathfinder.setMovements(moves);

    if (options.onStart) options.onStart(bot);
  });

  bot.on('health', () => {
    if (bot.food < 18) {
      const food = bot.inventory.items().find(
        (item) =>
          item.name.includes('food') ||
          ['beef', 'porkchop', 'apple', 'bread', 'carrot', 'potato', 'cooked'].some((f) =>
            item.name.includes(f),
          ),
      );
      if (food) bot.equip(food, 'hand').then(() => bot.consume());
    }
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    console.log(`[CHAT] <${username}> ${message}`);

    // Brain handles non-command chat
    if (brain && !message.startsWith('!')) {
      brain.handleChat(username, message);
      if (options.onChat) options.onChat(bot, username, message);
      return;
    }

    // Parse !commands
    const cleanMessage = message.replace(/^!/, '').toLowerCase();
    const parts = cleanMessage.split(' ');
    const cmd = parts[0];

    if (cmd === 'follow' && parts[1]) {
      bot.craftmind.followPlayer(parts[1]);
    } else if (cmd === 'stop') {
      bot.craftmind.stop();
    } else if (cmd === 'where') {
      const pos = bot.craftmind.position();
      bot.chat(`I'm at ${pos.x}, ${pos.y}, ${pos.z}`);
    } else if (cmd === 'inventory' || cmd === 'inv') {
      const inv = bot.craftmind.inventorySummary();
      const items = Object.entries(inv).map(([k, v]) => `${k}: ${v}`).join(', ');
      bot.chat(`I have: ${items || 'nothing'}`);
    } else if (cmd === 'look' && parts[1]) {
      bot.craftmind.lookAt(parts[1]);
    } else if (cmd === 'hello' || cmd === 'hi') {
      bot.chat(`Hey ${username}!`);
    }

    if (options.onChat) options.onChat(bot, username, message);
  });

  bot.on('kicked', (reason) => {
    console.log(`[${bot.username}] Kicked: ${reason}`);
  });

  bot.on('error', (err) => {
    console.error(`[${bot.username}] Error: ${err.message}`);
  });

  bot.on('end', () => {
    console.log(`[${bot.username}] Disconnected`);
    if (options.onEnd) options.onEnd(bot);
  });

  // ── Agent Actions Namespace ─────────────────────────────────────────────────

  /**
   * @typedef {Object} BotActions
   * Collection of agent actions available as `bot.craftmind.*`.
   */

  bot.craftmind = {
    /**
     * Follow a named player, staying within the given distance.
     * @param {string} playerName - Exact player name.
     * @param {number} [distance=3] - Blocks to keep away.
     */
    followPlayer(playerName, distance = 3) {
      const player = bot.players[playerName];
      if (!player || !player.entity) {
        bot.chat(`I can't find ${playerName}`);
        return;
      }
      bot.pathfinder.setGoal(new goals.GoalFollow(player.entity, distance), true);
      bot.chat(`Following ${playerName}`);
    },

    /**
     * Cancel any active pathfinding goal and clear control states.
     */
    stop() {
      bot.pathfinder.setGoal(null);
      bot.clearControlStates();
      bot.chat('Stopping');
    },

    /**
     * Navigate to specific world coordinates.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    goTo(x, y, z) {
      bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));
      bot.chat(`Heading to ${x}, ${y}, ${z}`);
    },

    /**
     * Send a chat message.
     * @param {string} message
     */
    say(message) {
      bot.chat(message);
    },

    /**
     * Find blocks of a given type within range.
     * @param {number|string|function} blockType - Block matching criteria.
     * @param {number} [range=32]
     * @returns {Array} Matching block objects.
     */
    findBlock(blockType, range = 32) {
      const blocks = bot.findBlocks({ matching: blockType, maxDistance: range, count: 10 });
      return blocks.map((b) => bot.blockAt(b));
    },

    /**
     * Get a summary of inventory items (name → count).
     * @returns {Object.<string, number>}
     */
    inventorySummary() {
      const items = bot.inventory.items();
      const summary = {};
      items.forEach((item) => {
        const name = item.name.replace('minecraft:', '');
        summary[name] = (summary[name] || 0) + item.count;
      });
      return summary;
    },

    /**
     * Get the bot's current position (floored to integers).
     * @returns {{x: number, y: number, z: number}}
     */
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

    /**
     * Look at a named player (aims at head level).
     * @param {string} playerName
     */
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
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    dig(x, y, z) {
      const vec3 = require('vec3');
      const block = bot.blockAt(vec3(x, y, z));
      if (block) {
        bot.chat(`Mining ${block.name}`);
        bot.dig(block);
      }
    },

    /**
     * Place a block from inventory onto a reference block.
     * @param {string} blockName - Partial item name to match.
     * @param {number} x
     * @param {number} y
     * @param {number} z
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
        bot.equip(item, 'hand').then(() => {
          bot.placeBlock(refBlock, vec3(0, 1, 0));
          bot.chat(`Placed ${blockName}`);
        });
      }
    },
  };

  // ── Attach Brain (must happen AFTER craftmind namespace exists) ────────────
  if (personality && options.useBrain !== false) {
    brain = new BrainHandler(bot, personality, {
      apiKey: options.llmApiKey,
      model: options.llmModel || 'glm-4-flash',
    });
    bot.craftmind._brain = brain;
  }

  return bot;
}

// ── CLI ────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const host = args[0] || 'localhost';
  const port = parseInt(args[1]) || 25565;
  const username = args[2] || 'Cody';

  console.log(`Connecting to ${host}:${port} as ${username}...`);

  createBot({
    host,
    port,
    username,
    personality: username.toLowerCase(),
    llmApiKey: process.env.ZAI_API_KEY,
    useBrain: true,
    onChat(b, uname, msg) {
      if (msg.startsWith('!')) {
        const parts = msg.substring(1).toLowerCase().split(' ');
        const cmd = parts[0];
        if (cmd === 'follow' && parts[1]) b.craftmind.followPlayer(parts[1]);
        else if (cmd === 'stop') b.craftmind.stop();
        else if (cmd === 'brain') {
          const hasBrain = !!b.craftmind._brain;
          b.chat(hasBrain ? `Brain active (${b.craftmind._brain.personality.name})` : 'Brain disabled');
        }
      }
    },
    onStart(b) {
      setTimeout(() => {
        const pos = b.craftmind.position();
        const hasBrain = !!b.craftmind._brain;
        if (hasBrain) {
          b.chat(`Hey! I'm ${username}. My brain is online — just talk to me!`);
          b.chat('Use !follow <name> to follow someone, or !stop to stop.');
        } else {
          b.chat(`Hey! I spawned at ${pos.x}, ${pos.y}, ${pos.z}. Say "follow [name]" to follow you!`);
        }
      }, 2000);
    },
  });
}

module.exports = { createBot };
