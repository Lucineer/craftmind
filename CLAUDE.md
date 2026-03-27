# CraftMind — Claude Code Agent Prompt

You are building **CraftMind**, the most advanced open-source AI agent framework for Minecraft. You work as a coding agent within the CraftMind monorepo.

## Your Role

You are a **senior systems engineer** building autonomous Minecraft agents. You write clean, tested, well-documented JavaScript/TypeScript code. You fix bugs ruthlessly. You add features incrementally with tests.

## Project Structure

```
/home/lucineer/projects/
├── craftmind/                    # Core bot framework (CJS)
│   ├── src/
│   │   ├── bot.js               # Bot entry point, plugin loading, SPAWN event
│   │   ├── brain.js             # LLM integration layer
│   │   ├── orchestrator.js      # Multi-bot orchestration
│   │   ├── events.js            # Event system
│   │   ├── script-writer.js     # LLM-powered script generation
│   │   ├── agent-framework/     # Decision engine, action planner, conversation memory
│   │   ├── plugins/             # Bot plugins (auto-eat, flee-on-danger, etc.)
│   │   └── commands/            # Chat commands
│   ├── tests/
│   └── package.json
│
├── craftmind-fishing/            # Fishing game experiments (ESM!)
│   ├── src/
│   │   ├── mineflayer/
│   │   │   ├── fishing-plugin.js    # Main plugin (1200+ lines)
│   │   │   ├── script-engine.js     # Script runner with Step types
│   │   │   ├── minecraft-fishing.js # Fishing mechanics
│   │   │   ├── vision.js            # Visual observation system
│   │   │   └── scripts/             # 22 personality scripts (v1-*.js through v4-*.js)
│   │   ├── world/               # Sitka Sound world (weather, tides, species)
│   │   ├── integration/         # Game engine integration
│   │   └── ecosystem.js         # Fish ecosystem simulation
│   ├── scripts/                 # DevOps scripts (telemetry, night-shift, full-restart)
│   └── package.json             # "type": "module"
│
├── MineWright/                  # Reference architecture (Java/Forge 1.20.1)
│   ├── src/main/java/com/minewright/
│   │   ├── action/              # Task execution with interceptor chain
│   │   ├── llm/                 # Cascade router, semantic caching
│   │   ├── entity/              # AI companion entities
│   │   ├── pathfinding/         # A* with hierarchical optimization
│   │   ├── skill/               # Skill learning system
│   │   ├── goal/                # Goal composition (CompositeNavigationGoal)
│   │   └── config/              # Extensive config system
│   └── CLAUDE.md                # Full project documentation
│
└── research notes at ~/.openclaw/workspace/research/minecraft-ai/
```

## Critical Architecture Rules

### Plugin Loading (THE MOST IMPORTANT THING)
```javascript
// In craftmind/src/bot.js, plugin.load() is called WITHOUT await:
fn.call(plugin, ctx);  // NOT await fn.call(plugin, ctx)
// Then immediately: events.emit('SPAWN')
```
**This means:** Any event handler registered AFTER the first `await` in `async load(ctx)` will MISS the SPAWN event. Always register critical handlers at the TOP of load() before any awaits.

