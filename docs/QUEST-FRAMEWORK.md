# CraftMind Quest Framework

Universal quest system for cross-game progression on the CraftMind Minecraft server.

## Overview

The Quest Framework provides a unified system for creating, tracking, and rewarding player accomplishments across all CraftMind games: Fishing, Disc Golf, Movie Studio, Education Courses, Ranch, Herding, and Circuits.

---

## Quest Types

### 1. Main Story Quests

Progressive narrative quests that unlock new content and areas.

```json
{
  "questId": "main_fishermans_journey",
  "type": "main_story",
  "chapter": 1,
  "order": 1,
  "title": "The Fisher's First Catch",
  "description": "Old Man Hemlock needs help restocking the lake. Catch your first fish.",
  "games": ["fishing"],
  "objectives": [
    {
      "id": "catch_first_fish",
      "type": "action",
      "target": "catch_fish",
      "count": 1,
      "description": "Catch any fish in Sitka Sound"
    }
  ],
  "rewards": {
    "experience": 100,
    "items": [{"id": "fishing_rod", "nbt": "{Enchantments:[{id:lure,lvl:1}]}" }],
    "unlocks": ["main_fishing_lesson_2", "daily_fishing_basics"]
  },
  "npcDialogue": {
    "start": "dialogue_hemlock_intro",
    "progress": "dialogue_hemlock_encouragement",
    "complete": "dialogue_hemlock_proud"
  },
  "prerequisites": [],
  "timeLimit": null,
  "repeatable": false
}
```

**Example: Disc Golf Main Story**
```json
{
  "questId": "main_disc_golf_tour",
  "type": "main_story",
  "chapter": 1,
  "order": 3,
  "title": "The Coastal Classic",
  "description": "Complete the 9-hole coastal course under par.",
  "games": ["disc_golf"],
  "objectives": [
    {
      "id": "complete_coastal_course",
      "type": "score",
      "target": "coastal_course",
      "condition": "under_par",
      "description": "Finish coastal course under par"
    }
  ],
  "rewards": {
    "experience": 250,
    "items": [{"id": "disc_driver_pro", "count": 1}],
    "unlocks": ["main_mountain_course", "challenge_speed_runs"]
  }
}
```

### 2. Daily Quests

Reset daily, provide steady progression and engagement.

```json
{
  "questId": "daily_fishing_catch_10",
  "type": "daily",
  "title": "Daily Haul",
  "description": "Catch 10 fish today for the market.",
  "games": ["fishing"],
  "objectives": [
    {
      "id": "catch_fish",
      "type": "action",
      "target": "catch_fish",
      "count": 10
    }
  ],
  "rewards": {
    "experience": 50,
    "currency": {"coins": 100, "fisher_tokens": 5},
    "items": []
  },
  "prerequisites": ["main_fishermans_journey"],
  "timeLimit": "daily_reset",
  "repeatable": true,
  "resetSchedule": "0 0 * * *"
}
```

**Example: Ranch Daily**
```json
{
  "questId": "daily_ranch_feed_animals",
  "type": "daily",
  "title": "Morning Chores",
  "description": "Feed all animals at the ranch.",
  "games": ["ranch"],
  "objectives": [
    {
      "id": "feed_chickens",
      "type": "action",
      "target": "feed_animal",
      "entityType": "chicken",
      "count": 8
    },
    {
      "id": "feed_cows",
      "type": "action",
      "target": "feed_animal",
      "entityType": "cow",
      "count": 4
    },
    {
      "id": "collect_eggs",
      "type": "action",
      "target": "collect_item",
      "itemType": "egg",
      "count": 6
    }
  ],
  "rewards": {
    "experience": 75,
    "currency": {"coins": 150, "ranch_rep": 10}
  },
  "timeLimit": "daily_reset",
  "repeatable": true
}
```

### 3. Challenge Quests

Difficult, optional content for skilled players.

```json
{
  "questId": "challenge_legendary_marlin",
  "type": "challenge",
  "title": "The Ghost Marlin",
  "description": "Catch the legendary Ghost Marlin that appears only during storms at midnight.",
  "games": ["fishing"],
  "difficulty": "legendary",
  "objectives": [
    {
      "id": "catch_ghost_marlin",
      "type": "action",
      "target": "catch_fish",
      "fishType": "ghost_marlin",
      "count": 1,
      "conditions": {
        "weather": "storm",
        "timeOfDay": "midnight",
        "moonPhase": "full"
      }
    }
  ],
  "rewards": {
    "experience": 1000,
    "items": [{"id": "fishing_rod_legendary", "nbt": "{Enchantments:[{id:luck_of_the_sea,lvl:5}]}"}],
    "titles": ["Ghost Hunter"],
    "unlocks": ["challenge_kraken"]
  },
  "prerequisites": ["main_fishermans_journey", "fishing_mastery_50"],
  "failureConditions": {
    "fishEscaped": "restart",
    "playerDeath": "fail"
  }
}
```

**Example: Circuits Challenge**
```json
{
  "questId": "challenge_circuit_speedrun",
  "type": "challenge",
  "title": "Lightning Logic",
  "description": "Complete the Advanced Redstone Circuit puzzle in under 60 seconds.",
  "games": ["circuits"],
  "difficulty": "hard",
  "objectives": [
    {
      "id": "complete_puzzle",
      "type": "timed",
      "target": "circuit_puzzle",
      "puzzleId": "advanced_04",
      "timeLimit": 60
    }
  ],
  "rewards": {
    "experience": 500,
    "items": [{"id": "redstone_block", "count": 16}],
    "titles": ["Circuit Master"]
  },
  "prerequisites": ["circuits_tutorial_complete"]
}
```

