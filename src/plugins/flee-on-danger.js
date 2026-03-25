/**
 * Built-in plugin: FleeOnDanger
 *
 * When health drops too low or bot is in lava, triggers flee behavior.
 * Configurable via config.behavior.fleeHealth and config.behavior.fleeOnLava.
 */
module.exports = {
  name: 'flee-on-danger',
  version: '1.0.0',
  description: 'Flee from dangerous situations (low health, lava)',

  init(ctx) {
    const { bot, events, config } = ctx;
    const stateMachine = bot.craftmind?._stateMachine;
    const fleeHealth = config.behavior?.fleeHealth ?? 4;
    const fleeOnLava = config.behavior?.fleeOnLava !== false;

    if (!stateMachine) return;

    events.on('HEALTH', () => {
      // Check for lava
      if (fleeOnLava) {
        const pos = bot.entity.position;
        const blockBelow = bot.blockAt(pos.offset(0, -1, 0));
        const blockAt = bot.blockAt(pos);
        if (blockBelow?.name?.includes('lava') || blockAt?.name?.includes('lava')) {
          if (stateMachine.current !== 'FLEEING') {
            stateMachine.transition('FLEEING', { cause: 'lava' });
            bot.craftmind.stop();
            // Try to jump out
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
          }
          return;
        }
      }

      // Low health flee
      if (bot.health <= fleeHealth && stateMachine.current !== 'FLEEING') {
        stateMachine.transition('FLEEING', { cause: 'low_health', health: bot.health });
        bot.craftmind.stop();
        // Run away from nearby hostile mobs
        const hostiles = bot.nearestEntity((e) =>
          e.type === 'mob' &&
          ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'blaze'].some((m) => e.name?.includes(m)),
        );
        if (hostiles) {
          const dx = bot.entity.position.x - hostiles.position.x;
          const dz = bot.entity.position.z - hostiles.position.z;
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          const fleeX = bot.entity.position.x + (dx / len) * 16;
          const fleeZ = bot.entity.position.z + (dz / len) * 16;
          bot.craftmind.goTo(Math.floor(fleeX), 64, Math.floor(fleeZ));
        }
      }
    });

    // Recover from flee when safe
    stateMachine.onStateChange((from, to) => {
      if (from === 'FLEEING' && to === 'IDLE') {
        // Safe now
      }
    });
  },
};
