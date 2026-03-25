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
const { BehaviorScript, validateRule, validateScript, diffScripts, mergeScripts } = require('./behavior-script');
const { ScriptWriter } = require('./script-writer');
const { NoveltyDetector, SEVERITY } = require('./novelty-detector');
const { AttentionBudget } = require('./attention-budget');
const { EmergenceTracker } = require('./emergence-tracker');

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
  // Behavior Script Engine
  BehaviorScript,
  validateRule,
  validateScript,
  diffScripts,
  mergeScripts,
  // Script Writer (LLM-driven)
  ScriptWriter,
  // Novelty Detection
  NoveltyDetector,
  SEVERITY,
  // Attention Budget
  AttentionBudget,
  // Emergence Tracking
  EmergenceTracker,
};