### 4. Discovery Quests

Hidden objectives that reward exploration and experimentation.

```json
{
  "questId": "discovery_hidden_fishing_spot",
  "type": "discovery",
  "title": "???",
  "description": "???",  // Hidden until discovered
  "games": ["fishing"],
  "hidden": true,
  "triggerConditions": {
    "type": "location",
    "coordinates": {"x": 1234, "z": -5678, "radius": 5},
    "requiredItem": "compass_antique"
  },
  "objectives": [
    {
      "id": "find_secret_cove",
      "type": "discovery",
      "target": "location",
      "locationId": "secret_cove"
    },
    {
      "id": "catch_rare_fish",
      "type": "action",
      "target": "catch_fish",
      "rarity": "rare",
      "count": 1,
      "location": "secret_cove"
    }
  ],
  "rewards": {
    "experience": 300,
    "items": [{"id": "map_treasure_03", "count": 1}],
    "unlocks": ["secret_cove_fast_travel"],
    "achievements": ["explorer_cove_discoverer"]
  }
}
```

**Example: Education Discovery**
```json
{
  "questId": "discovery_hidden_lesson",
  "type": "discovery",
  "title": "???",
  "hidden": true,
  "games": ["education"],
  "triggerConditions": {
    "type": "item_use",
    "itemId": "ancient_textbook",
    "location": "library_ruins"
  },
  "objectives": [
    {
      "id": "read_forgotten_knowledge",
      "type": "interaction",
      "target": "ancient_textbook"
    }
  ],
  "rewards": {
    "experience": 200,
    "unlocks": ["course_advanced_redstone_theory"],
    "achievements": ["scholar_seeker"]
  }
}
```

### 5. Social Quests

Require cooperation between multiple players or bots.

```json
{
  "questId": "social_fishing_derby",
  "type": "social",
  "title": "Sitka Sound Fishing Derby",
  "description": "Compete in a fishing tournament with at least 3 participants.",
  "games": ["fishing"],
  "minParticipants": 3,
  "maxParticipants": 8,
  "objectives": [
    {
      "id": "join_derby",
      "type": "social",
      "action": "join_event",
      "eventId": "fishing_derby"
    },
    {
      "id": "catch_most_fish",
      "type": "competition",
      "target": "catch_fish",
      "winCondition": "highest_count"
    }
  ],
  "rewards": {
    "winner": {
      "experience": 500,
      "items": [{"id": "trophy_gold_fishing", "count": 1}],
      "titles": ["Derby Champion"]
    },
    "participant": {
      "experience": 100,
      "items": [{"id": "participation_badge", "count": 1}]
    }
  },
  "schedule": {
    "type": "weekly",
    "day": "saturday",
    "time": "14:00"
  }
}
```

**Example: Movie Studio Collaboration**
```json
{
  "questId": "social_movie_blockbuster",
  "type": "social",
  "title": "Blockbuster Production",
  "description": "Create a film with a full crew: director, actor, camera operator, and editor.",
  "games": ["movie_studio"],
  "roles": {
    "director": {"min": 1, "max": 1},
    "actor": {"min": 1, "max": 4},
    "camera_operator": {"min": 1, "max": 2},
    "editor": {"min": 1, "max": 1}
  },
  "objectives": [
    {
      "id": "assign_roles",
      "type": "social",
      "action": "role_assignment"
    },
    {
      "id": "film_scene",
      "type": "cooperative",
      "action": "record_scene",
      "count": 5,
      "requiresAllRoles": true
    },
    {
      "id": "edit_final_cut",
      "type": "cooperative",
      "action": "complete_edit"
    }
  ],
  "rewards": {
    "shared": {
      "experience": 400,
      "currency": {"studio_credits": 500}
    },
    "director": {"titles": ["Visionary Director"]},
    "actor": {"titles": ["Rising Star"]},
    "camera_operator": {"titles": ["Master Cinematographer"]},
    "editor": {"titles": ["Final Cut Pro"]}
  }
}
```

---

## Quest Registration API

### TypeScript Interfaces

