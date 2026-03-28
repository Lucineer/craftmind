#!/usr/bin/env node
/**
 * Analytics Dashboard Server
 * Simple HTTP server for analytics data
 *
 * Endpoints:
 *   GET /api/metrics - Current metrics JSON
 *   GET /api/metrics/history?days=7 - Trend data
 *   GET /api/alerts - Recent alerts
 *   GET /api/dashboard - Aggregated dashboard data
 *
 * Usage: node scripts/analytics-server.js [port]
 * Default port: 8080, bound to localhost only
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Import analytics modules
const { AnalyticsCollector } = require('../src/analytics/collector');
const { MetricsEngine } = require('../src/analytics/metrics');
const { AnalyticsExport } = require('../src/analytics/export');
const { AlertSystem } = require('../src/analytics/alerts');

// Configuration
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '127.0.0.1'; // localhost only for security
const DATA_DIR = path.join(process.cwd(), 'data', 'analytics');

// Initialize components
const metricsEngine = new MetricsEngine({ dataDir: DATA_DIR });
const analyticsExport = new AnalyticsExport({ dataDir: DATA_DIR, metricsEngine });
const alertSystem = new AlertSystem({ dataDir: DATA_DIR });

/**
 * Send JSON response
 * @param {http.ServerResponse} res - Response object
 * @param {number} statusCode - HTTP status code
 * @param {Object} data - Data to send
 */
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'localhost'
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Send error response
 * @param {http.ServerResponse} res - Response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 */
function sendError(res, statusCode, message) {
  sendJSON(res, statusCode, { error: true, message });
}

/**
 * Parse query parameters
 * @param {string} queryStr - Query string
 * @returns {Object} Parsed parameters
 */
function parseQuery(queryStr) {
  const params = {};
  if (!queryStr) return params;

  for (const pair of queryStr.split('&')) {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  }

  return params;
}

/**
 * Handle GET /api/metrics
 * @param {http.ServerResponse} res - Response object
 */
async function handleMetrics(res) {
  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30); // Last 30 days

    const metrics = await metricsEngine.calculateMetrics(sinceDate);
    sendJSON(res, 200, metrics);
  } catch (err) {
    console.error('[API] Error in /api/metrics:', err.message);
    sendError(res, 500, 'Failed to calculate metrics');
  }
}

/**
 * Handle GET /api/metrics/history
 * @param {http.ServerResponse} res - Response object
 * @param {Object} query - Query parameters
 */
async function handleMetricsHistory(res, query) {
  try {
    const days = Math.min(parseInt(query.days || '7', 10), 90);
    const metric = query.metric || 'dau';

    const history = await metricsEngine.getMetricHistory(metric, days);
    sendJSON(res, 200, { metric, days, history });
  } catch (err) {
    console.error('[API] Error in /api/metrics/history:', err.message);
    sendError(res, 500, 'Failed to get metric history');
  }
}

/**
 * Handle GET /api/alerts
 * @param {http.ServerResponse} res - Response object
 * @param {Object} query - Query parameters
 */
async function handleAlerts(res, query) {
  try {
    const limit = Math.min(parseInt(query.limit || '50', 10), 200);
    const severity = query.severity;

    let alerts;
    if (severity) {
      alerts = alertSystem.getAlertsBySeverity(severity, limit);
    } else {
      alerts = alertSystem.getRecentAlerts(limit);
    }

    sendJSON(res, 200, {
      total: alerts.length,
      alerts
    });
  } catch (err) {
    console.error('[API] Error in /api/alerts:', err.message);
    sendError(res, 500, 'Failed to get alerts');
  }
}

/**
 * Handle GET /api/dashboard
 * @param {http.ServerResponse} res - Response object
 */
