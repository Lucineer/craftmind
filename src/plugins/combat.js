/**
 * Built-in plugin: Combat
 *
 * Detects nearby hostile mobs and fights them (or flees from creepers/low health).
 * Simple interval-based approach — no behavior tree needed.
 */
module.exports = {
  name: 'combat',
  version: '1.0.0',
  description: 'Attack nearby hostile mobs and flee from creepers',

  init(ctx) {
    const { bot, events } = ctx;

    const HOSTILES = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'drowned', 'phantom', 'blaze'];
    const WEAPON_PRIORITY = [
      'diamond_sword', 'iron_sword', 'golden_sword', 'stone_sword', 'wooden_sword',
      'diamond_axe', 'iron_axe', 'stone_axe', 'wooden_axe',
    ];

    let attacking = false;

    function findNearestHostile() {
      if (!bot.entity || bot.health <= 0) return null;
      return bot.nearestEntity((e) =>
        e.type === 'mob' &&
        HOSTILES.some((h) => e.name?.includes(h)) &&
        e.position.distanceTo(bot.entity.position) < 16 &&
        e.health > 0 || e.health === undefined,
      );
    }

    function equipBestWeapon() {
      for (const name of WEAPON_PRIORITY) {
        const item = bot.inventory.items().find((i) => i.name === name);
        if (item) {
          const held = bot.entity?.heldItem;
          if (held?.name !== name) {
            bot.equip(item, 'hand').catch(() => {});
          }
          return;
        }
      }
    }

    function fleeFrom(pos) {
      if (!bot.entity) return;
      try { bot.pathfinder.setGoal(null); } catch {}
      bot.setControlState('forward', true);
      bot.setControlState('sprint', true);
      bot.setControlState('jump', true);
      setTimeout(() => bot.clearControlStates(), 2000);
    }

    const scanner = setInterval(() => {
      if (!bot.entity || bot.health <= 0 || attacking) return;

      const hostile = findNearestHostile();
      if (!hostile) return;

      const dist = hostile.position.distanceTo(bot.entity.position);

      if (hostile.name?.includes('creeper') && dist < 6) {
        fleeFrom(hostile.position);
        return;
      }

      if (bot.health <= 8) {
        fleeFrom(hostile.position);
        return;
      }

      // Fight
      attacking = true;
      equipBestWeapon();

      const attackLoop = setInterval(() => {
        if (!bot.entity || bot.health <= 0) {
          clearInterval(attackLoop);
          attacking = false;
          return;
        }
        // Verify target is still valid
        if (!hostile || !hostile.position || hostile.health === 0 ||
            hostile.position.distanceTo(bot.entity.position) > 16) {
          clearInterval(attackLoop);
          attacking = false;
          return;
        }
        // Verify entity is still hostile (entity objects can be recycled)
        if (hostile.type !== 'mob' || !HOSTILES.some((h) => hostile.name?.includes(h))) {
          clearInterval(attackLoop);
          attacking = false;
          return;
        }
        try { bot.pathfinder.setGoal(null); } catch {}
        bot.lookAt(hostile.position.offset(0, hostile.height || 1.62, 0));
        bot.attack(hostile);
      }, 800);
    }, 1500);

    bot.on('end', () => clearInterval(scanner));
    bot.on('death', () => { clearInterval(scanner); attacking = false; });
  },
};
