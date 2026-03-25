/**
 * @module orchestrator
 * @description CraftMind Orchestrator — command multiple bots like an RTS commander.
 * Provides a CLI for sending commands to individual bots or the whole team.
 */

const { createBot } = require('./bot');
const readline = require('readline');

// ─── BotAgent ──────────────────────────────────────────────────────────────────

/**
 * Wraps a single mineflayer bot with status tracking and command routing.
 *
 * @example
 * const agent = new BotAgent('Cody');
 * await agent.start('localhost', 25565);
 * agent.command('follow', 'SafeArtist2047', 3);
 */
class BotAgent {
  /**
   * @param {string} name   - In-game username.
   * @param {Object} [config={}] - Arbitrary agent configuration.
   */
  constructor(name, config = {}) {
    /** @type {string} */
    this.name = name;
    /** @type {Object} */
    this.config = config;
    /** @type {import('mineflayer').Bot|null} */
    this.bot = null;
    /** @type {boolean} */
    this.alive = false;
    /** @type {'idle'|'following'|'mining'|'building'|'fighting'|'moving'} */
    this.status = 'idle';
    /** @type {string|null} */
    this.target = null;
  }

  /**
   * Connect the agent to a Minecraft server.
   *
   * @param {string} serverHost - Server hostname.
   * @param {number} serverPort - Server port.
   * @returns {Promise<void>} Resolves once the bot has spawned.
   */
  start(serverHost, serverPort) {
    return new Promise((resolve, reject) => {
      try {
        this.bot = createBot({
          host: serverHost,
          port: serverPort,
          username: this.name,
          version: '1.21.4',
          onChat: (_bot, username, message) => this.handleChat(username, message),
          onStart: () => {
            this.alive = true;
            console.log(`[ORCH] ${this.name} spawned`);
            resolve();
          },
          onEnd: () => {
            this.alive = false;
            this.status = 'idle';
          },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Route a chat message to this agent. Reacts when the bot's name is mentioned.
   * @param {string} username
   * @param {string} message
   */
  handleChat(username, message) {
    if (message.toLowerCase().includes(this.name.toLowerCase())) {
      console.log(`[${this.name}] ${username} said to me: ${message}`);
    }
  }

  /**
   * Execute an agent command.
   *
   * @param {string} action - One of `follow`, `stop`, `goto`, `say`, `where`, `inventory`, `look`, `entities`.
   * @param {...*}    args   - Action-specific arguments.
   * @returns {boolean} `true` if the command was recognised.
   */
  command(action, ...args) {
    if (!this.alive || !this.bot) return false;
    const cm = this.bot.craftmind;

    switch (action) {
      case 'follow':
        cm.followPlayer(args[0], args[1] || 3);
        this.status = 'following';
        this.target = args[0];
        break;
      case 'stop':
        cm.stop();
        this.status = 'idle';
        this.target = null;
        break;
      case 'goto':
        cm.goTo(parseInt(args[0]), parseInt(args[1]), parseInt(args[2]));
        this.status = 'moving';
        break;
      case 'say':
        cm.say(args.join(' '));
        break;
      case 'where': {
        const pos = cm.position();
        console.log(`[${this.name}] Position: ${pos.x}, ${pos.y}, ${pos.z}`);
        break;
      }
      case 'inventory':
        console.log(`[${this.name}]`, cm.inventorySummary());
        break;
      case 'look':
        cm.lookAt(args[0]);
        break;
      case 'entities':
        console.log(`[${this.name}]`, cm.nearbyEntities());
        break;
      default:
        return false;
    }
    return true;
  }

  /**
   * Get a status snapshot of the agent.
   * @returns {{name: string, alive: boolean, status: string, position: Object|null, health: number, food: number}}
   */
  getStatus() {
    return {
      name: this.name,
      alive: this.alive,
      status: this.status,
      position: this.alive ? this.bot.craftmind.position() : null,
      health: this.alive ? this.bot.health : 0,
      food: this.alive ? this.bot.food : 0,
    };
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────

/**
 * Manages a team of {@link BotAgent} instances and provides a CLI for control.
 *
 * @example
 * const orch = new Orchestrator();
 * orch.addAgent('Cody');
 * orch.addAgent('Nova');
 * orch.serverHost = 'localhost';
 * await orch.startAll();
 * orch.startCLI();   // REPL for sending commands
 */
class Orchestrator {
  constructor() {
    /** @type {Map<string, BotAgent>} */
    this.agents = new Map();
    /** @type {string} */
    this.serverHost = 'localhost';
    /** @type {number} */
    this.serverPort = 25565;
  }

  /**
   * Register a new agent.
   * @param {string} name        - In-game username.
   * @param {Object} [personality={}] - Personality metadata (reserved).
   * @returns {BotAgent}
   */
  addAgent(name, personality = {}) {
    const agent = new BotAgent(name, personality);
    this.agents.set(name, agent);
    return agent;
  }

  /**
   * Remove and disconnect an agent.
   * @param {string} name
   */
  removeAgent(name) {
    const agent = this.agents.get(name);
    if (agent?.bot) agent.bot.quit();
    this.agents.delete(name);
  }

  /**
   * Fuzzy-match a partial name against registered agents (prefix match).
   * @param {string} partial
   * @returns {string|null} The full agent name, or null.
   */
  resolveName(partial) {
    const lower = partial.toLowerCase();
    for (const [name] of this.agents) {
      if (name.toLowerCase().startsWith(lower)) return name;
    }
    return null;
  }

  /**
   * Broadcast a command to every agent.
   * @param {string} action
   * @param {...*} args
   */
  commandAll(action, ...args) {
    for (const [, agent] of this.agents) {
      agent.command(action, ...args);
    }
  }

  /**
   * Collect status snapshots for all agents.
   * @returns {Array<ReturnType<BotAgent['getStatus']>>}
   */
  getTeamStatus() {
    return Array.from(this.agents.values()).map((a) => a.getStatus());
  }

  /**
   * Connect every registered agent (with a 2-second stagger between connections).
   * @returns {Promise<void>}
   */
  async startAll() {
    const promises = [];
    for (const [name, agent] of this.agents) {
      promises.push(
        agent.start(this.serverHost, this.serverPort).catch((err) => {
          console.error(`Failed to start ${name}: ${err.message}`);
        }),
      );
      await new Promise((r) => setTimeout(r, 2000));
    }
    await Promise.all(promises);
  }

  /**
   * Start an interactive REPL for issuing commands.
   *
   * Commands:
   * - `<name> <action> [args]`  — e.g. `Cody follow PlayerName`
   * - `all <action> [args]`     — broadcast
   * - `status`                  — table of all agents
   * - `list`                    — agent names
   * - `add <name>`              — add an agent at runtime
   * - `quit` / `exit`           — disconnect everything
   */
  startCLI() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'craftmind> ',
    });

    rl.prompt();

    rl.on('line', (line) => {
      const parts = line.trim().split(/\s+/);
      if (!parts[0]) {
        rl.prompt();
        return;
      }

      const cmd = parts[0].toLowerCase();

      if (cmd === 'quit' || cmd === 'exit') {
        for (const [, agent] of this.agents) {
          if (agent.bot) agent.bot.quit();
        }
        process.exit(0);
      } else if (cmd === 'status') {
        console.table(this.getTeamStatus());
      } else if (cmd === 'all') {
        const subCmd = parts[1]?.toLowerCase();
        if (subCmd && ['follow', 'stop', 'say'].includes(subCmd)) {
          this.commandAll(subCmd, ...parts.slice(2));
        }
      } else if (cmd === 'list') {
        for (const name of this.agents.keys()) {
          console.log(`  - ${name}`);
        }
      } else if (cmd === 'add') {
        if (parts[1]) {
          this.addAgent(parts[1]);
          console.log(`Added agent: ${parts[1]}`);
        }
      } else {
        let agentName = cmd;
        let action = parts[1]?.toLowerCase();
        let args = parts.slice(2);

        if (action && this.agents.has(agentName)) {
          this.agents.get(agentName).command(action, ...args);
        } else if (cmd === 'follow' && parts[1] && this.agents.has(parts[1])) {
          this.agents.get(parts[1]).command('follow', ...parts.slice(2));
        } else {
          console.log('Unknown command. Usage: <agent> <action> [args...]');
        }
      }

      rl.prompt();
    });
  }
}

// ── CLI Startup ────────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const host = args.find((a) => !a.startsWith('--')) || 'localhost';
  const portArg = args.find((a) => a.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1]) : 25565;

  const countArg = args.find((a) => a.startsWith('--bots='));
  const botCount = countArg ? parseInt(countArg.split('=')[1]) : 2;
  const nameArg = args.find((a) => a.startsWith('--names='));

  const defaultNames = ['Cody', 'Nova', 'Rex', 'Iris'];
  const names = nameArg
    ? nameArg.split('=')[1].split(',')
    : defaultNames.slice(0, botCount);

  console.log('╔══════════════════════════════════════╗');
  console.log('║       CraftMind Orchestrator         ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Server: ${host}:${port}`.padEnd(33) + '║');
  console.log(`║  Bots: ${names.join(', ')}`.padEnd(33) + '║');
  console.log('╚══════════════════════════════════════╝');
  console.log();
  console.log('Commands:');
  console.log('  <name> <action> [args]  - e.g. "Cody follow SafeArtist2047"');
  console.log('  all <action> [args]     - command all bots');
  console.log('  status                  - show all bot statuses');
  console.log('  quit                    - disconnect all');
  console.log();

  const orch = new Orchestrator();
  orch.serverHost = host;
  orch.serverPort = port;
  names.forEach((name) => orch.addAgent(name));

  orch
    .startAll()
    .then(() => {
      console.log('All agents connected! Type commands to control them.');
      orch.startCLI();
    })
    .catch((err) => {
      console.error('Failed to connect:', err.message);
      console.log('Make sure your Minecraft server is running and accessible.');
    });
}

module.exports = { Orchestrator, BotAgent };
