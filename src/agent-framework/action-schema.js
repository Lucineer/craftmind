/**
 * @module craftmind/agent-framework/action-schema
 * @description Generic action type registry. Games register their domain-specific
 * actions; the planner and executor use this schema to validate and route actions.
 */

export class ActionSchema {
  constructor() {
    /** @type {Map<string, {description: string, params: Array<{name:string, required?:boolean, type?:string}>, category?: string}>} */
    this.types = new Map();
  }

  /**
   * Register an action type.
   * @param {string} name
   * @param {{description: string, params?: Array<{name:string, required?:boolean, type?:string}>, category?: string}} config
   */
  registerType(name, config) {
    this.types.set(name, {
      description: config.description || name,
      params: config.params || [],
      category: config.category || 'general',
    });
  }

  /**
   * Remove an action type.
   * @param {string} name
   * @returns {boolean}
   */
  unregisterType(name) {
    return this.types.delete(name);
  }

  /**
   * Get an action type definition.
   * @param {string} name
   * @returns {object|undefined}
   */
  getType(name) {
    return this.types.get(name);
  }

  /**
   * Get all types in a category.
   * @param {string} category
   * @returns {Array<{name:string, description:string, params:Array, category:string}>}
   */
  getByCategory(category) {
    const results = [];
    for (const [name, def] of this.types) {
      if (def.category === category) results.push({name, ...def});
    }
    return results;
  }

  /**
   * Get all registered types.
   * @returns {Array<{name:string, description:string, params:Array, category:string}>}
   */
  allTypes() {
    return [...this.types.entries()].map(([name, def]) => ({name, ...def}));
  }

  /**
   * Validate an action against its schema.
   * @param {{type: string, params?: Object}} action
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateAction(action) {
    const errors = [];

    if (!action || typeof action !== 'object') {
      return {valid: false, errors: ['Action must be an object']};
    }

    if (!action.type || typeof action.type !== 'string') {
      return {valid: false, errors: ['Action must have a string type']};
    }

    const def = this.types.get(action.type);
    if (!def) {
      return {valid: false, errors: [`Unknown action type: ${action.type}`]};
    }

    const params = action.params || {};
    for (const param of def.params) {
      if (param.required && (params[param.name] === undefined || params[param.name] === null)) {
        errors.push(`Missing required param: ${param.name}`);
      }
    }

    return {valid: errors.length === 0, errors};
  }

  /**
   * Get all category names.
   * @returns {string[]}
   */
  get categories() {
    return [...new Set([...this.types.values()].map(d => d.category))].sort();
  }

  /**
   * Get type count.
   * @returns {number}
   */
  get size() {
    return this.types.size;
  }

  /**
   * Check if a type is registered.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.types.has(name);
  }

  /**
   * Clear all types.
   */
  clear() {
    this.types.clear();
  }

  /**
   * Serialize schema for persistence.
   * @returns {Object}
   */
  serialize() {
    const result = {};
    for (const [name, def] of this.types) {
      result[name] = def;
    }
    return result;
  }
}

export default ActionSchema;
