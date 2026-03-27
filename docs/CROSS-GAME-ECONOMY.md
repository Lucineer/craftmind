# Cross-Game Economy System

**CraftMind Minecraft Server** — Unified economy across all game modes

---

## Overview

This document defines a unified economy system connecting six game modes: Fishing, Disc Golf, Movie Studio, Education Courses, Ranch, Herding, and Circuits. Players earn currency, XP, and items that transfer between games, creating a cohesive progression system.

### Design Principles

1. **No dead currency** — Every game earns and spends the same currency
2. **Skill transfer** — XP in one game provides small bonuses in others
3. **Specialization reward** — Focused players unlock unique perks
4. **Inflation control** — Sinks balanced against earn rates
5. **Casual-friendly** — Daily caps prevent hardcore domination

---

## Currency System

### Primary Currency: Credits (🪙)

The universal currency earned and spent across all games.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Currency",
  "type": "object",
  "properties": {
    "credits": { "type": "integer", "minimum": 0, "description": "Primary currency" },
    "premiumCredits": { "type": "integer", "minimum": 0, "description": "Event/special currency (non-tradeable)" }
  },
  "required": ["credits"]
}
```

### Earn Rates by Game

| Game | Base Action | Credits Earned | Time/Action | Effective Rate |
|------|-------------|----------------|-------------|----------------|
| **Fishing** | Catch fish | 10-50 (by rarity) | 30-90s | 20-60/hr |
| **Disc Golf** | Complete hole | 25-100 (by par) | 2-5 min | 40-80/hr |
| **Movie Studio** | Complete scene | 50-200 (by role) | 5-15 min | 30-60/hr |
| **Education** | Complete lesson | 75-150 | 3-10 min | 40-80/hr |
| **Ranch** | Harvest product | 15-60 | 2-8 min | 20-50/hr |
| **Herding** | Deliver herd | 100-300 | 10-20 min | 30-50/hr |
| **Circuits** | Solve puzzle | 30-80 | 2-5 min | 40-70/hr |

#### Detailed Earn Tables

**Fishing — Credit Values by Catch**
```json
{
  "catchValues": {
    "common": { "fish": ["Cod", "Salmon"], "credits": 10, "xp": 5 },
    "uncommon": { "fish": ["Tropical Fish", "Pufferfish"], "credits": 25, "xp": 12 },
    "rare": { "fish": ["Golden Salmon", "Midnight Bass"], "credits": 50, "xp": 25 },
    "legendary": { "fish": ["Crystal Koi", "Void Eel"], "credits": 150, "xp": 75 },
    "treasure": { "items": ["Enchanted Book", "Name Tag", "Saddle"], "credits": 30, "xp": 15 }
  },
  "bonuses": {
    "streak3": 1.15,
    "streak5": 1.30,
    "streak10": 1.50,
    "firstCatchOfDay": 2.0
  }
}
```

**Disc Golf — Hole Payouts**
```json
{
  "holePayouts": {
    "holeInOne": { "credits": 100, "xp": 50, "achievement": "ace" },
    "birdie": { "credits": 60, "xp": 30 },
    "par": { "credits": 40, "xp": 20 },
    "bogey": { "credits": 25, "xp": 12 },
    "doubleBogey": { "credits": 15, "xp": 8 }
  },
  "courseBonuses": {
    "complete9holes": { "credits": 150, "xp": 75 },
    "complete18holes": { "credits": 400, "xp": 200 },
    "underPar": { "creditsPerStroke": 50, "xpPerStroke": 25 }
  }
}
```

**Movie Studio — Role Payouts**
```json
{
  "rolePayouts": {
    "actor": { "baseCredits": 75, "bonusPerLine": 10, "xp": 40 },
    "director": { "baseCredits": 100, "bonusPerScene": 25, "xp": 50 },
    "camera": { "baseCredits": 50, "bonusPerShot": 15, "xp": 30 },
    "editor": { "baseCredits": 80, "bonusPerCut": 8, "xp": 45 },
    "writer": { "baseCredits": 60, "bonusPerPage": 20, "xp": 35 }
  },
  "projectBonuses": {
    "shortFilm": { "credits": 200, "xp": 100 },
    "featureFilm": { "credits": 1000, "xp": 500 },
    "series": { "creditsPerEpisode": 150, "xpPerEpisode": 75 }
  }
}
```

**Education — Course Completion**
```json
{
  "coursePayouts": {
    "beginner": { "credits": 75, "xp": 50, "skillPoints": 1 },
    "intermediate": { "credits": 150, "xp": 100, "skillPoints": 2 },
    "advanced": { "credits": 300, "xp": 200, "skillPoints": 3 },
    "mastery": { "credits": 600, "xp": 400, "skillPoints": 5 }
  },
  "quizBonuses": {
    "perfectScore": 1.5,
    "firstTry": 1.25,
    "speedBonus": { "threshold": 30, "multiplier": 1.2 }
  }
}
```

**Ranch — Product Harvest**
```json
{
  "ranchProducts": {
    "wool": { "credits": 15, "xp": 8, "growthTime": "2m" },
    "milk": { "credits": 20, "xp": 10, "growthTime": "3m" },
    "eggs": { "credits": 12, "xp": 6, "growthTime": "1.5m" },
    "honey": { "credits": 35, "xp": 18, "growthTime": "5m" },
    "truffle": { "credits": 80, "xp": 40, "growthTime": "8m" },
    "goldenEgg": { "credits": 200, "xp": 100, "growthTime": "rare" }
  }
}
```

**Herding — Delivery Bonuses**
```json
{
  "herdPayouts": {
    "smallHerd": { "animals": 5, "credits": 100, "xp": 50 },
    "mediumHerd": { "animals": 15, "credits": 250, "xp": 125 },
    "largeHerd": { "animals": 30, "credits": 500, "xp": 250 }
  },
  "conditionBonuses": {
    "noLosses": 1.5,
    "speedDelivery": 1.25,
    "nightDelivery": 1.3
  }
}
```

**Circuits — Puzzle Solutions**
```json
{
  "circuitPayouts": {
    "logic": { "credits": 30, "xp": 20 },
    "redstone": { "credits": 50, "xp": 35 },
    "computational": { "credits": 80, "xp": 55 }
  },
  "complexityBonus": {
    "tier1": 1.0,
    "tier2": 1.25,
    "tier3": 1.5,
    "tier4": 2.0
  }
}
```

### Currency Sinks

Balanced to maintain ~15% net credit reduction per active player per week.

```json
{
  "sinks": {
    "consumables": {
      "baitBundle": { "credits": 100, "items": 10 },
      "discRepair": { "credits": 50, "restores": "100%" },
      "feedBag": { "credits": 75, "feeds": 20 },
      "filmCanister": { "credits": 30, "uses": 5 }
    },
    "upgrades": {
      "rodEnchant": { "credits": 500, "effect": "+10% catch rate" },
      "discUpgrade": { "credits": 300, "effect": "+5% accuracy" },
      "ranchExpansion": { "credits": 1000, "effect": "+2 animal slots" },
      "studioUpgrade": { "credits": 2000, "effect": "unlock new sets" }
    },
    "cosmetics": {
      "playerTitle": { "credits": 250, "permanent": true },
      "petSkin": { "credits": 400, "permanent": true },
      "boatSkin": { "credits": 350, "permanent": true },
      "trailEffect": { "credits": 500, "permanent": true }
    },
    "services": {
      "fastTravel": { "credits": 25, "cooldown": "5m" },
      "instaGrow": { "credits": 100, "effect": "instant crop growth" },
      "skipLesson": { "credits": 200, "effect": "bypass prerequisite" }
    },
    "gambling": {
      "mysteryBox": { "credits": 150, "guaranteedValue": "50-300" },
      "luckyRoll": { "credits": 75, "jackpotChance": "1%" }
    }
  }
}
```

### Daily Earning Caps

Prevents inflation from hardcore players.

```json
{
  "dailyCaps": {
    "credits": {
      "fishing": 800,
      "discGolf": 600,
      "movieStudio": 500,
      "education": 400,
      "ranch": 600,
      "herding": 500,
      "circuits": 700
    },
    "totalDailyCap": 3000,
    "premiumCredits": { "dailyCap": 50, "sources": ["events", "achievements"] }
  }
}
```

---

## Item Schema

### Unified Item System

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GameItem",
  "type": "object",
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z]+:[a-z_]+$" },
    "displayName": { "type": "string" },
    "description": { "type": "string" },
    "rarity": { "type": "string", "enum": ["common", "uncommon", "rare", "epic", "legendary", "mythic"] },
    "maxStack": { "type": "integer", "minimum": 1, "maximum": 64 },
    "tradeable": { "type": "boolean" },
    "destroyOnUse": { "type": "boolean" },
    "games": {
      "type": "array",
      "items": { "type": "string", "enum": ["fishing", "discgolf", "studio", "education", "ranch", "herding", "circuits", "all"] }
    },
    "effects": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "type": "string" },
          "value": { "type": "number" },
          "duration": { "type": "integer", "description": "seconds, 0 = permanent" }
        }
      }
    },
    "value": { "type": "integer", "description": "Base credit value for selling" }
  },
  "required": ["id", "displayName", "rarity", "maxStack", "tradeable", "games"]
}
```

