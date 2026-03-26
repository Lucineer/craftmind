/**
 * Built-in plugin: AutoEquip
 *
 * Automatically equips best available armor on spawn.
 */
module.exports = {
  name: 'auto-equip',
  version: '1.0.0',
  description: 'Automatically equip best armor from inventory',

  init(ctx) {
    const { bot, events } = ctx;

    const ARMOR_PRIORITY = {
      head: ['diamond_helmet', 'iron_helmet', 'chainmail_helmet', 'golden_helmet', 'leather_helmet'],
      torso: ['diamond_chestplate', 'iron_chestplate', 'chainmail_chestplate', 'golden_chestplate', 'leather_chestplate'],
      legs: ['diamond_leggings', 'iron_leggings', 'chainmail_leggings', 'golden_leggings', 'leather_leggings'],
      feet: ['diamond_boots', 'iron_boots', 'chainmail_boots', 'golden_boots', 'leather_boots'],
    };
    const ARMOR_SLOTS = ['head', 'torso', 'legs', 'feet'];
    const SLOT_INDICES = { head: 5, torso: 6, legs: 7, feet: 8 };

    function equipBestArmor() {
      if (!bot.entity) return;
      for (const slot of ARMOR_SLOTS) {
        const current = bot.inventory.slots[SLOT_INDICES[slot]];
        for (const armor of ARMOR_PRIORITY[slot]) {
          if (current?.name === armor) break;
          const item = bot.inventory.items().find((i) => i.name === armor);
          if (item) {
            bot.equip(item, slot).catch(() => {});
            break;
          }
        }
      }
    }

    events.on('SPAWN', () => {
      // Equip armor after a short delay (inventory may not be synced yet)
      setTimeout(() => equipBestArmor(), 1000);
      setTimeout(() => equipBestArmor(), 3000);
    });

    // Also re-check periodically
    setInterval(() => equipBestArmor(), 30000);
  },
};
