# CraftMind Core Redesign: Universal Agent Framework

## Principle
**Core provides the BRAIN. Game plugins provide the BODY (actions, world, rules).**

A Studio plugin registers "film" actions. A Fishing plugin registers "fish" actions.
The planning, evaluation, evolution, and multi-agent orchestration are all shared.

---

## A. Architecture Overview

### What Core Provides (the BRAIN)
- **Agent Framework** — personality, memory, relationships, scheduling, autonomous ticking
- **Multi-Agent Orchestration** — spawn, coordinate, resolve interactions between agents
- **Action System** — schema definition, NL→action planning, tick-based execution with humanized timing
- **Conversation Intelligence** — topic extraction, intent detection, conversation context
- **Session Recording** — generic session logging with query support
- **Comparative Evaluation** — score, rank, compare any sessions/approaches
- **Script Evolution** — LLM-driven self-improvement of any scripts
- **Decision Engine** — data-driven decisions factoring personality, conditions, history
- **Interaction System** — 12+ interaction types between agents (rivalry, mentoring, gossip, etc.)
- **Story Generation** — emergent narrative detection from agent behavior
- **NPC Simulation** — agents without physical bot instances
- **State Machine** — finite state management with plugin-extensible states
- **LLM Brain** — health-monitored LLM client with personality system
- **Plugin System** — extensible via load/init/unload lifecycle

### What Stays Game-Specific (the BODY)
- Action type definitions (FISH, CAST, REEL, SELL, etc.)
- World builder / terrain generation
- Game rules, scoring, progression
- NPC configs (names, dialogue, relationships)
- Bot platform specifics (mineflayer, web, etc.)

### How Repos Share the Framework
```
craftmind/ (core npm package)
  └── src/agent-framework/   ← shared by all repos
  
craftmind-fishing/           ← game plugin
  └── src/game/              ← fishing-specific actions, world, NPCs
  └── imports from @craftmind/core

craftmind-studio/            ← game plugin
  └── src/game/              ← film-specific actions, actors, sets
  └── imports from @craftmind/core
```

### Plugin System Redesign
Current: plugins register commands, events, state transitions, methods.
New: plugins additionally register:
- **Action schemas** — define what actions their domain supports
- **Action handlers** — how to execute each action type
- **Condition schemas** — what conditions matter (weather, time, etc.)
- **NPC configs** — personality presets, dialogue banks, schedules
- **Scoring functions** — how to evaluate success in this domain

---

## B. Universal Agent Framework Modules

### Module Dependency Graph
```
ActionSchema → ActionPlanner → ActionExecutor
ConversationMemory → ActionPlanner
SessionRecorder → ComparativeEvaluator → DecisionEngine
DecisionEngine → ScriptEvolver
Agent → Personality, Memory, Relationships, Schedule
AgentManager → Agent, InteractionResolver, StoryGenerator, NPCSimulation
```

### 1. ActionSchema
**Purpose:** Define action types for any domain via configuration.
- `registerType(name, {description, params, category})`
- `getType(name)`, `getByCategory(category)`, `allTypes()`
- `validateAction({type, params})`
- Example: Fishing registers FISH, CAST, REEL. Studio registers FILM, DIRECT, EDIT.

### 2. ActionPlanner
**Purpose:** NL→structured actions with injectable context and personality.
- Constructor: `(llmClient, {getGameState, getPersonality, getMemory, getRelationships, actionSchema})`
- `plan(input, playerName)` → `{actions, dialogue, fallback}`
- Extension: inject custom system prompt, action types, fallback patterns

### 3. ActionExecutor
**Purpose:** Tick-based execution with pluggable action handlers.
- Constructor: `(options)` — no game-specific deps
- `registerHandler(type, handler)` — game plugins register their handlers
- `enqueue(actions)`, `tick()`, `stop()`, `pause()`, `resume()`
- `on({onChat, onComplete, onError, onActionStart})`

### 4. ConversationMemory
**Purpose:** Track conversations with configurable topics/intents.
- Constructor: `(options)` — `{maxMessages, topics, intentPatterns}`
- `add(role, message, metadata)`, `getRecent(n)`, `getContext()`
- `extractTopics()`, `detectIntent()` — configurable keyword/intent lists

### 5. SessionRecorder
**Purpose:** Record any gameplay session with generic event/result structure.
- Constructor: `(dataDir)`
- `recordSession(session)`, `querySessions(criteria)`, `createLiveSession(script, conditions)`
- Generic: conditions and results are plain objects, not fishing-specific

### 6. ComparativeEvaluator
**Purpose:** Compare sessions with configurable scoring and similarity.
- Constructor: `(dataDir)`
- `scoreSession(session, scoreFn)` — injectable scoring function
- `findSimilarSessions(conditions, sessions, similarityFn)` — injectable similarity
- `evaluate(session, history)` → `{score, rank, bestScript, insights, scriptRanking}`

### 7. ScriptEvolver
**Purpose:** LLM-driven self-improvement of any scripts.
- Constructor: `(dataDir, scriptsDir)`
- `evolve(scriptName, evaluation, llmClient)` — uses injectable evaluation data
- `validate(code, requiredExports)`, `compareScripts(old, new, eval)`
- `getEvolutionHistory(scriptName)`, `getLatestVersion(scriptName)`

### 8. DecisionEngine
**Purpose:** Data-driven decisions with personality modifiers.
- Constructor: `(evaluator, recorder)`
- `decide(conditions, personality, memory)` → `{action, script, confidence, reasoning}`
- `answerQuestion(question)` — NL query over session data

