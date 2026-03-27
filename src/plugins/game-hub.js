/**
 * @module craftmind/plugins/game-hub
 * @description Game Hub Plugin — central navigation area for all CraftMind games.
 *
 * This plugin creates a central hub where players can see all available games,
 * view cross-game statistics, and navigate between game servers. Features:
 *
 * - Automatic hub construction with RCON on spawn
 * - 8 decorated portals, one for each game
 * - !games command to list all available games
 * - !play [game] command to teleport to game servers
 * - !stats command to show cross-game statistics from identity system
 * - Automatic portal detection when players stand on them
 *
 * @example
 * // Load via CLI:
 * node src/bot.js --plugin ./src/plugins/game-hub.js
 * // Or place in src/plugins/ to load automatically
 */

const { send: rconSend } = require('../utils/rcon-helper.cjs');

/**
 * Game definitions with portal locations and descriptions.
 * Portals are arranged in a circle around the central platform.
 */
const GAMES = [
  {
    id: 'fishing',
    name: 'Fishing',
    icon: '🎣',
    description: 'Catch fish, compete, relax',
    port: 25566,
    portalPos: { x: 0, y: 64, z: -12 },
    spawnPos: { x: 0, y: 64, z: 0 },
    materials: ['water', 'sand', 'fishing_rod'],
    signText: ['Fishing Portal', 'Stand & type !play fishing', '→ Port 25566', '🎣 Catch fish!']
  },
  {
    id: 'courses',
    name: 'Courses',
    icon: '📚',
    description: 'Learn redstone, math, science',
    port: 25566,
    portalPos: { x: 9, y: 64, z: -8 },
    spawnPos: { x: 50, y: 64, z: 0 },
    materials: ['lectern', 'bookshelf', 'oak_planks'],
    signText: ['Courses Portal', 'Stand & type !play courses', '→ Education Wing', '📚 Learn!']
  },
  {
    id: 'herding',
    name: 'Herding',
    icon: '🐑',
    description: 'Guide sheep with your dog',
    port: 25567,
    portalPos: { x: 12, y: 64, z: 0 },
    spawnPos: { x: 0, y: 64, z: 0 },
    materials: ['grass_block', 'oak_fence', 'white_wool'],
    signText: ['Herding Portal', 'Stand & type !play herding', '→ Ranch Area', '🐑 Guide sheep!']
  },
  {
    id: 'studio',
    name: 'Studio',
    icon: '🎬',
    description: 'Create films with AI',
    port: 25567,
    portalPos: { x: 9, y: 64, z: 8 },
    spawnPos: { x: -50, y: 64, z: 0 },
    materials: ['redstone_block', 'armor_stand', 'item_frame'],
    signText: ['Studio Portal', 'Stand & type !play studio', '→ Creative Zone', '🎬 Create films!']
  },
  {
    id: 'ranch',
    name: 'Ranch',
    icon: '🌾',
    description: 'Evolve bot species',
    port: 25568,
    portalPos: { x: 0, y: 64, z: 12 },
    spawnPos: { x: 0, y: 64, z: 50 },
    materials: ['farmland', 'wheat', 'oak_log'],
    signText: ['Ranch Portal', 'Stand & type !play ranch', '→ Farm Valley', '🌾 Evolve species!']
  },
  {
    id: 'circuits',
    name: 'Circuits',
    icon: '⚡',
    description: 'Master redstone engineering',
    port: 25568,
    portalPos: { x: -9, y: 64, z: 8 },
    spawnPos: { x: 0, y: 64, z: -50 },
    materials: ['redstone', 'repeater', 'comparator'],
    signText: ['Circuits Portal', 'Stand & type !play circuits', '→ Tech Lab', '⚡ Engineer!']
  },
  {
    id: 'researcher',
    name: 'Researcher',
    icon: '🔬',
    description: 'Discover new techniques',
    port: 25566,
    portalPos: { x: -12, y: 64, z: 0 },
    spawnPos: { x: 50, y: 64, z: 50 },
    materials: ['brewing_stand', 'enchanting_table', 'bookshelf'],
    signText: ['Research Portal', 'Stand & type !play researcher', '→ Lab Wing', '🔬 Discover!']
  },
  {
    id: 'discgolf',
    name: 'Disc Golf',
    icon: '🥏',
    description: 'Play competitive rounds',
    port: 25567,
    portalPos: { x: -9, y: 64, z: -8 },
    spawnPos: { x: -50, y: 64, z: 50 },
    materials: ['target', 'white_carpet', 'spruce_pressure_plate'],
    signText: ['Disc Golf Portal', 'Stand & type !play discgolf', '→ Sports Field', '🥏 Compete!']
  }
];

