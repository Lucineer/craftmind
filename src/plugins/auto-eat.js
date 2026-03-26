/**
 * Built-in plugin: AutoEat
 *
 * Automatically consumes food when hunger drops below threshold.
 */
module.exports = {
  name: 'auto-eat',
  version: '1.0.0',
  description: 'Automatically eat food when hunger is low',

  init(ctx) {
    const { bot, events } = ctx;
    const threshold = 18;

    function tryEat() {
      if (!bot.entity || bot.food >= threshold || bot.food <= 0) return;

      const food = bot.inventory.items().find((item) =>
        ['bread', 'cooked_beef', 'cooked_porkchop', 'cooked_salmon', 'cooked_cod', 'apple', 'carrot', 'potato', 'beetroot', 'melon_slice'].includes(item.name),
      );

      if (food) {
        bot.equip(food, 'hand').then(() => bot.consume()).catch(() => {});
      }
    }

    events.on('HEALTH', () => tryEat());

    // Also check periodically (health event may not fire for all food changes)
    setInterval(() => tryEat(), 5000);
  },
};
