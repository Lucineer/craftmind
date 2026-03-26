/**
 * Built-in plugin: Wanderer
 *
 * Makes the bot wander around when idle using setControlState.
 */
module.exports = {
  name: 'wanderer',
  version: '1.0.1',
  description: 'Wander around when idle to avoid standing still',

  init(ctx) {
    const { bot, events } = ctx;
    let moving = false;

    function wander() {
      if (!bot.entity || bot.health <= 0 || moving) {
        setTimeout(wander, 3000);
        return;
      }

      const hostile = bot.nearestEntity((e) =>
        e.type === 'mob' &&
        ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'drowned'].some(
          (h) => e.name?.includes(h),
        ) &&
        e.position.distanceTo(bot.entity.position) < 16,
      );
      if (hostile) {
        setTimeout(wander, 3000);
        return;
      }

      const blockAt = bot.blockAt(bot.entity.position);
      if (blockAt?.name === 'water') {
        bot.setControlState('jump', true);
        bot.setControlState('forward', true);
        setTimeout(() => bot.clearControlStates(), 1500);
        setTimeout(wander, 2000);
        return;
      }

      const action = Math.random();

      if (action < 0.6) {
        moving = true;
        bot.setControlState('forward', true);
        if (Math.random() < 0.15) bot.setControlState('sprint', true);

        if (Math.random() < 0.5) {
          const angle = Math.random() * Math.PI * 2;
          const target = bot.entity.position.offset(Math.cos(angle) * 5, 0, Math.sin(angle) * 5);
          bot.lookAt(target).catch(() => {});
        }

        const walkTime = 2000 + Math.random() * 3000;
        setTimeout(() => {
          bot.clearControlStates();
          moving = false;
          setTimeout(wander, 5000 + Math.random() * 7000);
        }, walkTime);
      } else if (action < 0.85) {
        const angle = Math.random() * Math.PI * 2;
        bot.lookAt(bot.entity.position.offset(Math.cos(angle) * 10, 0, Math.sin(angle) * 10)).catch(() => {});
        setTimeout(wander, 3000 + Math.random() * 3000);
      } else {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
        setTimeout(wander, 3000);
      }
    }

    events.on('SPAWN', () => {
      setTimeout(wander, 5000);
    });
  },
};
