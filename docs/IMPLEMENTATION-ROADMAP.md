# CraftMind Implementation Roadmap

**Ordered build plan for the CraftMind Minecraft server**

---

## Overview

This roadmap provides a prioritized implementation plan for CraftMind, organized into four phases. Each phase builds on the previous, delivering playable value at each milestone.

**Related Documentation:**
- [CROSS-GAME-ECONOMY.md](CROSS-GAME-ECONOMY.md) — Currency, XP, items, market system
- [FISHING-MASTERY.md](FISHING-MASTERY.md) — Fish species, rarity, equipment, collection
- [NPC-PERSONALITY-SYSTEM.md](NPC-PERSONALITY-SYSTEM.md) — Archetypes, memory, relationships
- [PLAYER-JOURNEY.md](PLAYER-JOURNEY.md) — Player progression phases, wow moments
- [QUEST-FRAMEWORK.md](QUEST-FRAMEWORK.md) — Quest types, rewards, generation

**Architecture:**
- `craftmind/` — Core framework (CommonJS)
- `craftmind-fishing/` — Fishing game module (ESM)

---

## Phase 1: Playable Demo (2 Weeks)

**Goal:** Ship a minimum viable experience with fishing + 1 NPC + basic economy + onboarding.

**Done When:**
- [ ] New player can join, get oriented, catch fish, sell to NPC, feel progression
- [ ] NPC remembers player name and fish caught across sessions
- [ ] Economy credits persist and can be spent
- [ ] End-to-end playable loop in under 10 minutes

### 1.1 Core Fishing Experience (Priority: P0)

**Dependencies:** None (foundation)

| Task | File | Action |
|------|------|--------|
| 1.1.1 | `craftmind-fishing/src/mineflayer/fishing-plugin.js` | Stabilize existing fishing mechanics, fix chat rate limiter to 1.5s+0.5s jitter |
| 1.1.2 | `craftmind-fishing/src/world/fish-spawner.js` | **CREATE** — Biome-based fish spawning with rarity tiers (Common 68%, Uncommon 20%, Rare 8%, Epic 3%, Legendary 0.5%) |
| 1.1.3 | `craftmind-fishing/src/world/sitka-sound.js` | **CREATE** — Tide system, weather effects, time-of-day modifiers |
| 1.1.4 | `craftmind-fishing/src/integration/catch-processor.js` | **CREATE** — Process catches: XP, credits, item generation, rarity effects |
| 1.1.5 | `craftmind-fishing/src/data/fish-species.json` | **CREATE** — 20 fish species (5 per rarity tier), size/weight ranges |
| 1.1.6 | `craftmind/src/plugins/fishing-core.js` | **CREATE** — Bridge plugin connecting craftmind core to fishing module |

### 1.2 First NPC with Memory (Priority: P0)

**Dependencies:** 1.1 complete

| Task | File | Action |
|------|------|--------|
| 1.2.1 | `craftmind/src/npc/memory.js` | **CREATE** — Player memory schema (UUID, name, catches, conversations, preferences) |
| 1.2.2 | `craftmind/src/npc/dialogue.js` | **CREATE** — Template-based dialogue with memory injection |
| 1.2.3 | `craftmind/src/npc/archetypes/mentor.js` | **CREATE** — First NPC archetype: Gustav (grumpy fisherman, Mentor/Competitor blend) |
| 1.2.4 | `craftmind/src/npc/npc-manager.js` | **CREATE** — NPC lifecycle, spawning, pathfinding integration |
| 1.2.5 | `craftmind/data/npcs/gustav.yaml` | **CREATE** — NPC definition file with dialogue templates, gift preferences, unlockables |
| 1.2.6 | `craftmind/src/plugins/npc-system.js` | **CREATE** — Plugin wrapper for NPC system |