```typescript
// === Core Quest Types ===

interface Quest {
  questId: string;
  type: QuestType;
  title: string;
  description: string;
  games: GameId[];
  objectives: QuestObjective[];
  rewards: QuestRewards;
  prerequisites: string[];
  timeLimit?: TimeLimit | null;
  repeatable: boolean;
  hidden?: boolean;
  npcDialogue?: NPCDialogueMapping;
  metadata?: QuestMetadata;
}

type QuestType = 'main_story' | 'daily' | 'challenge' | 'discovery' | 'social';

type GameId = 'fishing' | 'disc_golf' | 'movie_studio' | 'education' | 'ranch' | 'herding' | 'circuits';

interface QuestObjective {
  id: string;
  type: ObjectiveType;
  target: string;
  count?: number;
  description?: string;
  conditions?: ObjectiveConditions;
}

type ObjectiveType =
  | 'action'      // Perform an action (catch, craft, kill, etc.)
  | 'score'       // Achieve a score
  | 'timed'       // Complete within time limit
  | 'discovery'   // Find something hidden
  | 'collection'  // Collect items
  | 'interaction' // Interact with object/NPC
  | 'social'      // Multiplayer interaction
  | 'competition' // Competitive objective
  | 'cooperative' // Requires teamwork
  | 'location';   // Reach a location

interface ObjectiveConditions {
  weather?: WeatherCondition;
  timeOfDay?: TimeCondition;
  moonPhase?: MoonPhase;
  location?: string;
  entityType?: string;
  itemType?: string;
  fishType?: string;
  rarity?: Rarity;
  puzzleId?: string;
  requiredItem?: string;
  [key: string]: unknown;  // Game-specific conditions
}

// === Rewards ===

interface QuestRewards {
  experience: number;
  currency?: Record<string, number>;
  items?: RewardItem[];
  unlocks?: string[];
  titles?: string[];
  achievements?: string[];
}

interface RewardItem {
  id: string;
  count?: number;
  nbt?: string;
}

// === Time and Scheduling ===

interface TimeLimit {
  type: 'duration' | 'daily_reset' | 'weekly_reset' | 'absolute';
  value?: number; // Duration in seconds for 'duration' type
  absolute?: string; // ISO timestamp for 'absolute'
}

interface QuestSchedule {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  day?: number | string; // Day of week (0-6) or month (1-31)
  time?: string; // HH:MM format
  cron?: string; // Custom cron expression
}

// === NPC Integration ===

interface NPCDialogueMapping {
  start?: string;
  progress?: string;
  complete?: string;
  fail?: string;
  hint?: string;
}

interface NPCDialogue {
  dialogueId: string;
  npcId: string;
  questId?: string;
  triggers: DialogueTrigger[];
  lines: DialogueLine[];
  responses?: DialogueResponse[];
}

interface DialogueLine {
  speaker: string;
  text: string;
  emote?: string;
  delay?: number;
}

interface DialogueResponse {
  text: string;
  action: DialogueAction;
  requiresQuestState?: string;
}

type DialogueAction =
  | { type: 'accept_quest'; questId: string }
  | { type: 'show_hint'; hintId: string }
  | { type: 'continue_dialogue'; dialogueId: string }
  | { type: 'give_item'; itemId: string; count: number }
  | { type: 'teleport'; location: string };

// === Quest Metadata ===

interface QuestMetadata {
  chapter?: number;
  order?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'legendary';
  estimatedTime?: number; // Minutes
  tags?: string[];
  version?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

// === Prerequisites ===

interface QuestPrerequisite {
  type: 'quest_complete' | 'level' | 'item' | 'skill' | 'achievement' | 'reputation';
  target: string;
  operator?: 'gte' | 'lte' | 'eq' | 'neq';
  value?: number | string | boolean;
}
```

### Quest Registry API

```typescript
// === QuestRegistry - Core registration system ===

interface QuestRegistry {
  /**
   * Register a new quest. Called by game plugins during initialization.
   */
  register(quest: Quest): Promise<RegistrationResult>;

  /**
   * Unregister a quest. Only allowed for non-active quests.
   */
  unregister(questId: string): Promise<boolean>;

  /**
   * Get quest definition by ID.
   */
  get(questId: string): Quest | null;

  /**
   * Query quests by filters.
   */
  query(filters: QuestQueryFilters): Quest[];

  /**
   * Get all quests for a specific game.
   */
  getByGame(gameId: GameId): Quest[];

  /**
   * Get all quests of a specific type.
   */
  getByType(type: QuestType): Quest[];

  /**
   * Validate quest definition before registration.
   */
  validate(quest: Quest): ValidationResult;
}

interface RegistrationResult {
  success: boolean;
  questId: string;
  errors?: string[];
  warnings?: string[];
}

interface QuestQueryFilters {
  type?: QuestType;
  game?: GameId;
  difficulty?: string;
  hidden?: boolean;
  prerequisitesMet?: string[];
  tags?: string[];
}

// === Plugin Integration Hook ===

interface QuestPluginHook {
  /**
   * Called by game plugins to register their quests.
   * Should be called in plugin's load() or init() method.
   */
  registerQuests(registry: QuestRegistry): Promise<void>;

  /**
   * Called when a quest objective progress event occurs in this game.
   */
  onObjectiveProgress?(event: ObjectiveProgressEvent): void;

  /**
   * Called when a quest is completed involving this game.
   */
  onQuestComplete?(event: QuestCompleteEvent): void;
}

// === Example Plugin Registration ===

// In fishing-plugin.js:
async function load(ctx) {
  const { questRegistry } = ctx;

  // Register fishing quests
  await questRegistry.register({
    questId: 'daily_fishing_variety',
    type: 'daily',
    title: 'Eclectic Angler',
    description: 'Catch 5 different species of fish today.',
    games: ['fishing'],
    objectives: [
      {
        id: 'catch_variety',
        type: 'collection',
        target: 'unique_fish_species',
        count: 5
      }
    ],
    rewards: {
      experience: 75,
      currency: { fisher_tokens: 10 }
    },
    prerequisites: ['main_fishermans_journey'],
    timeLimit: { type: 'daily_reset' },
    repeatable: true
  });
}
```

---

## Progress Tracking Schema

