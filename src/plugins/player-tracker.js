/**
 * Built-in plugin: PlayerTracker
 *
 * Remembers players the bot encounters and tracks player sightings.
 * Persists data via the memory system.
 */
module.exports = {
  name: 'player-tracker',
  version: '1.0.0',
  description: 'Track and remember players the bot encounters',

  init(ctx) {
    const { bot, events } = ctx;
    const memory = bot.craftmind?._memory;

    events.on('PLAYER_SEEN', (playerName) => {
      if (memory) {
        memory.rememberPlayer(playerName);
      }
    });

    // Listen for mineflayer player joined event
    bot.on('playerJoined', (player) => {
      events.emit('PLAYER_SEEN', player.username);
    });
  },
};
