/**
 * @module craftmind/events
 * @description Lightweight event emitter with plugin hook support.
 * Decouples bot internals so plugins and extensions can react to
 * bot lifecycle events without modifying core code.
 *
 * @example
 * const emitter = new CraftMindEvents();
 * emitter.on('chat', (username, message) => { ... });
 * emitter.emit('chat', 'SafeArtist2047', 'hello!');
 * emitter.on('stateChange', (from, to) => { ... });
 */

class CraftMindEvents {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._handlers = new Map();
  }

  /**
   * Register a handler for an event.
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unsubscribe function.
   */
  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set());
    }
    this._handlers.get(event).add(handler);
    return () => this._handlers.get(event)?.delete(handler);
  }

  /**
   * Register a one-time handler.
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unsubscribe function.
   */
  once(event, handler) {
    const unsub = this.on(event, (...args) => {
      unsub();
      handler(...args);
    });
    return unsub;
  }

  /**
   * Remove a specific handler for an event.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  /**
   * Emit an event, calling all registered handlers.
   * Handlers are called synchronously; errors are caught and logged.
   * @param {string} event
   * @param {...*} args
   */
  emit(event, ...args) {
    const handlers = this._handlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`[CraftMind] Event handler error on "${event}":`, err.message);
      }
    }
  }

  /**
   * Remove all handlers for a specific event, or all events.
   * @param {string} [event] - If omitted, clears all events.
   */
  removeAll(event) {
    if (event) {
      this._handlers.delete(event);
    } else {
      this._handlers.clear();
    }
  }
}

// Well-known event names for documentation / type safety.
CraftMindEvents.Events = Object.freeze({
  // Lifecycle
  SPAWN: 'spawn',
  DEATH: 'death',
  HEALTH: 'health',
  KICKED: 'kicked',
  ERROR: 'error',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',

  // Chat
  CHAT: 'chat',
  COMMAND: 'command',

  // State machine
  STATE_CHANGE: 'stateChange',

  // Inventory
  INVENTORY_CHANGE: 'inventoryChange',

  // World
  BLOCK_FOUND: 'blockFound',
  CHUNK_LOADED: 'chunkLoaded',
  PLAYER_SEEN: 'playerSeen',

  // Bot actions
  FOLLOW_START: 'followStart',
  FOLLOW_STOP: 'followStop',
  NAVIGATION_START: 'navigationStart',
  NAVIGATION_COMPLETE: 'navigationComplete',
  NAVIGATION_FAILED: 'navigationFailed',
  DIG_START: 'digStart',
  DIG_COMPLETE: 'digComplete',
  PLACE_BLOCK: 'placeBlock',
});

module.exports = { CraftMindEvents };
