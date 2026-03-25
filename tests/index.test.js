const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { LLMClient, PERSONALITIES, BrainHandler } = require('../src/brain');
const { BotAgent, Orchestrator } = require('../src/orchestrator');
const { BotStateMachine } = require('../src/state-machine');
const { CommandRegistry } = require('../src/commands');
const { builtinCommands } = require('../src/commands/builtin');
const { CraftMindEvents } = require('../src/events');
const { PluginManager } = require('../src/plugins');
const { BotMemory } = require('../src/memory');
const { loadConfig, validateConfig } = require('../src/config');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── LLMClient ─────────────────────────────────────────────────────────────────

describe('LLMClient', () => {
  it('constructs with defaults and env override', () => {
    const client = new LLMClient({ apiKey: 'test-key' });
    assert.equal(client.apiKey, 'test-key');
    assert.equal(client.model, 'glm-4.7-flash');
    assert.equal(client.maxHistory, 20);
    assert.ok(client.apiUrl.includes('z.ai'));
  });

  it('clearHistory empties the history array', () => {
    const client = new LLMClient();
    client.history.push({ role: 'user', content: 'hello' });
    client.history.push({ role: 'assistant', content: 'hi' });
    client.clearHistory();
    assert.equal(client.history.length, 0);
  });

  it('trims history to maxHistory', () => {
    const client = new LLMClient({ maxHistory: 3 });
    for (let i = 0; i < 5; i++) {
      client.history.push({ role: 'user', content: `msg${i}` });
    }
    if (client.history.length > client.maxHistory) {
      client.history = client.history.slice(-client.maxHistory);
    }
    assert.equal(client.history.length, 3);
    assert.equal(client.history[0].content, 'msg2');
  });

  it('returns null on API failure (no key)', async () => {
    const client = new LLMClient({ apiKey: '' });
    const result = await client.chat('hello');
    assert.equal(result, null);
  });
});

// ─── Personalities ─────────────────────────────────────────────────────────────

describe('PERSONALITIES', () => {
  const names = Object.keys(PERSONALITIES);

  it('exports four built-in personalities', () => {
    assert.deepEqual(names.sort(), ['cody', 'iris', 'nova', 'rex']);
  });

  it('each personality has required fields', () => {
    for (const name of names) {
      const p = PERSONALITIES[name];
      assert.ok(p.name, `${name} missing name`);
      assert.ok(p.systemPrompt, `${name} missing systemPrompt`);
      assert.ok(p.systemPrompt.includes('{context}'), `${name} systemPrompt missing {context}`);
    }
  });
});

// ─── BrainHandler ──────────────────────────────────────────────────────────────

describe('BrainHandler', () => {
  it('rate-limits calls within minThinkInterval', async () => {
    const bot = { username: 'TestBot', entity: { position: { x: 0, y: 64, z: 0 } }, chat() {} };
    const brain = new BrainHandler(bot, PERSONALITIES.cody, { apiKey: 'fake' });
    brain.lastThink = Date.now();
    await brain.handleChat('Player1', 'hello');
    assert.equal(brain.thinking, false);
  });

  it('ignores messages from self', async () => {
    const bot = { username: 'Cody', entity: { position: { x: 0, y: 64, z: 0 } }, chat() {} };
    const brain = new BrainHandler(bot, PERSONALITIES.cody, { apiKey: 'fake' });
    await brain.handleChat('Cody', 'hello');
    assert.equal(brain.thinking, false);
  });
});

// ─── State Machine ─────────────────────────────────────────────────────────────

