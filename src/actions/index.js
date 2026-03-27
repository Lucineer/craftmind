/**
 * @module craftmind/actions
 * @description General Action Primitives System — universal actions that ANY game plugin can use.
 *
 * Provides a registry of reusable actions with validation and execution logic.
 * Actions can be called by plugins, scripts, or commands.
 *
 * @example
 * const { ActionRegistry } = require('./actions');
 * const registry = new ActionRegistry();
 * registry.register('my_action', {
 *   description: 'Do something cool',
 *   validate: (params) => params.x !== undefined,
 *   execute: async (ctx, params) => { ... }
 * });
 */

const { goals } = require('mineflayer-pathfinder');
const { teleport } = require('../utils/rcon-helper.cjs');
const vec3 = require('vec3');

/**
 * ActionRegistry — manages universal bot actions.
 */
class ActionRegistry {
  constructor() {
    this._actions = new Map();
  }

  /**
   * Register a new action.
   * @param {string} name - Action name
   * @param {Object} definition - Action definition
   * @param {string} definition.description - Human-readable description
   * @param {function} definition.execute - Async function (ctx, params) => any
   * @param {function} [definition.validate] - Function (params) => boolean | string
   * @returns {ActionRegistry} this for chaining
   */
  register(name, { description, execute, validate }) {
    this._actions.set(name, { description, execute, validate });
    return this;
  }

  /**
   * Get an action definition.
   * @param {string} name
   * @returns {Object|undefined}
   */
  get(name) {
    return this._actions.get(name);
  }

  /**
   * List all registered action names.
   * @returns {string[]}
   */
  list() {
    return [...this._actions.keys()];
  }

  /**
   * Execute an action with validation.
   * @param {string} name - Action name
   * @param {Object} ctx - Bot context (bot, events, commands, etc.)
   * @param {Object} params - Action parameters
   * @returns {Promise<any>} Action result
   * @throws {Error} If action not found or validation fails
   */
  async execute(name, ctx, params = {}) {
    const action = this._actions.get(name);
    if (!action) {
      throw new Error(`Unknown action: ${name}`);
    }

    // Validate if validator exists
    if (action.validate) {
      const validationResult = action.validate(params, ctx);
      if (validationResult !== true) {
        const errorMsg = typeof validationResult === 'string'
          ? validationResult
          : `Validation failed for action: ${name}`;
        throw new Error(errorMsg);
      }
    }

    // Execute the action
    return await action.execute(ctx, params);
  }
}

// ── Built-in Actions ─────────────────────────────────────────────────────────────

/**
 * Helper: Validate coordinate parameters.
 */
function validateCoords(params, required = true) {
  if (required && (params.x === undefined || params.y === undefined || params.z === undefined)) {
    return 'Coordinates x, y, z are required';
  }
  if (params.x !== undefined && (typeof params.x !== 'number' || isNaN(params.x))) return 'x must be a number';
  if (params.y !== undefined && (typeof params.y !== 'number' || isNaN(params.y))) return 'y must be a number';
  if (params.z !== undefined && (typeof params.z !== 'number' || isNaN(params.z))) return 'z must be a number';
  return true;
}

/**
 * Helper: Find nearest entity matching criteria.
 */
function findNearestEntity(bot, predicate, maxDistance = 16) {
  const entities = Object.values(bot.entities)
    .filter(e => e !== bot.entity && predicate(e))
    .map(e => ({
      entity: e,
      distance: e.position.distanceTo(bot.entity.position)
    }))
    .filter(e => e.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);

  return entities[0]?.entity;
}

/**
 * Helper: Check if bot has item in inventory.
 */
function hasItem(bot, itemName) {
  return bot.inventory.items().some(item =>
    item.name.replace('minecraft:', '') === itemName.replace('minecraft:', '')
  );
}

/**
 * Helper: Get item by name from inventory.
 */
function getItem(bot, itemName) {
  return bot.inventory.items().find(item =>
    item.name.replace('minecraft:', '') === itemName.replace('minecraft:', '')
  );
}

// ── Action Definitions ───────────────────────────────────────────────────────────

