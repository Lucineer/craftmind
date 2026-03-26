/**
 * Built-in plugin: FleeOnDanger
 *
 * Flee from lava, drowning, and low-health situations.
 */
module.exports = {
  name: 'flee-on-danger',
  version: '1.0.0',
  description: 'Flee from dangerous situations (low health, lava, drowning)',

  init(ctx) {
    const { bot, events } = ctx;
    const fleeHealth = 6;
    let fleeing = false;

    function flee(cause) {
      if (fleeing) return;
      fleeing = true;
      try { bot.pathfinder.setGoal(null); } catch {}
      bot.setControlState('forward', true);
      bot.setControlState('sprint', true);
      bot.setControlState('jump', true);
      setTimeout(() => {
        bot.clearControlStates();
        fleeing = false;
      }, 2500);
    }

    events.on('HEALTH', () => {
      if (!bot.entity || bot.health <= 0) return;

      const blockBelow = bot.blockAt(bot.entity.position.offset(0, -1, 0));
      const blockAt = bot.blockAt(bot.entity.position);

      if (blockBelow?.name?.includes('lava') || blockAt?.name?.includes('lava')) {
        flee('lava');
        return;
      }

      if (blockAt?.name === 'water') {
        flee('drowning');
        return;
      }

      if (bot.health <= fleeHealth) {
        const hostile = bot.nearestEntity((e) =>
          e.type === 'mob' &&
          ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'blaze'].some((m) => e.name?.includes(m)),
        );
        if (hostile) flee('low_health');
      }
    });
  },
};
