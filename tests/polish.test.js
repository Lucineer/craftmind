/**
 * Integration and edge-case tests for the polished CraftMind core.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { PluginManager } = require('../src/plugins');
const { CommandRegistry } = require('../src/commands');
const { CraftMindEvents } = require('../src/events');
const { BotStateMachine, BUILTIN_STATES } = require('../src/state-machine');
const { HealthMonitor } = require('../src/brain');
const { EventEmitter } = require('events');

// ─── Plugin System Integration ────────────────────────────────────────────────

describe('Plugin System Integration', () => {
  let pm, events, commands;

  beforeEach(() => {
    pm = new PluginManager();
    events = new CraftMindEvents();
    commands = new CommandRegistry();
  });

  it('plugin can register commands via context', () => {
    pm.load({
      name: 'cmd-plugin',
      init(ctx) {
        ctx.commands.register({
          name: 'ping',
          execute(ctx) { ctx.reply('pong'); },
        });
      },
    }, events, commands, {});

    assert.ok(commands.names.includes('ping'));
    const replies = [];
    commands.execute('!ping', { reply: (m) => replies.push(m) });
    assert.deepEqual(replies, ['pong']);
  });

  it('plugin can register custom methods', () => {
    const mockBot = { craftmind: {} };
    pm.load({
      name: 'method-plugin',
      init(ctx) {
        ctx.registerMethod('doThing', () => 'thing done');
      },
    }, events, commands, mockBot);

    assert.equal(mockBot.craftmind.doThing(), 'thing done');
  });

  it('plugin can add prompt fragments', () => {
    pm.load({
      name: 'prompt-plugin',
      init(ctx) {
        ctx.addPromptFragment('context', 'You are fishing.', 10);
      },
    }, events, commands, {});

    const fragments = pm.getPromptFragments();
    assert.equal(fragments.length, 1);
    assert.equal(fragments[0].text, 'You are fishing.');
    assert.equal(fragments[0].priority, 10);
    assert.equal(fragments[0].plugin, 'prompt-plugin');
  });

  it('prompt fragments sorted by priority', () => {
    pm.load({
      name: 'low',
      init(ctx) { ctx.addPromptFragment('a', 'low', 1); },
    }, events, commands, {});
    pm.load({
      name: 'high',
      init(ctx) { ctx.addPromptFragment('b', 'high', 100); },
    }, events, commands, {});
    pm.load({
      name: 'mid',
      init(ctx) { ctx.addPromptFragment('c', 'mid', 50); },
    }, events, commands, {});

    const fragments = pm.getPromptFragments();
    assert.equal(fragments[0].text, 'high');
    assert.equal(fragments[1].text, 'mid');
    assert.equal(fragments[2].text, 'low');
  });

  it('plugin can register inventory hooks', () => {
    pm.load({
      name: 'inv-plugin',
      init(ctx) {
        ctx.addInventoryHook('fish', {
          itemPattern: /cod|salmon/,
          onCollect(item) { /* tracked */ },
        });
      },
    }, events, commands, {});

    const hooks = pm.getInventoryHooks();
    assert.equal(hooks.length, 1);
    assert.equal(hooks[0].category, 'fish');
    assert.ok(hooks[0].itemPattern.test('cod'));
    assert.ok(hooks[0].itemPattern.test('salmon'));
    assert.ok(!hooks[0].itemPattern.test('dirt'));
  });

  it('plugin can register crew roles', () => {
    pm.load({
      name: 'crew-plugin',
      init(ctx) {
        ctx.registerCrewRole('fisher', (state) => ({ action: 'fishing', ...state }));
      },
    }, events, commands, {});

    const roles = pm.getCrewRoles();
    assert.equal(roles.length, 1);
    assert.equal(roles[0].role, 'fisher');
    const result = roles[0].handler({ target: 'ocean' });
    assert.equal(result.action, 'fishing');
  });

  it('plugin dependency checking', () => {
    pm.load({
      name: 'base',
      init() {},
    }, events, commands, {});

    assert.ok(pm.has('base'));

    assert.throws(() => {
      pm.load({
        name: 'dependent',
        depends: ['missing'],
        init() {},
      }, events, commands, {});
    }, /depends on.*missing/);
  });

  it('findProvider finds plugin by capability', () => {
    pm.load({
      name: 'fisher',
      provides: ['fishing'],
      init() {},
    }, events, commands, {});

    assert.equal(pm.findProvider('fishing'), 'fisher');
    assert.equal(pm.findProvider('mining'), null);
  });

  it('invalid plugin throws', () => {
    assert.throws(() => {
      pm.load({}, events, commands, {});
    }, /load.*init.*function/);
  });

  it('plugin error during load is cleaned up', () => {
    assert.throws(() => {
      pm.load({
        name: 'broken',
        init() { throw new Error('load failed'); },
      }, events, commands, {});
    }, /Failed to load plugin.*broken/);

    assert.ok(!pm.has('broken'));
  });

  it('plugin loaded event is emitted', () => {
    const loaded = [];
    events.on('PLUGIN_LOADED', (data) => loaded.push(data.name));
    pm.load({ name: 'test', init() {} }, events, commands, {});
    assert.deepEqual(loaded, ['test']);
  });
});

