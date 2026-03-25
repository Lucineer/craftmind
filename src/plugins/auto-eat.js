/**
 * Built-in plugin: AutoEat
 *
 * Automatically consumes food when hunger drops below threshold.
 * Configurable via config.behavior.autoEat and config.behavior.autoEatThreshold.
 */
module.exports = {
  name: 'auto-eat',
  version: '1.0.0',
  description: 'Automatically eat food when hunger is low',

  init(ctx) {
    const { bot, events, config } = ctx;
    const enabled = config.behavior?.autoEat !== false;
    const threshold = config.behavior?.autoEatThreshold ?? 18;

    if (!enabled) return;

    events.on('HEALTH', () => {
      if (bot.food >= threshold) return;

      const food = bot.inventory.items().find(
        (item) =>
          item.name.includes('food') ||
          ['beef', 'porkchop', 'apple', 'bread', 'carrot', 'potato', 'cooked'].some((f) =>
            item.name.includes(f),
          ),
      );

      if (food) {
        bot.equip(food, 'hand').then(() => bot.consume());
        events.emit('INVENTORY_CHANGE', { reason: 'auto-eat', item: food.name });
      }
    });
  },
};
