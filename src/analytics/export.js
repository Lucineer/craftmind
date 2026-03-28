/**
 * Analytics Export - Export metrics to various formats and destinations
 * @module analytics/export
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

/**
 * AnalyticsExport class - Handles CSV, JSON exports and webhooks
 */
class AnalyticsExport {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.dataDir='data/analytics'] - Directory for exports
   * @param {MetricsEngine} options.metricsEngine - Metrics engine instance
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data', 'analytics');
    this.metricsEngine = options.metricsEngine;

    // Ensure export directory exists
    this.exportDir = path.join(this.dataDir, 'exports');
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Export metrics to CSV format
   * @param {string} metric - Metric name to export
   * @param {Object} dateRange - Date range
   * @param {Date} dateRange.start - Start date
   * @param {Date} dateRange.end - End date
   * @returns {Promise<string>} CSV content
   */
  async exportCSV(metric, dateRange) {
    if (!this.metricsEngine) {
      throw new Error('MetricsEngine not configured');
    }

    const history = await this.metricsEngine.getMetricHistory(
      metric,
      Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24))
    );

    let csv = 'date,metric,value\n';

    for (const entry of history) {
      let value = entry.value;

      // Handle complex values
      if (typeof value === 'object') {
        value = JSON.stringify(value).replace(/"/g, '""');
        csv += `${entry.date},"${entry.metric}","${value}"\n`;
      } else {
        csv += `${entry.date},${entry.metric},${value}\n`;
      }
    }

    return csv;
  }

  /**
   * Export metrics to JSON format
   * @param {Array<string>} metrics - Metric names to export
   * @param {Object} dateRange - Date range
   * @param {Date} dateRange.start - Start date
   * @param {Date} dateRange.end - End date
   * @returns {Promise<Object>} JSON export data
   */
  async exportJSON(metrics, dateRange) {
    if (!this.metricsEngine) {
      throw new Error('MetricsEngine not configured');
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      metrics: {}
    };

    for (const metric of metrics) {
      const history = await this.metricsEngine.getMetricHistory(
        metric,
        Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24))
      );
      exportData.metrics[metric] = history;
    }

    return exportData;
  }

  /**
   * Send data to a webhook URL
   * @param {string} url - Webhook URL
   * @param {Object} payload - Data to send
   * @param {Object} [options] - Request options
   * @param {string} [options.method='POST'] - HTTP method
   * @param {Object} [options.headers] - Additional headers
   * @returns {Promise<Object>} Response info
   */
  async sendWebhook(url, payload, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const data = JSON.stringify(payload);

      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...options.headers
        }
      };

      const req = httpModule.request(reqOptions, (res) => {
        let body = '';

        res.on('data', chunk => {
          body += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Webhook request timeout'));
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Save export to file
   * @param {string} filename - Filename (without extension)
   * @param {string} content - Content to save
   * @param {string} [format='json'] - Format for extension
   * @returns {Promise<string>} File path
   */
  async saveExport(filename, content, format = 'json') {
    const ext = format === 'csv' ? 'csv' : 'json';
    const filePath = path.join(this.exportDir, `${filename}.${ext}`);

    await fs.promises.writeFile(filePath, content, 'utf8');

    return filePath;
  }

  /**
   * Generate and send daily summary
   * @param {Object} [options] - Options
   * @param {string} [options.webhookUrl] - Optional webhook URL
   * @returns {Promise<Object>} Summary data
   */
  async sendDailySummary(options = {}) {
    if (!this.metricsEngine) {
      throw new Error('MetricsEngine not configured');
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const metrics = await this.metricsEngine.calculateMetrics(yesterday);

    const summary = {
      type: 'daily_summary',
      date: yesterday.toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      dau: metrics.dau.dau,
      retention: metrics.retention.day1.rate,
      economy: {
        totalCredits: metrics.economy.totalCreditsInCirculation,
        averageWealth: metrics.economy.averageWealth
      },
      topFish: metrics.topItems.topFishCaught.slice(0, 5),
      activity: metrics.activity.percentages
    };

    // Save locally
    await this.saveExport(
      `daily-${summary.date}`,
      JSON.stringify(summary, null, 2)
    );

    // Send webhook if configured
    if (options.webhookUrl) {
      await this.sendWebhook(options.webhookUrl, summary);
    }

    return summary;
  }

  /**
   * Generate and send weekly report
   * @param {Object} [options] - Options
   * @param {string} [options.webhookUrl] - Optional webhook URL
   * @returns {Promise<Object>} Report data
   */
  async sendWeeklyReport(options = {}) {
    if (!this.metricsEngine) {
      throw new Error('MetricsEngine not configured');
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const metrics = await this.metricsEngine.calculateMetrics(weekAgo);
    const dauHistory = await this.metricsEngine.getMetricHistory('dau', 7);
    const economyHistory = await this.metricsEngine.getMetricHistory('economy', 7);

    const report = {
      type: 'weekly_report',
      weekEnding: today.toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      summary: {
        totalEvents: metrics.eventCount,
        averageDAU: dauHistory.reduce((sum, d) => sum + (d.value || 0), 0) / dauHistory.length,
        mau: metrics.mau.mau,
        retention: metrics.retention
      },
      economy: {
        totalCredits: metrics.economy.totalCreditsInCirculation,
        averageWealth: metrics.economy.averageWealth,
        earnedSpentRatio: metrics.economy.earnedSpentRatio
      },
      trends: {
        dau: dauHistory,
        economy: economyHistory
      },
      topItems: metrics.topItems
    };

    // Save locally
    await this.saveExport(
      `weekly-${report.weekEnding}`,
      JSON.stringify(report, null, 2)
    );

    // Send webhook if configured
    if (options.webhookUrl) {
      await this.sendWebhook(options.webhookUrl, report);
    }

    return report;
  }

  /**
   * List available exports
   * @returns {Promise<Array<Object>>} List of export files
   */
  async listExports() {
    const files = await fs.promises.readdir(this.exportDir);
    const exports = [];

    for (const file of files) {
      const filePath = path.join(this.exportDir, file);
      const stats = await fs.promises.stat(filePath);

      exports.push({
        filename: file,
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      });
    }

    return exports.sort((a, b) => b.modified - a.modified);
  }
}

module.exports = { AnalyticsExport };
