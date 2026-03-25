/**
 * @module craftmind/behavior-script
 * @description Plugin that auto-evaluates behavior scripts each tick.
 * Integrates with the plugin system to run scripts on bot events.
 */

/**
 * @param {{ script: import('../behavior-script').BehaviorScript, events: import('../events').CraftMindEvents, getState: function(): Object }} opts
 * @returns {import('../plugins').PluginDef}
 */
function createBehaviorScriptPlugin(opts) {
  return {
    name: 'behavior-script',
    version: '1.0.0',
    description: 'Auto-evaluates behavior scripts each tick',

    init(ctx) {
      const { script, getState } = opts;

      // Execute script on each tick (state change)
      const interval = setInterval(() => {
        const state = getState();
        if (!state) return;
        const result = script.execute(state, { fireAction: true });
        if (result.action) {
          ctx.logger?.debug?.(`[BehaviorScript] Executed: ${result.ruleId} → ${result.action}`);
        }
      }, 50); // 20Hz evaluation

      // Store cleanup reference
      this._interval = interval;

      // Listen for novelty events and auto-register with attention budget if available
      ctx.events?.on('novelty', (event) => {
        if (event.severity === 'critical' || event.severity === 'important') {
          ctx.logger?.info?.(`[BehaviorScript] Novelty event: ${event.key} (${event.severity}, ${event.sigma}σ)`);
        }
      });
    },

    destroy() {
      if (this._interval) clearInterval(this._interval);
    },
  };
}

module.exports = { createBehaviorScriptPlugin };
