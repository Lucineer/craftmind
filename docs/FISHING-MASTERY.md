# Fishing Mastery System — CraftMind Server

> Deep fishing experience design with progression, collection, and cross-game economy integration.

---

## Table of Contents

1. [Rarity Tiers](#rarity-tiers)
2. [Biome-Specific Fish](#biome-specific-fish)
3. [Seasonal Events](#seasonal-events)
4. [Equipment Progression](#equipment-progression)
5. [Fish Encyclopedia](#fish-encyclopedia)
6. [Competitions & Leaderboards](#competitions--leaderboards)
7. [Cross-Game Economy](#cross-game-economy)
8. [JSON Schemas](#json-schemas)

---

## Rarity Tiers

### Tier Overview

| Tier | Name | Base Catch Rate | Glow Color | Sound Effect |
|------|------|-----------------|------------|--------------|
| 1 | Common | 68.5% | None | `entity.fishing_bobber.splash` |
| 2 | Uncommon | 20.0% | Green | `entity.experience_orb.pickup` |
| 3 | Rare | 8.0% | Blue | `block.enchantment_table.use` |
| 4 | Epic | 3.0% | Purple | `entity.player.levelup` |
| 5 | Legendary | 0.5% | Gold + Particles | `ui.toast.challenge_complete` |

### Catch Rate Modifiers

```json
{
  "base_rates": {
    "common": 0.685,
    "uncommon": 0.200,
    "rare": 0.080,
    "epic": 0.030,
    "legendary": 0.005
  },
  "modifiers": {
    "luck_of_sea_iii": { "rare": 1.5, "epic": 2.0, "legendary": 2.5 },
    "luck_potion": { "all_tiers": 1.2 },
    "golden_hour": { "all_tiers": 1.15 },
    "rain_weather": { "uncommon": 1.3, "rare": 1.5 },
    "full_moon": { "epic": 1.8, "legendary": 2.0 },
    "treasure_rod": { "rare": 1.3, "epic": 1.6, "legendary": 2.0 }
  }
}
```

### Rarity Tier Details

#### Common (68.5%)
Standard catches for new anglers. Quick to catch, low value.
- **Catch Time**: 5-15 seconds
- **XP**: 1-3 per catch
- **Sell Value**: 1-5 coins

#### Uncommon (20.0%)
Slightly harder to catch, recognizable by green sparkle.
- **Catch Time**: 8-20 seconds
- **XP**: 5-10 per catch
- **Sell Value**: 10-25 coins

#### Rare (8.0%)
Blue glow announces a quality catch. Often used in cooking.
- **Catch Time**: 12-30 seconds
- **XP**: 15-30 per catch
- **Sell Value**: 50-100 coins

#### Epic (3.0%)
Purple particles draw attention. High-value ingredients.
- **Catch Time**: 20-45 seconds
- **XP**: 50-100 per catch
- **Sell Value**: 200-500 coins

#### Legendary (0.5%)
Golden explosion with particles. Often triggers server announcement.
- **Catch Time**: 30-60 seconds (requires patience!)
- **XP**: 200-500 per catch
- **Sell Value**: 1000-5000 coins
- **Special**: Broadcast to all players: `✨ [Player] caught a LEGENDARY [Fish Name]!`

---

## Biome-Specific Fish

### Ocean Biome

**Water Type**: Saltwater | **Base Modifier**: 1.0x

| Fish Name | Rarity | Min Size | Max Size | Season | Time |
|-----------|--------|----------|----------|--------|------|
| Mackerel | Common | 20cm | 45cm | All | All |
| Sardine | Common | 10cm | 25cm | All | Day |
| Sea Bass | Uncommon | 30cm | 70cm | All | All |
| Bluefin Tuna | Rare | 80cm | 200cm | Summer | Day |
| Swordfish | Epic | 100cm | 300cm | Summer | Dawn/Dusk |
| Coelacanth | Legendary | 150cm | 200cm | Winter | Night |
| Kraken Tentacle | Legendary | 50cm | 100cm | All | Storm |

**Deep Ocean Sub-Biome** (Y < 45):
| Fish Name | Rarity | Notes |
|-----------|--------|-------|
| Anglerfish | Rare | Bioluminescent, only at night |
| Gulper Eel | Epic | Requires depth > 100 blocks |
| Leviathan Scale | Legendary | 0.1% drop from special event |

### River Biome

**Water Type**: Freshwater | **Base Modifier**: 1.1x

| Fish Name | Rarity | Min Size | Max Size | Season | Time |
|-----------|--------|----------|----------|--------|------|
| Trout | Common | 15cm | 40cm | All | Dawn |
| Salmon | Common | 30cm | 60cm | Fall | All |
| Catfish | Uncommon | 40cm | 100cm | All | Night |
| Sturgeon | Rare | 80cm | 200cm | Spring | Dawn |
| Golden Carp | Epic | 30cm | 50cm | Spring | Day |
| River Spirit | Legendary | 50cm | 80cm | All | Midnight |

### Jungle Pond Biome

**Water Type**: Tropical | **Base Modifier**: 1.3x (higher rare rates)

| Fish Name | Rarity | Min Size | Max Size | Season | Time |
|-----------|--------|----------|----------|--------|------|
| Piranha | Common | 15cm | 30cm | All | Day |
| Tetra | Common | 3cm | 8cm | All | All |
| Discus | Uncommon | 15cm | 25cm | All | Day |
| Electric Eel | Rare | 100cm | 250cm | Rain | Night |
| Arapaima | Epic | 150cm | 300cm | Summer | All |
| Amazonian Queen | Legendary | 80cm | 120cm | Spring | Dawn |

### Swamp Biome

**Water Type**: Murky | **Base Modifier**: 0.9x (slower catches)

| Fish Name | Rarity | Min Size | Max Size | Season | Time |
|-----------|--------|----------|----------|--------|------|
| Mudfish | Common | 20cm | 35cm | All | All |
| Bowfin | Uncommon | 30cm | 60cm | All | Night |
| Gar | Rare | 50cm | 150cm | Summer | Dawn |
| Swamp Monster | Epic | 100cm | 200cm | Fall | Night |
| Bog Lurker | Legendary | 150cm | 300cm | All | Fog |

### Nether Biome (Lava Fishing)

**Water Type**: Lava | **Base Modifier**: 0.5x (very slow)
**Requires**: Netherite Rod + Fire Resistance

| Fish Name | Rarity | Min Size | Max Size | Notes |
|-----------|--------|----------|----------|-------|
| Magma Minnow | Common | 5cm | 15cm | Found in any lava |
| FlameFin | Uncommon | 15cm | 30cm | Lava lakes only |
| Blaze Eel | Rare | 40cm | 80cm | Near fortresses |
| Ember Serpent | Epic | 60cm | 120cm | Deep lava only |
| Phoenix Koi | Legendary | 40cm | 60cm | Basalt deltas |

### End Biome (Void Fishing)

**Water Type**: Chorus | **Base Modifier**: 0.3x (extremely rare)
**Requires**: End Rod + Void Pearl bait

| Fish Name | Rarity | Min Size | Max Size | Notes |
|-----------|--------|----------|----------|-------|
| Chorus Guppy | Common | 2cm | 5cm | Small end lakes |
| Void Leech | Uncommon | 10cm | 20cm | Void pockets |
| Ender Serpent | Rare | 30cm | 60cm | End cities |
| Shulker Shell | Epic | 15cm | 25cm | Near cities |
| Dragon Scale | Legendary | 20cm | 40cm | Main island only |

---

## Seasonal Events

### Spring Festival (March 20 - April 20)

```json
{
  "event_id": "spring_festival",
  "duration_days": 31,
  "special_fish": [
    {
      "name": "Cherry Blossom Koi",
      "rarity": "epic",
      "catch_rate_boost": 3.0,
      "biomes": ["river", "ocean"],
      "exclusive": true
    },
    {
      "name": "Rainbow Trout",
      "rarity": "rare",
      "catch_rate_boost": 2.5,
      "biomes": ["river"],
      "exclusive": false
    }
  ],
  "bonuses": {
    "xp_multiplier": 1.5,
    "coin_multiplier": 1.25
  }
}
```

### Summer Slam (June 21 - July 21)

```json
{
  "event_id": "summer_slam",
  "duration_days": 30,
  "special_fish": [
    {
      "name": "Sunfish",
      "rarity": "epic",
      "catch_rate_boost": 2.0,
      "biomes": ["ocean"],
      "exclusive": true
    },
    {
      "name": "Electric Marlin",
      "rarity": "legendary",
      "catch_rate_boost": 5.0,
      "biomes": ["deep_ocean"],
      "exclusive": true
    }
  ],
  "tournament": "biggest_catch",
  "bonuses": {
    "size_bonus": 1.2
  }
}
```

### Harvest Moon (September 22 - October 22)

```json
{
  "event_id": "harvest_moon",
  "duration_days": 30,
  "special_fish": [
    {
      "name": "Autumn Salmon",
      "rarity": "rare",
      "catch_rate_boost": 2.0,
      "biomes": ["river"],
      "exclusive": true
    },
    {
      "name": "Ghost Fish",
      "rarity": "epic",
      "catch_rate_boost": 2.5,
      "biomes": ["swamp", "ocean"],
      "exclusive": true,
      "time_restriction": "night"
    }
  ],
  "bonuses": {
    "night_catch_rate": 1.5
  }
}
```

### Winter Wonderland (December 21 - January 21)

```json
{
  "event_id": "winter_wonderland",
  "duration_days": 31,
  "special_fish": [
    {
      "name": "Ice Cod",
      "rarity": "uncommon",
      "catch_rate_boost": 3.0,
      "biomes": ["frozen_ocean", "frozen_river"],
      "exclusive": true
    },
    {
      "name": "Frost Flounder",
      "rarity": "rare",
      "catch_rate_boost": 2.0,
      "biomes": ["frozen_ocean"],
      "exclusive": true
    },
    {
      "name": "Snow Serpent",
      "rarity": "legendary",
      "catch_rate_boost": 8.0,
      "biomes": ["frozen_ocean"],
      "exclusive": true,
      "weather_restriction": "snow"
    }
  ],
  "bonuses": {
    "frozen_biome_bonus": 2.0
  }
}
```

### Limited-Time Events

| Event Name | Duration | Exclusive Fish | Trigger |
|------------|----------|----------------|---------|
| Blood Moon | 1 night | Bloodfin Shark (Legendary) | Random full moon (5% chance) |
| Solar Eclipse | 2 hours | Void Ray (Epic) | Server-wide announcement |
| Meteor Shower | 1 hour | Starfish (Rare), Comet Koi (Legendary) | Friday nights, random |
| Server Anniversary | 7 days | Anniversary Angelfish (Legendary) | Once per year |

---

## Equipment Progression

### Fishing Rod Tiers

| Rod | Durability | Cast Speed | Rare Bonus | Unlock Requirement |
|-----|------------|------------|------------|-------------------|
| Wooden | 64 | 1.0x | 0% | Default |
| Bamboo | 128 | 1.1x | 5% | Catch 50 fish |
| Iron | 256 | 1.2x | 10% | Catch 200 fish |
| Golden | 32 | 1.5x | 20% | Craft with 8 gold ingots |
| Diamond | 1024 | 1.3x | 25% | Catch 1000 fish |
| Netherite | 2031 | 1.4x | 35% | Upgrade diamond rod + netherite |

### Rod JSON Schema

```json
{
  "rod_id": "diamond_fishing_rod",
  "name": "Diamond Fishing Rod",
  "tier": 5,
  "durability": 1024,
  "cast_speed_multiplier": 1.3,
  "rare_catch_bonus": 0.25,
  "enchantment_capacity": 4,
  "special_ability": "treasure_finder",
  "crafting": {
    "pattern": ["  D", " D ", "S  "],
    "ingredients": { "D": "diamond", "S": "stick" }
  }
}
```

### Enchantments

| Enchantment | Max Level | Effect | Conflict |
|-------------|-----------|--------|----------|
| Luck of the Sea | III | +5% rare catch per level | None |
| Lure | III | -5 second wait time per level | None |
| Unbreaking | III | Standard durability bonus | None |
| Mending | I | XP repairs rod | None |
| Treasure Hunter | I | +50% treasure items | Lure |
| Patience | I | +100% legendary chance, +50% wait time | Lure |
| Auto-Reel | I | Auto-catch when bobber dips | None |
| Sonar | I | Shows fish type before catch | None |
| Frost Walker | I | Fish in frozen water | None |
| Lava Fisher | I | Fish in lava (requires netherite) | None |

### Bait Types

| Bait | Duration | Effect | Source |
|------|----------|--------|--------|
| Worm | 1 catch | +10% common catch | Dig grass blocks |
| Crickets | 3 catches | +15% uncommon catch | Tall grass at night |
| Minnows | 5 catches | +20% rare catch | Catch with wooden rod |
| Golden Worm | 10 catches | +30% epic catch | Craft: gold nugget + worm |
| Void Pearl | 1 catch | +100% legendary, single use | End cities |
| Chum | 1 minute | Attracts fish to location | Craft: rotten flesh + bone meal |
| Magic Bait | 5 catches | Ignores time/weather restrictions | Trade with villager |

### Bait JSON Schema

```json
{
  "bait_id": "golden_worm",
  "name": "Golden Worm",
  "rarity": "uncommon",
  "duration_type": "catches",
  "duration_value": 10,
  "effects": [
    { "type": "catch_rate_bonus", "tier": "epic", "value": 0.30 }
  ],
  "crafting": {
    "shapeless": true,
    "ingredients": ["gold_nugget", "worm"],
    "result_count": 1
  }
}
```

---

## Fish Encyclopedia

### Collection System

```json
{
  "encyclopedia_version": "1.0.0",
  "total_species": 127,
  "categories": {
    "freshwater": 32,
    "saltwater": 45,
    "tropical": 22,
    "special": 15,
    "legendary": 13
  },
  "progression_tiers": [
    { "name": "Novice", "required": 10, "reward": "bamboo_rod" },
    { "name": "Apprentice", "required": 25, "reward": "iron_rod" },
    { "name": "Journeyman", "required": 50, "reward": "treasure_hunter_book" },
    { "name": "Expert", "required": 75, "reward": "diamond_rod" },
    { "name": "Master", "required": 100, "reward": "master_angler_title" },
    { "name": "Grandmaster", "required": 127, "reward": "legendary_rod_skin" }
  ]
}
```

### Fish Entry Schema

```json
{
  "fish_id": "bluefin_tuna",
  "name": "Bluefin Tuna",
  "scientific_name": "Thunnus thynnus",
  "rarity": "rare",
  "biomes": ["ocean", "deep_ocean"],
  "seasons": ["summer"],
  "time_range": { "start": 6000, "end": 18000 },
  "size_range": { "min": 80, "max": 200, "unit": "cm" },
  "weight_range": { "min": 50, "max": 300, "unit": "kg" },
  "base_xp": 25,
  "base_value": 75,
  "description": "A powerful ocean predator prized for its rich, fatty meat.",
  "trivia": "Can swim up to 70 km/h in short bursts!",
  "cooking_uses": ["sashimi", "tuna_steak", "sushi_roll"],
  "quest_items": ["fishermans_dream", "ocean_mastery"],
  "first_discovery": {
    "player": null,
    "timestamp": null
  },
  "personal_records": {
    "largest_cm": 0,
    "smallest_cm": 999,
    "total_caught": 0,
    "first_caught": null
  }
}
```

### Collection Tracking

```json
{
  "player_uuid": "...",
  "encyclopedia_progress": {
    "total_discovered": 47,
    "total_caught": 47,
    "percentage": 37.0,
    "tier": "Journeyman",
    "category_progress": {
      "freshwater": { "discovered": 18, "total": 32 },
      "saltwater": { "discovered": 22, "total": 45 },
      "tropical": { "discovered": 5, "total": 22 },
      "special": { "discovered": 2, "total": 15 },
      "legendary": { "discovered": 0, "total": 13 }
    }
  },
  "milestones": [
    { "name": "First Catch", "unlocked": true, "timestamp": "2026-01-15T10:30:00Z" },
    { "name": "Ocean Explorer", "unlocked": true, "timestamp": "2026-02-20T14:22:00Z" },
    { "name": "Legendary Hunter", "unlocked": false, "timestamp": null }
  ]
}
```

### Encyclopedia Commands

| Command | Description |
|---------|-------------|
| `/fish list` | Show all discovered fish |
| `/fish info <name>` | Detailed info on specific fish |
| `/fish progress` | Show collection percentage |
| `/fish records` | Personal best catches |
| `/fish missing` | List undiscovered fish (hints only) |
| `/fish compare <player>` | Compare collections |

---

## Competitions & Leaderboards

### Tournament Types

#### Daily Tournament
```json
{
  "tournament_id": "daily_20260327",
  "type": "daily",
  "duration_hours": 24,
  "mode": "most_fish",
  "entry_fee": 0,
  "rewards": [
    { "rank": 1, "coins": 500, "items": ["golden_worm x10"] },
    { "rank": 2, "coins": 300, "items": ["golden_worm x5"] },
    { "rank": 3, "coins": 200, "items": ["golden_worm x3"] },
    { "rank": "top_10", "coins": 100, "items": [] },
    { "rank": "participation", "coins": 25, "items": [] }
  ]
}
```

#### Weekly Tournament
```json
{
  "tournament_id": "weekly_2026_w13",
  "type": "weekly",
  "duration_days": 7,
  "mode": "biggest_catch",
  "categories": ["largest_fish", "rarest_fish", "total_weight"],
  "entry_fee": 100,
  "rewards": [
    { "rank": 1, "coins": 5000, "items": ["diamond_rod", "legendary_title"], "badge": "weekly_champion" },
    { "rank": 2, "coins": 3000, "items": ["diamond_rod"], "badge": "weekly_runner_up" },
    { "rank": 3, "coins": 2000, "items": ["golden_worm x20"] }
  ]
}
```

#### Seasonal Championship
```json
{
  "tournament_id": "championship_spring_2026",
  "type": "seasonal",
  "duration_days": 31,
  "mode": "points",
  "point_system": {
    "common": 1,
    "uncommon": 3,
    "rare": 10,
    "epic": 30,
    "legendary": 100
  },
  "entry_fee": 500,
  "rewards": [
    { "rank": 1, "coins": 50000, "items": ["champion_rod_skin", "exclusive_pet"], "title": "Spring Champion 2026" },
    { "rank": 2, "coins": 30000, "items": ["champion_rod_skin"], "title": "Spring Runner-Up 2026" },
    { "rank": 3, "coins": 20000, "items": ["diamond_rod"] }
  ]
}
```

### Leaderboard Categories

| Leaderboard | Reset Period | Track Type |
|-------------|--------------|------------|
| Most Fish Caught | Weekly | Count |
| Biggest Fish | Monthly | Size (cm) |
| Rarest Catch | All-time | Rarity tier |
| Fastest 100 Fish | Weekly | Time |
| Encyclopedia Progress | All-time | Percentage |
| Tournament Wins | All-time | Count |
| Longest Streak | All-time | Consecutive days |

### Leaderboard Entry Schema

```json
{
  "leaderboard_id": "biggest_fish_monthly",
  "period": "2026-03",
  "entries": [
    {
      "rank": 1,
      "player_uuid": "...",
      "player_name": "FishMaster2000",
      "value": 287,
      "unit": "cm",
      "fish_name": "Swordfish",
      "timestamp": "2026-03-15T14:22:00Z"
    }
  ]
}
```

### Daily Records

```json
{
  "date": "2026-03-27",
  "server_records": {
    "most_fish": { "player": "Cody_A", "count": 342 },
    "biggest_fish": { "player": "Steve", "fish": "Coelacanth", "size_cm": 189 },
    "rarest_catch": { "player": "Alex", "fish": "Dragon Scale" },
    "total_server_catches": 4521
  }
}
```

---

## Cross-Game Economy

### Fish as Cooking Ingredients

#### Recipe System
```json
{
  "recipe_id": "grilled_salmon",
  "name": "Grilled Salmon",
  "category": "main_course",
  "ingredients": [
    { "item": "salmon", "quantity": 1, "quality_min": "uncommon" },
    { "item": "salt", "quantity": 1 },
    { "item": "lemon", "quantity": 1 }
  ],
  "cooking_time_seconds": 30,
  "result": {
    "item": "grilled_salmon",
    "hunger_restored": 8,
    "saturation": 0.9,
    "effects": [
      { "type": "regeneration", "duration": 10, "amplifier": 0 }
    ]
  },
  "skill_xp": { "cooking": 25 }
}
```

#### Fish Quality Effects
| Fish Quality | Hunger Bonus | Effect Chance |
|--------------|--------------|---------------|
| Common | +0 | 0% |
| Uncommon | +1 | 10% |
| Rare | +2 | 25% |
| Epic | +3 | 50% |
| Legendary | +4 | 100% |

### Cooking Recipes by Fish

| Fish | Recipe | Special Effect |
|------|--------|----------------|
| Trout | Trout Meuniere | Speed I (2 min) |
| Salmon | Gravlax | Water Breathing (5 min) |
| Tuna | Sashimi Platter | Night Vision (3 min) |
| Catfish | Blackened Catfish | Fire Resistance (3 min) |
| Swordfish | Grilled Steak | Strength I (3 min) |
| Piranha | Piranha Soup | Resistance I (2 min) |
| Ender Serpent | Void Sashimi | Slow Falling (10 min) |
| Phoenix Koi | Phoenix Feast | Fire Immunity (5 min) |

### Quest Reward Integration

#### Quest Types
```json
{
  "quest_id": "fishermans_dream",
  "name": "Fisherman's Dream",
  "type": "collection",
  "tier": "epic",
  "requirements": [
    { "type": "catch_fish", "fish_id": "bluefin_tuna", "quantity": 5 },
    { "type": "catch_fish", "fish_id": "swordfish", "quantity": 3 },
    { "type": "catch_fish", "fish_id": "coelacanth", "quantity": 1 }
  ],
  "rewards": [
    { "type": "coins", "amount": 10000 },
    { "type": "item", "item_id": "master_rod_upgrade_kit" },
    { "type": "title", "title": "Ocean Master" },
    { "type": "skill_xp", "skill": "fishing", "amount": 5000 }
  ]
}
```

#### Fish as Quest Turn-Ins
| NPC | Quest | Required Fish | Reward |
|-----|-------|---------------|--------|
| Old Mariner | The Big One | 1x Swordfish (epic) | Treasure map |
| Sushi Chef | Fresh Delivery | 10x Tuna (rare) | 500 coins + recipe |
| Wizard | Scale of Power | 1x Dragon Scale (legendary) | Enchanted book |
| Zoo Keeper | Rare Specimens | 5x different rare fish | Pet fish companion |

### Fishing XP & Overall Leveling

#### XP Values
| Action | XP Gained |
|--------|-----------|
| Catch Common fish | 1-3 XP |
| Catch Uncommon fish | 5-10 XP |
| Catch Rare fish | 15-30 XP |
| Catch Epic fish | 50-100 XP |
| Catch Legendary fish | 200-500 XP |
| Discover new species | 50 XP |
| Complete encyclopedia tier | 500-5000 XP |
| Win tournament | 100-1000 XP |
| Daily streak bonus | 10 XP × streak |

#### Skill Level Progression
```json
{
  "skill_id": "fishing",
  "max_level": 100,
  "xp_curve": "exponential",
  "base_xp": 100,
  "multiplier": 1.15,
  "level_benefits": [
    { "level": 10, "benefit": "Auto-reel unlock" },
    { "level": 20, "benefit": "+5% rare catch chance" },
    { "level": 30, "benefit": "Sonar enchantment available" },
    { "level": 40, "benefit": "+10% rare catch chance" },
    { "level": 50, "benefit": "Deep ocean access" },
    { "level": 60, "benefit": "+15% rare catch chance" },
    { "level": 70, "benefit": "Lava fishing unlock" },
    { "level": 80, "benefit": "+20% rare catch chance" },
    { "level": 90, "benefit": "Void fishing unlock" },
    { "level": 100, "benefit": "Master Angler: +50% all catches" }
  ]
}
```

#### Cross-Skill Synergies
| Fishing Level | Cooking Bonus | Other Benefits |
|---------------|---------------|----------------|
| 25 | +10% quality dishes | Unlock fish recipes |
| 50 | +20% quality dishes | Unlock sea creature pets |
| 75 | +30% quality dishes | Unlock underwater breathing |
| 100 | +50% quality dishes | Unlock mermaid transformation |

### Currency Integration

```json
{
  "currency_system": {
    "base_currency": "coins",
    "fish_sell_values": {
      "common": { "min": 1, "max": 5 },
      "uncommon": { "min": 10, "max": 25 },
      "rare": { "min": 50, "max": 100 },
      "epic": { "min": 200, "max": 500 },
      "legendary": { "min": 1000, "max": 5000 }
    },
    "market_fluctuation": {
      "enabled": true,
      "update_interval_hours": 6,
      "variance_percent": 20
    }
  }
}
```

---

## JSON Schemas

### Complete Fish Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Fish",
  "type": "object",
  "required": ["fish_id", "name", "rarity", "biomes"],
  "properties": {
    "fish_id": { "type": "string", "pattern": "^[a-z_]+$" },
    "name": { "type": "string", "minLength": 1 },
    "scientific_name": { "type": "string" },
    "rarity": { "$ref": "#/definitions/rarity" },
    "biomes": {
      "type": "array",
      "items": { "$ref": "#/definitions/biome" },
      "minItems": 1
    },
    "seasons": {
      "type": "array",
      "items": { "$ref": "#/definitions/season" }
    },
    "time_range": { "$ref": "#/definitions/time_range" },
    "weather": {
      "type": "array",
      "items": { "enum": ["clear", "rain", "thunder", "snow", "fog"] }
    },
    "moon_phase": {
      "type": "array",
      "items": { "enum": ["new", "waxing_crescent", "first_quarter", "waxing_gibbous", "full", "waning_gibbous", "last_quarter", "waning_crescent"] }
    },
    "size_range": { "$ref": "#/definitions/size_range" },
    "weight_range": { "$ref": "#/definitions/weight_range" },
    "base_xp": { "type": "integer", "minimum": 0 },
    "base_value": { "type": "integer", "minimum": 0 },
    "description": { "type": "string" },
    "trivia": { "type": "string" },
    "cooking_uses": { "type": "array", "items": { "type": "string" } },
    "quest_items": { "type": "array", "items": { "type": "string" } },
    "special_requirements": { "$ref": "#/definitions/requirements" }
  },
  "definitions": {
    "rarity": { "enum": ["common", "uncommon", "rare", "epic", "legendary"] },
    "biome": { "enum": ["ocean", "deep_ocean", "river", "jungle_pond", "swamp", "frozen_ocean", "frozen_river", "nether_lava", "end_void"] },
    "season": { "enum": ["spring", "summer", "fall", "winter"] },
    "time_range": {
      "type": "object",
      "properties": {
        "start": { "type": "integer", "minimum": 0, "maximum": 24000 },
        "end": { "type": "integer", "minimum": 0, "maximum": 24000 }
      }
    },
    "size_range": {
      "type": "object",
      "properties": {
        "min": { "type": "number" },
        "max": { "type": "number" },
        "unit": { "enum": ["cm", "in"], "default": "cm" }
      }
    },
    "weight_range": {
      "type": "object",
      "properties": {
        "min": { "type": "number" },
        "max": { "type": "number" },
        "unit": { "enum": ["kg", "lb"], "default": "kg" }
      }
    },
    "requirements": {
      "type": "object",
      "properties": {
        "rod_tier_min": { "type": "integer" },
        "enchantments": { "type": "array", "items": { "type": "string" } },
        "bait": { "type": "string" },
        "weather": { "type": "string" },
        "player_level": { "type": "integer" }
      }
    }
  }
}
```

### Catch Event Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CatchEvent",
  "type": "object",
  "required": ["event_id", "player", "fish", "timestamp"],
  "properties": {
    "event_id": { "type": "string", "format": "uuid" },
    "player": {
      "type": "object",
      "properties": {
        "uuid": { "type": "string" },
        "name": { "type": "string" }
      }
    },
    "fish": { "$ref": "fish_schema#/properties/fish_id" },
    "size_cm": { "type": "number" },
    "weight_kg": { "type": "number" },
    "biome": { "type": "string" },
    "rod_used": { "type": "string" },
    "bait_used": { "type": "string" },
    "enchantments": { "type": "array", "items": { "type": "string" } },
    "weather": { "type": "string" },
    "moon_phase": { "type": "string" },
    "time_of_day": { "type": "integer" },
    "catch_time_seconds": { "type": "number" },
    "xp_gained": { "type": "integer" },
    "is_record": { "type": "boolean" },
    "is_first_discovery": { "type": "boolean" },
    "timestamp": { "type": "string", "format": "date-time" }
  }
}
```

### Tournament Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Tournament",
  "type": "object",
  "required": ["tournament_id", "type", "mode", "start_time", "end_time"],
  "properties": {
    "tournament_id": { "type": "string" },
    "name": { "type": "string" },
    "type": { "enum": ["daily", "weekly", "seasonal", "special"] },
    "mode": { "enum": ["most_fish", "biggest_catch", "rarest_catch", "points", "total_weight"] },
    "categories": { "type": "array", "items": { "type": "string" } },
    "point_system": {
      "type": "object",
      "additionalProperties": { "type": "integer" }
    },
    "entry_fee": { "type": "integer" },
    "start_time": { "type": "string", "format": "date-time" },
    "end_time": { "type": "string", "format": "date-time" },
    "rewards": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "rank": { "oneOf": [{ "type": "integer" }, { "type": "string" }] },
          "coins": { "type": "integer" },
          "items": { "type": "array", "items": { "type": "string" } },
          "badge": { "type": "string" },
          "title": { "type": "string" }
        }
      }
    },
    "participants": { "type": "array", "items": { "type": "string" } },
    "leaderboard": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "rank": { "type": "integer" },
          "player": { "type": "string" },
          "score": { "type": "number" }
        }
      }
    }
  }
}
```

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total Fish Species | 127 |
| Common | 50 |
| Uncommon | 35 |
| Rare | 22 |
| Epic | 12 |
| Legendary | 8 |
| Biomes | 9 |
| Seasonal Events | 4 |
| Limited Events | 4 |
| Rod Tiers | 6 |
| Enchantments | 10 |
| Bait Types | 7 |
| Cooking Recipes | 20+ |
| Quest Types | 5 |
| Skill Max Level | 100 |

---

*Document Version: 1.0.0 | Last Updated: 2026-03-27*
*Part of the CraftMind Fishing System*