**Memory Schema (from NPC-PERSONALITY-SYSTEM.md):**
```javascript
{
  player: { uuid, displayName, firstMet, lastInteraction, interactionCount },
  conversations: [{ date, location, topics, mood, keyPhrases }],
  preferences: { playStyle, communicationStyle, favoriteActivities },
  achievements: [{ type, date, details, npcReaction }],
  gifts: [{ item, date, reaction, friendshipDelta }]
}
```

### 1.3 Basic Economy (Priority: P0)

**Dependencies:** 1.1, 1.2 complete

| Task | File | Action |
|------|------|--------|
| 1.3.1 | `craftmind/src/economy/credits.js` | **MODIFY** — Add persistence, daily cap (800 credits), transaction log |
| 1.3.2 | `craftmind/src/economy/shop.js` | **CREATE** — NPC shop interface: buy/sell items, dynamic pricing |
| 1.3.3 | `craftmind/src/economy/pricing.js` | **CREATE** — Fish sell values by rarity (Common: 1-5, Uncommon: 10-25, Rare: 50-100, Epic: 200-500, Legendary: 1000-5000) |
| 1.3.4 | `craftmind/src/economy/transactions.js` | **CREATE** — Transaction processing, audit log, rollback support |
| 1.3.5 | `craftmind-fishing/src/economy/fish-pricing.js` | **CREATE** — Fish-specific pricing with size/quality modifiers |

**Credit Values (from CROSS-GAME-ECONOMY.md):**
| Rarity | Credits | XP |
|--------|---------|-----|
| Common | 10 | 5 |
| Uncommon | 25 | 12 |
| Rare | 50 | 25 |
| Epic | 150 | 75 |
| Legendary | 500+ | 200+ |

### 1.4 Onboarding Flow (Priority: P1)

**Dependencies:** 1.1, 1.2, 1.3 complete

| Task | File | Action |
|------|------|--------|
| 1.4.1 | `craftmind/src/plugins/onboarding.js` | **CREATE** — First-join detection, tutorial sequence |
| 1.4.2 | `craftmind/src/onboarding/spawn.js` | **CREATE** — Welcome dock spawn point, compass item |
| 1.4.3 | `craftmind/src/onboarding/tutorial.js` | **CREATE** — 5-minute guided tutorial: cast, catch, sell, talk to Gustav |
| 1.4.4 | `craftmind/data/dialogue/tutorial.json` | **CREATE** — Tutorial dialogue scripts |
| 1.4.5 | `craftmind/src/onboarding/first-fish-celebration.js` | **CREATE** — First catch celebration with Gustav reaction |

### 1.5 Phase 1 Polish (Priority: P1)

| Task | File | Action |
|------|------|--------|
| 1.5.1 | `craftmind/src/utils/rate-limiter.js` | **MODIFY** — Fix chat rate limiter to 1.5s base + 0.5s jitter |
| 1.5.2 | `craftmind/scripts/night-shift.cjs` | **CREATE** — Rewrite night-shift as CJS for bot monitoring/restart |
| 1.5.3 | `craftmind/tests/integration/fishing-flow.test.js` | **CREATE** — E2E test: join → catch fish → sell → NPC remembers |
| 1.5.4 | `craftmind/docs/QUICKSTART.md` | **CREATE** — Developer quickstart guide |

---

## Phase 2: Depth (4 Weeks)

**Goal:** Full-featured fishing game, quest system, collection/encyclopedia, progression, leaderboard.

**Done When:**
- [ ] Players can engage 5-10 hours without running out of content
- [ ] Quest system generates and tracks meaningful objectives
- [ ] Fish encyclopedia shows progress toward 127 species
- [ ] Leaderboard drives competition

**Dependencies:** Phase 1 complete

### 2.1 Fishing Mastery Expansion (Priority: P0)

