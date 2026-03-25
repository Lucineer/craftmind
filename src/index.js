/**
 * @module craftmind
 * @description CraftMind Core — public API entry point.
 * Re-exports all modules for convenient consumption.
 *
 * @example
 * const { createBot, PERSONALITIES, Orchestrator } = require('craftmind');
 */

const { createBot } = require('./bot');
const { LLMClient, PERSONALITIES, BrainHandler } = require('./brain');
const { Orchestrator, BotAgent } = require('./orchestrator');

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
};