### 9. Agent
**Purpose:** Full agent with personality, memory, relationships, schedule.
- Constructor: `(config)` — `{name, type, personality, schedule, home, location, skills, bot}`
- `tick(context)`, `handleEvent(event)`, `moveTo(location, position)`, `getSummary()`
- Extension: injectable personality builder, schedule, interaction picker

### 10. AgentManager
**Purpose:** Orchestrate multiple agents with event-driven coordination.
- Constructor: `(options)` — `{dataDir}`
- `spawnAgent(config)`, `removeAgent(name)`, `tick(context)`, `start(intervalMs)`
- Events: `agent:spawned`, `agent:action`, `interaction`, `story:emergent`, `world:event`

---

## C. Game-Specific Plugins (stays in each repo)

Each game repo defines:
- **Action types** — via `actionSchema.registerType(...)` 
- **Action handlers** — via `executor.registerHandler(type, fn)`
- **NPC configs** — personality presets, dialogue banks, location positions
- **Condition definitions** — what conditions matter for evaluation
- **Scoring functions** — how to evaluate a session's success
- **World builder** — terrain, locations, game mechanics

### Example: Fishing Plugin
```js
schema.registerType('FISH', {
  description: 'Go fishing with a specific method',
  params: ['method', 'location', 'bait', 'depth'],
  category: 'fishing'
});
executor.registerHandler('FISH', async (params) => {
  return game.startFishing(params.method);
});
evaluator.setScoreFn((session) => {
  // fishing-specific scoring
});
```

### Example: Studio Plugin
```js
schema.registerType('FILM', {
  description: 'Film a scene',
  params: ['scene', 'angle', 'actors'],
  category: 'production'
});
executor.registerHandler('FILM', async (params) => {
  return director.filmScene(params);
});
```

---

## D. Cross-Game Synergy Map

| Feature | Fishing | Studio | Courses | Researcher | Herding | Circuits | Ranch |
|---------|---------|--------|---------|------------|---------|----------|-------|
| Action Planner | Fish commands | Direct actors | Answer Qs | Run experiments | Coordinate dogs | Build circuits | Breed animals |
| Comparative Eval | Fishing scripts | Shot compositions | Lesson plans | Hypotheses | Herding strategies | Circuit designs | Breeding pairs |
| Script Evolution | Better fishing | Better directing | Better teaching | Better research | Better herding | Better circuits | Better breeding |
| Multi-Agent | Sitka NPCs | Actor ensemble | Student group | Research team | Dog pack | Circuit network | Animal colony |
| Story Gen | Sitka stories | Drama on set | Class moments | Lab discoveries | Pack dynamics | Debug stories | Evolution tales |
| Decision Engine | Conditions → method | Script → shot | Student → lesson | Hypothesis → test | Dog → task | Logic → design | Pair → breed |

---

## E. Implementation Plan

### Phase 1: Extract universal modules from fishing → core/src/agent-framework/
- action-schema.js, action-planner.js, action-executor.js
- conversation-memory.js, session-recorder.js
- comparative-evaluator.js, decision-engine.js
- agent.js, agent-manager.js
- 100+ tests

### Phase 2: Update fishing to import from core
- Replace local AI modules with core imports
- Keep fishing-specific configs in game layer

### Phase 3: Add game-specific action schemas to each repo
- Studio, Courses, Researcher, Herding, Circuits, Ranch

### Phase 4: Cross-game event system
- Events in one game can affect another (e.g., weather in fishing affects herding)

---

## F. Specific Code Design

### ActionSchema
```js
const schema = new ActionSchema();
schema.registerType('FISH', {
  description: 'Go fishing',
  params: [{name: 'method', required: true}, {name: 'bait'}],
  category: 'fishing'
});
schema.validateAction({type: 'FISH', params: {method: 'troll'}}); // true
```

### ActionPlanner — Fishing vs Studio
```js
// Fishing
const planner = new ActionPlanner(llm, {
  actionSchema: fishSchema,
  systemPrompt: 'You are Cody, an Alaska fisherman...',
  fallbackPatterns: fishingPatterns
});

// Studio  
const planner = new ActionPlanner(llm, {
  actionSchema: filmSchema,
  systemPrompt: 'You are a film director...',
  fallbackPatterns: directingPatterns
});
```

### ActionExecutor — Fishing vs Studio
```js
// Both use the same executor, different handlers
const executor = new ActionExecutor({tickInterval: 500});

// Fishing registers fishing handlers
executor.registerHandler('FISH', (params) => game.fish(params));
executor.registerHandler('CAST', (params) => game.cast(params));

// Studio registers film handlers
executor.registerHandler('FILM', (params) => director.film(params));
executor.registerHandler('CUT', (params) => editor.cut(params));
```

### ComparativeEvaluator — Fishing vs Studio
```js
const evaluator = new ComparativeEvaluator(dataDir);

// Fishing: score based on catch count and weight
evaluator.setScoreConfig({
  fields: {catchCount: 0.3, totalWeight: 0.2, speciesDiversity: 0.1},
  outcomeScores: {success: 0.8, partial: 0.5, failure: 0.1}
});

// Studio: score based on scene quality and audience rating
evaluator.setScoreConfig({
  fields: {sceneQuality: 0.4, audienceRating: 0.3, pacing: 0.2},
  outcomeScores: {hit: 0.9, mediocre: 0.5, flop: 0.1}
});
```