| Task | File | Action |
|------|------|--------|
| 2.1.1 | `craftmind-fishing/src/data/fish-species.json` | **EXPAND** — Add all 127 species from FISHING-MASTERY.md |
| 2.1.2 | `craftmind-fishing/src/world/biomes.js` | **CREATE** — 9 biomes (Ocean, Deep Ocean, River, Jungle Pond, Swamp, Frozen Ocean, Nether Lava, End Void) |
| 2.1.3 | `craftmind-fishing/src/gear/rods.js` | **CREATE** — 6 rod tiers (Wooden → Netherite) with enchantments |
| 2.1.4 | `craftmind-fishing/src/gear/bait.js` | **CREATE** — 7 bait types with duration/effects |
| 2.1.5 | `craftmind-fishing/src/world/seasonal.js` | **CREATE** — 4 seasonal events (Spring Festival, Summer Slam, Harvest Moon, Winter Wonderland) |
| 2.1.6 | `craftmind-fishing/src/world/weather-effects.js` | **CREATE** — Weather modifiers (rain, storm, fog, clear) |

### 2.2 Fish Encyclopedia (Priority: P0)

| Task | File | Action |
|------|------|--------|
| 2.2.1 | `craftmind/src/collection/encyclopedia.js` | **CREATE** — Fish collection tracking, discovery states |
| 2.2.2 | `craftmind/src/collection/milestones.js` | **CREATE** — Collection tiers (Novice 10 → Grandmaster 127) |
| 2.2.3 | `craftmind/src/collection/records.js` | **CREATE** — Personal records (largest, smallest, first caught date) |
| 2.2.4 | `craftmind/commands/fish.js` | **CREATE** — `/fish list`, `/fish info <name>`, `/fish progress`, `/fish records` |
| 2.2.5 | `craftmind/data/encyclopedia/fish-entries.json` | **CREATE** — Full fish entry data (see FISHING-MASTERY.md schema) |

### 2.3 Quest System (Priority: P0)

| Task | File | Action |
|------|------|--------|
| 2.3.1 | `craftmind/src/quest/engine.js` | **CREATE** — Quest generation, progress tracking, completion |
| 2.3.2 | `craftmind/src/quest/templates.js` | **CREATE** — Quest templates (collection, catch-specific, size-target, time-limited) |
| 2.3.3 | `craftmind/src/quest/rewards.js` | **CREATE** — Reward distribution (credits, items, XP, titles) |
| 2.3.4 | `craftmind/src/quest/daily.js` | **CREATE** — Daily quest generation (3 per player per day) |
| 2.3.5 | `craftmind/src/quest/chains.js` | **CREATE** — Multi-step quest chains with story progression |
| 2.3.6 | `craftmind/data/quests/fishing-quests.json` | **CREATE** — Initial quest pool (20+ quests) |

**Quest Types (from QUEST-FRAMEWORK.md):**
- Collection: Catch N fish of type
- Mastery: Catch fish above size threshold
- Discovery: Catch first of species
- Time-limited: Complete within timer
- Chain: Multi-step narrative

### 2.4 Player Progression (Priority: P1)

| Task | File | Action |
|------|------|--------|
| 2.4.1 | `craftmind/src/progression/xp-system.js` | **CREATE** — Unified XP tracking, level calculation |
| 2.4.2 | `craftmind/src/progression/skills.js` | **CREATE** — Fishing skill tree (Patience, Keen Eye, Angler) |
| 2.4.3 | `craftmind/src/progression/unlocks.js` | **CREATE** — Level-based unlocks (new areas, gear, abilities) |
| 2.4.4 | `craftmind/src/progression/titles.js` | **CREATE** — Earnable titles displayed in chat |
| 2.4.5 | `craftmind/data/progression/fishing-skill-tree.json` | **CREATE** — Skill tree definition |

**XP Curve (from CROSS-GAME-ECONOMY.md):**
- Level 10: 22,316 XP
- Level 50: 538,022 XP
- Level 100: 2,520,284 XP

### 2.5 Leaderboard System (Priority: P1)