### Example Items

**Fishing Items**
```json
[
  {
    "id": "fishing:golden_salmon",
    "displayName": "Golden Salmon",
    "description": "A rare catch that glimmers in the light. Worth bonus credits.",
    "rarity": "rare",
    "maxStack": 16,
    "tradeable": true,
    "destroyOnUse": true,
    "games": ["fishing"],
    "effects": [{ "type": "sellValue", "value": 50 }],
    "value": 50
  },
  {
    "id": "fishing:lucky_bait",
    "displayName": "Lucky Bait",
    "description": "Increases rare catch chance by 25% for 5 casts.",
    "rarity": "uncommon",
    "maxStack": 64,
    "tradeable": true,
    "destroyOnUse": true,
    "games": ["fishing"],
    "effects": [{ "type": "rareChance", "value": 0.25, "duration": 0, "uses": 5 }],
    "value": 25
  },
  {
    "id": "fishing:crystal_rod",
    "displayName": "Crystal Rod",
    "description": "A legendary fishing rod that never breaks and glows in darkness.",
    "rarity": "legendary",
    "maxStack": 1,
    "tradeable": false,
    "destroyOnUse": false,
    "games": ["fishing"],
    "effects": [
      { "type": "catchSpeed", "value": 0.15 },
      { "type": "rareChance", "value": 0.10 },
      { "type": "durability", "value": -1 }
    ],
    "value": 5000
  }
]
```