// ─── State Machine Edge Cases ─────────────────────────────────────────────────

describe('State Machine Edge Cases', () => {
  let fsm;

  beforeEach(() => {
    fsm = new BotStateMachine();
  });

  it('registerState adds custom plugin state', () => {
    assert.ok(!fsm.states.includes('EXCAVATING'));
    fsm.registerState('EXCAVATING', { from: ['IDLE', 'MINING'] });
    assert.ok(fsm.states.includes('EXCAVATING'));
    assert.ok(fsm.canTransition('EXCAVATING', 'IDLE'));
  });

  it('registerState with timeout', () => {
    fsm.registerState('REELING', {
      from: ['CASTING'],
      timeout: 500,
    });
    assert.ok(fsm.canTransition('REELING', 'CASTING'));
  });

  it('full fishing state flow: IDLE → FISHING → CASTING → REELING → FIGHTING → LANDING → IDLE', () => {
    fsm.registerState('CASTING', { from: ['FISHING'] });
    fsm.registerState('REELING', { from: ['CASTING'] });
    fsm.registerState('FIGHTING', { from: ['REELING'] });
    fsm.registerState('LANDING', { from: ['FIGHTING'] });

    assert.equal(fsm.current, 'IDLE');
    assert.equal(fsm.transition('FISHING'), true);
    assert.equal(fsm.current, 'FISHING');
    assert.equal(fsm.transition('CASTING'), true);
    assert.equal(fsm.current, 'CASTING');
    assert.equal(fsm.transition('REELING'), true);
    assert.equal(fsm.current, 'REELING');
    assert.equal(fsm.transition('FIGHTING'), true);
    assert.equal(fsm.current, 'FIGHTING');
    assert.equal(fsm.transition('LANDING'), true);
    assert.equal(fsm.current, 'LANDING');
    assert.equal(fsm.transition('IDLE'), true);
    assert.equal(fsm.current, 'IDLE');
  });

  it('IDLE is always reachable from any state', () => {
    fsm.transition('FOLLOWING');
    assert.equal(fsm.transition('IDLE'), true);

    fsm.transition('MINING');
    assert.equal(fsm.transition('IDLE'), true);
  });

  it('getHistory returns correct entries', () => {
    fsm.transition('FOLLOWING');
    fsm.transition('IDLE');
    fsm.transition('NAVIGATING');

    const history = fsm.getHistory();
    assert.equal(history.length, 3);
    assert.equal(history[0].from, 'IDLE');
    assert.equal(history[0].to, 'FOLLOWING');
  });

  it('getHistory with filters', () => {
    fsm.transition('FOLLOWING');
    fsm.transition('IDLE');
    fsm.transition('NAVIGATING');
    fsm.transition('IDLE');

    assert.equal(fsm.getHistory({ from: 'FOLLOWING' }).length, 1);
    assert.equal(fsm.getHistory({ to: 'IDLE' }).length, 2);
    assert.equal(fsm.getHistory({ limit: 1 }).length, 1);
  });

  it('forceState bypasses validation', () => {
    fsm.transition('FOLLOWING');
    fsm.forceState('CUSTOM_STATE', { reason: 'error recovery' });
    assert.equal(fsm.current, 'CUSTOM_STATE');

    const history = fsm.getHistory();
    assert.equal(history[history.length - 1].forced, true);
  });

  it('consecutive transitions increment counter', () => {
    assert.equal(fsm.transitionCount, 0);
    fsm.transition('FOLLOWING');
    assert.equal(fsm.transitionCount, 1);
    fsm.transition('IDLE');
    assert.equal(fsm.transitionCount, 2);
  });

  it('reset clears everything', () => {
    fsm.transition('FOLLOWING');
    fsm.meta('target', 'Player1');
    fsm.transition('IDLE');
    assert.ok(fsm.transitionCount > 0);

    fsm.reset();
    assert.equal(fsm.current, 'IDLE');
    assert.equal(fsm.transitionCount, 0);
    assert.equal(fsm.meta('target'), undefined);
  });

  it('BUILTIN_STATES includes expected values', () => {
    assert.ok(BUILTIN_STATES.includes('IDLE'));
    assert.ok(BUILTIN_STATES.includes('FOLLOWING'));
    assert.ok(BUILTIN_STATES.includes('NAVIGATING'));
    assert.ok(BUILTIN_STATES.includes('MINING'));
    assert.ok(BUILTIN_STATES.includes('BUILDING'));
    assert.ok(BUILTIN_STATES.includes('FISHING'));
  });

  it('states getter includes dynamically registered states', () => {
    const before = fsm.states.length;
    fsm.registerState('CUSTOM', { from: ['IDLE'] });
    assert.equal(fsm.states.length, before + 1);
  });

  it('stateData is stored and retrievable', () => {
    fsm.transition('FOLLOWING', { target: 'Steve', distance: 3 });
    assert.deepEqual(fsm.stateData, { target: 'Steve', distance: 3 });
  });
});