| Task | File | Action |
|------|------|--------|
| 2.5.1 | `craftmind/src/leaderboard/engine.js` | **CREATE** — Score tracking, ranking, reset schedules |
| 2.5.2 | `craftmind/src/leaderboard/categories.js` | **CREATE** — Categories: Most Fish, Biggest Fish, Rarest Catch, Fastest 100 |
| 2.5.3 | `craftmind/commands/leaderboard.js` | **CREATE** — `/leaderboard [category]`, `/top [n]` |
| 2.5.4 | `craftmind/src/leaderboard/display.js` | **CREATE** — Leaderboard hologram/sign display in-world |

### 2.6 Additional NPCs (Priority: P1)

| Task | File | Action |
|------|------|--------|
| 2.6.1 | `craftmind/src/npc/archetypes/competitor.js` | **CREATE** — Riley Chen (rival fisher) |
| 2.6.2 | `craftmind/src/npc/archetypes/mystic.js` | **CREATE** — Nana Kiko (weather/rare fish predictor) |
| 2.6.3 | `craftmind/src/npc/archetypes/merchant.js` | **CREATE** — Gus Morrison (tackle shop owner) |
| 2.6.4 | `craftmind/src/npc/gossip.js` | **CREATE** — NPC-to-NPC gossip network |
| 2.6.5 | `craftmind/data/npcs/riley.yaml` | **CREATE** — NPC definition |
| 2.6.6 | `craftmind/data/npcs/nana-kiko.yaml` | **CREATE** — NPC definition |
| 2.6.7 | `craftmind/data/npcs/gus.yaml` | **CREATE** — NPC definition |

---

## Phase 3: Community (4 Weeks)

**Goal:** Social features, trading, tournaments, NPC interactions, challenges.

**Done When:**
- [ ] Players can trade fish and items with each other
- [ ] Weekly tournaments run automatically
- [ ] NPCs interact with each other (gossip, relationships)
- [ ] Daily/weekly challenges provide recurring engagement

**Dependencies:** Phase 2 complete

### 3.1 P2P Trading (Priority: P0)

| Task | File | Action |
|------|------|--------|
| 3.1.1 | `craftmind/src/market/listing.js` | **CREATE** — Create/cancel market listings |
| 3.1.2 | `craftmind/src/market/search.js` | **CREATE** — Search/filter market by category, price, rarity |
| 3.1.3 | `craftmind/src/market/transaction.js` | **CREATE** — Purchase processing, 10% tax, delivery |
| 3.1.4 | `craftmind/src/market/price-history.js` | **CREATE** — Track prices, show trends |
| 3.1.5 | `craftmind/commands/market.js` | **CREATE** — `/market list`, `/market buy`, `/market search` |
| 3.1.6 | `craftmind/src/trade/direct.js` | **CREATE** — Proximity-based direct trading (50 blocks) |

### 3.2 Tournaments (Priority: P0)

| Task | File | Action |
|------|------|--------|
| 3.2.1 | `craftmind/src/tournament/engine.js` | **CREATE** — Tournament lifecycle (register → compete → results) |
| 3.2.2 | `craftmind/src/tournament/daily.js` | **CREATE** — Daily tournaments (most fish, 24h duration) |
| 3.2.3 | `craftmind/src/tournament/weekly.js` | **CREATE** — Weekly tournaments (biggest catch, entry fee, prizes) |
| 3.2.4 | `craftmind/src/tournament/seasonal.js` | **CREATE** — Seasonal championships (points-based, 31 days) |
| 3.2.5 | `craftmind/commands/tournament.js` | **CREATE** — `/tournament join`, `/tournament standings`, `/tournament rewards` |
| 3.2.6 | `craftmind/data/tournaments/templates.json` | **CREATE** — Tournament configuration templates |

### 3.3 NPC-to-NPC Interactions (Priority: P1)

| Task | File | Action |
|------|------|--------|
| 3.3.1 | `craftmind/src/npc/relationships.js` | **CREATE** — NPC-to-NPC relationship tracking |
| 3.3.2 | `craftmind/src/npc/gossip.js` | **EXPAND** — Full gossip system (see NPC-PERSONALITY-SYSTEM.md) |
| 3.3.3 | `craftmind/src/npc/coordination.js` | **CREATE** — Coordinated multi-NPC behaviors (celebrations, tutorials) |
| 3.3.4 | `craftmind/data/npc-relationships.yaml` | **CREATE** — Define relationship network |

