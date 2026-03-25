/**
 * @module craftmind/plugins
 * @description Plugin system for extending bot behavior.
 *
 * Plugins can hook into bot events, add commands, modify behavior,
 * and access the bot's full API through a clean interface.
 *
 * @example
 * // plugins/greeter.js
 * module.exports = {
 *   name: 'greeter',
 *   version: '1.0.0',
 *   init(ctx) {
 *     ctx.on('PLAYER_SEEN', (playerName) => {
 *       ctx.bot.chat(`Hey ${playerName}!`);
 *     });
 *     ctx.commands.register({
 *       name: 'wave',
 *       description: 'Wave at a player',
 *       usage: '!wave <player>',
 *       execute(cmdCtx, player) {
 *         cmdCtx.reply(`*waves at ${player || 'everyone'}*`);
 *       },
 *     });
 *   },
 *   destroy(ctx) {
 *     // Cleanup
 *   },
 * };
 */

/**
 * @typedef {Object} PluginDef
 * @property {string} name - Unique plugin identifier.
 * @property {string} [version='0.0.0'] - Semantic version.
 * @property {string} [description] - What the plugin does.
 * @property {function(PluginContext): void} init - Called when the plugin is loaded.
 * @property {function(PluginContext): void} [destroy] - Called when the plugin is unloaded.
 */

/**
 * Manages plugin lifecycle: loading, init, destroy, dependency checking.
 */
class PluginManager {
  constructor() {
    /** @type {Map<string, {def: PluginDef, context: PluginContext}>} */
    this._plugins = new Map();
    /** @type {Set<string>} */
    this._loaded = new Set();
  }

  /**
   * Load and initialize a plugin.
   * @param {PluginDef} plugin
   * @param {import('./events').CraftMindEvents} events
   * @param {import('./commands/index').CommandRegistry} commands
   * @param {import('mineflayer').Bot} bot
   * @returns {boolean} true if plugin was successfully loaded.
   */
  load(plugin, events, commands, bot) {
    if (this._loaded.has(plugin.name)) {
      console.warn(`[Plugins] "${plugin.name}" is already loaded`);
      return false;
    }

    const context = {
      bot,
      events,
      commands,
      config: bot.craftmind?._config || {},
      logger: bot.craftmind?._logger || console,
    };

    try {
      plugin.init(context);
      this._plugins.set(plugin.name, { def: plugin, context });
      this._loaded.add(plugin.name);
      console.log(`[Plugins] Loaded "${plugin.name}"`);
      return true;
    } catch (err) {
      console.error(`[Plugins] Failed to load "${plugin.name}":`, err.message);
      return false;
    }
  }

  /**
   * Unload a plugin (calls destroy if defined).
   * @param {string} name
   */
  unload(name) {
    const entry = this._plugins.get(name);
    if (!entry) return;

    try {
      entry.def.destroy?.(entry.context);
    } catch (err) {
      console.error(`[Plugins] Error destroying "${name}":`, err.message);
    }

    this._plugins.delete(name);
    this._loaded.delete(name);
    console.log(`[Plugins] Unloaded "${name}"`);
  }

  /**
   * Get all loaded plugin names.
   * @returns {string[]}
   */
  get loaded() {
    return [...this._loaded];
  }

  /**
   * Unload all plugins.
   */
  unloadAll() {
    for (const name of this._loaded) {
      this.unload(name);
    }
  }
}

module.exports = { PluginManager };
