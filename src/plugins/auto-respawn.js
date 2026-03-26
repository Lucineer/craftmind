/**
 * Built-in plugin: AutoRespawn
 *
 * Automatically respawns after death.
 */
module.exports = {
  name: 'auto-respawn',
  version: '1.0.0',
  description: 'Automatically respawn after death',

  init(ctx) {
    const { bot } = ctx;

    let respawning = false;

    bot.on('death', () => {
      if (respawning) return;
      respawning = true;
      console.log('[AutoRespawn] Died, respawning in 3s...');

      setTimeout(() => {
        try {
          bot.respawn();
          console.log('[AutoRespawn] Respawned');
        } catch (e) {
          console.log('[AutoRespawn] Respawn failed:', e.message);
        }
        respawning = false;
      }, 3000);
    });

    // Also handle spawn after respawn
    bot.on('spawn', () => {
      if (bot.health > 0 && bot.food > 0) {
        console.log('[AutoRespawn] Alive and well');
      }
    });
  },
};
