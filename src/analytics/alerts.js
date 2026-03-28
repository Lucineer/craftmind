/**
 * Analytics Alerts - Alert rules and notification system
 * @module analytics/alerts
 */

const fs = require('fs');
const path = require('path');

/**
 * Alert severity levels
 * @enum {string}
 */
const AlertSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

/**
 * Alert rule definitions
 * @type {Array<Object>}
 */
const DEFAULT_ALERT_RULES = [
  {
    id: 'inflation_spike',
    name: 'Inflation Spike',
    description: 'Detects >5% daily increase in average wealth',
    severity: AlertSeverity.WARNING,
    check: (metrics, history) => {
      if (history.length < 2) return null;

      const today = history[history.length - 1]?.value;
      const yesterday = history[history.length - 2]?.value;

      if (!today || !yesterday || yesterday.averageWealth === 0) return null;

      const change = ((today.averageWealth - yesterday.averageWealth) / yesterday.averageWealth) * 100;

      if (change > 5) {
        return {
          ruleId: 'inflation_spike',
          message: `Inflation spike detected: ${change.toFixed(1)}% increase in average wealth`,
          data: { change, today: today.averageWealth, yesterday: yesterday.averageWealth }
        };
      }

      return null;
    }
  },
  {
    id: 'wealth_imbalance',
    name: 'Wealth Imbalance',
    description: 'Gini coefficient > 0.7 indicates high wealth inequality',
    severity: AlertSeverity.WARNING,
    check: (metrics) => {
      // Simplified Gini calculation based on available data
      // In production, would need actual wealth distribution per player
      const avgWealth = metrics.economy?.averageWealth || 0;
      const totalCredits = metrics.economy?.totalCreditsInCirculation || 0;
      const playerCount = metrics.economy?.playerCount || 1;

      // Estimate Gini based on variance from mean
      // This is an approximation - real Gini needs full distribution
      const estimatedGini = playerCount > 1 ? Math.min(1, (totalCredits / (avgWealth * playerCount)) - 1) : 0;

      if (estimatedGini > 0.7) {
        return {
          ruleId: 'wealth_imbalance',
          message: `High wealth inequality detected: Gini ~${estimatedGini.toFixed(2)}`,
          data: { estimatedGini, avgWealth, playerCount }
        };
      }

      return null;
    }
  },
  {
    id: 'bot_crash',
    name: 'Bot Crash Spike',
    description: '>3 bot restarts in 1 hour (tracked via player_leave events)',
    severity: AlertSeverity.CRITICAL,
    check: (metrics, history, events) => {
      if (!events || events.length === 0) return null;

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentLeaves = events.filter(e =>
        e.type === 'player_leave' &&
        new Date(e.timestamp) > oneHourAgo &&
        e.data.reason?.includes('disconnect')
      );

      if (recentLeaves.length > 3) {
        return {
          ruleId: 'bot_crash',
          message: `High bot disconnect rate: ${recentLeaves.length} in last hour`,
          data: { count: recentLeaves.length, events: recentLeaves.slice(0, 5) }
        };
      }

      return null;
    }
  },
  {
    id: 'market_manipulation',
    name: 'Market Manipulation',
    description: 'Single player >20% of all transactions',
    severity: AlertSeverity.WARNING,
    check: (metrics, history, events) => {
      if (!events || events.length === 0) return null;

      const transactionEvents = events.filter(e =>
        e.type === 'fish_sold' ||
        e.type === 'item_bought' ||
        e.type === 'item_sold'
      );

      if (transactionEvents.length < 10) return null;

      const playerCounts = new Map();
      for (const event of transactionEvents) {
        if (event.data.player) {
          playerCounts.set(event.data.player, (playerCounts.get(event.data.player) || 0) + 1);
        }
      }

      const total = transactionEvents.length;
      let maxPlayer = null;
      let maxCount = 0;

      for (const [player, count] of playerCounts) {
        if (count > maxCount) {
          maxCount = count;
          maxPlayer = player;
        }
      }

      const percentage = (maxCount / total) * 100;

      if (percentage > 20 && maxPlayer) {
        return {
          ruleId: 'market_manipulation',
          message: `Possible market manipulation: ${maxPlayer} has ${percentage.toFixed(1)}% of transactions`,
          data: { player: maxPlayer, count: maxCount, total, percentage }
        };
      }

      return null;
    }
  },
  {
    id: 'new_player_dropout',
    name: 'New Player Drop-off',
    description: '>50% of new players leave within 5 minutes',
    severity: AlertSeverity.WARNING,
    check: (metrics, history, events) => {
      if (!events || events.length === 0) return null;

      // Find join/leave pairs for new players
      const playerFirstJoin = new Map();
      const playerLeaveTime = new Map();

      for (const event of events) {
        if (event.type === 'player_join' && event.data.player) {
          if (!playerFirstJoin.has(event.data.player)) {
            playerFirstJoin.set(event.data.player, new Date(event.timestamp));
          }
        }
        if (event.type === 'player_leave' && event.data.player) {
          playerLeaveTime.set(event.data.player, new Date(event.timestamp));
        }
      }

      let newPlayers = 0;
      let quickLeavers = 0;

      for (const [player, joinTime] of playerFirstJoin) {
        // Only count players whose first join is recent (within the metric window)
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (joinTime < dayAgo) continue;

        newPlayers++;
        const leaveTime = playerLeaveTime.get(player);

        if (leaveTime) {
          const sessionMs = leaveTime - joinTime;
          const fiveMinutes = 5 * 60 * 1000;

          if (sessionMs < fiveMinutes) {
            quickLeavers++;
          }
        }
      }

      if (newPlayers >= 5) {
        const dropoutRate = quickLeavers / newPlayers;

        if (dropoutRate > 0.5) {
          return {
            ruleId: 'new_player_dropout',
            message: `High new player drop-off: ${(dropoutRate * 100).toFixed(1)}% leave within 5 min`,
            data: { newPlayers, quickLeavers, dropoutRate }
          };
        }
      }

      return null;
    }
  }
];

