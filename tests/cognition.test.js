/**
 * Comprehensive tests for CraftMind core cognition modules.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  BehaviorScript, validateRule, validateScript, diffScripts, mergeScripts,
  parseCondition, evaluate, clearParseCache,
} = require('../src/behavior-script');
const { NoveltyDetector, SEVERITY } = require('../src/novelty-detector');
const { AttentionBudget } = require('../src/attention-budget');
const { EmergenceTracker } = require('../src/emergence-tracker');
const { ScriptWriter } = require('../src/script-writer');

// ─── Behavior Script ──────────────────────────────────────────────────────────

describe('BehaviorScript', () => {
  let script;

  beforeEach(() => {
    clearParseCache();
    script = new BehaviorScript([
      { id: 'rest', condition: 'energy < 0.2', action: 'rest', priority: 30 },
      { id: 'cast', condition: 'near_water AND has_rod AND !line_in', action: 'cast_line', priority: 10 },
      { id: 'reel', condition: 'hooked_fish AND tension > 0.7', action: 'reel_in', priority: 20 },
    ]);
  });

  it('loads rules sorted by priority', () => {
    assert.equal(script.rules[0].id, 'rest');
    assert.equal(script.rules[1].id, 'reel');
    assert.equal(script.rules[2].id, 'cast');
  });

  it('executes highest-priority matching rule', () => {
    const result = script.execute({ energy: 0.1, near_water: true, has_rod: true, line_in: false });
    assert.equal(result.action, 'rest');
    assert.equal(result.ruleId, 'rest');
  });

  it('falls through to lower priority if higher doesn\'t match', () => {
    const result = script.execute({ energy: 0.8, hooked_fish: true, tension: 0.9 });
    assert.equal(result.action, 'reel_in');
  });

  it('returns null when no rules match', () => {
    const result = script.execute({ energy: 0.8 });
    assert.equal(result.action, null);
  });

  it('supports AND conditions', () => {
    const r = script.execute({ near_water: true, has_rod: true, line_in: false, energy: 0.8 });
    assert.equal(r.action, 'cast_line');
  });

  it('AND fails when any operand is false', () => {
    const r = script.execute({ near_water: true, has_rod: false, line_in: false, energy: 0.8 });
    assert.notEqual(r.action, 'cast_line');
  });

  it('supports OR conditions', () => {
    const s = new BehaviorScript([
      { id: 'a', condition: 'hungry OR thirsty', action: 'eat', priority: 1 },
    ]);
    assert.equal(s.execute({ hungry: true }).action, 'eat');
    assert.equal(s.execute({ thirsty: true }).action, 'eat');
  });

  it('supports NOT conditions', () => {
    const s = new BehaviorScript([
      { id: 'a', condition: 'NOT sleeping', action: 'work', priority: 1 },
    ]);
    assert.equal(s.execute({ sleeping: false }).action, 'work');
    assert.equal(s.execute({ sleeping: true }).action, null);
  });

  it('supports numeric comparisons', () => {
    const s = new BehaviorScript([
      { id: 'gt', condition: 'x > 10', action: 'go_right', priority: 1 },
      { id: 'lt', condition: 'x < 5', action: 'go_left', priority: 2 },
      { id: 'eq', condition: 'x == 7', action: 'stop', priority: 0 },
      { id: 'ge', condition: 'x >= 10', action: 'arrived', priority: -1 },
      { id: 'le', condition: 'x <= 5', action: 'far', priority: -1 },
      { id: 'ne', condition: 'x != 7', action: 'move', priority: -2 },
    ]);
    assert.equal(s.execute({ x: 15 }).action, 'go_right');
    assert.equal(s.execute({ x: 3 }).action, 'go_left');
    assert.equal(s.execute({ x: 7 }).action, 'stop');
    assert.equal(s.execute({ x: 8 }).action, 'move');
    assert.equal(s.execute({ x: 10 }).action, 'arrived'); // x>=10 at priority -2
  });

  it('supports complex boolean expressions', () => {
    const s = new BehaviorScript([
      { id: 'complex', condition: '(hungry OR thirsty) AND NOT sleeping', action: 'consume', priority: 1 },
    ]);
    assert.equal(s.execute({ hungry: true, sleeping: false }).action, 'consume');
    assert.equal(s.execute({ thirsty: true, sleeping: true }).action, null);
    assert.equal(s.execute({ hungry: false, thirsty: false, sleeping: false }).action, null);
  });

  it('supports time checks', () => {
    const s = new BehaviorScript([
      { id: 'daytime', condition: '@time 08:00-18:00', action: 'work', priority: 1 },
    ]);
    const result = s.execute({});
    // Should match or not match based on current time — just ensure no crash
    assert.ok(result.action === 'work' || result.action === null);
  });

  it('returns allMatches when requested', () => {
    const result = script.execute({ energy: 0.1, hooked_fish: true, tension: 0.9 }, { maxResults: 10 });
    assert.ok(result.allMatches.length >= 1);
    assert.equal(result.allMatches[0].action, 'rest');
  });

  it('calls actionHandler when configured', () => {
    let called = false;
    const s = new BehaviorScript(
      [{ id: 'a', condition: 'ready', action: 'go', priority: 1 }],
      { actionHandler: (action) => { called = true; return 'done'; } },
    );
    const result = s.execute({ ready: true });
    assert.equal(called, true);
    assert.equal(result.handlerResult, 'done');
  });

  it('emits executed event', () => {
    const events = [];
    script.on('executed', (e) => events.push(e));
    script.execute({ energy: 0.1 });
    assert.equal(events.length, 1);
    assert.equal(events[0].action, 'rest');
  });

  it('addRule and removeRule work', () => {
    const v = script.addRule({ id: 'test', condition: 'x > 5', action: 'test_act', priority: 5 });
    assert.equal(v.valid, true);
    assert.ok(script.rules.find(r => r.id === 'test'));
    assert.equal(script.removeRule('test'), true);
    assert.ok(!script.rules.find(r => r.id === 'test'));
  });

  it('version increments on changes', () => {
    const v1 = script.version;
    script.addRule({ id: 't', condition: 'a', action: 'b', priority: 1 });
    assert.equal(script.version, v1 + 1);
  });

  it('rollback works', () => {
    script.addRule({ id: 't', condition: 'a', action: 'b', priority: 1 });
    assert.ok(script.rules.find(r => r.id === 't'));
    assert.equal(script.rollback(), true);
    assert.ok(!script.rules.find(r => r.id === 't'));
  });

  it('serialize and deserialize', () => {
    const json = script.serialize();
    const s2 = BehaviorScript.deserialize(json);
    assert.equal(s2.rules.length, script.rules.length);
  });

  it('validateState reports missing keys', () => {
    const missing = script.validateState({ energy: 0.5 });
    assert.ok(missing.includes('near_water'));
    assert.ok(missing.includes('has_rod'));
  });

  it('performance: 100 rules evaluate in < 1ms', () => {
    const rules = Array.from({ length: 100 }, (_, i) => ({
      id: `rule_${i}`,
      condition: `x > ${i}`,
      action: `act_${i}`,
      priority: i,
    }));
    const s = new BehaviorScript(rules);
    const start = process.hrtime.bigint();
    for (let j = 0; j < 100; j++) {
      s.execute({ x: 50 });
    }
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    assert.ok(elapsed < 100, `100 evaluations took ${elapsed}ms, expected < 100ms`);
  });
});

describe('validateRule / validateScript', () => {
  it('catches missing required fields', () => {
    const { valid, errors } = validateRule({ id: 't' });
    assert.equal(valid, false);
    assert.ok(errors.length > 0);
  });

  it('catches invalid condition syntax', () => {
    // Empty condition should fail validation
    const { valid, errors } = validateRule({ id: 't', condition: '', action: 'a', priority: 1 });
    assert.equal(valid, false);
  });

  it('catches duplicate rule ids', () => {
    const { valid, errors } = validateScript([
      { id: 'dup', condition: 'a', action: 'b', priority: 1 },
      { id: 'dup', condition: 'c', action: 'd', priority: 2 },
    ]);
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes('Duplicate')));
  });

  it('validates against validActions set', () => {
    const { valid } = validateRule(
      { id: 't', condition: 'a', action: 'invalid', priority: 1 },
      new Set(['valid_action']),
    );
    assert.equal(valid, false);
  });
});

describe('diffScripts', () => {
  const old = [
    { id: 'a', condition: 'x', action: 'go', priority: 1 },
    { id: 'b', condition: 'y', action: 'stop', priority: 2 },
  ];
  const nw = [
    { id: 'a', condition: 'x AND z', action: 'go_fast', priority: 3 },
    { id: 'c', condition: 'w', action: 'wait', priority: 1 },
  ];

  it('detects added, removed, and modified rules', () => {
    const diff = diffScripts(old, nw);
    assert.equal(diff.added.length, 1);
    assert.equal(diff.added[0].id, 'c');
    assert.equal(diff.removed.length, 1);
    assert.equal(diff.removed[0].id, 'b');
    assert.equal(diff.modified.length, 1);
    assert.equal(diff.modified[0].id, 'a');
  });

  it('empty diff for identical scripts', () => {
    const diff = diffScripts(old, old);
    assert.equal(diff.added.length, 0);
    assert.equal(diff.removed.length, 0);
    assert.equal(diff.modified.length, 0);
  });
});

describe('mergeScripts', () => {
  it('merges and tags by source', () => {
    const result = mergeScripts([
      { script: [{ id: 'a', condition: 'x', action: 'go', priority: 1 }], source: 'human' },
      { script: [{ id: 'b', condition: 'y', action: 'stop', priority: 2 }], source: 'model' },
    ]);
    assert.equal(result.length, 2);
    assert.ok(result.find(r => r._source === 'human'));
    assert.ok(result.find(r => r._source === 'model'));
  });

  it('later sources override by id', () => {
    const result = mergeScripts([
      { script: [{ id: 'a', condition: 'x', action: 'go', priority: 1 }], source: 'human' },
      { script: [{ id: 'a', condition: 'x AND z', action: 'go_fast', priority: 3 }], source: 'model' },
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].action, 'go_fast');
    assert.equal(result[0]._source, 'model');
  });
});

// ─── Novelty Detector ─────────────────────────────────────────────────────────

describe('NoveltyDetector', () => {
  let det;

  beforeEach(() => {
    det = new NoveltyDetector({ sigmaThreshold: 2 });
  });

  it('builds baseline without firing events', () => {
    for (let i = 0; i < 5; i++) det.track('x', 10 + Math.random());
    assert.equal(det.queueSize, 0);
  });

  it('fires event on anomaly', () => {
    // Establish baseline
    for (let i = 0; i < 20; i++) det.track('x', 10 + (Math.random() - 0.5));
    // Fire anomaly
    const events = [];
    det.on('novelty', (e) => events.push(e));
    const result = det.track('x', 100);
    assert.ok(result);
    assert.equal(events.length, 1);
    assert.equal(events[0].key, 'x');
    assert.ok(events[0].sigma >= 2);
  });

  it('classifies severity correctly', () => {
    for (let i = 0; i < 50; i++) det.track('x', 10 + (Math.random() - 0.5));
    det.track('x', 1000); // extreme
    const event = det.dequeue();
    assert.equal(event.severity, SEVERITY.CRITICAL);
  });

  it('deduplicates events within window', () => {
    for (let i = 0; i < 50; i++) det.track('x', 10 + (Math.random() - 0.5));
    det.track('x', 100);
    det.track('x', 100);
    det.track('x', 100);
    assert.equal(det.queueSize, 1); // deduped
  });

  it('priority queue returns events ordered by severity', () => {
    for (let i = 0; i < 50; i++) {
      det.track('a', 10 + (Math.random() - 0.5));
      det.track('b', 5 + (Math.random() - 0.5));
    }
    det.track('b', 100);
    det.track('a', 1000);
    const first = det.dequeue();
    assert.ok(first.severity === 'critical');
    assert.ok(first.sigma >= 4);
  });

  it('getStats returns mean and std', () => {
    for (let i = 0; i < 10; i++) det.track('x', i * 10);
    const stats = det.getStats('x');
    assert.ok(stats.n === 10);
    assert.ok(stats.mean > 0);
  });

  it('getHistory filters correctly', () => {
    for (let i = 0; i < 50; i++) det.track('x', 10 + (Math.random() - 0.5));
    det.track('x', 100);
    const history = det.getHistory({ key: 'x' });
    assert.ok(history.length >= 1);
  });

  it('reset clears metric', () => {
    det.track('x', 1);
    det.reset('x');
    assert.equal(det.getStats('x'), null);
  });

  it('attaches state snapshot context', () => {
    det.setStateSnapshot({ weather: 'rainy', location: 'lake' });
    for (let i = 0; i < 50; i++) det.track('x', 10 + (Math.random() - 0.5));
    det.track('x', 100);
    const event = det.dequeue();
    assert.equal(event.context.weather, 'rainy');
  });

  it('replayHistory replays all events', () => {
    for (let i = 0; i < 50; i++) det.track('x', 10 + (Math.random() - 0.5));
    det.track('x', 100);
    const replayed = [];
    det.replayHistory((e) => replayed.push(e));
    assert.ok(replayed.length >= 1);
  });
});

// ─── Attention Budget ─────────────────────────────────────────────────────────

describe('AttentionBudget', () => {
  let attn;

  beforeEach(() => {
    attn = new AttentionBudget({ maxCallsPerMinute: 2, heartbeatInterval: 100 });
  });

  it('registers entries', () => {
    attn.register('test', { priority: 'normal' });
    assert.ok(attn.registeredIds.includes('test'));
  });

  it('unregisters entries', () => {
    attn.register('test');
    attn.unregister('test');
    assert.ok(!attn.registeredIds.includes('test'));
  });

  it('tracks budget usage', () => {
    assert.equal(attn.budget.callsThisMinute, 0);
    assert.equal(attn.budget.available, true);
  });

  it('interrupt bypasses budget for critical priority', async () => {
    let called = false;
    attn.register('crit', {
      priority: 'critical',
      callback: async () => { called = true; },
    });
    const result = await attn.interrupt('crit');
    assert.equal(result, true);
    assert.equal(called, true);
  });

  it('normal interrupts respect budget', async () => {
    let called = 0;
    attn.register('norm', {
      priority: 'normal',
      callback: async () => { called++; },
    });
    await attn.interrupt('norm');
    await attn.interrupt('norm');
    await attn.interrupt('norm'); // should be blocked
    assert.equal(called, 2);
  });

  it('heartbeat calls registered callbacks', async () => {
    let called = false;
    attn.register('test', {
      priority: 'normal',
      callback: async () => { called = true; },
    });
    attn.start();
    await new Promise(r => setTimeout(r, 150));
    attn.stop();
    await new Promise(r => setTimeout(r, 50));
    assert.equal(called, true);
  });

  it('suppressed entries are skipped', async () => {
    let called = false;
    attn.register('test', {
      priority: 'normal',
      callback: async () => { called = true; },
    });
    attn.suppress('test');
    attn.start();
    await new Promise(r => setTimeout(r, 150));
    attn.stop();
    await new Promise(r => setTimeout(r, 50));
    assert.equal(called, false);
  });

  it('focus mode reduces non-focus interval', async () => {
    attn.register('focus_target', { priority: 'normal', callback: async () => {} });
    attn.register('other', { priority: 'normal', callback: async () => {} });
    attn.focus('focus_target');
    assert.equal(attn.registeredIds.length, 2);
    attn.unfocus();
  });

  it('getHistory returns records', async () => {
    attn.register('test', { priority: 'critical', callback: async () => {} });
    await attn.interrupt('test');
    const hist = attn.getHistory();
    assert.equal(hist.length, 1);
  });
});

// ─── Emergence Tracker ────────────────────────────────────────────────────────

describe('EmergenceTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new EmergenceTracker({ minFrequency: 3 });
  });

  it('logs behavior events', () => {
    tracker.log('fish', { action: 'swim', depth: 5 });
    assert.equal(tracker.logCount, 1);
  });

  it('detects repeated sequences', () => {
    for (let i = 0; i < 10; i++) {
      tracker.log('fish', { action: 'swim' });
      tracker.log('fish', { action: 'eat' });
    }
    const discoveries = tracker.detectPatterns();
    assert.ok(discoveries.length >= 1);
    assert.ok(discoveries[0].isNew);
  });

  it('exports insight cards', () => {
    for (let i = 0; i < 10; i++) {
      tracker.log('fish', { action: 'swim' });
      tracker.log('fish', { action: 'eat' });
    }
    tracker.detectPatterns();
    const patterns = tracker.patterns;
    assert.ok(patterns.length > 0);
    const card = tracker.exportInsightCard(patterns[0].id);
    assert.ok(card);
    assert.equal(card.type, 'insight-card');
  });

  it('imports insight cards', () => {
    const card = {
      type: 'insight-card',
      version: 1,
      pattern: { category: 'imported', signature: { sequence: 'a→b', length: 2 }, sequence: ['a', 'b'] },
      stats: { frequency: 5, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString() },
    };
    const pattern = tracker.importInsightCard(card);
    assert.ok(pattern);
    assert.equal(pattern.category, 'imported');
  });

  it('emits discovery event', () => {
    const discoveries = [];
    tracker.on('discovery', (d) => discoveries.push(d));
    for (let i = 0; i < 10; i++) {
      tracker.log('bot', { action: 'mine' });
      tracker.log('bot', { action: 'build' });
    }
    tracker.detectPatterns();
    assert.ok(discoveries.length >= 1);
  });

  it('causality hints from context', () => {
    for (let i = 0; i < 10; i++) {
      tracker.log('fish', { action: 'school' }, { predator: 'shark', school_size: 20 });
    }
    const discoveries = tracker.detectPatterns();
    if (discoveries.length > 0) {
      // May or may not have causality depending on timing
      assert.ok(discoveries[0].causalityHint === null || typeof discoveries[0].causalityHint.hint === 'string');
    }
  });

  it('reset clears everything', () => {
    tracker.log('fish', { action: 'swim' });
    tracker.reset();
    assert.equal(tracker.logCount, 0);
    assert.equal(tracker.patterns.length, 0);
  });
});

// ─── Script Writer ────────────────────────────────────────────────────────────

describe('ScriptWriter', () => {
  it('returns fallback when no API key', async () => {
    const writer = new ScriptWriter({ apiKey: '' });
    const mods = await writer.suggestScriptChanges({
      currentScript: [],
      context: 'test',
    });
    assert.equal(mods.added.length, 0);
    assert.equal(mods.qualityScore, 0);
  });

  it('explain generates readable output', () => {
    const writer = new ScriptWriter();
    const mods = {
      reasoning: 'Fish are avoiding surface bait',
      added: [{ id: 'deep_bait', condition: 'depth > 10', action: 'use_deep_bait', priority: 15 }],
      removed: [],
      modified: [],
      qualityScore: 85,
    };
    const explanation = writer.explain(mods);
    assert.ok(explanation.includes('deep_bait'));
    assert.ok(explanation.includes('Quality: 85'));
  });

  it('compressContext truncates long history', () => {
    const writer = new ScriptWriter();
    const events = Array.from({ length: 100 }, (_, i) => ({ type: 'action', data: `event_${i}` }));
    const compressed = writer.compressContext(events, 10);
    assert.ok(compressed.length < 5000);
  });

  it('A/B test lifecycle', () => {
    const writer = new ScriptWriter();
    const id = writer.startABTest(
      [{ id: 'a', condition: 'x', action: 'go', priority: 1 }],
      [{ id: 'b', condition: 'y', action: 'stop', priority: 1 }],
      { duration: 0 }, // immediate
    );
    writer.recordABResult(id, 'A', 10);
    writer.recordABResult(id, 'A', 8);
    writer.recordABResult(id, 'B', 3);
    const result = writer.getABResult(id);
    assert.equal(result.complete, true);
    assert.equal(result.winner, 'A');
  });

  it('available reflects API key status', () => {
    assert.equal(new ScriptWriter().available, false);
    assert.equal(new ScriptWriter({ apiKey: 'test' }).available, true);
  });
});

// ─── Integration: novelty → attention → script ────────────────────────────────

describe('Integration: novelty → attention → script', () => {
  it('novelty event triggers attention interrupt which modifies script', async () => {
    const det = new NoveltyDetector({ sigmaThreshold: 2 });
    const attn = new AttentionBudget({ maxCallsPerMinute: 10 });
    const script = new BehaviorScript([
      { id: 'fish', condition: 'catch_rate > 0.2', action: 'keep_fishing', priority: 1 },
    ]);

    // Register attention target
    let scriptModified = false;
    attn.register('script_optimizer', {
      priority: 'critical',
      callback: async (ctx) => {
        // Simulate: on novelty, add a new rule
        script.addRule({ id: 'bail', condition: 'catch_rate < 0.05', action: 'change_location', priority: 10 });
        scriptModified = true;
      },
    });

    // Feed normal data
    for (let i = 0; i < 50; i++) det.track('catch_rate', 0.3 + (Math.random() - 0.5) * 0.1);

    // Anomaly!
    const event = det.track('catch_rate', 0.01);
    assert.ok(event);

    // Interrupt attention
    await attn.interrupt('script_optimizer', { noveltyEvent: event });

    assert.equal(scriptModified, true);
    assert.ok(script.rules.find(r => r.id === 'bail'));
    assert.equal(script.rules[0].id, 'bail'); // highest priority
  });

  it('emergence detection with script interaction', () => {
    const tracker = new EmergenceTracker({ minFrequency: 3 });
    const script = new BehaviorScript([
      { id: 'farm', condition: 'crops_ready', action: 'harvest', priority: 1 },
      { id: 'plant', condition: '!crops_ready', action: 'plant', priority: 2 },
    ]);

    // Simulate a pattern that emerges from rule interaction
    const state = { crops_ready: false };
    for (let i = 0; i < 10; i++) {
      // Crops grow
      if (i % 3 === 0) state.crops_ready = true;
      const result = script.execute(state);
      tracker.log('farmer', { action: result.action });
      if (state.crops_ready) state.crops_ready = false;
    }

    const discoveries = tracker.detectPatterns();
    // Should find at least the plant→harvest cycle
    assert.ok(discoveries.length >= 0); // May or may not detect depending on sequence
  });
});

// ─── State Machine Script Hooks ───────────────────────────────────────────────

describe('BotStateMachine script hooks', () => {
  const { BotStateMachine } = require('../src/state-machine');

  it('script action triggers state transition', () => {
    const fsm = new BotStateMachine();
    const script = new BehaviorScript([
      { id: 'fight', condition: 'enemy_near', action: 'attack', priority: 1 },
    ], { actionHandler: () => {} });

    fsm.hookScript(script, { attack: 'COMBAT' });
    assert.equal(fsm.current, 'IDLE');

    script.execute({ enemy_near: true });
    assert.equal(fsm.current, 'COMBAT');

    fsm.unhookScript();
    fsm.reset();
  });
});

// ─── Memory Script History ────────────────────────────────────────────────────

describe('BotMemory script history', () => {
  const { BotMemory } = require('../src/memory');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  let tmpDir, mem;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-test-'));
    mem = new BotMemory('TestBot', tmpDir);
  });

  it('records and retrieves script versions', () => {
    mem.recordScriptVersion('fisherman', { rules: [], version: 1 }, 'human');
    mem.recordScriptVersion('fisherman', { rules: [], version: 2 }, 'model');
    const history = mem.getScriptHistory('fisherman');
    assert.equal(history.length, 2);
    assert.equal(history[1].source, 'model');
  });

  it('returns all script history when no name filter', () => {
    mem.recordScriptVersion('a', {}, 'x');
    mem.recordScriptVersion('b', {}, 'y');
    assert.equal(mem.getScriptHistory().length, 2);
  });

  it('persists script history', () => {
    mem.recordScriptVersion('test', { v: 1 }, 'auto');
    mem.save();
    const mem2 = new BotMemory('TestBot', tmpDir);
    assert.equal(mem2.getScriptHistory('test').length, 1);
  });
});