**Disc Golf Items**
```json
[
  {
    "id": "discgolf:driver_pro",
    "displayName": "Pro Driver Disc",
    "description": "Long-range disc with excellent stability.",
    "rarity": "uncommon",
    "maxStack": 1,
    "tradeable": true,
    "destroyOnUse": false,
    "games": ["discgolf"],
    "effects": [
      { "type": "distance", "value": 20 },
      { "type": "accuracy", "value": 0.05 }
    ],
    "value": 300
  },
  {
    "id": "discgolf:wind_resistant",
    "displayName": "Wind-Cutter Disc",
    "description": "Ignores wind penalties entirely.",
    "rarity": "epic",
    "maxStack": 1,
    "tradeable": false,
    "destroyOnUse": false,
    "games": ["discgolf"],
    "effects": [{ "type": "windResistance", "value": 1.0 }],
    "value": 1500
  }
]
```

**Cross-Game Items**
```json
[
  {
    "id": "all:xp_boost_small",
    "displayName": "Minor XP Boost",
    "description": "+10% XP in all games for 30 minutes.",
    "rarity": "uncommon",
    "maxStack": 16,
    "tradeable": true,
    "destroyOnUse": true,
    "games": ["all"],
    "effects": [{ "type": "xpMultiplier", "value": 0.10, "duration": 1800 }],
    "value": 100
  },
  {
    "id": "all:lucky_coin",
    "displayName": "Lucky Coin",
    "description": "+5% rare drop chance in all games. Permanent.",
    "rarity": "epic",
    "maxStack": 1,
    "tradeable": false,
    "destroyOnUse": false,
    "games": ["all"],
    "effects": [{ "type": "rareDropChance", "value": 0.05, "duration": 0 }],
    "value": 3000
  },
  {
    "id": "all:time_warp",
    "displayName": "Time Warp Token",
    "description": "Instantly complete any cooldown or growth timer.",
    "rarity": "rare",
    "maxStack": 8,
    "tradeable": true,
    "destroyOnUse": true,
    "games": ["all"],
    "effects": [{ "type": "skipCooldown", "value": 1 }],
    "value": 200
  }
]
```