/**
 * AlertSystem class - Evaluates alert rules and manages notifications
 */
class AlertSystem {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.dataDir='data/analytics'] - Directory for alert storage
   * @param {number} [options.cooldownMs=3600000] - Cooldown period (default 1 hour)
   * @param {Array<Object>} [options.rules] - Custom alert rules
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data', 'analytics');
    this.cooldownMs = options.cooldownMs ?? 3600000;
    this.rules = options.rules || DEFAULT_ALERT_RULES;

    /** @type {Map<string, number>} Last trigger time per rule */
    this.lastTriggered = new Map();

    /** @type {Array<Object>} Alert history */
    this.alertHistory = [];

    /** @type {Function|null} Alert callback */
    this.onAlert = null;

    // Ensure alert directory exists
    this.alertDir = path.join(this.dataDir, 'alerts');
    if (!fs.existsSync(this.alertDir)) {
      fs.mkdirSync(this.alertDir, { recursive: true });
    }

    // Load existing alert history
    this._loadHistory();
  }

  /**
   * Load alert history from disk
   * @private
   */
  _loadHistory() {
    const historyFile = path.join(this.alertDir, 'history.json');

    if (fs.existsSync(historyFile)) {
      try {
        const content = fs.readFileSync(historyFile, 'utf8');
        this.alertHistory = JSON.parse(content);
      } catch (err) {
        console.error('[AlertSystem] Error loading history:', err.message);
        this.alertHistory = [];
      }
    }
  }

  /**
   * Save alert history to disk
   * @private
   */
  _saveHistory() {
    const historyFile = path.join(this.alertDir, 'history.json');

    try {
      // Keep only last 1000 alerts
      const toSave = this.alertHistory.slice(-1000);
      fs.writeFileSync(historyFile, JSON.stringify(toSave, null, 2), 'utf8');
    } catch (err) {
      console.error('[AlertSystem] Error saving history:', err.message);
    }
  }

  /**
   * Check if a rule is in cooldown
   * @param {string} ruleId - Rule ID
   * @returns {boolean} Whether rule is in cooldown
   * @private
   */
  _isInCooldown(ruleId) {
    const lastTime = this.lastTriggered.get(ruleId);
    if (!lastTime) return false;

    return (Date.now() - lastTime) < this.cooldownMs;
  }

  /**
   * Check all alert rules against current metrics
   * @param {Object} metrics - Current metrics from MetricsEngine
   * @param {Array<Object>} [history] - Metric history
   * @param {Array<Object>} [events] - Raw events
   * @returns {Promise<Array<Object>>} Triggered alerts
   */
  async checkAlerts(metrics, history = [], events = []) {
    const triggeredAlerts = [];

    for (const rule of this.rules) {
      // Check cooldown
      if (this._isInCooldown(rule.id)) {
        continue;
      }

      try {
        const result = rule.check(metrics, history, events);

        if (result) {
          const alert = {
            id: `${rule.id}-${Date.now()}`,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: result.message,
            data: result.data,
            timestamp: new Date().toISOString()
          };

          triggeredAlerts.push(alert);

          // Update cooldown
          this.lastTriggered.set(rule.id, Date.now());

          // Add to history
          this.alertHistory.push(alert);

          // Trigger callback
          if (this.onAlert) {
            try {
              this.onAlert(alert);
            } catch (err) {
              console.error('[AlertSystem] Alert callback error:', err.message);
            }
          }

          // Log alert
          this._logAlert(alert);
        }
      } catch (err) {
        console.error(`[AlertSystem] Error checking rule ${rule.id}:`, err.message);
      }
    }

    // Save history if new alerts
    if (triggeredAlerts.length > 0) {
      this._saveHistory();
    }

    return triggeredAlerts;
  }

  /**
   * Log an alert to daily log file
   * @param {Object} alert - Alert object
   * @private
   */
  _logAlert(alert) {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.alertDir, `alerts-${today}.log`);

    const logLine = `[${alert.timestamp}] [${alert.severity.toUpperCase()}] ${alert.ruleName}: ${alert.message}\n`;

    fs.appendFileSync(logFile, logLine, 'utf8');

    console.log(`[AlertSystem] ${alert.severity.toUpperCase()}: ${alert.message}`);
  }

  /**
   * Send alert notification
   * @param {Object} alert - Alert to send
   * @param {Object} [options] - Options
   * @param {string} [options.webhookUrl] - Webhook URL for notification
   * @returns {Promise<Object|null>} Webhook response or null
   */
  async sendAlert(alert, options = {}) {
    // Log the alert
    this._logAlert(alert);

    // Send webhook if configured
    if (options.webhookUrl) {
      const http = require('http');
      const https = require('https');

      return new Promise((resolve, reject) => {
        const urlObj = new URL(options.webhookUrl);
        const isHttps = urlObj.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const payload = {
          type: 'analytics_alert',
          alert
        };

        const data = JSON.stringify(payload);

        const req = httpModule.request({
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
          }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Alert webhook timeout'));
        });

        req.write(data);
        req.end();
      });
    }

    return null;
  }

  /**
   * Get recent alerts
   * @param {number} [limit=50] - Maximum number of alerts to return
   * @returns {Array<Object>} Recent alerts
   */
  getRecentAlerts(limit = 50) {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alerts by severity
   * @param {string} severity - Alert severity
   * @param {number} [limit=50] - Maximum number of alerts
   * @returns {Array<Object>} Filtered alerts
   */
  getAlertsBySeverity(severity, limit = 50) {
    return this.alertHistory
      .filter(a => a.severity === severity)
      .slice(-limit);
  }

  /**
   * Clear alert cooldown for a rule
   * @param {string} ruleId - Rule ID
   */
  clearCooldown(ruleId) {
    this.lastTriggered.delete(ruleId);
  }

  /**
   * Clear all cooldowns
   */
  clearAllCooldowns() {
    this.lastTriggered.clear();
  }

  /**
   * Add a custom alert rule
   * @param {Object} rule - Rule definition
   */
  addRule(rule) {
    if (!rule.id || !rule.name || typeof rule.check !== 'function') {
      throw new Error('Rule must have id, name, and check function');
    }

    // Remove existing rule with same ID
    this.rules = this.rules.filter(r => r.id !== rule.id);

    this.rules.push({
      severity: AlertSeverity.WARNING,
      ...rule
    });
  }

  /**
   * Remove an alert rule
   * @param {string} ruleId - Rule ID to remove
   * @returns {boolean} Whether rule was removed
   */
  removeRule(ruleId) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all registered rules
   * @returns {Array<Object>} Rules
   */
  getRules() {
    return this.rules.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      severity: r.severity
    }));
  }
}

module.exports = {
  AlertSystem,
  AlertSeverity,
  DEFAULT_ALERT_RULES
};
