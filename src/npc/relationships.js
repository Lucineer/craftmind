/**
 * @module craftmind/npc/relationships
 * @description NPCRelationship - Manages NPC-to-NPC relationships and interactions.
 *
 * Tracks relationship types (friend, rival, mentor, neutral), strength levels,
 * history of interactions, and enables gossip spreading between NPCs.
 *
 * @example
 * const relationships = new NPCRelationship('./data/npc-relationships.yaml');
 * relationships.load();
 * relationships.updateRelationship('Gustav', 'Riley', 'argument', -10);
 * const gossipTargets = relationships.getGossipTarget('Gustav', 'player_caught_legendary');
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} RelationshipHistoryEntry
 * @property {string} event - Event description
 * @property {string} date - ISO date string
 * @property {number} delta - Relationship change
 */

/**
 * @typedef {Object} NPCRelationshipData
 * @property {string} npcA - First NPC name
 * @property {string} npcB - Second NPC name
 * @property {string} type - Relationship type: "friend"|"rival"|"mentor"|"neutral"
 * @property {number} strength - Relationship strength 0-100
 * @property {RelationshipHistoryEntry[]} history - History of interactions
 */

/**
 * @typedef {Object} GossipRule
 * @property {string} relationshipType - Relationship type this applies to
 * @property {number} spreadRate - Probability of spreading (0-1)
 * @property {number} delayDays - Days before spreading
 * @property {number} accuracy - Information accuracy (0-1)
 */

/** @constant {Object} Default gossip rules by relationship type */
const DEFAULT_GOSSIP_RULES = {
  friend: {
    spreadRate: 0.5,
    delayDays: 0,
    accuracy: 0.95,
  },
  closeFriend: {
    spreadRate: 0.7,
    delayDays: 0,
    accuracy: 1.0,
  },
  mentor: {
    spreadRate: 0.4,
    delayDays: 1,
    accuracy: 0.9,
  },
  rival: {
    spreadRate: 0.3,
    delayDays: 2,
    accuracy: 0.7,
  },
  neutral: {
    spreadRate: 0.1,
    delayDays: 3,
    accuracy: 0.6,
  },
  enemy: {
    spreadRate: 0.0,
    delayDays: 0,
    accuracy: 0.5,
  },
};

/**
 * NPCRelationship class - manages NPC-to-NPC relationships.
 */
class NPCRelationship {
  /**
   * Create a new NPCRelationship manager.
   * @param {string} [dataPath='./data/npc-relationships.yaml'] - Path to relationships data
   */
  constructor(dataPath = './data/npc-relationships.yaml') {
    /** @type {string} Data file path */
    this.dataPath = dataPath;

    /** @type {Map<string, NPCRelationshipData>} Relationship data by key */
    this.relationships = new Map();

    /** @type {Map<string, GossipRule>} Gossip rules by relationship type */
    this.gossipRules = new Map(Object.entries(DEFAULT_GOSSIP_RULES));

    /** @type {Map<string, Set<string>>} NPC names to their relationship keys */
    this.npcIndex = new Map();

    /** @type {boolean} Whether data has been loaded */
    this._loaded = false;
  }

  /**
   * Generate a unique key for a relationship pair.
   * @private
   * @param {string} npcA
   * @param {string} npcB
   * @returns {string}
   */
  _makeKey(npcA, npcB) {
    const sorted = [npcA.toLowerCase(), npcB.toLowerCase()].sort();
    return `${sorted[0]}:${sorted[1]}`;
  }