---

## XP & Skill System

### Unified XP System

All games contribute to a unified XP system with cross-game benefits.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PlayerXP",
  "type": "object",
  "properties": {
    "totalXP": { "type": "integer", "minimum": 0 },
    "level": { "type": "integer", "minimum": 1 },
    "gameXP": {
      "type": "object",
      "properties": {
        "fishing": { "type": "integer", "minimum": 0 },
        "discgolf": { "type": "integer", "minimum": 0 },
        "studio": { "type": "integer", "minimum": 0 },
        "education": { "type": "integer", "minimum": 0 },
        "ranch": { "type": "integer", "minimum": 0 },
        "herding": { "type": "integer", "minimum": 0 },
        "circuits": { "type": "integer", "minimum": 0 }
      }
    },
    "gameLevels": {
      "type": "object",
      "properties": {
        "fishing": { "type": "integer", "minimum": 1 },
        "discgolf": { "type": "integer", "minimum": 1 },
        "studio": { "type": "integer", "minimum": 1 },
        "education": { "type": "integer", "minimum": 1 },
        "ranch": { "type": "integer", "minimum": 1 },
        "herding": { "type": "integer", "minimum": 1 },
        "circuits": { "type": "integer", "minimum": 1 }
      }
    }
  },
  "required": ["totalXP", "level", "gameXP", "gameLevels"]
}
```

### Level Curve

XP required per level uses a diminishing returns curve:

```
XP for level N = floor(1000 * (N ^ 1.5))
```

| Level | XP Required | Cumulative XP | Title |
|-------|-------------|---------------|-------|
| 1 | 1,000 | 1,000 | Novice |
| 5 | 2,236 | 6,716 | Apprentice |
| 10 | 3,162 | 22,316 | Journeyman |
| 20 | 4,472 | 82,254 | Expert |
| 30 | 5,477 | 183,579 | Master |
| 50 | 7,071 | 538,022 | Grandmaster |
| 75 | 8,660 | 1,329,019 | Legend |
| 100 | 10,000 | 2,520,284 | Mythic |

### Cross-Game Skill Transfer

High level in one game provides small bonuses to others:

```json
{
  "skillTransfer": {
    "rule": "For every 10 levels in a game, gain +1% bonus in all other games",
    "maxTransfer": 10,
    "example": {
      "player": {
        "fishingLevel": 30,
        "discgolfLevel": 15,
        "totalTransferBonus": "3% + 1.5% = 4.5% bonus to other games"
      }
    },
    "synergyBonuses": {
      "fishing+ranch": { "threshold": [20, 20], "bonus": "Animal bonding +10%" },
      "discgolf+circuits": { "threshold": [20, 20], "bonus": "Precision tasks +5%" },
      "studio+education": { "threshold": [20, 20], "bonus": "Teaching XP +15%" },
      "herding+ranch": { "threshold": [20, 20], "bonus": "Animal speed +8%" }
    }
  }
}
```

### Game-Specific Skills

Each game has unique skill trees unlocked by game XP:

**Fishing Skill Tree**
```json
{
  "fishingSkills": {
    "patience": {
      "levels": [0, 5, 10, 20, 35, 50],
      "effects": ["+5% catch speed", "+10% catch speed", "+15% catch speed", "+20% catch speed", "Auto-reel"],
      "maxPoints": 5
    },
    "keenEye": {
      "levels": [0, 10, 25, 45, 70],
      "effects": ["+5% rare chance", "+10% rare chance", "+15% rare chance", "+20% rare chance", "See fish rarity"],
      "maxPoints": 5
    },
    "angler": {
      "levels": [0, 15, 35, 60, 90],
      "effects": ["+1 bait efficiency", "+2 bait efficiency", "+3 bait efficiency", "+4 bait efficiency", "Infinite basic bait"],
      "maxPoints": 5
    }
  }
}
```

**Ranch Skill Tree**
```json
{
  "ranchSkills": {
    "husbandry": {
      "levels": [0, 5, 10, 20, 35, 50],
      "effects": ["+5% product quality", "+10% quality", "+15% quality", "+20% quality", "Golden product chance"],
      "maxPoints": 5
    },
    "breeder": {
      "levels": [0, 10, 25, 45, 70],
      "effects": ["+1 breeding speed", "+2 breeding speed", "+3 breeding speed", "+4 breeding speed", "Twin chance"],
      "maxPoints": 5
    },
    "rancher": {
      "levels": [0, 15, 35, 60, 90],
      "effects": ["+1 animal capacity", "+2 capacity", "+3 capacity", "+4 capacity", "No feed needed"],
      "maxPoints": 5
    }
  }
}
```

### Prestige System

After reaching max level (100) in a game, players can prestige:

```json
{
  "prestige": {
    "requirements": {
      "gameLevel": 100,
      "credits": 10000
    },
    "effects": {
      "levelReset": 1,
      "permanentBonus": "5% XP in that game",
      "prestigeIcon": true,
      "exclusiveCosmetics": true
    },
    "maxPrestige": 10,
    "stackingBonus": "5% per prestige level"
  }
}
```

---

## Daily & Weekly Challenges

### Challenge Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Challenge",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "type": { "type": "string", "enum": ["daily", "weekly", "monthly", "event"] },
    "game": { "type": "string", "enum": ["fishing", "discgolf", "studio", "education", "ranch", "herding", "circuits", "crossgame"] },
    "title": { "type": "string" },
    "description": { "type": "string" },
    "requirements": {
      "type": "object",
      "properties": {
        "action": { "type": "string" },
        "count": { "type": "integer" },
        "conditions": { "type": "object" }
      }
    },
    "rewards": {
      "type": "object",
      "properties": {
        "credits": { "type": "integer" },
        "xp": { "type": "integer" },
        "items": { "type": "array" },
        "premiumCredits": { "type": "integer" }
      }
    },
    "timeLimit": { "type": "integer", "description": "seconds until reset" },
    "difficulty": { "type": "string", "enum": ["easy", "medium", "hard", "extreme"] }
  },
  "required": ["id", "type", "game", "title", "requirements", "rewards"]
}
```

