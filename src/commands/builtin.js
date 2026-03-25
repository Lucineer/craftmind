/**
 * @module craftmind/commands/builtin
 * @description Built-in commands registered by default on every bot.
 */

const builtinCommands = [
  {
    name: 'follow',
    description: 'Follow a player',
    usage: '!follow <player> [distance]',
    aliases: ['trail'],
    execute(ctx, playerName, distance) {
      if (!playerName) {
        ctx.reply('Usage: !follow <player> [distance]');
        return;
      }
      const dist = parseInt(distance) || ctx.bot.craftmind._config?.pathfinding?.defaultFollowDistance || 3;
      ctx.bot.craftmind.followPlayer(playerName, dist);
    },
  },
  {
    name: 'stop',
    description: 'Cancel current action',
    usage: '!stop',
    execute(ctx) {
      ctx.bot.craftmind.stop();
    },
  },
  {
    name: 'where',
    description: 'Report current position',
    usage: '!where',
    aliases: ['pos', 'coords'],
    execute(ctx) {
      const pos = ctx.bot.craftmind.position();
      ctx.reply(`I'm at ${pos.x}, ${pos.y}, ${pos.z}`);
    },
  },
  {
    name: 'inventory',
    description: 'List inventory items',
    usage: '!inventory',
    aliases: ['inv', 'items'],
    execute(ctx) {
      const inv = ctx.bot.craftmind.inventorySummary();
      const items = Object.entries(inv).map(([k, v]) => `${k}: ${v}`).join(', ');
      ctx.reply(`I have: ${items || 'nothing'}`);
    },
  },
  {
    name: 'look',
    description: 'Look at a player',
    usage: '!look <player>',
    execute(ctx, playerName) {
      if (!playerName) {
        ctx.reply('Usage: !look <player>');
        return;
      }
      ctx.bot.craftmind.lookAt(playerName);
    },
  },
  {
    name: 'goto',
    description: 'Navigate to coordinates',
    usage: '!goto <x> <y> <z>',
    aliases: ['nav', 'go'],
    permission: 'op',
    execute(ctx, x, y, z) {
      if (!x || !y || !z) {
        ctx.reply('Usage: !goto <x> <y> <z>');
        return;
      }
      ctx.bot.craftmind.goTo(parseInt(x), parseInt(y), parseInt(z));
    },
  },
  {
    name: 'dig',
    description: 'Mine a block at coordinates',
    usage: '!dig <x> <y> <z>',
    permission: 'op',
    execute(ctx, x, y, z) {
      if (!x || !y || !z) {
        ctx.reply('Usage: !dig <x> <y> <z>');
        return;
      }
      ctx.bot.craftmind.dig(parseInt(x), parseInt(y), parseInt(z));
    },
  },
  {
    name: 'place',
    description: 'Place a block',
    usage: '!place <blockName> <x> <y> <z>',
    permission: 'op',
    execute(ctx, blockName, x, y, z) {
      if (!blockName || !x || !y || !z) {
        ctx.reply('Usage: !place <blockName> <x> <y> <z>');
        return;
      }
      ctx.bot.craftmind.place(blockName, parseInt(x), parseInt(y), parseInt(z));
    },
  },
  {
    name: 'hello',
    description: 'Say hello',
    usage: '!hello',
    aliases: ['hi', 'hey'],
    execute(ctx) {
      ctx.reply(`Hey ${ctx.sender}!`);
    },
  },
  {
    name: 'help',
    description: 'Show available commands',
    usage: '!help [command]',
    aliases: ['?'],
    execute(ctx, name) {
      const helpText = ctx.bot.craftmind._commands.help(name);
      // Send in chunks to avoid chat limit
      helpText.split('\n').forEach((line) => ctx.reply(line));
    },
  },
  {
    name: 'status',
    description: 'Show bot status',
    usage: '!status',
    execute(ctx) {
      const bot = ctx.bot;
      const pos = bot.craftmind.position();
      const state = bot.craftmind._stateMachine?.current || 'unknown';
      const deaths = bot.craftmind._memory?.data.deaths || 0;
      ctx.reply(
        `${state} | HP: ${bot.health} | Food: ${bot.food} | Pos: ${pos.x},${pos.y},${pos.z} | Deaths: ${deaths}`,
      );
    },
  },
  {
    name: 'brain',
    description: 'Show brain status',
    usage: '!brain',
    execute(ctx) {
      const brain = ctx.bot.craftmind._brain;
      if (brain) {
        ctx.reply(`Brain active (${brain.personality.name})`);
      } else {
        ctx.reply('Brain disabled');
      }
    },
  },
];

module.exports = { builtinCommands };