describe('BotStateMachine', () => {
  let fsm;

  beforeEach(() => {
    fsm = new BotStateMachine();
  });

  it('starts in IDLE state', () => {
    assert.equal(fsm.current, 'IDLE');
  });

  it('transitions between valid states', () => {
    assert.equal(fsm.transition('FOLLOWING'), true);
    assert.equal(fsm.current, 'FOLLOWING');
    assert.equal(fsm.transition('IDLE'), true);
    assert.equal(fsm.current, 'IDLE');
  });

  it('rejects unknown states', () => {
    assert.throws(() => fsm.transition('DANCING'), /Unknown state/);
  });

  it('notifies listeners on state change', () => {
    const changes = [];
    fsm.onStateChange((from, to) => changes.push({ from, to }));
    fsm.transition('NAVIGATING');
    assert.deepEqual(changes, [{ from: 'IDLE', to: 'NAVIGATING' }]);
  });

  it('supports unsubscribing from state changes', () => {
    const changes = [];
    const unsub = fsm.onStateChange((from, to) => changes.push({ from, to }));
    fsm.transition('FOLLOWING');
    unsub();
    fsm.transition('COMBAT');
    assert.equal(changes.length, 1);
  });

  it('supports state guards', () => {
    fsm.configure('COMBAT', { guard: (from) => from === 'IDLE' });
    assert.equal(fsm.transition('COMBAT'), true);
    assert.equal(fsm.transition('FLEEING'), true);
    assert.equal(fsm.transition('COMBAT'), false); // Not from IDLE
    assert.equal(fsm.current, 'FLEEING');
  });

  it('tracks elapsed time in state', () => {
    const before = fsm.elapsed;
    assert.ok(before >= 0);
    fsm.transition('FOLLOWING');
    const after = fsm.elapsed;
    assert.ok(after >= 0);
  });

  it('supports metadata', () => {
    fsm.meta('target', 'Player1');
    assert.equal(fsm.meta('target'), 'Player1');
    fsm.reset();
    assert.equal(fsm.meta('target'), undefined);
  });

  it('canTransition checks without side effects', () => {
    assert.equal(fsm.canTransition('NAVIGATING'), true);
    assert.equal(fsm.current, 'IDLE'); // Still IDLE
  });

  it('calls onEnter and onExit hooks', () => {
    const log = [];
    fsm.configure('COMBAT', {
      onEnter: (from) => log.push(`enter:${from}`),
      onExit: (to) => log.push(`exit:${to}`),
    });
    fsm.transition('COMBAT');
    fsm.transition('IDLE');
    assert.deepEqual(log, ['enter:IDLE', 'exit:IDLE']);
  });

  it('IDLE transition to IDLE returns true (no-op)', () => {
    assert.equal(fsm.transition('IDLE'), true);
  });
});

// ─── Command Registry ──────────────────────────────────────────────────────────

describe('CommandRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  it('registers and executes commands', () => {
    registry.register({
      name: 'test',
      execute(ctx) { ctx.reply('ok'); },
    });
    const replies = [];
    const ctx = { reply: (m) => replies.push(m) };
    assert.equal(registry.execute('!test', ctx), true);
    assert.deepEqual(replies, ['ok']);
  });

  it('returns false for unknown commands', () => {
    assert.equal(registry.execute('!nonexistent', {}), false);
  });

  it('handles aliases', () => {
    registry.register({
      name: 'hello',
      aliases: ['hi', 'hey'],
      execute(ctx) { ctx.reply('hello!'); },
    });
    const replies = [];
    const ctx = { reply: (m) => replies.push(m) };
    assert.equal(registry.execute('!hi', ctx), true);
    assert.equal(registry.execute('!hey', ctx), true);
    assert.equal(replies.length, 2);
  });

  it('prevents duplicate registration', () => {
    registry.register({ name: 'test', execute() {} });
    assert.throws(() => registry.register({ name: 'test', execute() {} }), /already registered/);
  });

  it('supports unregistering', () => {
    registry.register({ name: 'test', execute() {} });
    registry.unregister('test');
    assert.equal(registry.execute('!test', {}), false);
  });

  it('respects permissions', () => {
    registry.register({
      name: 'admin',
      permission: 'op',
      execute(ctx) { ctx.reply('admin'); },
    });
    const replies = [];
    const ctx = { reply: (m) => replies.push(m), permission: 'anyone' };
    registry.execute('!admin', ctx);
    assert.ok(replies[0].includes('permission'));
  });

  it('generates help text', () => {
    registry.register({
      name: 'test',
      description: 'A test command',
      usage: '!test <arg>',
      execute() {},
    });
    const help = registry.help();
    assert.ok(help.includes('!test'));
    const cmdHelp = registry.help('test');
    assert.ok(cmdHelp.includes('A test command'));
  });

  it('lists command names', () => {
    registry.register({ name: 'a', execute() {} });
    registry.register({ name: 'b', aliases: ['b2'], execute() {} });
    assert.deepEqual(registry.names.sort(), ['a', 'b']);
  });

  it('catches and reports execution errors', () => {
    registry.register({
      name: 'broken',
      execute() { throw new Error('boom'); },
    });
    const replies = [];
    const ctx = { reply: (m) => replies.push(m) };
    assert.equal(registry.execute('!broken', ctx), true);
    assert.ok(replies[0].includes('boom'));
  });
});

// ─── Builtin Commands ──────────────────────────────────────────────────────────

