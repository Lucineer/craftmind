# CraftMind Core

AI-powered Minecraft bots with LLM brains and multi-bot orchestration.

## Features

- **LLM-Powered Chat** — Bots converse naturally using the z.ai API. No hardcoded responses.
- **4 Built-in Personalities** — Cody, Nova, Rex, and Iris — each with unique speech patterns and quirks.
- **Custom Personalities** — Drop your own into the `PERSONALITIES` registry.
- **Pathfinding** — Follow players, navigate to coordinates, with parkour support.
- **Agent Actions** — Dig, place, look at players, inventory queries, entity scanning.
- **Multi-Bot Orchestrator** — Control an entire team from a REPL: `Cody follow PlayerName`, `all stop`.
- **Auto-Eat** — Bots automatically consume food when hunger drops.
- **Autonomous Thinking** — Bots occasionally "think" about what to do next.

## Architecture

```
┌─────────────────────────────────────────────┐
│              Orchestrator                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ BotAgent │ │ BotAgent │ │ BotAgent │ …  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘    │
│       │             │             │          │
│  ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐    │
│  │  Bot +   │ │  Bot +   │ │  Bot +   │    │
│  │ Brain    │ │ Brain    │ │ Brain    │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘    │
│       │             │             │          │
├───────▼─────────────▼─────────────▼──────────┤
│                  Minecraft Server             │
└─────────────────────────────────────────────┘

Bot Factory (bot.js)
  └─> mineflayer + pathfinder
  └─> craftmind.* actions namespace
  └─> optional BrainHandler attachment

BrainHandler (brain.js)
  └─> LLMClient → z.ai API
  └─> game-state context injection
  └─> rate limiting + history management
```

## Setup

```bash
# Install dependencies
npm install

# Configure API key
cp .env.example .env
# Edit .env — set ZAI_API_KEY=your_key_here
```

## Quick Start

### Single Bot

```bash
node src/bot.js localhost 25565 Cody
# or
node examples/single-bot.js
```

### Multi-Bot (Orchestrator)

```bash
node src/orchestrator.js --bots=3
node src/orchestrator.js --names=Cody,Nova
node examples/multi-bot.js --names=Cody,Nova,Rex,Iris
```

## Programmatic API

```js
const { createBot, PERSONALITIES, Orchestrator } = require('craftmind');

// Single bot
const bot = createBot({
  host: 'localhost',
  port: 25565,
  username: 'Cody',
  personality: 'cody',
  llmApiKey: process.env.ZAI_API_KEY,
  onStart(bot) { bot.chat('I have arrived!'); },
});

// Agent actions
bot.craftmind.followPlayer('SafeArtist2047', 3);
bot.craftmind.goTo(100, 64, -200);
bot.craftmind.stop();
bot.craftmind.position();
bot.craftmind.inventorySummary();
bot.craftmind.nearbyEntities();

// Multi-bot
const orch = new Orchestrator();
orch.addAgent('Cody');
orch.addAgent('Nova');
await orch.startAll();
orch.startCLI();
```

## In-Game Commands

| Command | Description |
|---------|-------------|
| `!follow <name>` | Follow a player |
| `!stop` | Cancel movement |
| `!where` | Report position |
| `!inv` | List inventory |
| `!look <name>` | Look at a player |
| `!brain` | Show brain status |

Just talking normally (no `!` prefix) triggers LLM-powered conversation.

## Personality System

Each personality has: `name`, `traits`, `speech`, `background`, `quirks`, and `systemPrompt`.

The `systemPrompt` contains a `{context}` placeholder that gets replaced at runtime with:
- Position, standing block, health, food, day/night, nearby entities, conversing player.

### Adding a Custom Personality

```js
const { PERSONALITIES } = require('craftmind');

PERSONALITIES.wizard = {
  name: 'Wizard',
  traits: 'mysterious, cryptic, wise',
  speech: 'speaks in riddles, old-fashioned',
  background: 'An ancient wizard trapped in block form.',
  quirks: 'obsessed with enchanting, hoards lapis',
  systemPrompt: `You are Wizard, a mysterious AI player. {context}\n…rules…`,
};
```

Then use `personality: 'wizard'` when creating the bot.

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `ZAI_API_KEY` | — | API key for z.ai LLM (required for brain) |

## Testing

```bash
npm test
```

Uses Node.js built-in test runner (`node:test`). Tests cover LLMClient, PERSONALITIES, BrainHandler, and Orchestrator.

## Troubleshooting

- **"Can't find player"** — Player must be within render distance. Use the exact username.
- **Bot disconnects immediately** — Check server version matches (`1.21.4` default). Use `online-mode=false` for cracked servers.
- **Brain not responding** — Verify `ZAI_API_KEY` is set. Check network connectivity to `api.z.ai`.
- **Pathfinding stuck** — Bot may need a clear path. Try `!stop` then `!follow` again.

## License

MIT — see [LICENSE](LICENSE).
