/**
 * @module craftmind/config
 * @description Configuration loading, merging, and validation.
 *
 * Config resolution order (later overrides earlier):
 *   1. Built-in defaults
 *   2. craftmind.config.js (project root)
 *   3. CRAFTMIND_ env vars
 *   4. Runtime options passed to createBot()
 *
 * @example
 * const { loadConfig, validateConfig } = require('craftmind/config');
 * const config = loadConfig({ host: 'mc.example.com', username: 'Cody' });
 */

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  host: 'localhost',
  port: 25565,
  version: '1.21.4',
  username: 'CraftBot',
  personality: null, // defaults to username.toLowerCase()
  useBrain: true,
  llm: {
    apiKey: null, // falls back to ZAI_API_KEY env
    model: 'glm-4.7-flash',
    apiUrl: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
    maxHistory: 20,
    maxTokens: 200,
    temperature: 0.8,
    timeout: 15000,
    minInterval: 2000,
  },
  behavior: {
    autoEat: true,
    autoEatThreshold: 18,
    autoReconnect: true,
    reconnectDelay: 5000,
    maxReconnectAttempts: 10,
    fleeHealth: 4,
    fleeOnLava: true,
  },
  pathfinding: {
    allowSprinting: true,
    allowParkour: true,
    defaultFollowDistance: 3,
  },
};

/**
 * Load configuration from file, env, and runtime options.
 * @param {Object} [runtimeOpts={}] - Runtime overrides.
 * @returns {Object} Merged configuration.
 */
function loadConfig(runtimeOpts = {}) {
  // Start with defaults (deep clone)
  const config = JSON.parse(JSON.stringify(DEFAULTS));

  // 2. Load config file
  const configPaths = [
    path.resolve('craftmind.config.js'),
    path.resolve('craftmind.config.json'),
    path.resolve('craftmind.config.cjs'),
  ];

  for (const p of configPaths) {
    try {
      if (p.endsWith('.json')) {
        const file = JSON.parse(fs.readFileSync(p, 'utf8'));
        deepMerge(config, file);
      } else {
        const file = require(p);
        deepMerge(config, file);
      }
      break;
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND' && err.code !== 'ENOENT') {
        console.warn(`[Config] Error loading ${p}: ${err.message}`);
      }
    }
  }

  // 3. Environment overrides
  const envMap = {
    CRAFTMIND_HOST: ['host'],
    CRAFTMIND_PORT: ['port', Number],
    CRAFTMIND_VERSION: ['version'],
    CRAFTMIND_USERNAME: ['username'],
    CRAFTMIND_PERSONALITY: ['personality'],
    CRAFTMIND_DISABLE_BRAIN: ['useBrain', (v) => v !== 'true'],
    CRAFTMIND_LLM_API_KEY: ['llm', 'apiKey'],
    CRAFTMIND_LLM_MODEL: ['llm', 'model'],
    CRAFTMIND_LOG_LEVEL: null, // handled by logger directly
  };

  for (const [env, path] of Object.entries(envMap)) {
    if (process.env[env] === undefined) continue;
    if (!path) continue;
    const transform = path[1] instanceof Function ? path[1] : (v) => v;
    const val = path[1] instanceof Function ? transform(process.env[env]) : process.env[env];
    if (path.length === 1) {
      config[path[0]] = val;
    } else {
      config[path[0]][path[1]] = val;
    }
  }

  // 4. Runtime options
  deepMerge(config, runtimeOpts);

  // Default personality to username
  if (!config.personality && config.username) {
    config.personality = config.username.toLowerCase();
  }

  return config;
}

/**
 * Validate a configuration object.
 * @param {Object} config
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateConfig(config) {
  const errors = [];

  if (config.host && typeof config.host !== 'string') {
    errors.push('host must be a string');
  }
  if (config.port !== undefined && (typeof config.port !== 'number' || config.port < 1 || config.port > 65535)) {
    errors.push('port must be a number between 1 and 65535');
  }
  if (config.username !== undefined && (typeof config.username !== 'string' || config.username.length === 0 || config.username.length > 16)) {
    errors.push('username must be 1-16 characters');
  }
  if (config.llm?.maxHistory !== undefined && config.llm.maxHistory < 1) {
    errors.push('llm.maxHistory must be ≥ 1');
  }
  if (config.behavior?.autoEatThreshold !== undefined && (config.behavior.autoEatThreshold < 0 || config.behavior.autoEatThreshold > 20)) {
    errors.push('behavior.autoEatThreshold must be 0-20');
  }
  if (config.pathfinding?.defaultFollowDistance !== undefined && config.pathfinding.defaultFollowDistance < 1) {
    errors.push('pathfinding.defaultFollowDistance must be ≥ 1');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Deep merge source into target (mutates target).
 * @param {Object} target
 * @param {Object} source
 */
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined) {
      target[key] = source[key];
    }
  }
}

module.exports = { loadConfig, validateConfig, DEFAULTS };