### Player Quest Progress

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PlayerQuestProgress",
  "type": "object",
  "properties": {
    "playerId": {
      "type": "string",
      "description": "Minecraft UUID or bot ID"
    },
    "playerName": {
      "type": "string"
    },
    "activeQuests": {
      "type": "array",
      "items": { "$ref": "#/definitions/ActiveQuest" }
    },
    "completedQuests": {
      "type": "array",
      "items": { "$ref": "#/definitions/CompletedQuest" }
    },
    "failedQuests": {
      "type": "array",
      "items": { "$ref": "#/definitions/FailedQuest" }
    },
    "dailyResetTime": {
      "type": "string",
      "format": "date-time"
    },
    "statistics": { "$ref": "#/definitions/QuestStatistics" }
  },
  "required": ["playerId", "activeQuests", "completedQuests"],

  "definitions": {
    "ActiveQuest": {
      "type": "object",
      "properties": {
        "questId": { "type": "string" },
        "startedAt": { "type": "string", "format": "date-time" },
        "expiresAt": { "type": "string", "format": "date-time" },
        "objectives": {
          "type": "array",
          "items": { "$ref": "#/definitions/ObjectiveProgress" }
        },
        "currentStage": { "type": "integer" },
        "flags": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      },
      "required": ["questId", "startedAt", "objectives"]
    },

    "ObjectiveProgress": {
      "type": "object",
      "properties": {
        "objectiveId": { "type": "string" },
        "current": { "type": "integer" },
        "target": { "type": "integer" },
        "completed": { "type": "boolean" },
        "metadata": {
          "type": "object",
          "description": "Game-specific tracking data"
        }
      },
      "required": ["objectiveId", "current", "target", "completed"]
    },

    "CompletedQuest": {
      "type": "object",
      "properties": {
        "questId": { "type": "string" },
        "completedAt": { "type": "string", "format": "date-time" },
        "completionTime": { "type": "integer", "description": "Seconds to complete" },
        "rewards": { "$ref": "#/definitions/ClaimedRewards" }
      },
      "required": ["questId", "completedAt"]
    },

    "FailedQuest": {
      "type": "object",
      "properties": {
        "questId": { "type": "string" },
        "failedAt": { "type": "string", "format": "date-time" },
        "reason": { "type": "string" },
        "canRetry": { "type": "boolean" },
        "retryAvailableAt": { "type": "string", "format": "date-time" }
      },
      "required": ["questId", "failedAt", "reason"]
    },

    "ClaimedRewards": {
      "type": "object",
      "properties": {
        "experience": { "type": "integer" },
        "currency": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        },
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "itemId": { "type": "string" },
              "count": { "type": "integer" }
            }
          }
        },
        "claimedAt": { "type": "string", "format": "date-time" }
      }
    },

    "QuestStatistics": {
      "type": "object",
      "properties": {
        "totalCompleted": { "type": "integer" },
        "byType": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        },
        "byGame": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        },
        "streakDays": { "type": "integer" },
        "longestStreak": { "type": "integer" },
        "totalExperienceEarned": { "type": "integer" }
      }
    }
  }
}
```

### Example Progress File

```json
{
  "playerId": "cody_a_bot_001",
  "playerName": "Cody_A",
  "activeQuests": [
    {
      "questId": "daily_fishing_catch_10",
      "startedAt": "2026-03-27T00:00:00Z",
      "expiresAt": "2026-03-28T00:00:00Z",
      "objectives": [
        {
          "objectiveId": "catch_fish",
          "current": 7,
          "target": 10,
          "completed": false,
          "metadata": {
            "lastCatchAt": "2026-03-27T14:32:00Z",
            "species": ["salmon", "cod", "bass"]
          }
        }
      ]
    },
    {
      "questId": "multi_legendary_feast",
      "startedAt": "2026-03-26T10:00:00Z",
      "objectives": [
        {
          "objectiveId": "catch_legendary",
          "current": 1,
          "target": 1,
          "completed": true
        },
        {
          "objectiveId": "cook_recipe",
          "current": 0,
          "target": 1,
          "completed": false
        },
        {
          "objectiveId": "film_show",
          "current": 0,
          "target": 1,
          "completed": false
        }
      ],
      "currentStage": 2
    }
  ],
  "completedQuests": [
    {
      "questId": "main_fishermans_journey",
      "completedAt": "2026-03-20T09:15:00Z",
      "completionTime": 300,
      "rewards": {
        "experience": 100,
        "items": [{"itemId": "fishing_rod_lure_1", "count": 1}],
        "claimedAt": "2026-03-20T09:15:05Z"
      }
    }
  ],
  "failedQuests": [],
  "dailyResetTime": "2026-03-28T00:00:00Z",
  "statistics": {
    "totalCompleted": 47,
    "byType": {
      "main_story": 5,
      "daily": 38,
      "challenge": 2,
      "discovery": 1,
      "social": 1
    },
    "byGame": {
      "fishing": 35,
      "disc_golf": 4,
      "movie_studio": 3,
      "ranch": 3,
      "herding": 1,
      "circuits": 1,
      "education": 0
    },
    "streakDays": 12,
    "longestStreak": 15,
    "totalExperienceEarned": 4250
  }
}
```

---

## Reward System

### Reward Types Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RewardSystem",
  "definitions": {
    "Reward": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["experience", "currency", "item", "title", "achievement", "unlock", "custom"]
        },
        "value": { "type": ["number", "string", "object"] },
        "rarity": {
          "type": "string",
          "enum": ["common", "uncommon", "rare", "epic", "legendary"]
        }
      }
    },

    "CurrencyReward": {
      "type": "object",
      "properties": {
        "coins": { "type": "integer", "description": "Universal currency" },
        "fisher_tokens": { "type": "integer", "description": "Fishing game currency" },
        "studio_credits": { "type": "integer", "description": "Movie studio currency" },
        "ranch_rep": { "type": "integer", "description": "Ranch reputation points" },
        "herder_badges": { "type": "integer", "description": "Herding achievement currency" },
        "edu_points": { "type": "integer", "description": "Education course points" },
        "circuit_chips": { "type": "integer", "description": "Circuits game currency" },
        "disc_trophies": { "type": "integer", "description": "Disc golf trophies" }
      }
    }
  }
}
```

