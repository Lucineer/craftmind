/**
 * Built-in plugin: DeathTracker
 *
 * Records deaths and respawn behavior.
 * Persists death data via the memory system.
 */
module.exports = {
  name: 'death-tracker',
  version: '1.0.0',
  description: 'Track deaths and respawn automatically',

  init(ctx) {
    const { bot, events } = ctx;
    const memory = bot.craftmind?._memory;
    const stateMachine = bot.craftmind?._stateMachine;

    bot.on('death', () => {
      events.emit('DEATH');
      if (memory) {
        memory.recordDeath('death event');
      }
      if (stateMachine) {
        stateMachine.transition('DEAD');
      }
    });

    bot.on('respawn', () => {
      if (stateMachine) {
        stateMachine.transition('IDLE');
      }
      events.emit('SPAWN');
    });
  },
};