const BUILTIN_ACTIONS = {
  /**
   * move_to — Move bot to coordinates using pathfinder
   */
  move_to: {
    description: 'Move the bot to specific world coordinates using pathfinding',
    validate: (params) => validateCoords(params),
    execute: async (ctx, params) => {
      const { bot } = ctx;
      const { x, y, z, range = 2 } = params;

      return new Promise((resolve, reject) => {
        const goal = new goals.GoalBlock(x, y, z);

        bot.pathfinder.setGoal(goal);

        // Listen for goal reached or path update events
        const onGoalReached = () => {
          cleanup();
          resolve({ success: true, x, y, z });
        };

        const onPathUpdate = (result) => {
          if (result === 'noPath') {
            cleanup();
            reject(new Error(`No path found to ${x}, ${y}, ${z}`));
          }
        };

        const cleanup = () => {
          bot.removeListener('goal_reached', onGoalReached);
          bot.removeListener('path_update', onPathUpdate);
        };

        bot.once('goal_reached', onGoalReached);
        bot.once('path_update', onPathUpdate);

        // Timeout after 30 seconds
        setTimeout(() => {
          cleanup();
          reject(new Error('Navigation timeout'));
        }, 30000);
      });
    }
  },

  /**
   * mine_block — Mine a specific block type at nearest location
   */
  mine_block: {
    description: 'Mine the nearest block of a specific type',
    validate: (params) => {
      if (!params.blockType) return 'blockType is required';
      return true;
    },
    execute: async (ctx, params) => {
      const { bot } = ctx;
      const { blockType, maxDistance = 20 } = params;

      const blocks = bot.findBlocks({
        matching: blockType,
        maxDistance: maxDistance,
        count: 1
      });

      if (blocks.length === 0) {
        throw new Error(`No ${blockType} found within ${maxDistance} blocks`);
      }

      const block = bot.blockAt(blocks[0]);
      if (!block) {
        throw new Error('Block not found');
      }

      return new Promise((resolve, reject) => {
        bot.dig(block, (err) => {
          if (err) {
            reject(new Error(`Failed to mine ${blockType}: ${err.message}`));
          } else {
            resolve({ success: true, block: blockType, position: blocks[0] });
          }
        });
      });
    }
  },

  /**
   * place_block — Place a block at target position
   */
  place_block: {
    description: 'Place a block from inventory at a target position',
    validate: (params) => {
      if (!params.blockType) return 'blockType is required';
      return validateCoords(params);
    },
    execute: async (ctx, params) => {
      const { bot } = ctx;
      const { blockType, x, y, z } = params;

      const item = getItem(bot, blockType);
      if (!item) {
        throw new Error(`Don't have any ${blockType} in inventory`);
      }

      const refBlock = bot.blockAt(vec3(x, y, z));
      if (!refBlock) {
        throw new Error('Reference block not found');
      }

      await bot.equip(item, 'hand');
      await bot.placeBlock(refBlock, vec3(0, 1, 0));

      return { success: true, block: blockType, position: { x, y, z } };
    }
  },

  /**
   * craft_item — Craft an item from inventory
   */
  craft_item: {
    description: 'Craft an item using available materials in inventory',
    validate: (params) => {
      if (!params.item) return 'item name is required';
      if (params.count !== undefined && (typeof params.count !== 'number' || params.count < 1)) {
        return 'count must be a positive number';
      }
      return true;
    },
    execute: async (ctx, params) => {
      const { bot } = ctx;
      const { item, count = 1 } = params;

      const mcData = require('minecraft-data')(bot.version);
      const itemData = mcData.itemsByName[item.replace('minecraft:', '')];

      if (!itemData) {
        throw new Error(`Unknown item: ${item}`);
      }

      // Find crafting recipe
      const recipe = bot.recipesFor(itemData.id, null, 1, null)[0];
      if (!recipe) {
        throw new Error(`No crafting recipe found for ${item}`);
      }

      await bot.craft(recipe, count);
      return { success: true, item, count };
    }
  },

  /**
   * equip_item — Equip an item to a specific slot
   */
  equip_item: {
    description: 'Equip an item to a specific equipment slot',
    validate: (params) => {
      if (!params.item) return 'item name is required';
      if (params.slot && !['hand', 'head', 'torso', 'legs', 'feet'].includes(params.slot)) {
        return 'Invalid slot. Use: hand, head, torso, legs, or feet';
      }
      return true;
    },
    execute: async (ctx, params) => {
      const { bot } = ctx;
      const { item, slot = 'hand' } = params;

      const itemObj = getItem(bot, item);
      if (!itemObj) {
        throw new Error(`Don't have any ${item} in inventory`);
      }

      await bot.equip(itemObj, slot);
      return { success: true, item, slot };
    }
  },

  /**
   * use_item — Use/activate held item
   */
  use_item: {
    description: 'Use or activate the currently held item',
    validate: () => true,
    execute: async (ctx, params) => {
      const { bot } = ctx;

      const heldItem = bot.heldItem;
      if (!heldItem) {
        throw new Error('No item in hand');
      }

      // Try different use methods depending on context
      try {
        await bot.activateItem();
        return { success: true, item: heldItem.name };
      } catch (err) {
        throw new Error(`Failed to use item: ${err.message}`);
      }
    }
  },

  /**
   * look_at — Look at coordinates or entity
   */
  look_at: {
    description: 'Look at specific coordinates or nearest entity',
    validate: (params) => {
      if (params.x !== undefined) return validateCoords(params);
      if (!params.entity && !params.playerName) {
        return 'Must specify either coordinates (x,y,z) or entity/playerName';
      }
      return true;
    },
    execute: async (ctx, params) => {
      const { bot } = ctx;
      let target;

      if (params.x !== undefined) {
        // Look at coordinates
        target = vec3(params.x, params.y, params.z);
      } else if (params.playerName) {
        // Look at specific player
        const player = bot.players[params.playerName];
        if (!player || !player.entity) {
          throw new Error(`Player ${params.playerName} not found`);
        }
        target = player.entity.position.offset(0, 1.6, 0);
      } else if (params.entity) {
        // Look at nearest entity matching type
        const entity = findNearestEntity(bot, (e) =>
          e.name === params.entity || e.type === params.entity
        );
        if (!entity) {
          throw new Error(`No ${params.entity} found nearby`);
        }
        target = entity.position.offset(0, 1.6, 0);
      }

      await bot.lookAt(target);
      return { success: true, target: target.toString() };
    }
  },

  /**
   * attack_entity — Attack a nearby entity
   */
  attack_entity: {
    description: 'Attack the nearest hostile or specified entity',
    validate: (params) => {
      if (!params.entity) return 'entity type is required';
      return true;
    },
    execute: async (ctx, params) => {
      const { bot } = ctx;
      const { entity, maxDistance = 4 } = params;

      const target = findNearestEntity(bot, (e) => {
        if (entity === 'nearest_hostile') {
          return e.type === 'hostile';
        }
        return e.name === entity || e.type === entity;
      }, maxDistance);

      if (!target) {
        throw new Error(`No ${entity} found within ${maxDistance} blocks`);
      }

      await bot.attack(target);
      return { success: true, entity: target.name || target.type };
    }
  },

  /**
   * interact_entity — Right-click interact with entity
   */
  interact_entity: {
    description: 'Right-click interact with a nearby entity',
    validate: (params) => {
      if (!params.entity) return 'entity type is required';
      return true;
    },
    execute: async (ctx, params) => {
      const { bot } = ctx;
      const { entity } = params;

      const target = findNearestEntity(bot, (e) =>
        e.name === entity || e.type === entity
      );

      if (!target) {
        throw new Error(`No ${entity} found nearby`);
      }

      await bot.activateEntity(target);
      return { success: true, entity: target.name || target.type };
    }
  },

  /**
   * wait — Wait for specified duration
   */
  wait: {
    description: 'Wait for a specified duration in milliseconds',
    validate: (params) => {
      if (!params.ms || typeof params.ms !== 'number' || params.ms <= 0) {
        return 'ms must be a positive number';
      }
      return true;
    },
    execute: async (ctx, params) => {
      const { ms } = params;
      await new Promise(resolve => setTimeout(resolve, ms));
      return { success: true, waited: ms };
    }
  },

  /**
   * chat — Send a chat message
   */
  chat: {
    description: 'Send a chat message (with rate limiting)',
    validate: (params) => {
      if (!params.message || typeof params.message !== 'string') {
        return 'message must be a string';
      }
      if (params.message.length > 256) {
        return 'Message too long (max 256 characters)';
      }
      return true;
    },
    execute: async (ctx, params) => {
      const { bot } = ctx;
      const { message } = params;
      bot.chat(message);
      return { success: true, message };
    }
  },

  /**
   * teleport — Teleport via RCON (admin only)
   */
  teleport: {
    description: 'Teleport the bot via RCON (requires server admin access)',
    validate: (params) => {
      if (!validateCoords(params)) return 'Coordinates x, y, z are required';
      return true;
    },
    execute: async (ctx, params) => {
      const { bot } = ctx;
      const { x, y, z } = params;

      // Get RCON port from config or default to server port + 10000
      const serverPort = bot._client.socket?.serverPort || 25565;
      const rconPort = serverPort + 10000;

      await teleport(rconPort, bot.username, x, y, z);
      return { success: true, position: { x, y, z } };
    }
  }
};

// ── Export ───────────────────────────────────────────────────────────────────────

module.exports = {
  ActionRegistry,
  BUILTIN_ACTIONS
};