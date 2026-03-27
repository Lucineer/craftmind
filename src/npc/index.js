/**
 * @module craftmind/npc
 * @description NPC system exports - memory, dialogue, and archetypes.
 */

const { PlayerMemory, FULL_DETAIL_DAYS, SUMMARY_RETENTION_DAYS } = require('./memory');
const { DialogueEngine, TIME_GREETINGS, MOOD_TONES } = require('./dialogue');
const { MentorArchetype, createGustav } = require('./archetypes');

module.exports = {
  // Memory
  PlayerMemory,
  FULL_DETAIL_DAYS,
  SUMMARY_RETENTION_DAYS,

  // Dialogue
  DialogueEngine,
  TIME_GREETINGS,
  MOOD_TONES,

  // Archetypes
  MentorArchetype,
  createGustav,
};