/**
 * Hub configuration
 */
const HUB_CONFIG = {
  center: { x: 0, y: 64, z: 0 },
  platformSize: 20,
  platformMaterial: 'quartz_block',
  welcomeSign: ['CraftMind Game Hub', 'Welcome!', 'Use !games to see all games', '!play [game] to teleport']
};

module.exports = {
  name: 'game-hub',
  version: '1.0.0',
  description: 'Central navigation hub for all CraftMind games',

  /**
   * Called when the plugin is loaded (after bot spawns).
   * @param {import('../plugins').PluginContext} ctx
   */
  async init(ctx) {
    const { bot, events, commands } = ctx;

    // Store RCON port for later use
    const serverPort = bot._client.socket?.serverPort || 25566;
    const rconPort = serverPort + 10000;
    this._rconPort = rconPort;
    this._botName = bot.username;

    console.log(`[GameHub] Initializing on server port ${serverPort}, RCON port ${rconPort}`);

    // Register event handlers IMMEDIATELY before any awaits
    events.on('SPAWN', () => this._onSpawn(ctx));

    // Register commands
    this._registerCommands(commands, ctx);

    // Track players on portals for automatic teleport hints
    this._portalTracking = new Map();
    events.on('physicTick', () => this._checkPortalPositions(ctx));

    console.log('[GameHub] Initialized with ' + GAMES.length + ' game portals');
  },

  /**
   * Handle spawn event — build hub and teleport player to it
   * @private
   */
  async _onSpawn(ctx) {
    const { bot } = ctx;

    try {
      // Teleport to hub center
      await this._rconCommand(`tp ${bot.username} 0 64 0`);
      console.log('[GameHub] Teleported to hub center');

      // Build the hub structure
      await this._buildHub(ctx);
    } catch (err) {
      console.error(`[GameHub] Spawn setup failed: ${err.message}`);
    }
  },

  /**
   * Register hub commands
   * @private
   */
  _registerCommands(commands, ctx) {
    // !games — List all available games
    commands.register({
      name: 'games',
      description: 'List all available games with descriptions',
      usage: '!games',
      permission: 'anyone',
      execute: (cmdCtx) => this._cmdGames(cmdCtx, ctx)
    });

    // !play [game] — Teleport to a game server
    commands.register({
      name: 'play',
      description: 'Teleport to a game server or area',
      usage: '!play <game>',
      permission: 'anyone',
      execute: (cmdCtx, gameName) => this._cmdPlay(cmdCtx, ctx, gameName)
    });

    // !stats — Show cross-game statistics
    commands.register({
      name: 'stats',
      description: 'Show cross-game statistics from identity system',
      usage: '!stats [player]',
      permission: 'anyone',
      execute: (cmdCtx, targetPlayer) => this._cmdStats(cmdCtx, ctx, targetPlayer)
    });

    // !hub — Return to hub center
    commands.register({
      name: 'hub',
      description: 'Return to the hub center',
      usage: '!hub',
      permission: 'anyone',
      execute: (cmdCtx) => this._cmdHub(cmdCtx, ctx)
    });
  },

  /**
   * Build the hub structure using RCON commands
   * @private
   */
  async _buildHub(ctx) {
    const { bot } = ctx;

    try {
      console.log('[GameHub] Building hub structure...');

      // Clear area around hub
      await this._rconCommand(`fill -10 63 -10 10 65 10 air replace`);
      await this._rconCommand(`fill -15 62 -15 15 62 15 stone replace`);

      // Build central platform (20x20)
      const halfSize = HUB_CONFIG.platformSize / 2;
      await this._rconCommand(
        `fill ${-halfSize} 64 ${-halfSize} ${halfSize} 64 ${halfSize} ${HUB_CONFIG.platformMaterial}`
      );
      await this._rconCommand(
        `fill ${-halfSize} 63 ${-halfSize} ${halfSize} 63 ${halfSize} stone`
      );

      // Add lighting
      await this._rconCommand(`setblock 0 65 0 lantern[hanging=true]`);
      await this._rconCommand(`setblock -8 65 -8 lantern`);
      await this._rconCommand(`setblock 8 65 -8 lantern`);
      await this._rconCommand(`setblock -8 65 8 lantern`);
      await this._rconCommand(`setblock 8 65 8 lantern`);

      // Build welcome sign at center
      await this._buildSign(0, 65, 2, 'north', HUB_CONFIG.welcomeSign);

      // Build each game portal
      for (const game of GAMES) {
        await this._buildPortal(game);
      }

      // Add decorative border
      await this._rconCommand(
        `fill ${-halfSize} 64 ${-halfSize} ${-halfSize} 64 ${halfSize} quartz_slab[type=bottom]`
      );
      await this._rconCommand(
        `fill ${halfSize} 64 ${-halfSize} ${halfSize} 64 ${halfSize} quartz_slab[type=bottom]`
      );
      await this._rconCommand(
        `fill ${-halfSize} 64 ${-halfSize} ${halfSize} 64 ${-halfSize} quartz_slab[type=bottom]`
      );
      await this._rconCommand(
        `fill ${-halfSize} 64 ${halfSize} ${halfSize} 64 ${halfSize} quartz_slab[type=bottom]`
      );

      console.log('[GameHub] Hub structure built successfully');
    } catch (err) {
      console.error(`[GameHub] Failed to build hub: ${err.message}`);
    }
  },

  /**
   * Build a single game portal
   * @private
   */
  async _buildPortal(game) {
    const { portalPos, materials, signText, icon } = game;
    const px = portalPos.x;
    const py = portalPos.y;
    const pz = portalPos.z;

    try {
      // Create portal platform (5x5)
      await this._rconCommand(`fill ${px - 2} ${py} ${pz - 2} ${px + 2} ${py} ${pz + 2} white_carpet`);

      // Add portal frame
      await this._rconCommand(`setblock ${px - 2} ${py + 1} ${pz - 2} oak_fence`);
      await this._rconCommand(`setblock ${px + 2} ${py + 1} ${pz - 2} oak_fence`);
      await this._rconCommand(`setblock ${px - 2} ${py + 1} ${pz + 2} oak_fence`);
      await this._rconCommand(`setblock ${px + 2} ${py + 1} ${pz + 2} oak_fence`);

      // Add game-specific materials
      if (materials.includes('water')) {
        await this._rconCommand(`setblock ${px} ${py} ${pz} water[level=0]`);
      }
      if (materials.includes('sand')) {
        await this._rconCommand(`fill ${px - 1} ${py} ${pz - 1} ${px + 1} ${py} ${pz + 1} sand`);
      }
      if (materials.includes('lectern')) {
        await this._rconCommand(`setblock ${px} ${py + 1} ${pz} lectern`);
      }
      if (materials.includes('farmland')) {
        await this._rconCommand(`fill ${px - 1} ${py} ${pz - 1} ${px + 1} ${py} ${pz + 1} farmland`);
      }
      if (materials.includes('redstone')) {
        await this._rconCommand(`setblock ${px} ${py} ${pz} redstone_wire`);
      }

      // Build sign facing toward center
      const dx = HUB_CONFIG.center.x - px;
      const dz = HUB_CONFIG.center.z - pz;
      let facing = 'north';
      if (Math.abs(dx) > Math.abs(dz)) {
        facing = dx > 0 ? 'east' : 'west';
      } else {
        facing = dz > 0 ? 'south' : 'north';
      }

      // Place sign near portal
      const signX = px + (facing === 'east' ? 3 : facing === 'west' ? -3 : 0);
      const signZ = pz + (facing === 'south' ? 3 : facing === 'north' ? -3 : 0);
      await this._buildSign(signX, py + 1, signZ, facing, signText);

      // Add glowstone highlight
      await this._rconCommand(`setblock ${px} ${py + 2} ${pz} glowstone`);

      console.log(`[GameHub] Built ${game.name} portal`);
    } catch (err) {
      console.error(`[GameHub] Failed to build ${game.name} portal: ${err.message}`);
    }
  },

  /**
   * Build a sign with text
   * @private
   */
  async _buildSign(x, y, z, facing, text) {
    const signType = 'oak_sign';
    const escapedText = text.map(t => t.replace(/'/g, "\\'"));

    try {
      // Place sign
      await this._rconCommand(`setblock ${x} ${y} ${z} ${signType}[facing=${facing}]`);

      // Set sign text using data tag
      const textJson = JSON.stringify({
        Text1: `{"text":"${escapedText[0]}","bold":true}`,
        Text2: `{"text":"${escapedText[1]}","italic":true}`,
        Text3: `{"text":"${escapedText[2]}","color":"blue"}`,
        Text4: `{"text":"${escapedText[3]}"}`
      });
      await this._rconCommand(`data merge block ${x} ${y} ${z} ${textJson}`);
    } catch (err) {
      console.error(`[GameHub] Sign build failed: ${err.message}`);
    }
  },

  /**
   * Check if players are standing on portals and show hints
   * @private
   */
  _checkPortalPositions(ctx) {
    const { bot } = ctx;

    for (const playerName in bot.players) {
      const player = bot.players[playerName];
      if (!player || !player.entity) continue;

      const pos = player.entity.position;
      const bx = Math.floor(pos.x);
      const by = Math.floor(pos.y);
      const bz = Math.floor(pos.z);

      // Check if player is on a portal
      for (const game of GAMES) {
        const pp = game.portalPos;
        if (bx >= pp.x - 2 && bx <= pp.x + 2 &&
            bz >= pp.z - 2 && bz <= pp.z + 2 &&
            by === pp.y) {

          // Player is on this portal
          const lastHint = this._portalTracking.get(playerName);
          const now = Date.now();

          // Only show hint every 30 seconds
          if (!lastHint || now - lastHint > 30000) {
            bot.chat(`${playerName}: Type ${game.icon} !play ${game.id} ${game.icon} to enter ${game.name}!`);
            this._portalTracking.set(playerName, now);
          }
        }
      }
    }
  },

  /**
   * Command: !games — List all games
   * @private
   */
  _cmdGames(cmdCtx, ctx) {
    const { reply } = cmdCtx;
    const { bot } = ctx;

    let output = `\n§b=== CraftMind Game Hub ===\n`;
    output += `§eAvailable Games:\n`;

    for (const game of GAMES) {
      output += `\n§6${game.icon} ${game.name} §7(!play ${game.id})`;
      output += `\n   §f${game.description}`;
      output += `\n   §8Port: ${game.port}`;
    }

    output += `\n\n§7Use !play <game> to teleport\n`;
    output += `§7Use !stats to see your progress\n`;

    reply(output);
  },

  /**
   * Command: !play [game] — Teleport to game
   * @private
   */
  async _cmdPlay(cmdCtx, ctx, gameName) {
    const { reply, sender } = cmdCtx;

    if (!gameName) {
      reply('§cUsage: !play <game>\n§7Use !games to see available games');
      return;
    }

    const game = GAMES.find(g =>
      g.id === gameName.toLowerCase() ||
      g.name.toLowerCase() === gameName.toLowerCase()
    );

    if (!game) {
      reply(`§cUnknown game: ${gameName}\n§7Use !games to see available games`);
      return;
    }

    try {
      const pos = game.spawnPos;
      await this._rconCommand(`tp ${sender} ${pos.x} ${pos.y} ${pos.z}`);
      reply(`§aTeleporting to §6${game.icon} ${game.name}§a...`);
      console.log(`[GameHub] ${sender} teleported to ${game.name}`);
    } catch (err) {
      reply(`§cFailed to teleport: ${err.message}`);
    }
  },

  /**
   * Command: !stats — Show cross-game statistics
   * @private
   */
  _cmdStats(cmdCtx, ctx, targetPlayer) {
    const { reply, sender } = cmdCtx;
    const { bot } = ctx;

    // Get identity from bot's memory system if available
    const playerName = targetPlayer || sender;
    let output = `\n§b=== Stats for ${playerName} ===\n`;

    // Try to get identity from bot's memory
    const memory = bot.craftmind?.memory;
    if (memory && memory.identity) {
      const identity = memory.identity;

      // Show traits
      const traits = identity.getTraits();
      output += `§ePersonality Traits:\n`;
      for (const [trait, value] of Object.entries(traits)) {
        const bar = '█'.repeat(Math.round(value * 10));
        output += `  §f${trait}: §7[${bar}§7] §${value > 0.7 ? 'a' : value > 0.4 ? 'e' : 'c'}${Math.round(value * 100)}%\n`;
      }

      // Show game stats
      const stats = identity.getAllStats();
      if (Object.keys(stats).length > 0) {
        output += `\n§eGame Statistics:\n`;
        for (const [game, gameStats] of Object.entries(stats)) {
          output += `  §f${game}: §a${gameStats.success}§7/§c${gameStats.failures}§7 (${gameStats.actions} total)\n`;
        }
      }

      // Show achievements
      const achievements = identity.getAchievements();
      if (achievements.length > 0) {
        output += `\n§eAchievements: §a${achievements.length} unlocked\n`;
        output += `  §7${achievements.slice(-5).join(', ')}\n`;
      }

      // Show relationships
      const relationships = identity.getRelationships();
      if (Object.keys(relationships).length > 0) {
        output += `\n§eRelationships:\n`;
        for (const [player, rel] of Object.entries(relationships).slice(0, 5)) {
          const scoreColor = rel.score > 50 ? 'a' : rel.score > 0 ? 'e' : 'c';
          output += `  §f${player}: §${scoreColor}${rel.score}§7 (${rel.interactions} interactions)\n`;
        }
      }
    } else {
      output += `§7No statistics available yet.\n`;
      output += `§7Play games to build your identity!\n`;
    }

    output += `\n§7Use !games to explore more activities\n`;
    reply(output);
  },

  /**
   * Command: !hub — Return to hub center
   * @private
   */
  async _cmdHub(cmdCtx, ctx) {
    const { reply, sender } = cmdCtx;

    try {
      await this._rconCommand(`tp ${sender} 0 65 0`);
      reply(`§aReturning to hub center...`);
      console.log(`[GameHub] ${sender} returned to hub`);
    } catch (err) {
      reply(`§cFailed to return to hub: ${err.message}`);
    }
  },

  /**
   * Execute an RCON command
   * @private
   */
  async _rconCommand(command) {
    try {
      const result = await rconSend(this._rconPort, command);
      return result;
    } catch (err) {
      console.error(`[GameHub] RCON command failed: ${command} — ${err.message}`);
      throw err;
    }
  },

  /**
   * Called when the plugin is unloaded (bot disconnects).
   */
  destroy() {
    this._portalTracking.clear();
    console.log('[GameHub] Cleaned up');
  }
};
