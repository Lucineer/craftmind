/**
 * @module craftmind
 * @description CraftMind Core — public API entry point.
 * Re-exports all modules for convenient consumption.
 *
 * @example
 * const { createBot, PERSONALITIES, Orchestrator } = require('craftmind');
 * const { CommandRegistry, PluginManager, BotMemory } = require('craftmind');
 * const { BotStateMachine } = require('craftmind');
 */

const { createBot } = require('./bot');
const { LLMClient, PERSONALITIES, BrainHandler } = require('./brain');
const { Orchestrator, BotAgent } = require('./orchestrator');
const { CraftMindEvents } = require('./events');
const { BotStateMachine } = require('./state-machine');
const { CommandRegistry } = require('./commands');
const { PluginManager } = require('./plugins');
const { BotMemory } = require('./memory');
const { loadConfig, validateConfig } = require('./config');
const logger = require('./log');

module.exports = {
  // Bot factory
  createBot,
  // Brain
  LLMClient,
  PERSONALITIES,
  BrainHandler,
  // Multi-bot
  Orchestrator,
  BotAgent,
  // Systems
  CraftMindEvents,
  BotStateMachine,
  CommandRegistry,
  PluginManager,
  BotMemory,
  // Config
  loadConfig,
  validateConfig,
  // Logging
  logger,
};