**Gossip System:**
- Achievements: Spread to friends immediately, 100% accurate
- Offenses: Spread next day, 80% accurate
- Secrets: Spread after 7 days, requires trust 150

### 3.4 Daily/Weekly Challenges (Priority: P1)

| Task | File | Action |
|------|------|--------|
| 3.4.1 | `craftmind/src/challenges/daily.js` | **CREATE** — Generate 3 daily challenges per player |
| 3.4.2 | `craftmind/src/challenges/weekly.js` | **CREATE** — Weekly challenges with higher rewards |
| 3.4.3 | `craftmind/src/challenges/progress.js` | **CREATE** — Challenge progress tracking |
| 3.4.4 | `craftmind/commands/challenges.js` | **CREATE** — `/challenges`, `/challenge claim <id>` |
| 3.4.5 | `craftmind/data/challenges/pool.json` | **CREATE** — Challenge pool by game mode |

### 3.5 Social Features (Priority: P2)

| Task | File | Action |
|------|------|--------|
| 3.5.1 | `craftmind/src/social/friends.js` | **CREATE** — Friend list, online status |
| 3.5.2 | `craftmind/src/social/party.js` | **CREATE** — Party system for group activities |
| 3.5.3 | `craftmind/src/social/chat-channels.js` | **CREATE** — Chat channels (global, local, trade, party) |
| 3.5.4 | `craftmind/commands/social.js` | **CREATE** — `/friend`, `/party`, `/channel` |

---

## Phase 4: Platform (Ongoing)

**Goal:** Content creation tools, modding API, cross-server, analytics.

**Done When:**
- [ ] Community can create and share content
- [ ] Server supports cross-server economy
- [ ] Admins have visibility into player behavior

**Dependencies:** Phase 3 complete

### 4.1 Content Creation Tools (Priority: P1)

| Task | File | Action |
|------|------|--------|
| 4.1.1 | `craftmind/src/editor/fish-editor.js` | **CREATE** — In-game fish species editor |
| 4.1.2 | `craftmind/src/editor/quest-editor.js` | **CREATE** — Quest template creator |
| 4.1.3 | `craftmind/src/editor/npc-editor.js` | **CREATE** — NPC dialogue/behavior editor |
| 4.1.4 | `craftmind/src/editor/zone-editor.js` | **CREATE** — Fishing zone configuration |
| 4.1.5 | `craftmind/commands/editor.js` | **CREATE** — `/editor [type]` admin command |

### 4.2 Modding API (Priority: P1)

| Task | File | Action |
|------|------|--------|
| 4.2.1 | `craftmind/src/api/events.js` | **CREATE** — Public event API for plugins |
| 4.2.2 | `craftmind/src/api/hooks.js` | **CREATE** — Hook system for extending behavior |
| 4.2.3 | `craftmind/src/api/data.js` | **CREATE** — Data access API (read-only for players) |
| 4.2.4 | `craftmind/docs/API.md` | **CREATE** — API documentation |
| 4.2.5 | `craftmind/examples/custom-plugin.js` | **CREATE** — Example custom plugin |

### 4.3 Cross-Server Economy (Priority: P2)

| Task | File | Action |
|------|------|--------|
| 4.3.1 | `craftmind/src/federation/sync.js` | **CREATE** — Cross-server data sync protocol |
| 4.3.2 | `craftmind/src/federation/conflict.js` | **CREATE** — Conflict resolution for concurrent updates |
| 4.3.3 | `craftmind/src/federation/handoff.js` | **CREATE** — Player handoff between servers |
| 4.3.4 | `craftmind/data/federation/config.json` | **CREATE** — Federation configuration |

### 4.4 Analytics Dashboard (Priority: P2)

