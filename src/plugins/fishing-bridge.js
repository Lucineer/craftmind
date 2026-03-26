/**
 * CJS bridge for the ESM fishing plugin.
 * 
 * Core bot.js uses require() (CJS) but the fishing plugin is pure ESM.
 * This bridge loads the ESM plugin dynamically and re-exports it.
 * 
 * Usage:
 *   node src/bot.js localhost 25565 Cody --plugin ../craftmind-fishing/src/mineflayer/fishing-plugin.cjs
 */

module.exports = {
  name: 'craftmind-fishing-bridge',
  version: '3.0.0',
  description: 'CJS→ESM bridge for the fishing plugin',
  async load(ctx) {
    const mod = await import('../../../craftmind-fishing/src/mineflayer/fishing-plugin.js');
    const plugin = mod.default || mod;
    if (plugin.load) {
      await plugin.load(ctx);
    } else if (plugin.init) {
      await plugin.init(ctx);
    }
    this._plugin = plugin;
  },
  async unload() {
    if (this._plugin?.unload) await this._plugin.unload();
    if (this._plugin?.destroy) await this._plugin.destroy();
  },
};