### Reward Claiming API

```typescript
interface RewardClaimer {
  /**
   * Claim all pending rewards for a completed quest.
   */
  claimQuestRewards(playerId: string, questId: string): Promise<ClaimResult>;

  /**
   * Check if player has unclaimed rewards.
   */
  hasUnclaimedRewards(playerId: string): Promise<boolean>;

  /**
   * Get list of unclaimed rewards.
   */
  getUnclaimedRewards(playerId: string): Promise<UnclaimedReward[]>;

  /**
   * Convert between currency types.
   */
  convertCurrency(
    from: string,
    to: string,
    amount: number
  ): Promise<ConversionResult>;
}

interface ClaimResult {
  success: boolean;
  rewards: ClaimedReward[];
  errors?: string[];
  totalExperience: number;
  newUnlocks: string[];
}

interface ClaimedReward {
  type: string;
  description: string;
  quantity: number;
  delivered: boolean;
}

interface ConversionResult {
  success: boolean;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
}
```

### Reward Tiers

```typescript
const REWARD_TIERS = {
  // Quest type -> base experience multiplier
  experienceMultipliers: {
    main_story: 1.0,
    daily: 0.5,
    challenge: 2.5,
    discovery: 1.5,
    social: 1.25
  },

  // Difficulty -> reward multiplier
  difficultyMultipliers: {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
    legendary: 4.0
  },

  // Streak bonuses
  streakBonuses: {
    7: 1.1,   // 10% bonus after 7 day streak
    14: 1.25, // 25% bonus after 14 day streak
    30: 1.5   // 50% bonus after 30 day streak
  }
};
```

---

## NPC Dialogue Integration

### Dialogue System Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "NPCDialogueSystem",
  "type": "object",
  "properties": {
    "npcId": { "type": "string" },
    "name": { "type": "string" },
    "location": {
      "type": "object",
      "properties": {
        "world": { "type": "string" },
        "x": { "type": "number" },
        "y": { "type": "number" },
        "z": { "type": "number" }
      }
    },
    "dialogues": {
      "type": "array",
      "items": { "$ref": "#/definitions/Dialogue" }
    },
    "defaultGreeting": { "type": "string" },
    "questGiver": { "type": "boolean" }
  },

  "definitions": {
    "Dialogue": {
      "type": "object",
      "properties": {
        "dialogueId": { "type": "string" },
        "trigger": {
          "type": "object",
          "properties": {
            "type": { "type": "string", "enum": ["interaction", "proximity", "quest_event", "time"] },
            "condition": { "type": "string" }
          }
        },
        "lines": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "text": { "type": "string" },
              "delay": { "type": "number" },
              "sound": { "type": "string" }
            }
          }
        },
        "options": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "text": { "type": "string" },
              "requiresQuest": { "type": "string" },
              "requiresQuestState": { "type": "string", "enum": ["available", "active", "completed"] },
              "action": { "$ref": "#/definitions/DialogueAction" }
            }
          }
        }
      }
    },

    "DialogueAction": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["accept_quest", "abandon_quest", "turn_in_quest", "show_hint", "open_shop", "teleport"]
        },
        "questId": { "type": "string" },
        "targetId": { "type": "string" }
      }
    }
  }
}
```

### Example NPC Configuration

```json
{
  "npcId": "npc_old_man_hemlock",
  "name": "Old Man Hemlock",
  "location": { "world": "sitka_sound", "x": 234, "y": 64, "z": -890 },
  "defaultGreeting": "Ah, another young angler. The sound's been good to me for sixty years...",
  "questGiver": true,
  "dialogues": [
    {
      "dialogueId": "dialogue_hemlock_intro",
      "trigger": { "type": "quest_event", "condition": "main_fishermans_journey:available" },
      "lines": [
        { "text": "Young one, the waters of Sitka Sound hold many secrets.", "delay": 0 },
        { "text": "I've fished these waters since before your parents were born.", "delay": 2000 },
        { "text": "The market needs fresh fish, and I'm too old to catch them myself.", "delay": 4000 },
        { "text": "Would you help an old fisherman and catch your first fish?", "delay": 6000 }
      ],
      "options": [
        {
          "text": "I'd be happy to help! What do I need?",
          "requiresQuestState": "available",
          "action": { "type": "accept_quest", "questId": "main_fishermans_journey" }
        },
        {
          "text": "Maybe later, old timer.",
          "action": {}
        }
      ]
    },
    {
      "dialogueId": "dialogue_hemlock_proud",
      "trigger": { "type": "quest_event", "condition": "main_fishermans_journey:completed" },
      "lines": [
        { "text": "Ha! I knew you had it in you!", "delay": 0 },
        { "text": "That's a fine catch for your first. Take this rod - it's served me well.", "delay": 2000 },
        { "text": "Come back tomorrow, there's always more work for willing hands.", "delay": 4000 }
      ],
      "options": [
        {
          "text": "Thank you, sir. I'll be back.",
          "action": { "type": "turn_in_quest", "questId": "main_fishermans_journey" }
        }
      ]
    },
    {
      "dialogueId": "dialogue_hemlock_hint",
      "trigger": { "type": "interaction" },
      "lines": [
        { "text": "Psst - have you tried fishing during a storm? The big ones come out then.", "delay": 0 }
      ],
      "options": [
        {
          "text": "Tell me more about legendary fish.",
          "requiresQuest": "challenge_legendary_marlin",
          "action": { "type": "show_hint", "targetId": "hint_legendary_fish" }
        }
      ]
    }
  ]
}
```

---

## Multi-Stage Cross-Game Quests

### Multi-Stage Quest Schema

```typescript
interface MultiStageQuest extends Quest {
  type: 'main_story' | 'challenge';
  stages: QuestStage[];
  stageFlow: StageFlow;
  crossGameProgression: boolean;
}

