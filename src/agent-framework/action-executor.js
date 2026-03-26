/**
 * @module craftmind/agent-framework/action-executor
 * @description Tick-based action executor with pluggable handlers.
 * Game plugins register handlers for their action types.
 */

export class ActionExecutor {
  /**
   * @param {object} [options]
   * @param {number} [options.tickInterval=500]
   * @param {function} [options.humanizer] - Optional: (ms) => humanized delay
   */
  constructor(options = {}) {
    /** @type {Map<string, function(Object): Promise<boolean>>} */
    this.handlers = new Map();
    this.queue = [];
    this.current = null;
    this.running = false;
    this.paused = false;
    this._tickTimer = null;
    this.tickInterval = options.tickInterval || 500;
    this._humanizer = options.humanizer || null;
    this._onChat = null;
    this._onComplete = null;
    this._onError = null;
    this._onActionStart = null;
  }

  /**
   * Register a handler for an action type.
   * @param {string} type - Action type name
   * @param {function(Object): Promise<boolean>} handler - Returns true when complete
   */
  registerHandler(type, handler) {
    if (typeof handler !== 'function') throw new TypeError('Handler must be a function');
    this.handlers.set(type, handler);
  }

  /**
   * Remove a handler.
   * @param {string} type
   */
  unregisterHandler(type) {
    this.handlers.delete(type);
  }

  /**
   * Set callbacks.
   * @param {Object} callbacks
   */
  on({onChat, onComplete, onError, onActionStart}) {
    if (onChat) this._onChat = onChat;
    if (onComplete) this._onComplete = onComplete;
    if (onError) this._onError = onError;
    if (onActionStart) this._onActionStart = onActionStart;
  }

  /**
   * Enqueue actions.
   * @param {Array<{type: string, params?: Object, reasoning?: string}>} actions
   */
  enqueue(actions) {
    if (!Array.isArray(actions)) actions = [actions];
    this.queue.push(...actions);
    if (!this.running) this.start();
  }

  /**
   * Stop execution.
   */
  stop() {
    this.running = false;
    this.current = null;
    this.queue = [];
    if (this._tickTimer) {
      clearInterval(this._tickTimer);
      this._tickTimer = null;
    }
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; if (!this.running && this.queue.length > 0) this.start(); }

  start() {
    if (this.running) return;
    this.running = true;
    this._tickTimer = setInterval(() => this.tick(), this.tickInterval);
  }

  async tick() {
    if (!this.running || this.paused) return;

    try {
      if (!this.current && this.queue.length > 0) {
        this.current = this.queue.shift();
        if (this._onActionStart) this._onActionStart(this.current);
      }

      if (this.current) {
        const done = await this.executeOne(this.current);
        if (done) {
          this.current = null;
          if (this.queue.length === 0 && this._onComplete) {
            this._onComplete();
          }
        }
      }
    } catch (err) {
      if (this._onError) this._onError(err, this.current);
      const failedAction = this.current;
      this.current = null;
    }
  }

  async executeOne(action) {
    const {type, params = {}} = action;

    // Built-in actions
    if (type === 'CHAT') {
      if (params.message && this._onChat) this._onChat(params.message);
      return true;
    }
    if (type === 'WAIT') {
      const ms = (parseFloat(params.seconds) || 2) * 1000;
      const delay = this._humanizer ? this._humanizer(ms) : ms;
      await new Promise(r => setTimeout(r, Math.min(delay, 30000)));
      return true;
    }
    if (type === 'STOP') {
      this.stop();
      return true;
    }

    // Registered handler
    const handler = this.handlers.get(type);
    if (handler) {
      return await handler(params);
    }

    // Unknown — skip
    return true;
  }

  get status() {
    return {
      running: this.running,
      paused: this.paused,
      queueLength: this.queue.length,
      currentAction: this.current,
      registeredHandlers: [...this.handlers.keys()],
    };
  }

  get handlerCount() {
    return this.handlers.size;
  }

  hasHandler(type) {
    return this.handlers.has(type);
  }
}

export default ActionExecutor;
