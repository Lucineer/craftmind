/**
 * @module craftmind/state-machine
 * @description Finite state machine for bot behavior.
 *
 * States: IDLE, FOLLOWING, MINING, BUILDING, COMBAT, FLEEING, NAVIGATING, DEAD
 *
 * Each state has entry/exit hooks and optional tick behavior.
 * Transitions can be guarded by predicates for safety.
 *
 * @example
 * const fsm = new BotStateMachine();
 * fsm.onStateChange((from, to) => console.log(`${from} → ${to}`));
 * fsm.transition('FOLLOWING'); // IDLE → FOLLOWING
 * fsm.transition('IDLE');      // FOLLOWING → IDLE
 * fsm.transition('COMBAT');    // IDLE → COMBAT
 */

class BotStateMachine {
  constructor() {
    /** @type {Map<string, StateConfig>} */
    this._states = new Map();
    /** @type {Set<Function>} */
    this._listeners = new Set();
    /** @type {string} */
    this._current = 'IDLE';
    /** @type {number} */
    this._enteredAt = Date.now();
    /** @type {Map<string, *>} */
    this._metadata = new Map();
    /** @type {Function|null} */
    this._scriptHandler = null;

    // Register default states
    for (const name of BotStateMachine.STATES) {
      this._states.set(name, { name, onEnter: null, onExit: null, guard: null });
    }
  }

  /** All valid state names. */
  static STATES = Object.freeze([
    'IDLE',
    'FOLLOWING',
    'MINING',
    'BUILDING',
    'COMBAT',
    'FLEEING',
    'NAVIGATING',
    'DEAD',
  ]);

  /**
   * Configure a state with hooks.
   * @param {string} name
   * @param {{ onEnter?: Function, onExit?: Function, guard?: (from: string, to: string) => boolean }} config
   */
  configure(name, config = {}) {
    const state = this._states.get(name);
    if (!state) throw new Error(`Unknown state: ${name}. Valid: ${BotStateMachine.STATES.join(', ')}`);
    if (config.onEnter) state.onEnter = config.onEnter;
    if (config.onExit) state.onExit = config.onExit;
    if (config.guard) state.guard = config.guard;
  }

  /**
   * Get the current state.
   * @returns {string}
   */
  get current() {
    return this._current;
  }

  /**
   * Get time in current state (ms).
   * @returns {number}
   */
  get elapsed() {
    return Date.now() - this._enteredAt;
  }

  /**
   * Get/set state metadata (for carrying data between states).
   * @param {string} key
   * @param {*} [value] - If omitted, returns current value.
   * @returns {*}
   */
  meta(key, value) {
    if (value === undefined) return this._metadata.get(key);
    this._metadata.set(key, value);
  }

  /**
   * Attempt a state transition.
   * @param {string} to - Target state name.
   * @param {*} [context] - Optional context passed to hooks.
   * @returns {boolean} true if transition succeeded.
   */
  transition(to, context) {
    to = to.toUpperCase();
    if (!this._states.has(to)) {
      throw new Error(`Unknown state: ${to}. Valid: ${BotStateMachine.STATES.join(', ')}`);
    }

    if (to === this._current) return true;

    const targetState = this._states.get(to);
    if (targetState.guard && !targetState.guard(this._current, to)) {
      return false;
    }

    const from = this._current;
    const fromState = this._states.get(from);

    // Exit current state
    try {
      fromState.onExit?.(to, context);
    } catch (err) {
      console.error(`[FSM] onExit error (${from}):`, err.message);
    }

    // Transition
    this._current = to;
    this._enteredAt = Date.now();

    // Enter new state
    try {
      targetState.onEnter?.(from, context);
    } catch (err) {
      console.error(`[FSM] onEnter error (${to}):`, err.message);
    }

    // Notify listeners
    for (const listener of this._listeners) {
      try {
        listener(from, to, context);
      } catch (err) {
        console.error('[FSM] listener error:', err.message);
      }
    }

    return true;
  }

  /**
   * Register a callback for state changes.
   * @param {Function} fn - (from: string, to: string, context: *) => void
   * @returns {Function} Unsubscribe function.
   */
  onStateChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /**
   * Check if a transition would be valid (without actually transitioning).
   * @param {string} to
   * @returns {boolean}
   */
  canTransition(to) {
    to = to.toUpperCase();
    if (!this._states.has(to)) return false;
    if (to === this._current) return true;
    const guard = this._states.get(to).guard;
    return guard ? guard(this._current, to) : true;
  }

  /**
   * Reset to IDLE state.
   */
  reset() {
    this.transition('IDLE');
    this._metadata.clear();
  }

  /**
   * Register a behavior script that can trigger state transitions.
   * When the script executes an action matching a registered mapping,
   * the FSM transitions to the corresponding state.
   * @param {import('./behavior-script').BehaviorScript} script
   * @param {Object.<string, string>} actionToState - Maps action names to state names.
   */
  hookScript(script, actionToState) {
    this._scriptHook = { script, actionToState };
    this._scriptHandler = ({ action }) => {
      const targetState = actionToState[action];
      if (targetState) {
        this.transition(targetState, { triggeredBy: action });
      }
    };
    script.on('executed', this._scriptHandler);
  }

  /**
   * Remove any registered behavior script hook.
   */
  unhookScript() {
    if (this._scriptHook && this._scriptHandler) {
      this._scriptHook.script.off('executed', this._scriptHandler);
    }
    this._scriptHook = null;
    this._scriptHandler = null;
  }
}

module.exports = { BotStateMachine };