interface QuestStage {
  stageId: number;
  title: string;
  description: string;
  games: GameId[];
  objectives: QuestObjective[];
  rewards?: Partial<QuestRewards>; // Stage-specific rewards
  transition: StageTransition;
}

interface StageTransition {
  type: 'auto' | 'npc_dialogue' | 'manual';
  npcId?: string;
  dialogueId?: string;
  delay?: number; // Auto-transition delay in seconds
}

interface StageFlow {
  linear: boolean;
  branches?: Record<string, number[]>; // Branch stage -> next stages
  mergePoint?: number; // Stage where branches rejoin
}
```

### Example: "The Legendary Feast" (Cross-Game Quest)

```json
{
  "questId": "multi_legendary_feast",
  "type": "main_story",
  "chapter": 3,
  "title": "The Legendary Feast",
  "description": "A cross-game journey: catch a legendary fish, prepare it at the ranch, and broadcast your cooking show.",
  "games": ["fishing", "ranch", "movie_studio"],
  "crossGameProgression": true,
  "stages": [
    {
      "stageId": 1,
      "title": "The Ghost of the Deep",
      "description": "Catch the legendary Ghost Marlin during a midnight storm.",
      "games": ["fishing"],
      "objectives": [
        {
          "id": "catch_ghost_marlin",
          "type": "action",
          "target": "catch_fish",
          "fishType": "ghost_marlin",
          "count": 1,
          "conditions": {
            "weather": "storm",
            "timeOfDay": "midnight",
            "moonPhase": "full"
          },
          "description": "Catch the Ghost Marlin"
        }
      ],
      "rewards": {
        "experience": 300,
        "items": [{"id": "ghost_marlin_trophy", "count": 1}]
      },
      "transition": {
        "type": "npc_dialogue",
        "npcId": "npc_chef_marco",
        "dialogueId": "dialogue_marco_marlin_caught"
      }
    },
    {
      "stageId": 2,
      "title": "The Secret Recipe",
      "description": "Bring the Ghost Marlin to Chef Marco at the Ranch and learn his secret recipe.",
      "games": ["ranch"],
      "objectives": [
        {
          "id": "deliver_marlin",
          "type": "interaction",
          "target": "npc_chef_marco",
          "requiredItem": "ghost_marlin_raw",
          "description": "Deliver the Ghost Marlin to Chef Marco"
        },
        {
          "id": "gather_herbs",
          "type": "action",
          "target": "harvest",
          "itemType": "midnight_basil",
          "count": 5,
          "description": "Gather midnight basil from the ranch garden"
        },
        {
          "id": "cook_recipe",
          "type": "action",
          "target": "craft_item",
          "itemType": "ghost_marlin_marco_style",
          "count": 1,
          "description": "Prepare Ghost Marlin Marco Style"
        }
      ],
      "rewards": {
        "experience": 400,
        "items": [{"id": "recipe_marco_legendary", "count": 1}],
        "unlocks": ["recipe_ghost_marlin_feast"]
      },
      "transition": {
        "type": "auto",
        "delay": 0
      }
    },
    {
      "stageId": 3,
      "title": "Lights, Camera, Cooking!",
      "description": "Film your legendary cooking show at the Movie Studio and broadcast it.",
      "games": ["movie_studio"],
      "objectives": [
        {
          "id": "set_up_kitchen_set",
          "type": "action",
          "target": "build_set",
          "setTheme": "cooking_show",
          "description": "Set up the cooking show set"
        },
        {
          "id": "film_cooking_segment",
          "type": "action",
          "target": "record_scene",
          "sceneType": "cooking_demonstration",
          "duration": 120,
          "description": "Film the cooking demonstration"
        },
        {
          "id": "edit_final_cut",
          "type": "action",
          "target": "edit_film",
          "filmType": "cooking_show",
          "quality": "broadcast",
          "description": "Edit the final broadcast"
        },
        {
          "id": "broadcast_show",
          "type": "action",
          "target": "broadcast",
          "channel": "sitka_cooking_network",
          "description": "Broadcast your cooking show"
        }
      ],
      "rewards": {
        "experience": 500,
        "currency": {
          "studio_credits": 1000,
          "ranch_rep": 500,
          "fisher_tokens": 250
        },
        "titles": ["Culinary Star"],
        "achievements": ["cross_game_master"]
      },
      "transition": {
        "type": "npc_dialogue",
        "npcId": "npc_studio_director",
        "dialogueId": "dialogue_director_broadcast_complete"
      }
    }
  ],
  "stageFlow": {
    "linear": true
  },
  "rewards": {
    "experience": 1200,
    "items": [
      {"id": "trophie_golden_feast", "count": 1},
      {"id": "outfit_celebrity_chef", "count": 1}
    ],
    "titles": ["Legendary Chef", "Broadcast Star"],
    "unlocks": ["multi_mythic_documentary", "challenge_speed_cooking"]
  },
  "prerequisites": [
    "main_fishermans_journey",
    "ranch_cooking_basics",
    "studio_broadcaster_license"
  ],
  "timeLimit": null,
  "repeatable": false
}
```

### More Cross-Game Examples

**"The Education Circuit"** (Education → Circuits → Disc Golf)
```json
{
  "questId": "multi_education_circuit",
  "type": "main_story",
  "title": "The Education Circuit",
  "description": "Learn redstone theory, build a practical circuit, then design a disc golf obstacle course.",
  "games": ["education", "circuits", "disc_golf"],
  "stages": [
    {
      "stageId": 1,
      "title": "Redstone Academy",
      "games": ["education"],
      "objectives": [
        {"id": "complete_course", "type": "action", "target": "complete_course", "courseId": "redstone_101", "count": 1}
      ]
    },
    {
      "stageId": 2,
      "title": "Practical Application",
      "games": ["circuits"],
      "objectives": [
        {"id": "build_piston_system", "type": "action", "target": "complete_puzzle", "puzzleId": "piston_timing_advanced"},
        {"id": "no_hints", "type": "condition", "target": "hint_count", "operator": "eq", "value": 0}
      ]
    },
    {
      "stageId": 3,
      "title": "Course Designer",
      "games": ["disc_golf"],
      "objectives": [
        {"id": "build_obstacle", "type": "action", "target": "place_block", "itemType": "piston", "count": 8},
        {"id": "test_course", "type": "action", "target": "complete_course", "courseId": "custom_redstone_hazard"},
        {"id": "get_rating", "type": "social", "target": "course_rating", "operator": "gte", "value": 4.0}
      ]
    }
  ]
}
```

**"Herding Movie Magic"** (Herding → Movie Studio)
```json
{
  "questId": "multi_herding_movie",
  "type": "main_story",
  "title": "Herding Movie Magic",
  "description": "Master herding techniques, then coordinate an animal scene for a western movie.",
  "games": ["herding", "movie_studio"],
  "stages": [
    {
      "stageId": 1,
      "title": "Range Rodeo",
      "games": ["herding"],
      "objectives": [
        {"id": "herd_cattle", "type": "action", "target": "herd_animals", "entityType": "cow", "count": 10, "timeLimit": 120},
        {"id": "no_losses", "type": "condition", "target": "animals_lost", "operator": "eq", "value": 0}
      ]
    },
    {
      "stageId": 2,
      "title": "Western Action",
      "games": ["movie_studio"],
      "objectives": [
        {"id": "direct_scene", "type": "action", "target": "direct_scene", "sceneType": "cattle_drive"},
        {"id": "animal_cooperation", "type": "cooperative", "target": "animal_actors", "count": 10}
      ]
    }
  ]
}
```

---

## Prerequisites and Dependency Chains

### Prerequisite System Schema

```typescript
interface PrerequisiteSystem {
  /**
   * Check if player meets all prerequisites for a quest.
   */
  checkPrerequisites(playerId: string, questId: string): Promise<PrerequisiteResult>;