| Task | File | Action |
|------|------|--------|
| 4.4.1 | `craftmind/src/analytics/collector.js` | **CREATE** — Event collection, aggregation |
| 4.4.2 | `craftmind/src/analytics/metrics.js` | **CREATE** — KPI calculation (DAU, retention, economy health) |
| 4.4.3 | `craftmind/src/analytics/export.js` | **CREATE** — Export to CSV, JSON, webhook |
| 4.4.4 | `craftmind/src/analytics/alerts.js` | **CREATE** — Alert on metric thresholds |
| 4.4.5 | `craftmind/scripts/analytics-server.js` | **CREATE** — Dashboard web server |

**Monitored Metrics (from CROSS-GAME-ECONOMY.md):**
- Daily: credits in circulation, earned, spent, active players
- Weekly: inflation rate, wealth Gini, game mode distribution
- Alerts: inflation spike (>5%), wealth imbalance (Gini > 0.7)

### 4.5 Remaining Games (Priority: P2)

| Task | File | Action |
|------|------|--------|
| 4.5.1 | `craftmind-discgolf/` | **CREATE** — Disc golf module (new package) |
| 4.5.2 | `craftmind-studio/` | **CREATE** — Movie studio module (new package) |
| 4.5.3 | `craftmind-academy/` | **CREATE** — Education/circuits module (new package) |
| 4.5.4 | `craftmind-ranch/` | **CREATE** — Ranch/herding module (new package) |
| 4.5.5 | `craftmind/src/games/hub.js` | **CREATE** — Game hub integration, portal system |

---

## Priority Summary

| Phase | Priority | Duration | Key Deliverable |
|-------|----------|----------|-----------------|
| 1 | P0-P1 | 2 weeks | Playable fishing demo with 1 NPC |
| 2 | P0-P1 | 4 weeks | Full fishing game with progression |
| 3 | P0-P2 | 4 weeks | Social features, tournaments |
| 4 | P1-P2 | Ongoing | Platform, other games |

## Dependency Graph

```
Phase 1 (Foundation)
├── 1.1 Fishing Core ─────────┬──► 1.2 NPC System ──┬──► 1.4 Onboarding
│                             │                     │
│                             └──► 1.3 Economy ─────┘
│
└──► Phase 2 (Depth)
     ├── 2.1 Mastery ─────────────► 2.2 Encyclopedia
     ├── 2.3 Quests ──────────────► 2.4 Progression
     └── 2.5 Leaderboard ◄──────── 2.6 NPCs

└──► Phase 3 (Community)
     ├── 3.1 Trading ◄───────────── 2.5 Leaderboard
     ├── 3.2 Tournaments ◄───────── 2.5 Leaderboard
     └── 3.3 NPC Interactions ◄──── 2.6 NPCs

└──► Phase 4 (Platform)
     ├── 4.1 Content Tools ◄─────── 3.3 NPC Interactions
     ├── 4.2 Modding API ◄───────── All Phase 3
     ├── 4.3 Cross-Server ◄──────── 3.1 Trading
     └── 4.5 Other Games ◄───────── All above
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| NPC memory bloat | Implement compression: recent 30 days detailed, older summarized |
| Economy inflation | Daily caps, 10% market tax, credit sinks (consumables, cosmetics) |
| Chat spam kicks | Rate limiter at 1.5s + 0.5s jitter (target < 20 messages/min) |
| Bot crashes | Night-shift daemon with auto-restart, health checks |
| Data loss | Periodic snapshots, transaction log with replay |

## Success Metrics by Phase

| Phase | Metric | Target |
|-------|--------|--------|
| 1 | Tutorial completion | > 80% |
| 1 | First-session retention | > 50% return next day |
| 2 | Session length | > 30 min average |
| 2 | Encyclopedia progress | > 20% in first week |
| 3 | Market transactions | > 10 per active player/week |
| 3 | Tournament participation | > 30% of active players |
| 4 | User-generated content | > 10 community quests/month |

---

*Document Version: 1.0.0*
*Created: 2026-03-27*
*Server: CraftMind Alpha (port 25566)*