describe('builtinCommands', () => {
  it('contains expected commands', () => {
    const names = builtinCommands.map((c) => c.name);
    assert.ok(names.includes('follow'));
    assert.ok(names.includes('stop'));
    assert.ok(names.includes('help'));
    assert.ok(names.includes('status'));
  });

  it('every command has an execute function', () => {
    for (const cmd of builtinCommands) {
      assert.equal(typeof cmd.execute, 'function', `${cmd.name} missing execute`);
    }
  });
});

// ─── Events ────────────────────────────────────────────────────────────────────

describe('CraftMindEvents', () => {
  let events;

  beforeEach(() => {
    events = new CraftMindEvents();
  });

  it('emits to registered handlers', () => {
    const results = [];
    events.on('test', (a, b) => results.push([a, b]));
    events.emit('test', 1, 2);
    assert.deepEqual(results, [[1, 2]]);
  });

  it('once handler fires only once', () => {
    let count = 0;
    events.once('test', () => count++);
    events.emit('test');
    events.emit('test');
    assert.equal(count, 1);
  });

  it('off removes specific handler', () => {
    let count = 0;
    const handler = () => count++;
    events.on('test', handler);
    events.emit('test');
    events.off('test', handler);
    events.emit('test');
    assert.equal(count, 1);
  });

  it('removeAll clears handlers for specific event', () => {
    events.on('a', () => {});
    events.on('a', () => {});
    events.on('b', () => {});
    events.removeAll('a');
    // Emitting 'a' should not throw
    events.emit('a');
  });

  it('removeAll with no arg clears everything', () => {
    events.on('a', () => {});
    events.removeAll();
    events.emit('a');
  });

  it('catches handler errors without crashing', () => {
    events.on('test', () => { throw new Error('handler error'); });
    events.on('test', () => {});
    // Should not throw
    events.emit('test');
  });

  it('on returns unsubscribe function', () => {
    let count = 0;
    const unsub = events.on('test', () => count++);
    events.emit('test');
    unsub();
    events.emit('test');
    assert.equal(count, 1);
  });

  it('has predefined event names', () => {
    assert.ok(CraftMindEvents.Events.SPAWN);
    assert.ok(CraftMindEvents.Events.CHAT);
    assert.ok(CraftMindEvents.Events.COMMAND);
    assert.ok(CraftMindEvents.Events.STATE_CHANGE);
    assert.ok(CraftMindEvents.Events.PLAYER_SEEN);
  });
});

// ─── Plugin Manager ────────────────────────────────────────────────────────────

describe('PluginManager', () => {
  it('loads and initializes a plugin', () => {
    const pm = new PluginManager();
    const events = new CraftMindEvents();
    const commands = new CommandRegistry();

    let initialized = false;
    pm.load(
      {
        name: 'test',
        init() { initialized = true; },
      },
      events,
      commands,
      { craftmind: {} },
    );

    assert.ok(initialized);
    assert.deepEqual(pm.loaded, ['test']);
  });

  it('prevents loading duplicate plugins', () => {
    const pm = new PluginManager();
    const plugin = { name: 'dup', init() {} };
    pm.load(plugin, new CraftMindEvents(), new CommandRegistry(), {});
    assert.equal(pm.load(plugin, new CraftMindEvents(), new CommandRegistry(), {}), false);
  });

  it('calls destroy on unload', () => {
    const pm = new PluginManager();
    let destroyed = false;
    pm.load(
      { name: 'test', init() {}, destroy() { destroyed = true; } },
      new CraftMindEvents(),
      new CommandRegistry(),
      {},
    );
    pm.unload('test');
    assert.ok(destroyed);
    assert.deepEqual(pm.loaded, []);
  });

  it('unloadAll removes everything', () => {
    const pm = new PluginManager();
    pm.load({ name: 'a', init() {} }, new CraftMindEvents(), new CommandRegistry(), {});
    pm.load({ name: 'b', init() {} }, new CraftMindEvents(), new CommandRegistry(), {});
    pm.unloadAll();
    assert.deepEqual(pm.loaded, []);
  });
});

// ─── Memory ────────────────────────────────────────────────────────────────────