// ─── Health Monitor ────────────────────────────────────────────────────────────

describe('HealthMonitor', () => {
  it('starts healthy', () => {
    const llm = new EventEmitter();
    const monitor = new HealthMonitor(llm);
    assert.ok(monitor.healthy);
  });

  it('becomes unhealthy after consecutive failures', () => {
    const llm = new EventEmitter();
    const monitor = new HealthMonitor(llm);
    const changes = [];
    llm.on('healthChange', (h) => changes.push(h));

    for (let i = 0; i < 3; i++) {
      monitor.recordFailure('API error');
    }
    assert.ok(!monitor.healthy);
    assert.deepEqual(changes, [false]);
  });

  it('recovers after consecutive successes', () => {
    const llm = new EventEmitter();
    const monitor = new HealthMonitor(llm);
    const changes = [];
    llm.on('healthChange', (h) => changes.push(h));

    // Make unhealthy
    for (let i = 0; i < 3; i++) monitor.recordFailure('error');
    assert.ok(!monitor.healthy);

    // Make healthy again
    for (let i = 0; i < 2; i++) monitor.recordSuccess();
    assert.ok(monitor.healthy);
    assert.deepEqual(changes, [false, true]);
  });

  it('stats tracks call counts', () => {
    const llm = new EventEmitter();
    const monitor = new HealthMonitor(llm);

    monitor.recordSuccess();
    monitor.recordSuccess();
    monitor.recordFailure('timeout', true);
    monitor.recordFailure('error');

    const stats = monitor.stats;
    assert.equal(stats.totalCalls, 4);
    assert.equal(stats.totalFailures, 2);
    assert.equal(stats.totalTimeouts, 1);
  });

  it('recent errors are tracked', () => {
    const llm = new EventEmitter();
    const monitor = new HealthMonitor(llm);

    for (let i = 0; i < 15; i++) {
      monitor.recordFailure(`error ${i}`);
    }

    // Only keeps last 10
    assert.equal(monitor.stats.recentErrors.length, 10);
    assert.equal(monitor.stats.recentErrors[0], 'error 5');
  });

  it('reset clears all stats', () => {
    const llm = new EventEmitter();
    const monitor = new HealthMonitor(llm);

    monitor.recordFailure('error');
    monitor.recordSuccess();
    monitor.reset();

    assert.ok(monitor.healthy);
    assert.equal(monitor.stats.totalCalls, 0);
    assert.equal(monitor.stats.totalFailures, 0);
    assert.equal(monitor.stats.recentErrors.length, 0);
  });
});

// ─── Events Error Handling ─────────────────────────────────────────────────────

describe('Events Error Handling', () => {
  it('error in handler does not prevent other handlers from running', () => {
    const events = new CraftMindEvents();
    const results = [];

    events.on('test', () => { throw new Error('boom'); });
    events.on('test', () => results.push('second'));

    // Should not throw
    events.emit('test');
    assert.deepEqual(results, ['second']);
  });

  it('removeAll(event) clears only that event', () => {
    const events = new CraftMindEvents();
    let aCount = 0;
    let bCount = 0;

    events.on('a', () => aCount++);
    events.on('a', () => aCount++);
    events.on('b', () => bCount++);

    events.removeAll('a');
    events.emit('a');
    events.emit('b');

    assert.equal(aCount, 0);
    assert.equal(bCount, 1);
  });

  it('Events object has all expected keys', () => {
    const { EVENTS } = require('../src/events');
    assert.ok(EVENTS.SPAWN);
    assert.ok(EVENTS.DISCONNECT);
    assert.ok(EVENTS.CHAT);
    assert.ok(EVENTS.COMMAND);
    assert.ok(EVENTS.PLAYER_SEEN);
    assert.ok(EVENTS.STATE_CHANGE);
    assert.ok(EVENTS.FISHING_CAST);
    assert.ok(EVENTS.FISHING_BITE);
    assert.ok(EVENTS.FISHING_CATCH);
    assert.ok(EVENTS.SERVER_CRASH);
    assert.ok(EVENTS.PLUGIN_LOADED);
  });
});