### Daily Challenge Pool

Each player receives 3 daily challenges (1 per game category) at reset (00:00 UTC):

```json
{
  "dailyChallengePool": {
    "fishing": [
      {
        "id": "fish_catch_20",
        "title": "Morning Catch",
        "description": "Catch 20 fish of any type",
        "requirements": { "action": "catch_fish", "count": 20 },
        "rewards": { "credits": 150, "xp": 75 },
        "difficulty": "easy"
      },
      {
        "id": "fish_rare_3",
        "title": "Rare Find",
        "description": "Catch 3 rare or better fish",
        "requirements": { "action": "catch_fish", "count": 3, "conditions": { "rarity": ["rare", "legendary"] } },
        "rewards": { "credits": 300, "xp": 150, "items": ["fishing:lucky_bait"] },
        "difficulty": "medium"
      },
      {
        "id": "fish_legendary",
        "title": "Legendary Hunter",
        "description": "Catch a legendary fish",
        "requirements": { "action": "catch_fish", "count": 1, "conditions": { "rarity": ["legendary"] } },
        "rewards": { "credits": 500, "xp": 300, "premiumCredits": 10 },
        "difficulty": "hard"
      }
    ],
    "discgolf": [
      {
        "id": "dg_complete_3",
        "title": "Course Runner",
        "description": "Complete 3 holes",
        "requirements": { "action": "complete_hole", "count": 3 },
        "rewards": { "credits": 120, "xp": 60 },
        "difficulty": "easy"
      },
      {
        "id": "dg_birdie_2",
        "title": "Under Par",
        "description": "Get 2 birdies or better",
        "requirements": { "action": "score", "count": 2, "conditions": { "score": ["birdie", "holeInOne"] } },
        "rewards": { "credits": 250, "xp": 125 },
        "difficulty": "medium"
      }
    ],
    "ranch": [
      {
        "id": "ranch_harvest_10",
        "title": "Productive Day",
        "description": "Harvest 10 ranch products",
        "requirements": { "action": "harvest", "count": 10 },
        "rewards": { "credits": 100, "xp": 50 },
        "difficulty": "easy"
      },
      {
        "id": "ranch_golden",
        "title": "Golden Hour",
        "description": "Harvest a golden product",
        "requirements": { "action": "harvest", "count": 1, "conditions": { "quality": "golden" } },
        "rewards": { "credits": 400, "xp": 200, "premiumCredits": 5 },
        "difficulty": "hard"
      }
    ],
    "crossgame": [
      {
        "id": "cross_play_3",
        "title": "Variety Player",
        "description": "Play 3 different game modes today",
        "requirements": { "action": "play_game", "count": 3, "conditions": { "unique": true } },
        "rewards": { "credits": 200, "xp": 100 },
        "difficulty": "easy"
      },
      {
        "id": "cross_earn_500",
        "title": "Busy Day",
        "description": "Earn 500 credits across all games",
        "requirements": { "action": "earn_credits", "count": 500 },
        "rewards": { "credits": 100, "xp": 50, "items": ["all:xp_boost_small"] },
        "difficulty": "medium"
      }
    ]
  }
}
```

