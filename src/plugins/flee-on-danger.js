/**
 * Built-in plugin: FleeOnDanger v2
 *
 * Flee from lava, drowning, and low-health situations using pathfinding.
 */
module.exports = {
  name: 'flee-on-danger',
  version: '2.0.0',
  description: 'Flee from dangerous situations using pathfinding',

  init(ctx) {
    const { bot, events } = ctx;
    const { goals, Movements } = require('mineflayer-pathfinder');
    const fleeHealth = 6;
    let fleeing = false;

    function flee(cause) {
      if (fleeing) return;
      fleeing = true;

      try {
        bot.pathfinder.setGoal(null);
        const pos = bot.entity.position;

        // Run AWAY from danger — find safe ground 10-15 blocks away
        // Pick a direction away from nearest hostile or toward nearest safe block
        let safeX = pos.x, safeZ = pos.z;

        if (cause === 'lava') {
          // Run in any horizontal direction away from current pos
          const angle = Math.random() * Math.PI * 2;
          safeX = pos.x + Math.cos(angle) * 12;
          safeZ = pos.z + Math.sin(angle) * 12;
        } else if (cause === 'drowning') {
          // Find land nearby
          const landBlock = bot.findBlock({
            matching: (block) => block.name !== 'water' && block.name !== 'lava',
            maxDistance: 16,
            count: 1,
          });
          if (landBlock) {
            safeX = landBlock.position.x;
            safeZ = landBlock.position.z;
          }
        } else {
          // Low health — run away from hostile
          const hostile = bot.nearestEntity((e) =>
            e.type === 'mob' &&
            ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'blaze'].some((m) => e.name?.includes(m)),
          );
          if (hostile) {
            const dx = pos.x - hostile.position.x;
            const dz = pos.z - hostile.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz) || 1;
            safeX = pos.x + (dx / dist) * 12;
            safeZ = pos.z + (dz / dist) * 12;
          }
        }

        const defaultMove = new Movements(bot);
        defaultMove.allowSprinting = true;
        bot.pathfinder.setMovements(defaultMove);
        bot.pathfinder.setGoal(new goals.GoalXZ(safeX, safeZ));

        // Clear goal after reaching safety or timeout
        setTimeout(() => {
          try { bot.pathfinder.setGoal(null); } catch {}
          fleeing = false;
        }, 8000);
      } catch (e) {
        // Fallback: raw sprint if pathfinder fails
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        bot.setControlState('jump', true);
        setTimeout(() => {
          bot.clearControlStates();
          fleeing = false;
        }, 2500);
      }
    }

    events.on('HEALTH', () => {
      if (!bot.entity || bot.health <= 0) return;

      const blockBelow = bot.blockAt(bot.entity.position.offset(0, -1, 0));
      const blockAt = bot.blockAt(bot.entity.position);

      if (blockBelow?.name?.includes('lava') || blockAt?.name?.includes('lava')) {
        flee('lava');
        return;
      }

      // Only flee water if actually drowning (in water + health dropping)
      if (blockAt?.name === 'water' && bot.health < bot.health) {
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
