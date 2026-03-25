/**
 * @module craftmind/log
 * @description Structured logging with levels, timestamps, and source context.
 *
 * @example
 * const logger = require('craftmind/log');
 * logger.info('Bot spawned', { username: 'Cody', x: 100, y: 64 });
 * logger.warn('Low health', { health: 3, food: 5 });
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

let minLevel = LOG_LEVELS[process.env.CRAFTMIND_LOG_LEVEL || 'info'];
let transports = [];

function formatEntry(level, source, message, meta) {
  const ts = new Date().toISOString();
  const entry = { timestamp: ts, level, source, message };
  if (meta && Object.keys(meta).length > 0) {
    entry.data = meta;
  }
  return entry;
}

function emit(level, source, message, meta) {
  if (level < minLevel) return;
  const entry = formatEntry(level, source, message, meta);
  for (const transport of transports) {
    try {
      transport(entry);
    } catch (err) {
      // Prevent logging failures from crashing
    }
  }
}

// Default transport: colored console output
function defaultTransport(entry) {
  const colors = { debug: '\x1b[2m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' };
  const reset = '\x1b[0m';
  const color = colors[entry.level] || '';
  const src = entry.source ? `[${entry.source}] ` : '';
  const data = entry.data ? ' ' + JSON.stringify(entry.data) : '';
  process.stderr.write(`${color}${entry.timestamp} ${entry.level.toUpperCase()} ${src}${entry.message}${data}${reset}\n`);
}

transports.push(defaultTransport);

const logger = {
  /**
   * Create a child logger with a fixed source tag.
   * @param {string} source - Source identifier (e.g., bot name or module).
   * @returns {{ debug: Function, info: Function, warn: Function, error: Function }}
   */
  create(source) {
    return {
      debug: (msg, meta) => emit(LOG_LEVELS.debug, source, msg, meta),
      info: (msg, meta) => emit(LOG_LEVELS.info, source, msg, meta),
      warn: (msg, meta) => emit(LOG_LEVELS.warn, source, msg, meta),
      error: (msg, meta) => emit(LOG_LEVELS.error, source, msg, meta),
    };
  },

  /** Root logger (no source tag). */
  debug: (msg, meta) => emit(LOG_LEVELS.debug, null, msg, meta),
  info: (msg, meta) => emit(LOG_LEVELS.info, null, msg, meta),
  warn: (msg, meta) => emit(LOG_LEVELS.warn, null, msg, meta),
  error: (msg, meta) => emit(LOG_LEVELS.error, null, msg, meta),

  /**
   * Set the minimum log level.
   * @param {'debug'|'info'|'warn'|'error'|'silent'} level
   */
  setLevel(level) {
    if (level in LOG_LEVELS) {
      minLevel = LOG_LEVELS[level];
    }
  },

  /**
   * Add a custom transport function.
   * @param {(entry: Object) => void} fn - Transport function receiving log entries.
   */
  addTransport(fn) {
    transports.push(fn);
  },

  /**
   * Remove all transports (including default). Use to fully customize output.
   */
  clearTransports() {
    transports = [];
  },

  /** Log level constants for programmatic use. */
  levels: LOG_LEVELS,
};

module.exports = logger;
