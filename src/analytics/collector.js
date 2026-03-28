/**
 * Analytics Collector - Buffers and persists analytics events
 * @module analytics/collector
 */

const fs = require('fs');
const path = require('path');

/**
 * Valid event types for analytics collection
 * @type {string[]}
 */
const VALID_EVENT_TYPES = [
  'player_join',
  'player_leave',
  'fish_caught',
  'fish_sold',
  'quest_completed',
  'item_bought',
  'item_sold',
  'tournament_join',
  'level_up',
  'npc_interact'
];

/**
 * AnalyticsCollector class - Collects, buffers, and persists analytics events
 */
class AnalyticsCollector {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.dataDir='data/analytics'] - Directory for event storage
   * @param {number} [options.flushInterval=60000] - Auto-flush interval in ms
   * @param {number} [options.maxBufferSize=1000] - Max events before forced flush
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data', 'analytics');
    this.flushInterval = options.flushInterval ?? 60000;
    this.maxBufferSize = options.maxBufferSize ?? 1000;

    /** @type {Array<Object>} Event buffer */
    this.buffer = [];

    /** @type {NodeJS.Timeout|null} Flush timer */
    this.timer = null;

    /** @type {boolean} Whether collector is running */
    this.isRunning = false;

    // Ensure data directory exists
    this._ensureDataDir();
  }

  /**
   * Ensure the data directory exists
   * @private
   */
  _ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get the events file path for a specific date
   * @param {Date} [date=new Date()] - The date
   * @returns {string} File path
   * @private
   */
  _getEventsFile(date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    return path.join(this.dataDir, `events-${dateStr}.jsonl`);
  }

  /**
   * Start the collector (begin auto-flush timer, register exit handler)
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;

    // Start auto-flush timer
    this.timer = setInterval(() => {
      this.flush().catch(err => {
        console.error('[AnalyticsCollector] Auto-flush error:', err.message);
      });
    }, this.flushInterval);

    // Prevent timer from keeping process alive
    if (this.timer.unref) {
      this.timer.unref();
    }

    // Register exit handler for final flush
    this._exitHandler = async () => {
      if (this.buffer.length > 0) {
        await this.flush();
      }
    };

    process.on('beforeExit', this._exitHandler);
    process.on('SIGINT', this._exitHandler);
    process.on('SIGTERM', this._exitHandler);

    console.log('[AnalyticsCollector] Started with flush interval', this.flushInterval, 'ms');
  }

  /**
   * Stop the collector
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this._exitHandler) {
      process.off('beforeExit', this._exitHandler);
      process.off('SIGINT', this._exitHandler);
      process.off('SIGTERM', this._exitHandler);
    }

    // Final flush
    if (this.buffer.length > 0) {
      this.flush().catch(err => {
        console.error('[AnalyticsCollector] Final flush error:', err.message);
      });
    }

    console.log('[AnalyticsCollector] Stopped');
  }

  /**
   * Collect an analytics event
   * @param {string} eventType - Type of event (must be in VALID_EVENT_TYPES)
   * @param {Object} data - Event data
   * @returns {boolean} Whether the event was accepted
   */
  collect(eventType, data = {}) {
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      console.warn(`[AnalyticsCollector] Invalid event type: ${eventType}`);
      return false;
    }

    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      data
    };

    this.buffer.push(event);

    // Check for forced flush
    if (this.buffer.length >= this.maxBufferSize) {
      console.log('[AnalyticsCollector] Buffer full, forcing flush');
      this.flush().catch(err => {
        console.error('[AnalyticsCollector] Forced flush error:', err.message);
      });
    }

    return true;
  }

  /**
   * Flush buffered events to disk
   * @returns {Promise<number>} Number of events flushed
   */
  async flush() {
    if (this.buffer.length === 0) {
      return 0;
    }

    // Get events to flush
    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    // Group by date
    const eventsByDate = new Map();

    for (const event of eventsToFlush) {
      const dateStr = event.timestamp.split('T')[0];
      if (!eventsByDate.has(dateStr)) {
        eventsByDate.set(dateStr, []);
      }
      eventsByDate.get(dateStr).push(event);
    }

    // Write each date's events to its file
    let totalFlushed = 0;

    for (const [dateStr, events] of eventsByDate) {
      const filePath = path.join(this.dataDir, `events-${dateStr}.jsonl`);

      try {
        // Append events as JSON lines
        const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';
        await fs.promises.appendFile(filePath, lines, 'utf8');
        totalFlushed += events.length;
      } catch (err) {
        console.error(`[AnalyticsCollector] Error writing to ${filePath}:`, err.message);
        // Re-add failed events to buffer
        this.buffer.unshift(...events);
      }
    }

    if (totalFlushed > 0) {
      console.log(`[AnalyticsCollector] Flushed ${totalFlushed} events to disk`);
    }

    return totalFlushed;
  }

  /**
   * Read events from a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array<Object>>} Events
   */
  async readEvents(startDate, endDate) {
    const events = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const filePath = this._getEventsFile(current);

      if (fs.existsSync(filePath)) {
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');
          const lines = content.trim().split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                events.push(JSON.parse(line));
              } catch (e) {
                // Skip malformed lines
              }
            }
          }
        } catch (err) {
          console.error(`[AnalyticsCollector] Error reading ${filePath}:`, err.message);
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return events;
  }

  /**
   * Get current buffer size
   * @returns {number} Number of buffered events
   */
  getBufferSize() {
    return this.buffer.length;
  }

  /**
   * Get valid event types
   * @returns {string[]} Valid event types
   */
  static getValidEventTypes() {
    return [...VALID_EVENT_TYPES];
  }
}

module.exports = {
  AnalyticsCollector,
  VALID_EVENT_TYPES
};