### Weekly Challenges

Higher difficulty, better rewards. Reset every Monday 00:00 UTC.

```json
{
  "weeklyChallengePool": [
    {
      "id": "weekly_fish_100",
      "game": "fishing",
      "title": "Master Angler",
      "description": "Catch 100 fish this week",
      "requirements": { "action": "catch_fish", "count": 100 },
      "rewards": { "credits": 1000, "xp": 500, "items": ["fishing:crystal_rod"], "premiumCredits": 25 },
      "difficulty": "hard",
      "timeLimit": 604800
    },
    {
      "id": "weekly_course_complete",
      "game": "discgolf",
      "title": "Full Round",
      "description": "Complete an 18-hole course under par",
      "requirements": { "action": "complete_course", "count": 1, "conditions": { "holes": 18, "underPar": true } },
      "rewards": { "credits": 800, "xp": 400, "items": ["discgolf:wind_resistant"], "premiumCredits": 20 },
      "difficulty": "extreme",
      "timeLimit": 604800
    },
    {
      "id": "weekly_all_games",
      "game": "crossgame",
      "title": "Renaissance Player",
      "description": "Reach daily cap in 4 different games",
      "requirements": { "action": "reach_cap", "count": 4, "conditions": { "uniqueGames": true } },
      "rewards": { "credits": 1500, "xp": 750, "items": ["all:lucky_coin"], "premiumCredits": 50 },
      "difficulty": "extreme",
      "timeLimit": 604800
    }
  ]
}
```

### Challenge Generation Algorithm

```javascript
// Pseudocode for daily challenge selection
function generateDailyChallenges(player) {
  const challenges = [];

  // 1 fishing challenge (weighted by player level)
  const fishingPool = filterByLevel(dailyChallengePool.fishing, player.fishingLevel);
  challenges.push(weightedRandom(fishingPool));

  // 1 from random other game
  const otherGames = ['discgolf', 'ranch', 'circuits', 'studio', 'education', 'herding'];
  const randomGame = otherGames[Math.floor(Math.random() * otherGames.length)];
  const gamePool = filterByLevel(dailyChallengePool[randomGame], player[`${randomGame}Level`]);
  challenges.push(weightedRandom(gamePool));

  // 1 cross-game challenge
  const crossPool = filterByLevel(dailyChallengePool.crossgame, player.level);
  challenges.push(weightedRandom(crossPool));

  return challenges;
}
```

---

## Market & Trading System

### Player Market