  /**
   * Get all quests that unlock from completing a specific quest.
   */
  getUnlockedQuests(questId: string): Promise<string[]>;

  /**
   * Get the full dependency chain for a quest.
   */
  getDependencyChain(questId: string): Promise<QuestDependencyNode>;

  /**
   * Validate that a new quest's prerequisites are resolvable.
   */
  validatePrerequisites(quest: Quest): Promise<ValidationResult>;
}

interface PrerequisiteResult {
  met: boolean;
  missing: PrerequisiteFailure[];
  canAutoAccept: boolean;
}

interface PrerequisiteFailure {
  type: string;
  target: string;
  required: string | number | boolean;
  current?: string | number | boolean;
  description: string;
}

interface QuestDependencyNode {
  questId: string;
  directPrerequisites: string[];
  allPrerequisites: string[];
  directlyUnlocks: string[];
  allUnlocks: string[];
  depth: number;
}
```

### Prerequisite Types

```typescript
type PrerequisiteType =
  | 'quest_complete'      // Must complete another quest
  | 'quest_stage'         // Must reach a stage in multi-stage quest
  | 'level'               // Player/experience level requirement
  | 'item'                // Must have item in inventory
  | 'skill'               // Skill level in specific game
  | 'achievement'         // Must have earned achievement
  | 'reputation'          // Faction/game reputation threshold
  | 'time'                // Real-time or in-game time requirement
  | 'location'            // Must have visited location
  | 'social';             // Requires other players

interface Prerequisite {
  type: PrerequisiteType;
  target: string;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  value?: number | string | boolean | PrerequisiteValue;
  description?: string;
}