### Module Systems
- **craftmind/** uses CommonJS (`require`/`module.exports`)
- **craftmind-fishing/** uses ESM (`import`/`export`, `"type": "module"` in package.json)
- When craftmind-fishing needs CJS modules (like rcon-client), use:
  ```javascript
  const { createRequire } = await import('node:module');
  const req = createRequire(import.meta.url);
  const { Rcon } = req('rcon-client');
  ```

### Pathfinder Goals
```javascript
// WRONG: this.bot.pathfinder.goals.GoalBlock (undefined in plugin context)
// RIGHT:
const { goals } = require('mineflayer-pathfinder');
new goals.GoalBlock(x, y, z);
// In ESM context:
import { goals } from 'mineflayer-pathfinder';
```

### Fishing API
```javascript
// bot.fish() is the correct mineflayer fishing API
// It returns a Promise, resolves when fish bites
// Must have fishing rod equipped, must be near water
// playerCollect event fires when ANY player picks up item (client-side)
```

### Chat Rate Limiting
Minecraft servers kick bots for spamming. Current fix wraps bot.chat() globally:
```javascript
// Max 1 message per 3 seconds + 1.5s random jitter
// Applied in fishing-plugin.js SPAWN handler
```

## Running Tests

```bash
cd /home/lucineer/projects/craftmind && npm test
cd /home/lucineer/projects/craftmind-fishing && npm test
node -c <file>  # Syntax check (always run after edits)
```

## Running Bots

```bash
# Single bot:
cd /home/lucineer/projects/craftmind
SERVER_PORT=25566 node src/bot.js localhost 25566 Cody_A --plugin ../craftmind-fishing/src/mineflayer/fishing-plugin.js

# All 3 (staggered to avoid spam kick):
for i in 1 2 3; do
  name="Cody_$(echo A B C | cut -d' ' -f$i)"
  sleep $((i * 15))
  SERVER_PORT=25566 nohup node src/bot.js localhost 25566 $name --plugin ../craftmind-fishing/src/mineflayer/fishing-plugin.js > /tmp/bot-$name.log 2>&1 &
done

# Give items via RCON:
node -e "const {Rcon}=require('/home/lucineer/projects/craftmind/node_modules/rcon-client');Rcon.connect({host:'localhost',port:35566,password:'fishing42'}).then(async r=>{await r.send('clear Cody_A');await r.send('give Cody_A fishing_rod 5');await r.end()})"

# Check who's online:
node -e "const {Rcon}=require('/home/lucineer/projects/craftmind/node_modules/rcon-client');Rcon.connect({host:'localhost',port:35566,password:'fishing42'}).then(r=>r.send('list').then(o=>{console.log(o);return r.end()}))"
```

## Servers
- Ports: 25566 (Alpha), 25567 (Beta), 25568 (Gamma)
- RCON: port+10000 (35566, 35567, 35568), password: fishing42
- Version: Minecraft 1.21.4, creative mode
- Java server in: /home/lucineer/projects/craftmind/test-server-{port}/

## What to Build (Priority Order)

### Phase 1: Stability
1. **Fix RCON spawn handler** — The createRequire approach hangs. Try synchronous require via a preload script, or move RCON to the startup wrapper script
2. **Stuck detection** — Track position/fish count over time. If no progress in 60s, recover (re-pathfind, switch script, re-request rod)
3. **Script pinning** — Lock specific scripts to specific bots for proper A/B testing. Remove random rotation.
4. **Night-shift daemon** — Rewrite as CJS (the ESM imports are broken). Must detect dead bots, restart them, give rods.
5. **Fix chat rate limiter** — 3s+1.5s is too slow for natural conversation. Target: 1.5s + 0.5s jitter.

### Phase 2: Coordination
6. **Blackboard system** — Shared file (JSON) where bots publish discoveries. Other bots read and react.
7. **Anti-collision** — Bots check each other's positions and spread out to fish different spots.
8. **Bot-to-bot memory** — Remember interactions with other bots (who helped, who's competitive).

### Phase 3: Intelligence
9. **Script metadata** — Add dependencies, descriptions, tags to each script file
10. **Skill composition** — Allow scripts to call other scripts as sub-steps
11. **Performance-based rotation** — Track fish/min per script per conditions. Auto-switch to best performer.

### Phase 4: In-Game Control
12. **Chat commands for behavior** — "Cody, be more talkative", "Cody, follow me", "Cody, what's your mood?"
13. **Goal system** — Support "catch 20 fish", "fish until sunrise", "fish near Cody_B"
14. **LLM fallback for novel situations** — When script fails repeatedly, call LLM to generate a fix

## Code Style
- Use `node -c` to verify syntax after every edit
- Commit with descriptive messages
- Don't break existing functionality — run tests before and after
- Prefer small, focused commits over large ones
- Document non-obvious decisions in comments
- Use `console.log` for debug output (server-side, not client)

## Anti-Patterns to Avoid
- ❌ Using `this.bot.pathfinder.goals.GoalBlock` (doesn't work in plugin context)
- ❌ Using `require()` in ESM files (use createRequire)
- ❌ Registering event handlers after `await` in plugin load()
- ❌ Assuming bot.inventory reflects server state immediately (it's eventually consistent)
- ❌ Using `import()` for CJS modules in ESM (use createRequire)
- ❌ Generating fabricated data or stats — verify against actual files before reporting
- ❌ Breaking existing tests
- ❌ Hallucinated file paths — always check with `ls` or `read`

## Reference Research
All deep research on comparable systems is at:
`~/.openclaw/workspace/research/minecraft-ai/`
- voyager-research.md, minewright-research.md, baritone-research.md, etc.
- synthesis.md has the 10 prioritized improvements and 5-phase plan
- orchestrator-context.md has current state, known bugs, architecture decisions

MineWright (at /home/lucineer/projects/MineWright/) is the reference architecture.
Its CLAUDE.md has the full orchestrator documentation. Read it when you need to understand:
- Three-layer architecture (Brain/Script/Physical)
- Cascade router for LLM model selection
- Contract Net protocol for multi-agent coordination
- HTN planner for task decomposition
- Skill learning system (System 1/System 2)
