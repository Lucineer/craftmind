/**
 * @module craftmind/plugins/npc-system
 * @description NPC System Plugin - Integrates NPC management into the bot.
 *
 * Provides chat commands for interacting with NPCs and handles player chat
 * routing to appropriate NPCs.
 *
 * Commands:
 * - !talk <npc> [message] - Talk to an NPC
 * - !gift <npc> <item> - Give a gift to an NPC
 * - !npcs - List all NPCs
 * - !friendship [npc] - Check friendship level with NPCs
 *
 * @example
 * // Load via CLI:
 * node src/bot.js --plugin ./src/plugins/npc-system.js
 */

const path = require('path');
const { NPCManager } = require('../npc/npc-manager');

/**
 * @typedef {import('../plugins').PluginContext} PluginContext
 */

module.exports = {
  name: 'npc-system',
  version: '1.0.0',
  description: 'NPC interaction and management system',

  /**
   * Called when the plugin is loaded.
   * @param {PluginContext} ctx
   */
  load(ctx) {
    const { bot, events, commands } = ctx;

    // Initialize NPC manager
    const npcManager = new NPCManager({
      memoryDir: path.join(process.cwd(), 'memory', 'npcs'),
      tickInterval: 5000,
    });

    // Load NPC definitions
    const npcsDir = path.join(process.cwd(), 'data', 'npcs');
    const loaded = npcManager.loadFromDirectory(npcsDir);
    console.log(`[npc-system] Loaded ${loaded} NPC definitions`);

    // Store reference on bot
    bot.craftmind._npcManager = npcManager;

    // Register commands - MUST be before any await
    commands.register({
      name: 'talk',
      description: 'Talk to an NPC',
      usage: '!talk <npc> [message]',
      execute(cmdCtx, npcName, ...messageParts) {
        if (!npcName) {
          cmdCtx.reply('Usage: !talk <npc> [message]');
          return;
        }

        const message = messageParts.join(' ') || 'Hello';
        const responses = npcManager.handlePlayerChat(
          cmdCtx.senderUuid || cmdCtx.sender,
          cmdCtx.sender,
          `${npcName}, ${message}`
        );

        if (responses.length === 0) {
          cmdCtx.reply(`No NPC named "${npcName}" nearby or online.`);
          return;
        }

        for (const resp of responses) {
          cmdCtx.reply(`[${resp.npc}] ${resp.response}`);
        }
      },
    });

    commands.register({
      name: 'gift',
      description: 'Give a gift to an NPC',
      usage: '!gift <npc> <item>',
      execute(cmdCtx, npcName, item) {
        if (!npcName || !item) {
          cmdCtx.reply('Usage: !gift <npc> <item>');
          return;
        }

        const result = npcManager.handleGift(
          npcName,
          cmdCtx.senderUuid || cmdCtx.sender,
          cmdCtx.sender,
          item
        );

        if (!result) {
          cmdCtx.reply(`NPC "${npcName}" not found.`);
          return;
        }

        cmdCtx.reply(`[${npcName}] ${result.reaction}`);
        if (result.friendshipDelta !== 0) {
          const delta = result.friendshipDelta > 0 ? `+${result.friendshipDelta}` : result.friendshipDelta;
          cmdCtx.reply(`Friendship: ${delta} (${result.preference})`);
        }
      },
    });

    commands.register({
      name: 'npcs',
      description: 'List all NPCs',
      usage: '!npcs',
      aliases: ['npc-list'],
      execute(cmdCtx) {
        const status = npcManager.getStatus();
        if (status.spawned === 0) {
          cmdCtx.reply('No NPCs spawned.');
          return;
        }

        cmdCtx.reply(`NPCs (${status.online}/${status.spawned} online):`);
        for (const npc of status.npcs) {
          const onlineStatus = npc.online ? 'online' : 'offline';
          cmdCtx.reply(`  ${npc.name} [${onlineStatus}] @ ${npc.location}`);
        }
      },
    });

    commands.register({
      name: 'friendship',
      description: 'Check friendship level with NPCs',
      usage: '!friendship [npc]',
      aliases: ['relationship', 'rep'],
      execute(cmdCtx, npcName) {
        if (npcName) {
          // Check specific NPC
          const memory = npcManager.getPlayerMemory(
            npcName,
            cmdCtx.senderUuid || cmdCtx.sender,
            cmdCtx.sender
          );

          if (!memory) {
            cmdCtx.reply(`NPC "${npcName}" not found.`);
            return;
          }

          const summary = memory.getSummary();
          cmdCtx.reply(`Friendship with ${npcName}: ${summary.relationship.level}/5 (${memory.getFriendshipName()})`);
          cmdCtx.reply(`Points: ${summary.relationship.points} | Interactions: ${summary.player.interactionCount}`);
        } else {
          // Check all NPCs
          cmdCtx.reply('Your friendships:');
          for (const npc of npcManager.getAllNpcs()) {
            const memory = npcManager.getPlayerMemory(
              npc.name,
              cmdCtx.senderUuid || cmdCtx.sender,
              cmdCtx.sender
            );
            if (memory) {
              cmdCtx.reply(`  ${npc.name}: ${memory.getFriendshipName()} (${memory.relationship.friendshipPoints} pts)`);
            }
          }
        }
      },
    });

    // Spawn NPCs when bot spawns - register BEFORE any await
    events.on('SPAWN', () => {
      console.log('[npc-system] Bot spawned, initializing NPCs...');

      // Spawn all registered NPCs
      for (const [name] of npcManager.definitions) {
        const spawned = npcManager.spawnNpc(name, bot);
        if (spawned) {
          console.log(`[npc-system] Spawned ${name}`);
        }
      }

      // Start tick loop
      npcManager.startTick();
    });

    // Handle player chat - register BEFORE any await
    events.on('chat', (username, message) => {
      // Don't respond to ourselves
      if (username === bot.username) return;

      // Check if message is directed at an NPC (contains NPC name or starts with !talk)
      const lowerMsg = message.toLowerCase();
      const isNpcCommand = lowerMsg.startsWith('!talk') || lowerMsg.startsWith('!gift');

      if (!isNpcCommand) {
        // Route to NPCs for ambient chat
        const responses = npcManager.handlePlayerChat(
          bot.players?.[username]?.uuid || username,
          username,
          message
        );

        // Send responses (with rate limiting)
        for (const resp of responses) {
          setTimeout(() => {
            bot.chat(`[${resp.npc}] ${resp.response}`);
          }, 1000 + Math.random() * 2000);
        }
      }
    });

    // Handle player join - register BEFORE any await
    events.on('playerJoined', (player) => {
      const username = typeof player === 'string' ? player : player.username;
      const uuid = typeof player === 'string' ? username : player.uuid;

      npcManager.handlePlayerJoin(uuid, username);
      console.log(`[npc-system] Player joined: ${username}`);
    });

    // Handle player achievements (e.g., catching fish)
    events.on('playerCatch', (data) => {
      if (!data.playerUuid || !data.playerName) return;

      const reactions = npcManager.handlePlayerAchievement(
        data.playerUuid,
        data.playerName,
        data.rarity === 'legendary' ? 'legendary_catch' :
        data.rarity === 'rare' ? 'rare_catch' :
        data.rarity === 'uncommon' ? 'uncommon_catch' : 'first_catch',
        data
      );

      for (const reaction of reactions) {
        setTimeout(() => {
          bot.chat(`[${reaction.npc}] ${reaction.reaction}`);
        }, 500 + Math.random() * 1500);
      }
    });

    console.log('[npc-system] Plugin loaded');
  },

  /**
   * Called when the plugin is unloaded.
   * @param {Object} ctx
   */
  destroy(ctx) {
    if (ctx.bot?.craftmind?._npcManager) {
      ctx.bot.craftmind._npcManager.destroy();
    }
    console.log('[npc-system] Plugin destroyed');
  },
};