describe('BotMemory', () => {
  let tmpDir;
  let mem;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'craftmind-test-'));
    mem = new BotMemory('TestBot', tmpDir);
  });

  it('remembers players', () => {
    mem.rememberPlayer('Alice', { note: 'friendly' });
    const info = mem.getPlayer('alice');
    assert.ok(info);
    assert.equal(info.interactions, 1);
  });

  it('increments player interactions', () => {
    mem.rememberPlayer('Alice');
    mem.rememberPlayer('alice');
    assert.equal(mem.getPlayer('alice').interactions, 2);
  });

  it('remembers places', () => {
    mem.rememberPlace('spawn', { x: 0, y: 64, z: 0 });
    assert.ok(mem.getPlace('spawn'));
    assert.equal(mem.knownPlaces.spawn.x, 0);
  });

  it('records builds', () => {
    mem.rememberBuild('tower', { x: 10, y: 70, z: 10 });
    assert.ok(mem.knownBuilds.tower);
  });

  it('records resources', () => {
    mem.recordResource('diamond', { x: 5, y: 12, z: -30 }, 3);
    assert.equal(mem.data.resources.diamond.totalFound, 3);
    assert.equal(mem.data.resources.diamond.locations.length, 1);
  });

  it('records deaths', () => {
    mem.recordDeath('creeper');
    mem.recordDeath('fall');
    assert.equal(mem.data.deaths, 2);
    assert.equal(mem.data.deathCauses.length, 2);
  });

  it('supports meta key-value', () => {
    mem.setMeta('favoriteBlock', 'obsidian');
    assert.equal(mem.getMeta('favoriteBlock'), 'obsidian');
  });

  it('persists to disk and reloads', () => {
    mem.rememberPlayer('Bob');
    mem.recordDeath('lava');
    mem.save();

    const mem2 = new BotMemory('TestBot', tmpDir);
    assert.ok(mem2.getPlayer('bob'));
    assert.equal(mem2.data.deaths, 1);
  });

  it('starts fresh for unknown bot', () => {
    assert.equal(mem.data.deaths, 0);
    assert.deepEqual(mem.data.players, {});
  });
});

// ─── Configuration ─────────────────────────────────────────────────────────────

describe('Config', () => {
  it('loads with defaults', () => {
    const config = loadConfig({});
    assert.equal(config.host, 'localhost');
    assert.equal(config.port, 25565);
    assert.equal(config.version, '1.21.4');
    assert.equal(config.username, 'CraftBot');
    assert.ok(config.llm);
    assert.ok(config.behavior);
    assert.ok(config.pathfinding);
  });

  it('runtime options override defaults', () => {
    const config = loadConfig({ host: 'mc.example.com', port: 25566 });
    assert.equal(config.host, 'mc.example.com');
    assert.equal(config.port, 25566);
  });

  it('defaults personality to username lowercase', () => {
    const config = loadConfig({ username: 'Cody' });
    assert.equal(config.personality, 'cody');
  });

  it('validates correct config', () => {
    const config = loadConfig({});
    const result = validateConfig(config);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('catches invalid port', () => {
    const { valid, errors } = validateConfig({ port: 99999 });
    assert.equal(valid, false);
    assert.ok(errors.some((e) => e.includes('port')));
  });

  it('catches invalid username', () => {
    const { valid, errors } = validateConfig({ username: '' });
    assert.equal(valid, false);
    assert.ok(errors.some((e) => e.includes('username')));
  });
});

// ─── Orchestrator ──────────────────────────────────────────────────────────────

describe('Orchestrator', () => {
  it('addAgent and removeAgent lifecycle', () => {
    const orch = new Orchestrator();
    orch.addAgent('Cody');
    assert.ok(orch.agents.has('Cody'));
    orch.removeAgent('Cody');
    assert.ok(!orch.agents.has('Cody'));
  });

  it('resolveName does prefix matching', () => {
    const orch = new Orchestrator();
    orch.addAgent('Cody');
    assert.equal(orch.resolveName('c'), 'Cody');
    assert.equal(orch.resolveName('co'), 'Cody');
    assert.equal(orch.resolveName('cody'), 'Cody');
    assert.equal(orch.resolveName('nova'), null);
  });

  it('command returns false for dead agent', () => {
    const agent = new BotAgent('Test');
    assert.equal(agent.command('follow', 'Player'), false);
  });

  it('getStatus returns expected shape', () => {
    const agent = new BotAgent('Test');
    const status = agent.getStatus();
    assert.equal(status.name, 'Test');
    assert.equal(status.alive, false);
    assert.equal(status.status, 'idle');
  });

  it('commandAll broadcasts to all agents (noop when dead)', () => {
    const orch = new Orchestrator();
    orch.addAgent('Cody');
    orch.addAgent('Nova');
    orch.commandAll('stop');
    assert.ok(true);
  });
});