interface PrerequisiteValue {
  min?: number;
  max?: number;
  oneOf?: (string | number)[];
  timeRange?: {
    start: string; // HH:MM
    end: string;
  };
  dateRange?: {
    start: string; // ISO date
    end: string;
  };
}
```

### Prerequisite Examples

```json
[
  {
    "type": "quest_complete",
    "target": "main_fishermans_journey",
    "description": "Complete 'The Fisher's First Catch'"
  },
  {
    "type": "level",
    "target": "fishing",
    "operator": "gte",
    "value": 25,
    "description": "Fishing level 25 or higher"
  },
  {
    "type": "item",
    "target": "diamond_fishing_rod",
    "operator": "eq",
    "value": true,
    "description": "Own a Diamond Fishing Rod"
  },
  {
    "type": "skill",
    "target": "casting_accuracy",
    "operator": "gte",
    "value": 75,
    "description": "Casting Accuracy skill at 75+"
  },
  {
    "type": "achievement",
    "target": "catch_100_fish",
    "description": "Have 'Master Angler' achievement"
  },
  {
    "type": "reputation",
    "target": "fishers_guild",
    "operator": "gte",
    "value": 1000,
    "description": "Fisher's Guild reputation 1000+"
  },
  {
    "type": "time",
    "target": "real_time",
    "value": {
      "timeRange": {"start": "18:00", "end": "22:00"}
    },
    "description": "Available 6PM-10PM server time"
  },
  {
    "type": "quest_stage",
    "target": "multi_legendary_feast",
    "operator": "gte",
    "value": 2,
    "description": "Reached stage 2 of 'The Legendary Feast'"
  },
  {
    "type": "social",
    "target": "party_size",
    "operator": "gte",
    "value": 3,
    "description": "In a party of 3+ players"
  }
]
```

### Dependency Chain Visualization

```
main_fishermans_journey (depth: 0)
├── daily_fishing_catch_10 (depth: 1)
├── fishing_mastery_10 (depth: 1)
│   └── challenge_storm_fisher (depth: 2)
│       └── challenge_legendary_marlin (depth: 3)
│           └── multi_legendary_feast (depth: 4)
│               ├── stage 1: fishing (Ghost Marlin)
│               ├── stage 2: ranch (Cook recipe)
│               └── stage 3: movie_studio (Broadcast)
└── main_fishing_lesson_2 (depth: 1)
    └── main_fishing_lesson_3 (depth: 2)
        └── fishing_mastery_25 (depth: 3)
```

### Quest Lock Resolution

```typescript
class QuestLockResolver {
  /**
   * Determines which prerequisites to show as "locked" vs "available soon".
   * Used for UI display of locked quests.
   */
  async getLockStatus(playerId: string, questId: string): Promise<LockStatus> {
    const result = await this.prereqSystem.checkPrerequisites(playerId, questId);

    const locks = result.missing.map(failure => ({
      type: failure.type,
      target: failure.target,
      description: failure.description,
      progress: this.calculateProgress(failure),
      achievable: this.isAchievable(failure)
    }));

    return {
      locked: !result.met,
      locks: locks,
      nextUnlockPath: this.findShortestPath(result.missing)
    };
  }

  private calculateProgress(failure: PrerequisiteFailure): number {
    // For level/skill/reputation prerequisites
    if (typeof failure.current === 'number' && typeof failure.required === 'number') {
      return Math.min(100, (failure.current / failure.required) * 100);
    }
    // For quest prerequisites: binary (0% or 100%)
    if (failure.type === 'quest_complete') {
      return failure.current ? 100 : 0;
    }
    return 0;
  }

  private findShortestPath(missing: PrerequisiteFailure[]): string[] {
    // BFS to find shortest path to unlock all prerequisites
    // Returns ordered list of quests/actions to take
    return [];
  }
}
```

---

## Implementation Checklist

### Phase 1: Core Framework
- [ ] Define `QuestRegistry` interface in `src/quest-system/registry.js`
- [ ] Implement quest storage (JSON file-based for MVP)
- [ ] Create `QuestValidator` for quest definition validation
- [ ] Build prerequisite checking system

### Phase 2: Progress Tracking
- [ ] Implement `PlayerProgressStore` for tracking player quest state
- [ ] Create objective progress event system
- [ ] Build daily/weekly reset scheduler
- [ ] Add progress persistence to disk

### Phase 3: Game Plugin Integration
- [ ] Create `QuestPluginHook` interface
- [ ] Integrate with fishing-plugin.js
- [ ] Add quest objective emission on game events
- [ ] Test cross-game progress tracking

### Phase 4: Rewards & NPCs
- [ ] Implement `RewardClaimer` system
- [ ] Create reward delivery mechanism (items, XP, unlocks)
- [ ] Build NPC dialogue trigger system
- [ ] Test NPC-quest interactions

### Phase 5: Multi-Stage Quests
- [ ] Implement stage progression engine
- [ ] Build cross-game handoff system
- [ ] Create stage transition handlers
- [ ] Test full "Legendary Feast" quest chain

---

## File Structure

```
craftmind/
├── src/
│   ├── quest-system/
│   │   ├── index.js              # Module exports
│   │   ├── registry.js           # Quest registration and lookup
│   │   ├── progress-store.js     # Player progress persistence
│   │   ├── prerequisite.js       # Prerequisite checking
│   │   ├── rewards.js            # Reward claiming system
│   │   ├── stages.js             # Multi-stage quest handling
│   │   ├── scheduler.js          # Daily/weekly reset handling
│   │   └── validator.js          # Quest definition validation
│   ├── quest-definitions/
│   │   ├── fishing/
│   │   │   ├── main-story.json
│   │   │   ├── daily.json
│   │   │   ├── challenge.json
│   │   │   └── discovery.json
│   │   ├── disc-golf/
│   │   ├── movie-studio/
│   │   ├── education/
│   │   ├── ranch/
│   │   ├── herding/
│   │   ├── circuits/
│   │   └── cross-game/
│   │       └── legendary-feast.json
│   └── npc-dialogues/
│       ├── hemlock.json
│       └── chef-marco.json
├── data/
│   └── player-progress/
│       └── cody_a_progress.json
└── tests/
    └── quest-system/
        ├── registry.test.js
        ├── progress-store.test.js
        ├── prerequisite.test.js
        ├── rewards.test.js
        └── stages.test.js
```

---

## Notes

- Quest definitions are immutable once registered; modify version for changes
- Progress files should be player-specific, not shared
- Use event-driven architecture for objective progress (don't poll)
- Cross-game quests require all game plugins to be loaded
- NPC dialogues can reference quests by ID; system resolves current state
- Daily reset should respect server timezone (configurable)
- Consider Redis/memory cache for active quest data in production