  /**
   * Load relationships from data file.
   * @returns {boolean} True if loaded successfully
   */
  load() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        console.warn(`[NPCRelationship] Data file not found: ${this.dataPath}`);
        return false;
      }

      const content = fs.readFileSync(this.dataPath, 'utf8');
      const data = this._parseYaml(content);

      // Load relationships
      if (data.relationships && Array.isArray(data.relationships)) {
        for (const rel of data.relationships) {
          this._addRelationship(rel);
        }
      }

      // Load custom gossip rules if present
      if (data.gossipRules) {
        for (const [type, rule] of Object.entries(data.gossipRules)) {
          this.gossipRules.set(type, rule);
        }
      }

      this._loaded = true;
      console.log(`[NPCRelationship] Loaded ${this.relationships.size} relationships`);
      return true;
    } catch (err) {
      console.warn(`[NPCRelationship] Failed to load: ${err.message}`);
      return false;
    }
  }

  /**
   * Simple YAML parser for relationships file.
   * @private
   * @param {string} content
   * @returns {Object}
   */
  _parseYaml(content) {
    const result = { relationships: [], gossipRules: {} };
    const lines = content.split('\n');
    let currentSection = null;
    let currentRel = null;
    let currentGossipRule = null;
    let indent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      const currentIndent = line.search(/\S/);

      // Check for section headers
      if (trimmed === 'relationships:') {
        currentSection = 'relationships';
        continue;
      }
      if (trimmed === 'gossip_rules:') {
        currentSection = 'gossip';
        continue;
      }

      // Parse relationships
      if (currentSection === 'relationships') {
        if (trimmed.startsWith('- ')) {
          // Save previous relationship
          if (currentRel) {
            result.relationships.push(currentRel);
          }
          currentRel = {};
          // Parse inline object or start new one
          const inline = trimmed.slice(2).trim();
          if (inline.includes(':')) {
            const [key, value] = inline.split(':').map(s => s.trim());
            currentRel[key] = this._parseValue(value);
          }
        } else if (currentRel && currentIndent > indent && trimmed.includes(':')) {
          const [key, value] = trimmed.split(':').map(s => s.trim());
          if (value) {
            currentRel[key] = this._parseValue(value);
          }
        }
        indent = currentIndent;
      }

      // Parse gossip rules
      if (currentSection === 'gossip') {
        if (trimmed.endsWith(':') && currentIndent === 2) {
          currentGossipRule = trimmed.slice(0, -1);
          result.gossipRules[currentGossipRule] = {};
        } else if (currentGossipRule && trimmed.includes(':')) {
          const [key, value] = trimmed.split(':').map(s => s.trim());
          result.gossipRules[currentGossipRule][key] = this._parseValue(value);
        }
      }
    }

    // Save last relationship
    if (currentRel) {
      result.relationships.push(currentRel);
    }

    return result;
  }

  /**
   * Parse a YAML value.
   * @private
   * @param {string} value
   * @returns {*}
   */
  _parseValue(value) {
    if (!value) return null;
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    // Try number
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
    return value;
  }

  /**
   * Add a relationship to the manager.
   * @private
   * @param {Object} rel - Relationship data
   */
  _addRelationship(rel) {
    if (!rel.npcA || !rel.npcB) return;

    const key = this._makeKey(rel.npcA, rel.npcB);
    const data = {
      npcA: rel.npcA,
      npcB: rel.npcB,
      type: rel.type || 'neutral',
      strength: rel.strength || 50,
      history: rel.history || [],
    };

    this.relationships.set(key, data);

    // Update index
    const npcAKey = rel.npcA.toLowerCase();
    const npcBKey = rel.npcB.toLowerCase();

    if (!this.npcIndex.has(npcAKey)) {
      this.npcIndex.set(npcAKey, new Set());
    }
    if (!this.npcIndex.has(npcBKey)) {
      this.npcIndex.set(npcBKey, new Set());
    }

    this.npcIndex.get(npcAKey).add(key);
    this.npcIndex.get(npcBKey).add(key);
  }

  /**
   * Save relationships to data file.
   * @returns {boolean}
   */
  save() {
    try {
      const lines = ['# NPC Relationships', ''];

      // Write relationships
      lines.push('relationships:');
      for (const rel of this.relationships.values()) {
        lines.push(`  - npcA: "${rel.npcA}"`);
        lines.push(`    npcB: "${rel.npcB}"`);
        lines.push(`    type: "${rel.type}"`);
        lines.push(`    strength: ${rel.strength}`);
        if (rel.history.length > 0) {
          lines.push('    history:');
          for (const h of rel.history.slice(-10)) { // Keep last 10
            lines.push(`      - event: "${h.event}"`);
            lines.push(`        date: "${h.date}"`);
            lines.push(`        delta: ${h.delta}`);
          }
        }
        lines.push('');
      }

      // Write gossip rules
      lines.push('gossip_rules:');
      for (const [type, rule] of this.gossipRules) {
        lines.push(`  ${type}:`);
        lines.push(`    spreadRate: ${rule.spreadRate}`);
        lines.push(`    delayDays: ${rule.delayDays}`);
        lines.push(`    accuracy: ${rule.accuracy}`);
      }

      fs.writeFileSync(this.dataPath, lines.join('\n'));
      return true;
    } catch (err) {
      console.warn(`[NPCRelationship] Failed to save: ${err.message}`);
      return false;
    }
  }

  /**
   * Get relationship between two NPCs.
   * @param {string} npcA
   * @param {string} npcB
   * @returns {NPCRelationshipData|null}
   */
  getRelationship(npcA, npcB) {
    const key = this._makeKey(npcA, npcB);
    return this.relationships.get(key) || null;
  }

  /**
   * Get all relationships for an NPC.
   * @param {string} npcName
   * @returns {NPCRelationshipData[]}
   */
  getRelationshipsForNpc(npcName) {
    const key = npcName.toLowerCase();
    const relKeys = this.npcIndex.get(key);
    if (!relKeys) return [];

    return Array.from(relKeys)
      .map(k => this.relationships.get(k))
      .filter(Boolean);
  }

  /**
   * Update relationship between two NPCs.
   * @param {string} npcA
   * @param {string} npcB
   * @param {string} event - Event description
   * @param {number} delta - Strength change (-100 to +100)
   * @returns {NPCRelationshipData|null}
   */
  updateRelationship(npcA, npcB, event, delta) {
    let rel = this.getRelationship(npcA, npcB);

    if (!rel) {
      // Create new relationship
      rel = {
        npcA,
        npcB,
        type: 'neutral',
        strength: 50,
        history: [],
      };
      this._addRelationship(rel);
    }

    // Update strength
    rel.strength = Math.max(0, Math.min(100, rel.strength + delta));

    // Update type based on strength
    rel.type = this._calculateType(rel.strength, rel.type);

    // Add history entry
    rel.history.push({
      event,
      date: new Date().toISOString(),
      delta,
    });

    // Keep history manageable
    if (rel.history.length > 50) {
      rel.history = rel.history.slice(-50);
    }

    return rel;
  }

  /**
   * Calculate relationship type from strength.
   * @private
   * @param {number} strength
   * @param {string} currentType
   * @returns {string}
   */
  _calculateType(strength, currentType) {
    // Preserve mentor relationships
    if (currentType === 'mentor') {
      if (strength < 30) return 'neutral';
      return 'mentor';
    }

    // Preserve rival relationships
    if (currentType === 'rival') {
      if (strength > 70) return 'neutral'; // Rivals became friends
      return 'rival';
    }

    if (strength >= 80) return 'friend';
    if (strength >= 50) return 'neutral';
    if (strength < 20) return 'enemy';
    return 'neutral';
  }

  /**
   * Get NPCs who would care about gossip from a source.
   * @param {string} sourceNpc - NPC who has the information
   * @param {string} topic - Topic type (achievement, offense, secret, preference)
   * @returns {Array<{npc: string, spreadRate: number, accuracy: number}>}
   */
  getGossipTarget(sourceNpc, topic) {
    const relationships = this.getRelationshipsForNpc(sourceNpc);
    const targets = [];

    for (const rel of relationships) {
      const otherNpc = rel.npcA.toLowerCase() === sourceNpc.toLowerCase()
        ? rel.npcB
        : rel.npcA;

      const rule = this.gossipRules.get(rel.type) || this.gossipRules.get('neutral');
      if (!rule || rule.spreadRate === 0) continue;

      // Check if this relationship type shares this topic
      if (!this._shouldShareTopic(rel.type, topic)) continue;

      targets.push({
        npc: otherNpc,
        spreadRate: rule.spreadRate,
        accuracy: rule.accuracy,
        delayDays: rule.delayDays,
        relationshipType: rel.type,
      });
    }

    return targets;
  }

  /**
   * Check if a relationship type should share a topic.
   * @private
   * @param {string} relationshipType
   * @param {string} topic
   * @returns {boolean}
   */
  _shouldShareTopic(relationshipType, topic) {
    const sharingRules = {
      friend: ['achievement', 'offense', 'preference', 'secret'],
      closeFriend: ['achievement', 'offense', 'preference', 'secret'],
      mentor: ['achievement', 'offense', 'preference'],
      rival: ['achievement', 'offense'],
      neutral: ['achievement'],
      enemy: [],
    };

    const allowed = sharingRules[relationshipType] || ['achievement'];
    return allowed.includes(topic);
  }

  /**
   * Get dialogue modifier based on relationship.
   * @param {string} npcA
   * @param {string} npcB
   * @returns {number} Modifier (-2 to +2)
   */
  getDialogueModifier(npcA, npcB) {
    const rel = this.getRelationship(npcA, npcB);
    if (!rel) return 0;

    const modifiers = {
      friend: 2,
      closeFriend: 2,
      mentor: 1,
      neutral: 0,
      rival: -1,
      enemy: -2,
    };

    return modifiers[rel.type] || 0;
  }

  /**
   * Check if two NPCs should coordinate.
   * @param {string} npcA
   * @param {string} npcB
   * @returns {boolean}
   */
  shouldCoordinate(npcA, npcB) {
    const rel = this.getRelationship(npcA, npcB);
    if (!rel) return false;

    return ['friend', 'closeFriend', 'mentor'].includes(rel.type);
  }

  /**
   * Get pre-defined relationships status.
   * @returns {Object} Summary of all relationships
   */
  getStatus() {
    const summary = {
      total: this.relationships.size,
      byType: {},
      npcs: this.npcIndex.size,
    };

    for (const rel of this.relationships.values()) {
      summary.byType[rel.type] = (summary.byType[rel.type] || 0) + 1;
    }

    return summary;
  }

  /**
   * Initialize default relationships for the fishing game.
   * @returns {NPCRelationship}
   */
  static createDefault() {
    const rel = new NPCRelationship();

    // Pre-defined relationships from requirements
    const defaults = [
      { npcA: 'Gustav', npcB: 'Riley', type: 'rival', strength: 30 },
      { npcA: 'Gustav', npcB: 'NanaKiko', type: 'friend', strength: 70 },
      { npcA: 'Gustav', npcB: 'Gus', type: 'neutral', strength: 40 },
      { npcA: 'Riley', npcB: 'NanaKiko', type: 'neutral', strength: 10 },
      { npcA: 'Riley', npcB: 'Gus', type: 'neutral', strength: 50 },
      { npcA: 'NanaKiko', npcB: 'Gus', type: 'friend', strength: 60 },
    ];

    for (const d of defaults) {
      rel._addRelationship(d);
    }

    return rel;
  }
}

module.exports = {
  NPCRelationship,
  DEFAULT_GOSSIP_RULES,
};