async function handleDashboard(res) {
  try {
    // Gather all dashboard data in parallel
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);

    const [metrics, dauHistory, quickStats, recentAlerts, rules] = await Promise.all([
      metricsEngine.calculateMetrics(sinceDate),
      metricsEngine.getMetricHistory('dau', 7),
      metricsEngine.getQuickStats(),
      Promise.resolve(alertSystem.getRecentAlerts(10)),
      Promise.resolve(alertSystem.getRules())
    ]);

    const dashboard = {
      generatedAt: new Date().toISOString(),
      quickStats,
      current: {
        dau: metrics.dau,
        mau: metrics.mau,
        retention: metrics.retention,
        economy: {
          totalCredits: metrics.economy.totalCreditsInCirculation,
          averageWealth: metrics.economy.averageWealth,
          earnedSpentRatio: metrics.economy.earnedSpentRatio
        }
      },
      trends: {
        dau: dauHistory.map(h => ({ date: h.date, value: h.value }))
      },
      topItems: metrics.topItems,
      activity: metrics.activity.percentages,
      recentAlerts,
      alertRules: rules
    };

    sendJSON(res, 200, dashboard);
  } catch (err) {
    console.error('[API] Error in /api/dashboard:', err.message);
    sendError(res, 500, 'Failed to generate dashboard data');
  }
}

/**
 * Handle GET /api/exports
 * @param {http.ServerResponse} res - Response object
 */
async function handleExports(res) {
  try {
    const exports = await analyticsExport.listExports();
    sendJSON(res, 200, { exports });
  } catch (err) {
    console.error('[API] Error in /api/exports:', err.message);
    sendError(res, 500, 'Failed to list exports');
  }
}

/**
 * Handle GET /api/health
 * @param {http.ServerResponse} res - Response object
 */
function handleHealth(res) {
  sendJSON(res, 200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

/**
 * Main request handler
 * @param {http.IncomingMessage} req - Request object
 * @param {http.ServerResponse} res - Response object
 */
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  const query = parseQuery(parsedUrl.query);

  console.log(`[Server] ${req.method} ${pathname}`);

  // Only allow GET requests
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  // Route to handlers
  try {
    if (pathname === '/api/metrics' && !query.metric) {
      await handleMetrics(res);
    } else if (pathname === '/api/metrics/history' || pathname === '/api/metrics') {
      await handleMetricsHistory(res, query);
    } else if (pathname === '/api/alerts') {
      await handleAlerts(res, query);
    } else if (pathname === '/api/dashboard') {
      await handleDashboard(res);
    } else if (pathname === '/api/exports') {
      await handleExports(res);
    } else if (pathname === '/api/health') {
      handleHealth(res);
    } else if (pathname === '/' || pathname === '') {
      // Root endpoint - API info
      sendJSON(res, 200, {
        name: 'CraftMind Analytics API',
        version: '1.0.0',
        endpoints: [
          { path: '/api/metrics', description: 'Current metrics (30 days)' },
          { path: '/api/metrics/history?days=7&metric=dau', description: 'Metric history' },
          { path: '/api/alerts?limit=50', description: 'Recent alerts' },
          { path: '/api/dashboard', description: 'Aggregated dashboard data' },
          { path: '/api/exports', description: 'List export files' },
          { path: '/api/health', description: 'Health check' }
        ]
      });
    } else {
      sendError(res, 404, 'Not found');
    }
  } catch (err) {
    console.error('[Server] Unhandled error:', err);
    sendError(res, 500, 'Internal server error');
  }
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`[Server] Analytics dashboard running at http://${HOST}:${PORT}`);
  console.log('[Server] Endpoints:');
  console.log(`  GET http://${HOST}:${PORT}/api/metrics`);
  console.log(`  GET http://${HOST}:${PORT}/api/metrics/history?days=7`);
  console.log(`  GET http://${HOST}:${PORT}/api/alerts`);
  console.log(`  GET http://${HOST}:${PORT}/api/dashboard`);
  console.log(`  GET http://${HOST}:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down...');
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});
