/**
 * @module craftmind/behavior-script
 * @description Universal Behavior Script Engine for CraftMind bots.
 *
 * Every bot can have a behavior script — an array of prioritized rules.
 * The executor evaluates conditions against current state (pure string matching,
 * no LLM calls) and fires the highest-priority matching action each tick.
 *
 * Conditions support: comparison (>, <, ==, !=, >=, <=), boolean (AND, OR, NOT),
 * state lookups, time checks (@time HH:MM), proximity (@near key tolerance).
 *
 * @example
 * const script = new BehaviorScript([
 *   { id: 'rest', condition: 'energy < 0.2', action: 'rest', priority: 30 },
 *   { id: 'cast', condition: 'near_water AND has_rod AND !line_in', action: 'cast_line', priority: 10 },
 * ]);
 * script.execute({ near_water: true, has_rod: true, line_in: false, energy: 0.8 });
 * // → { action: 'cast_line', ruleId: 'cast' }
 */

const { EventEmitter } = require('events');

// ── Condition Parser ──────────────────────────────────────────────────────────

/**
 * Tokenize a condition string into atoms.
 * Supports: AND, OR, NOT, parentheses, comparisons, state keys, numeric literals.
 * @private
 */
function tokenize(cond) {
  const tokens = [];
  let i = 0;
  while (i < cond.length) {
    if (/\s/.test(cond[i])) { i++; continue; }
    // Parentheses
    if (cond[i] === '(' || cond[i] === ')') { tokens.push({ type: 'paren', value: cond[i] }); i++; continue; }
    // Operators
    if (['>=', '<=', '!=', '==', '>', '<'].some(op => cond.startsWith(op, i))) {
      for (const op of ['>=', '<=', '!=', '==', '>', '<']) {
        if (cond.startsWith(op, i)) { tokens.push({ type: 'op', value: op }); i += op.length; break; }
      }
      continue;
    }
    // NOT keyword
    if (cond.startsWith('NOT', i) && (i + 3 >= cond.length || /[\s(]/.test(cond[i + 3]))) {
      tokens.push({ type: 'bool', value: 'NOT' }); i += 3; continue;
    }
    // AND keyword
    if (cond.startsWith('AND', i) && (i + 3 >= cond.length || /[\s(]/.test(cond[i + 3]))) {
      tokens.push({ type: 'bool', value: 'AND' }); i += 3; continue;
    }
    // OR keyword
    if (cond.startsWith('OR', i) && (i + 2 >= cond.length || /[\s(]/.test(cond[i + 2]))) {
      tokens.push({ type: 'bool', value: 'OR' }); i += 2; continue;
    }
    // Number (must check before identifier since identifiers can start with digits in some cases)
    {
      const m = cond.substring(i).match(/^[-]?\d+(\.\d+)?/);
      if (m) {
        tokens.push({ type: 'number', value: parseFloat(m[0]) }); i += m[0].length; continue;
      }
    }
    // String literal (single-quoted)
    if (cond[i] === "'") {
      const end = cond.indexOf("'", i + 1);
      tokens.push({ type: 'string', value: cond.substring(i + 1, end >= 0 ? end : cond.length) });
      i = end >= 0 ? end + 1 : cond.length;
      continue;
    }
    // Time check: @time HH:MM or @time HH:MM-HH:MM
    if (cond.startsWith('@time', i)) {
      const m = cond.substring(i).match(/^@time\s+(\d{1,2}:\d{2})(?:-(\d{1,2}:\d{2}))?/);
      if (m) {
        tokens.push({ type: 'time', start: m[1], end: m[2] || null });
        i += m[0].length; continue;
      }
    }
    // Proximity check: @near key tolerance
    if (cond.startsWith('@near', i)) {
      const m = cond.substring(i).match(/^@near\s+(\w+)\s+(\d+)/);
      if (m) {
        tokens.push({ type: 'near', key: m[1], tolerance: parseInt(m[2], 10) });
        i += m[0].length; continue;
      }
    }
    // Duration check: @within key ms
    if (cond.startsWith('@within', i)) {
      const m = cond.substring(i).match(/^@within\s+(\w+)\s+(\d+)/);
      if (m) {
        tokens.push({ type: 'within', key: m[1], ms: parseInt(m[2], 10) });
        i += m[0].length; continue;
      }
    }
    // Negation prefix: !identifier
    if (cond[i] === '!' && cond[i + 1]?.match(/[a-zA-Z_]/)) {
      i++; // skip !
      const m = cond.substring(i).match(/^[a-zA-Z_]\w*/);
      if (m) {
        tokens.push({ type: 'negated', value: m[0] }); i += m[0].length; continue;
      }
      i--; // put back
    }
    // Identifier
    const m = cond.substring(i).match(/^[a-zA-Z_]\w*/);
    if (m) {
      tokens.push({ type: 'ident', value: m[0] }); i += m[0].length; continue;
    }
    i++; // skip unknown
  }
  return tokens;
}

/**
 * Recursive descent parser for condition expressions.
 * Grammar:
 *   expr    → or_expr
 *   or_expr → and_expr (OR and_expr)*
 *   and_expr → not_expr (AND not_expr)*
 *   not_expr → NOT not_expr | primary
 *   primary → '(' expr ')' | comparison | time | near | within | bool_check
 *   comparison → ident op (ident | number | string)
 *   bool_check → ident
 * @private
 */
class ConditionParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() { return this.tokens[this.pos] || null; }
  consume() { return this.tokens[this.pos++]; }

  parse() {
    if (this.tokens.length === 0) return { type: 'literal', value: true };
    const result = this.orExpr();
    return result;
  }

  orExpr() {
    let left = this.andExpr();
    while (this.peek()?.value === 'OR') {
      this.consume();
      const right = this.andExpr();
      left = { type: 'or', left, right };
    }
    return left;
  }

  andExpr() {
    let left = this.notExpr();
    while (this.peek()?.value === 'AND') {
      this.consume();
      const right = this.notExpr();
      left = { type: 'and', left, right };
    }
    return left;
  }

  notExpr() {
    if (this.peek()?.value === 'NOT') {
      this.consume();
      return { type: 'not', operand: this.notExpr() };
    }
    return this.primary();
  }

  primary() {
    const tok = this.peek();
    if (!tok) return { type: 'literal', value: true };

    // Parenthesized expression
    if (tok.type === 'paren' && tok.value === '(') {
      this.consume();
      const expr = this.orExpr();
      if (this.peek()?.value === ')') this.consume();
      return expr;
    }

    // Time check
    if (tok.type === 'time') {
      this.consume();
      return { type: 'time', start: tok.start, end: tok.end };
    }

    // Proximity check
    if (tok.type === 'near') {
      this.consume();
      return { type: 'near', key: tok.key, tolerance: tok.tolerance };
    }

    // Duration check
    if (tok.type === 'within') {
      this.consume();
      return { type: 'within', key: tok.key, ms: tok.ms };
    }

    // Negated identifier (!has_rod)
    if (tok.type === 'negated') {
      this.consume();
      return { type: 'not', operand: { type: 'state', key: tok.value } };
    }

    // Negated identifier with != operator
    if (tok.type === 'ident' && this.tokens[this.pos + 1]?.type === 'op' && this.tokens[this.pos + 1]?.value === '!=') {
      const ident = this.consume();
      this.consume(); // !=
      const right = this.consume();
      return {
        type: 'compare',
        left: { type: 'state', key: ident.value },
        op: '!=',
        right: right.type === 'number' ? { type: 'literal', value: right.value }
          : right.type === 'string' ? { type: 'literal', value: right.value }
          : { type: 'state', key: right.value },
      };
    }

    // Comparison: ident op value
    if (tok.type === 'ident' && this.tokens[this.pos + 1]?.type === 'op') {
      const ident = this.consume();
      const opTok = this.consume();
      const right = this.consume();
      return {
        type: 'compare',
        left: { type: 'state', key: ident.value },
        op: opTok.value,
        right: right.type === 'number' ? { type: 'literal', value: right.value }
          : right.type === 'string' ? { type: 'literal', value: right.value }
          : { type: 'state', key: right.value },
      };
    }

    // Bare boolean check
    if (tok.type === 'ident') {
      this.consume();
      return { type: 'state', key: tok.value };
    }

    this.consume();
    return { type: 'literal', value: true };
  }
}

/**
 * Evaluate a parsed condition AST against a state object.
 * @private
 * @param {*} node - AST node
 * @param {Object} state - Current state
 * @returns {boolean}
 */
function evaluate(node, state) {
  switch (node.type) {
    case 'literal': return !!node.value;
    case 'state': return !!state[node.key];
    case 'not': return !evaluate(node.operand, state);
    case 'and': return evaluate(node.left, state) && evaluate(node.right, state);
    case 'or': return evaluate(node.left, state) || evaluate(node.right, state);
    case 'compare': {
      const left = node.left.type === 'state' ? state[node.left.key] : node.left.value;
      const right = node.right.type === 'state' ? state[node.right.key] : node.right.value;
      switch (node.op) {
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '==': return left == right;
        case '!=': return left != right;
        default: return false;
      }
    }
    case 'time': {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const current = h + ':' + m;
      if (node.end) return current >= node.start && current <= node.end;
      return current === node.start;
    }
    case 'near': {
      const val = state[node.key];
      if (typeof val !== 'number') return false;
      return Math.abs(val) <= node.tolerance;
    }
    case 'within': {
      const ts = state[node.key];
      if (!(ts instanceof Date || typeof ts === 'number')) return false;
      const then = typeof ts === 'number' ? ts : ts.getTime();
      return (Date.now() - then) <= node.ms;
    }
    default: return false;
  }
}

// ── Compiled Condition Cache ──────────────────────────────────────────────────

const _parseCache = new Map();

function parseCondition(condition) {
  if (_parseCache.has(condition)) return _parseCache.get(condition);
  const tokens = tokenize(condition);
  const ast = new ConditionParser(tokens).parse();
  // Only cache if not too many to avoid memory leak
  if (_parseCache.size > 500) _parseCache.clear();
  _parseCache.set(condition, ast);
  return ast;
}

function clearParseCache() {
  _parseCache.clear();
}

// ── Rule Schema ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BehaviorRule
 * @property {string} id - Unique rule identifier.
 * @property {string} condition - Condition expression string.
 * @property {string} action - Action to execute when condition matches.
 * @property {number} priority - Higher priority = evaluated first (0 = lowest).
 * @property {Object} [meta] - Optional metadata.
 */

const RULE_REQUIRED = ['id', 'condition', 'action', 'priority'];

/**
 * Validate a single rule object.
 * @param {BehaviorRule} rule
 * @param {Set<string>} [validActions]
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateRule(rule, validActions) {
  const errors = [];
  for (const field of RULE_REQUIRED) {
    if (rule[field] === undefined || rule[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  if (rule.id && typeof rule.id !== 'string') errors.push('id must be a string');
  if (rule.condition !== undefined && typeof rule.condition !== 'string') errors.push('condition must be a string');
  if (rule.condition === '') errors.push('condition cannot be empty');
  if (rule.action && typeof rule.action !== 'string') errors.push('action must be a string');
  if (rule.priority !== undefined && typeof rule.priority !== 'number') errors.push('priority must be a number');
  if (validActions && rule.action && !validActions.has(rule.action)) {
    errors.push(`Unknown action: ${rule.action}`);
  }
  // Try parsing condition
  if (rule.condition) {
    try {
      parseCondition(rule.condition);
    } catch (e) {
      errors.push(`Invalid condition syntax: ${e.message}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate an entire script array.
 * @param {BehaviorRule[]} script
 * @param {Set<string>} [validActions]
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateScript(script, validActions) {
  if (!Array.isArray(script)) return { valid: false, errors: ['Script must be an array'] };
  const errors = [];
  const ids = new Set();
  for (let i = 0; i < script.length; i++) {
    const rule = script[i];
    const r = validateRule(rule, validActions);
    if (!r.valid) errors.push(`Rule ${i} (${rule.id || '?'}): ${r.errors.join('; ')}`);
    if (rule.id) {
      if (ids.has(rule.id)) errors.push(`Duplicate rule id: ${rule.id}`);
      ids.add(rule.id);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ── Script Diff ───────────────────────────────────────────────────────────────

/**
 * Compare two scripts and return added/removed/modified rules.
 * @param {BehaviorRule[]} oldScript
 * @param {BehaviorRule[]} newScript
 * @returns {{ added: BehaviorRule[], removed: BehaviorRule[], modified: { id: string, old: BehaviorRule, new: BehaviorRule }[] }}
 */
function diffScripts(oldScript, newScript) {
  const oldMap = new Map(oldScript.map(r => [r.id, r]));
  const newMap = new Map(newScript.map(r => [r.id, r]));

  const added = [];
  const removed = [];
  const modified = [];

  for (const [id, rule] of newMap) {
    if (!oldMap.has(id)) added.push(rule);
    else {
      const old = oldMap.get(id);
      if (old.condition !== rule.condition || old.action !== rule.action || old.priority !== rule.priority) {
        modified.push({ id, old, new: rule });
      }
    }
  }
  for (const [id, rule] of oldMap) {
    if (!newMap.has(id)) removed.push(rule);
  }

  return { added, removed, modified };
}

// ── Script Merge ──────────────────────────────────────────────────────────────

/**
 * Merge rules from multiple scripts. Later scripts override earlier ones by id.
 * Tags each rule with `_source` indicating origin.
 * @param {{ script: BehaviorRule[], source: string }[]} sources
 * @returns {BehaviorRule[]}
 */
function mergeScripts(sources) {
  const merged = new Map();
  for (const { script, source } of sources) {
    for (const rule of script) {
      merged.set(rule.id, { ...rule, _source: source });
    }
  }
  return [...merged.values()].sort((a, b) => b.priority - a.priority);
}

// ── BehaviorScript Class ──────────────────────────────────────────────────────

class BehaviorScript extends EventEmitter {
  /**
   * @param {BehaviorRule[]} [rules=[]]
   * @param {{ validActions?: Set<string>, actionHandler?: function(string, BehaviorRule, Object): *, stateValidator?: function(Object): string[] }} [opts]
   */
  constructor(rules = [], opts = {}) {
    super();
    /** @type {BehaviorRule[]} */
    this.rules = [];
    /** @type {Set<string>} */
    this._validActions = opts.validActions || null;
    /** @type {function|null} */
    this._actionHandler = opts.actionHandler || null;
    /** @type {function|null} */
    this._stateValidator = opts.stateValidator || null;
    /** @type {{ version: number, rules: BehaviorRule[], timestamp: string }[]} */
    this._history = [];
    /** @type {number} */
    this._version = 0;

    if (rules.length > 0) this.load(rules);
  }

  /**
   * Get current version number.
   * @returns {number}
   */
  get version() { return this._version; }

  /**
   * Load a new set of rules (replaces all existing rules).
   * @param {BehaviorRule[]} rules
   * @returns {{ valid: boolean, errors: string[] }}
   */
  load(rules) {
    const v = validateScript(rules, this._validActions);
    if (v.valid) {
      this._snapshot();
      this.rules = rules.slice().sort((a, b) => b.priority - a.priority);
      this._version++;
      // Re-parse cache for new conditions
      for (const rule of this.rules) parseCondition(rule.condition);
      this.emit('changed', { version: this._version, diff: diffScripts([], this.rules) });
    }
    return v;
  }

  /**
   * Add a single rule.
   * @param {BehaviorRule} rule
   * @returns {{ valid: boolean, errors: string[] }}
   */
  addRule(rule) {
    const v = validateRule(rule, this._validActions);
    if (v.valid) {
      this._snapshot();
      this.rules.push(rule);
      this.rules.sort((a, b) => b.priority - a.priority);
      this._version++;
      this.emit('ruleAdded', rule);
    }
    return v;
  }

  /**
   * Remove a rule by id.
   * @param {string} id
   * @returns {boolean}
   */
  removeRule(id) {
    const idx = this.rules.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this._snapshot();
    const removed = this.rules.splice(idx, 1)[0];
    this._version++;
    this.emit('ruleRemoved', removed);
    return true;
  }

  /**
   * Execute the script against current state.
   * Returns the first matching rule (highest priority).
   * @param {Object} state - Current state key-value pairs.
   * @param {{ fireAction?: boolean, maxResults?: number }} [opts]
   * @returns {{ action: string|null, ruleId: string|null, rule: BehaviorRule|null, allMatches: { action: string, ruleId: string, rule: BehaviorRule }[] }}
   */
  execute(state, opts = {}) {
    const fireAction = opts.fireAction !== false;
    const maxResults = opts.maxResults || 1;
    const allMatches = [];

    for (const rule of this.rules) {
      try {
        const ast = parseCondition(rule.condition);
        if (evaluate(ast, state)) {
          allMatches.push({ action: rule.action, ruleId: rule.id, rule });
          if (allMatches.length >= maxResults) break;
        }
      } catch (err) {
        this.emit('error', { rule, error: err.message });
      }
    }

    const result = {
      action: allMatches.length > 0 ? allMatches[0].action : null,
      ruleId: allMatches.length > 0 ? allMatches[0].ruleId : null,
      rule: allMatches.length > 0 ? allMatches[0].rule : null,
      allMatches,
    };

    if (result.action && fireAction && this._actionHandler) {
      const handlerResult = this._actionHandler(result.action, result.rule, state);
      result.handlerResult = handlerResult;
    }

    if (result.action) {
      this.emit('executed', { action: result.action, ruleId: result.ruleId, state });
    }

    return result;
  }

  /**
   * Diff current script against another.
   * @param {BehaviorRule[]} otherScript
   * @returns {ReturnType<typeof diffScripts>}
   */
  diff(otherScript) {
    return diffScripts(this.rules, otherScript);
  }

  /**
   * Merge rules from another script into this one.
   * @param {BehaviorRule[]} otherRules
   * @param {string} [source='merged']
   */
  merge(otherRules, source = 'merged') {
    this._snapshot();
    const merged = mergeScripts([
      { script: this.rules, source: 'current' },
      { script: otherRules, source },
    ]);
    this.rules = merged;
    this._version++;
    this.emit('changed', { version: this._version });
  }

  /**
   * Rollback to a previous version.
   * @param {number} [steps=1]
   * @returns {boolean}
   */
  rollback(steps = 1) {
    if (this._history.length === 0) return false;
    const target = Math.max(0, this._history.length - steps);
    const snapshot = this._history[target];
    this.rules = snapshot.rules.slice().sort((a, b) => b.priority - a.priority);
    this._version++;
    this._history = this._history.slice(0, target);
    this.emit('rollback', { version: this._version, fromVersion: snapshot.version });
    return true;
  }

  /**
   * Serialize script to JSON.
   * @returns {string}
   */
  serialize() {
    return JSON.stringify({ version: this._version, rules: this.rules });
  }

  /**
   * Deserialize script from JSON.
   * @param {string} json
   * @returns {BehaviorScript}
   */
  static deserialize(json) {
    const data = JSON.parse(json);
    return new BehaviorScript(data.rules || []);
  }

  /**
   * Export with metadata.
   * @returns {Object}
   */
  toJSON() {
    return { version: this._version, rules: this.rules, ruleCount: this.rules.length };
  }

  /**
   * Validate state against known condition keys.
   * @param {Object} state
   * @returns {string[]} Missing keys
   */
  validateState(state) {
    if (this._stateValidator) return this._stateValidator(state);
    const needed = new Set();
    for (const rule of this.rules) {
      const tokens = tokenize(rule.condition);
      for (const tok of tokens) {
        if (tok.type === 'ident') needed.add(tok.value);
      }
    }
    return [...needed].filter(k => !(k in state));
  }

  // ── Private ──

  _snapshot() {
    this._history.push({
      version: this._version,
      rules: this.rules.map(r => ({ ...r })),
      timestamp: new Date().toISOString(),
    });
    // Keep last 50 versions
    if (this._history.length > 50) this._history = this._history.slice(-50);
  }
}

module.exports = {
  BehaviorScript,
  validateRule,
  validateScript,
  diffScripts,
  mergeScripts,
  parseCondition,
  evaluate,
  clearParseCache,
};