Peer-to-peer trading with server tax.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MarketListing",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "seller": { "type": "string", "description": "Player UUID" },
    "item": { "$ref": "#/definitions/GameItem" },
    "quantity": { "type": "integer", "minimum": 1 },
    "pricePerUnit": { "type": "integer", "minimum": 1 },
    "createdAt": { "type": "string", "format": "date-time" },
    "expiresAt": { "type": "string", "format": "date-time" },
    "status": { "type": "string", "enum": ["active", "sold", "expired", "cancelled"] }
  },
  "required": ["id", "seller", "item", "quantity", "pricePerUnit", "createdAt", "expiresAt", "status"]
}
```

### Market Parameters

```json
{
  "marketConfig": {
    "listingFee": { "credits": 5, "description": "Fixed fee per listing" },
    "transactionTax": { "rate": 0.10, "description": "10% tax on all sales" },
    "listingDuration": { "days": 7, "maxExtensions": 2 },
    "maxListings": { "perPlayer": 20 },
    "priceLimits": {
      "minPrice": 1,
      "maxPrice": 100000,
      "suggestedPriceSource": "7-day average"
    },
    "categories": [
      "fishing.gear",
      "fishing.bait",
      "fishing.catch",
      "discgolf.discs",
      "ranch.animals",
      "ranch.products",
      "consumables",
      "cosmetics",
      "crossgame"
    ]
  }
}
```

### Price History & Analytics

```json
{
  "priceHistorySchema": {
    "itemId": "string",
    "dataPoints": [
      {
        "timestamp": "ISO8601",
        "avgPrice": "number",
        "minPrice": "number",
        "maxPrice": "number",
        "volume": "integer"
      }
    ],
    "aggregation": "hourly | daily | weekly"
  },
  "analytics": {
    "trending": "items with rising price (>5% in 24h)",
    "volatile": "items with high price variance",
    "undervalued": "items priced below 7-day average by >10%"
  }
}
```

### Direct Trading

Player-to-player instant trades with confirmation:

```json
{
  "directTrade": {
    "initiator": "PlayerUUID",
    "recipient": "PlayerUUID",
    "initiatorOffers": [
      { "itemId": "string", "quantity": 1 },
      { "credits": 500 }
    ],
    "recipientOffers": [
      { "itemId": "string", "quantity": 2 }
    ],
    "state": "pending | confirmed | completed | cancelled",
    "expirySeconds": 60
  },
  "rules": {
    "proximity": "Must be within 50 blocks",
    "confirmation": "Both parties must confirm",
    "cancelWindow": "10 seconds to cancel after confirmation"
  }
}
```

### NPC Shops

Server-run shops for baseline pricing and essential items:

```json
{
  "npcShops": [
    {
      "id": "tackle_shop",
      "name": "Oliver's Tackle",
      "location": { "world": "main", "x": 100, "y": 64, "z": -200 },
      "inventory": [
        { "item": "fishing:basic_bait", "buyPrice": 10, "sellPrice": 5, "stock": -1 },
        { "item": "fishing:lucky_bait", "buyPrice": 50, "sellPrice": 25, "stock": 100 },
        { "item": "fishing:basic_rod", "buyPrice": 200, "sellPrice": 100, "stock": -1 }
      ]
    },
    {
      "id": "general_store",
      "name": "Emporium",
      "location": { "world": "main", "x": 0, "y": 64, "z": 0 },
      "inventory": [
        { "item": "all:xp_boost_small", "buyPrice": 150, "sellPrice": 75, "stock": -1 },
        { "item": "all:time_warp", "buyPrice": 250, "sellPrice": 100, "stock": 50 }
      ]
    }
  ],
  "stockRules": {
    "unlimited": -1,
    "restockInterval": "daily",
    "dynamicPricing": "High demand items increase 5% per day"
  }
}
```

---

## Economy Balance Metrics

### Target Metrics

```json
{
  "balanceTargets": {
    "averageHourlyEarnings": "40-60 credits",
    "inflationRate": "<2% per month",
    "currencyVelocity": "Each credit spent 3x per week",
    "wealthDistribution": {
      "top10Percent": "<40% of total credits",
      "bottom50Percent": ">20% of total credits"
    },
    "engagementCorrelation": "Play time vs wealth should be 0.6-0.8"
  }
}
```

### Monitoring Dashboard

```json
{
  "monitoredMetrics": {
    "daily": [
      "totalCreditsInCirculation",
      "creditsEarned",
      "creditsSpent",
      "netCreditsCreated",
      "activePlayers",
      "transactionsCompleted",
      "averageSessionDuration"
    ],
    "weekly": [
      "inflationRate",
      "priceIndex",
      "wealthGini",
      "gameModeDistribution",
      "challengeCompletionRate"
    ],
    "alerts": {
      "inflationSpike": "Daily net credits > 5% of total",
      "wealthImbalance": "Gini > 0.7",
      "stagnation": "Currency velocity < 2.0"
    }
  }
}
```

### Anti-Exploit Measures

```json
{
  "antiExploit": {
    "afkDetection": {
      "method": "Input tracking + position variance",
      "threshold": "5 minutes no input = AFK",
      "penalty": "No earnings while AFK"
    },
    "botDetection": {
      "methods": [
        "CAPTCHA on high-value actions",
        "Pattern analysis for repetitive behavior",
        "Impossible timing detection"
      ],
      "penalties": {
        "first": "Warning + 24h credit freeze",
        "second": "7-day ban + 50% credit forfeit",
        "third": "Permanent ban"
      }
    },
    "multiAccountLimit": {
      "maxAccounts": 2,
      "sharedIPCreditCap": "1.5x normal cap",
      "tradeBetweenOwnAccounts": "Disabled"
    },
    "marketManipulation": {
      "listingFlooding": "Max 20 listings per player",
      "priceFloor": "Cannot list below 50% of 7-day average",
      "washTrading": "Same IP trades flagged"
    }
  }
}
```

---

## Implementation Roadmap

### Phase 1: Core Currency (Week 1-2)
- [ ] Implement credit system with persistence
- [ ] Add earn actions to fishing game
- [ ] Create basic NPC shop
- [ ] Set up daily cap tracking

### Phase 2: XP & Skills (Week 3-4)
- [ ] Unified XP tracking
- [ ] Level calculation
- [ ] Cross-game bonus calculation
- [ ] Skill tree UI placeholder

### Phase 3: Items & Inventory (Week 5-6)
- [ ] Item schema implementation
- [ ] Inventory system
- [ ] Item effects engine
- [ ] Cross-game item support

### Phase 4: Challenges (Week 7-8)
- [ ] Challenge generation system
- [ ] Daily challenge assignment
- [ ] Challenge progress tracking
- [ ] Reward distribution

### Phase 5: Market (Week 9-10)
- [ ] Listing creation
- [ ] Search/filter system
- [ ] Transaction processing
- [ ] Price history tracking

### Phase 6: Analytics & Balance (Week 11-12)
- [ ] Monitoring dashboard
- [ ] Inflation tracking
- [ ] Balance adjustments
- [ ] Anti-exploit systems

---

## Appendix: Quick Reference

### Credit Values at a Glance

| Activity | Credits | Time | Rate/Hour |
|----------|---------|------|-----------|
| Common Fish | 10 | 30s | 60 |
| Rare Fish | 50 | 60s | 50 |
| Disc Golf Hole (Par) | 40 | 3min | 40 |
| Movie Scene | 100 | 8min | 45 |
| Education Lesson | 100 | 5min | 60 |
| Ranch Harvest | 20 | 3min | 40 |
| Herd Delivery | 200 | 15min | 40 |
| Circuit Puzzle | 50 | 3min | 50 |

### XP Curve Quick Reference

- Level 10: 22,316 XP
- Level 25: 129,665 XP
- Level 50: 538,022 XP
- Level 75: 1,329,019 XP
- Level 100: 2,520,284 XP

### Daily Limits

- Per-game cap: 400-800 credits
- Total daily cap: 3,000 credits
- Premium credits: 50/day

### Tax Rates

- Market sale: 10%
- Listing fee: 5 credits
- No tax on direct trades

---

*Document Version: 1.0.0*
*Last Updated: 2026-03-27*
*Author: CraftMind Team*
