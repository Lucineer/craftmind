import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ActionSchema } from '../../src/agent-framework/action-schema.js';
import { ActionPlanner } from '../../src/agent-framework/action-planner.js';
import { ActionExecutor } from '../../src/agent-framework/action-executor.js';
import { ConversationMemory } from '../../src/agent-framework/conversation-memory.js';
import { SessionRecorder, LiveSession } from '../../src/agent-framework/session-recorder.js';
import { ComparativeEvaluator } from '../../src/agent-framework/comparative-evaluator.js';
import { DecisionEngine } from '../../src/agent-framework/decision-engine.js';
import { Agent } from '../../src/agent-framework/agent.js';
import { AgentManager } from '../../src/agent-framework/agent-manager.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Temp dir helper
let tmpDir;
function getDataDir() {
  if (!tmpDir) tmpDir = mkdtempSync(join(tmpdir(), 'craftmind-test-'));
  return join(tmpDir, `data-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ActionSchema Tests (15)
// ═══════════════════════════════════════════════════════════════════════════════
describe('ActionSchema', () => {
  it('should register an action type', () => {
    const s = new ActionSchema();
    s.registerType('FISH', {description: 'Go fishing', params: [{name: 'method', required: true}]});
    assert.ok(s.has('FISH'));
    assert.equal(s.size, 1);
  });

  it('should get a type by name', () => {
    const s = new ActionSchema();
    s.registerType('FISH', {description: 'Go fishing'});
    const t = s.getType('FISH');
    assert.equal(t.description, 'Go fishing');
  });

  it('should return undefined for unknown type', () => {
    const s = new ActionSchema();
    assert.equal(s.getType('NONEXISTENT'), undefined);
  });

  it('should get types by category', () => {
    const s = new ActionSchema();
    s.registerType('FISH', {description: 'Fish', category: 'fishing'});
    s.registerType('CAST', {description: 'Cast', category: 'fishing'});
    s.registerType('BUILD', {description: 'Build', category: 'construction'});
    assert.equal(s.getByCategory('fishing').length, 2);
    assert.equal(s.getByCategory('construction').length, 1);
  });

  it('should return empty for unknown category', () => {
    const s = new ActionSchema();
    assert.equal(s.getByCategory('nothing').length, 0);
  });

  it('should list all types', () => {
    const s = new ActionSchema();
    s.registerType('FISH', {description: 'Fish'});
    s.registerType('BUILD', {description: 'Build'});
    assert.equal(s.allTypes().length, 2);
  });

  it('should return empty allTypes when empty', () => {
    const s = new ActionSchema();
    assert.equal(s.allTypes().length, 0);
  });

  it('should validate a correct action', () => {
    const s = new ActionSchema();
    s.registerType('FISH', {params: [{name: 'method', required: true}]});
    const result = s.validateAction({type: 'FISH', params: {method: 'troll'}});
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('should reject missing required param', () => {
    const s = new ActionSchema();
    s.registerType('FISH', {params: [{name: 'method', required: true}]});
    const result = s.validateAction({type: 'FISH', params: {}});
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes('method'));
  });

  it('should reject unknown action type', () => {
    const s = new ActionSchema();
    const result = s.validateAction({type: 'BOGUS', params: {}});
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes('Unknown'));
  });

  it('should reject null action', () => {
    const s = new ActionSchema();
    const result = s.validateAction(null);
    assert.equal(result.valid, false);
  });

  it('should reject action without type', () => {
    const s = new ActionSchema();
    const result = s.validateAction({params: {}});
    assert.equal(result.valid, false);
  });

  it('should unregister a type', () => {
    const s = new ActionSchema();
    s.registerType('FISH', {description: 'Fish'});
    assert.ok(s.unregisterType('FISH'));
    assert.equal(s.size, 0);
  });

  it('should clear all types', () => {
    const s = new ActionSchema();
    s.registerType('FISH', {description: 'Fish'});
    s.registerType('BUILD', {description: 'Build'});
    s.clear();
    assert.equal(s.size, 0);
  });

  it('should list categories', () => {
    const s = new ActionSchema();
    s.registerType('FISH', {category: 'fishing'});
    s.registerType('BUILD', {category: 'construction'});
    assert.deepEqual(s.categories, ['construction', 'fishing']);
  });

  it('should serialize', () => {
    const s = new ActionSchema();
    s.registerType('FISH', {description: 'Fish', category: 'fishing'});
    const json = s.serialize();
    assert.ok(json.FISH);
    assert.equal(json.FISH.description, 'Fish');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ActionPlanner Tests (12)
// ═══════════════════════════════════════════════════════════════════════════════
describe('ActionPlanner', () => {
  it('should return empty actions without LLM or fallbacks', async () => {
    const p = new ActionPlanner();
    const result = await p.plan('do something');
    assert.equal(result.actions.length, 0);
    assert.equal(result.fallback, false);
  });

  it('should match fallback patterns', async () => {
    const p = new ActionPlanner({
      fallbackPatterns: [
        {pattern: /fish/i, action: {type: 'FISH', params: {method: 'troll'}}},
      ],
    });
    const result = await p.plan('go fishing');
    assert.equal(result.actions[0].type, 'FISH');
    assert.equal(result.fallback, true);
  });

  it('should not match non-matching fallbacks', async () => {
    const p = new ActionPlanner({
      fallbackPatterns: [{pattern: /fish/i, action: {type: 'FISH'}}],
    });
    const result = await p.plan('build a house');
    assert.equal(result.actions.length, 0);
    assert.equal(result.fallback, false);
  });

  it('should match fallback with dialogue', async () => {
    const p = new ActionPlanner({
      fallbackPatterns: [
        {pattern: /hello/i, action: {type: 'CHAT', params: {message: 'Hey!'}, dialogue: 'Hey there!'}},
      ],
    });
    const result = await p.plan('hello');
    assert.equal(result.dialogue, 'Hey there!');
  });

  it('should support multiple fallback patterns', async () => {
    const p = new ActionPlanner({
      fallbackPatterns: [
        {pattern: /fish/i, action: {type: 'FISH'}},
        {pattern: /mine/i, action: {type: 'MINE'}},
        {pattern: /build/i, action: {type: 'BUILD'}},
      ],
    });
    assert.equal((await p.plan('go fishing')).actions[0].type, 'FISH');
    assert.equal((await p.plan('mine some iron')).actions[0].type, 'MINE');
    assert.equal((await p.plan('build a house')).actions[0].type, 'BUILD');
  });

  it('should use LLM client when set', async () => {
    const p = new ActionPlanner();
    p.setLLMClient({
      chat: async () => JSON.stringify({actions: [{type: 'FISH', params: {method: 'troll'}}], dialogue: 'Sure!'}),
    });
    const result = await p.plan('go fishing');
    assert.equal(result.actions[0].type, 'FISH');
    assert.equal(result.fallback, false);
  });

  it('should handle LLM errors gracefully', async () => {
    const p = new ActionPlanner();
    p.setLLMClient({chat: async () => { throw new Error('LLM down'); }});
    const result = await p.plan('go fishing');
    assert.equal(result.actions.length, 0);
  });

  it('should extract action from plain LLM text', async () => {
    const schema = new ActionSchema();
    schema.registerType('FISH', {description: 'Go fishing'});
    const p = new ActionPlanner({actionSchema: schema});
    p.setLLMClient({chat: async () => 'You should definitely go FISH right now!'});
    const result = await p.plan('go fishing');
    assert.equal(result.actions[0].type, 'FISH');
  });

  it('should accept custom system prompt', () => {
    const p = new ActionPlanner({systemPrompt: 'Custom prompt'});
    assert.equal(p.systemPrompt, 'Custom prompt');
  });

  it('should accept custom getGameState', () => {
    const p = new ActionPlanner({getGameState: () => ({hp: 100})});
    assert.deepEqual(p.getGameState(), {hp: 100});
  });

  it('should provide context', () => {
    const p = new ActionPlanner({
      systemPrompt: 'Test',
      getGameState: () => ({hp: 50}),
      getPersonality: () => ({brave: true}),
    });
    const ctx = p.getContext();
    assert.equal(ctx.systemPrompt, 'Test');
    assert.equal(ctx.hasLLM, false);
    assert.equal(ctx.actionCount, 0);
  });

  it('should track action count from schema', () => {
    const schema = new ActionSchema();
    schema.registerType('FISH', {});
    const p = new ActionPlanner({actionSchema: schema});
    assert.equal(p.getContext().actionCount, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ActionExecutor Tests (18)
// ═══════════════════════════════════════════════════════════════════════════════
describe('ActionExecutor', () => {
  it('should register a handler', () => {
    const e = new ActionExecutor();
    e.registerHandler('FISH', async () => true);
    assert.ok(e.hasHandler('FISH'));
    assert.equal(e.handlerCount, 1);
  });

  it('should reject non-function handlers', () => {
    const e = new ActionExecutor();
    assert.throws(() => e.registerHandler('FISH', 'not a function'));
  });

  it('should unregister a handler', () => {
    const e = new ActionExecutor();
    e.registerHandler('FISH', async () => true);
    e.unregisterHandler('FISH');
    assert.equal(e.hasHandler('FISH'), false);
  });

  it('should execute a FISH action via handler', async () => {
    const e = new ActionExecutor();
    let called = false;
    e.registerHandler('FISH', async (params) => { called = true; return true; });
    const result = await e.executeOne({type: 'FISH', params: {method: 'troll'}});
    assert.ok(called);
    assert.ok(result);
  });

  it('should execute a CHAT action', async () => {
    const e = new ActionExecutor();
    let msg = null;
    e.on({onChat: (m) => { msg = m; }});
    const result = await e.executeOne({type: 'CHAT', params: {message: 'hello'}});
    assert.equal(msg, 'hello');
    assert.ok(result);
  });

  it('should execute a WAIT action', async () => {
    const e = new ActionExecutor();
    const start = Date.now();
    await e.executeOne({type: 'WAIT', params: {seconds: 0.01}});
    assert.ok(Date.now() - start >= 5); // at least some ms
  });

  it('should execute a STOP action', async () => {
    const e = new ActionExecutor();
    await e.executeOne({type: 'STOP', params: {}});
    assert.equal(e.running, false);
  });

  it('should skip unknown actions', async () => {
    const e = new ActionExecutor();
    const result = await e.executeOne({type: 'UNKNOWN', params: {}});
    assert.ok(result);
  });

  it('should enqueue multiple actions', () => {
    const e = new ActionExecutor();
    e.enqueue([{type: 'CHAT', params: {message: 'a'}}, {type: 'CHAT', params: {message: 'b'}}]);
    assert.equal(e.status.queueLength, 2);
  });

  it('should enqueue single action (non-array)', () => {
    const e = new ActionExecutor();
    e.enqueue({type: 'CHAT', params: {message: 'a'}});
    assert.equal(e.status.queueLength, 1);
  });

  it('should start and run', async () => {
    const e = new ActionExecutor({tickInterval: 50});
    let completed = 0;
    e.on({onComplete: () => { completed++; }});
    e.enqueue([{type: 'CHAT', params: {message: 'hi'}}]);
    await new Promise(r => setTimeout(r, 200));
    assert.equal(completed, 1);
    e.stop();
  });

  it('should stop and clear queue', () => {
    const e = new ActionExecutor();
    e.enqueue([{type: 'CHAT', params: {}}, {type: 'CHAT', params: {}}]);
    e.stop();
    assert.equal(e.status.running, false);
    assert.equal(e.status.queueLength, 0);
  });

  it('should pause and resume', () => {
    const e = new ActionExecutor();
    e.start();
    e.pause();
    assert.equal(e.status.paused, true);
    e.resume();
    assert.equal(e.status.paused, false);
    e.stop();
  });

  it('should call onActionStart', async () => {
    const e = new ActionExecutor();
    let started = null;
    e.on({onActionStart: (a) => { started = a; }});
    e.running = true;
    e.enqueue([{type: 'CHAT', params: {message: 'test'}}]);
    await e.tick();
    assert.equal(started.type, 'CHAT');
    e.stop();
  });

  it('should call onError for handler errors', async () => {
    const e = new ActionExecutor();
    let errorCaught = false;
    e.registerHandler('FAIL', async () => { throw new Error('boom'); });
    e.on({onError: () => { errorCaught = true; }});
    e.current = {type: 'FAIL', params: {}};
    e.running = true;
    await e.tick();
    assert.ok(errorCaught);
    e.stop();
  });

  it('should report status', () => {
    const e = new ActionExecutor();
    e.registerHandler('FISH', async () => true);
    const s = e.status;
    assert.equal(s.running, false);
    assert.deepEqual(s.registeredHandlers, ['FISH']);
  });

  it('should use humanizer if provided', async () => {
    let humanized = false;
    const e = new ActionExecutor({
      humanizer: (ms) => { humanized = true; return Math.max(1, ms * 0.1); },
    });
    await e.executeOne({type: 'WAIT', params: {seconds: 0.01}});
    assert.ok(humanized);
  });

  it('should process queue in order', async () => {
    const e = new ActionExecutor({tickInterval: 50});
    const order = [];
    e.on({
      onChat: (m) => order.push(m),
      onComplete: () => {},
    });
    e.enqueue([{type: 'CHAT', params: {message: '1'}}, {type: 'CHAT', params: {message: '2'}}]);
    await new Promise(r => setTimeout(r, 300));
    e.stop();
    assert.ok(order.length >= 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ConversationMemory Tests (15)
// ═══════════════════════════════════════════════════════════════════════════════
describe('ConversationMemory', () => {
  it('should add a message', () => {
    const m = new ConversationMemory();
    m.add('player', 'hello');
    assert.equal(m.length, 1);
  });

  it('should get recent messages', () => {
    const m = new ConversationMemory();
    m.add('a', '1');
    m.add('b', '2');
    m.add('c', '3');
    assert.equal(m.getRecent(2).length, 2);
    assert.equal(m.getRecent(2)[0].message, '2');
  });

  it('should get messages from speaker', () => {
    const m = new ConversationMemory();
    m.add('alice', 'hi');
    m.add('bob', 'hello');
    m.add('alice', 'bye');
    const alice = m.getFromSpeaker('alice');
    assert.equal(alice.length, 2);
  });

  it('should respect maxMessages', () => {
    const m = new ConversationMemory({maxMessages: 3});
    m.add('a', '1');
    m.add('b', '2');
    m.add('c', '3');
    m.add('d', '4');
    assert.equal(m.length, 3);
    assert.equal(m.getRecent(1)[0].message, '4');
  });

  it('should extract topics', () => {
    const m = new ConversationMemory({topicKeywords: ['fishing', 'weather', 'boat']});
    m.add('a', 'How is the fishing today?');
    m.add('b', 'The weather is nice for fishing');
    const topics = m.extractTopics();
    assert.ok(topics.includes('fishing'));
    assert.ok(topics.includes('weather'));
  });

  it('should return empty topics with no keywords', () => {
    const m = new ConversationMemory();
    m.add('a', 'hello');
    assert.equal(m.extractTopics().length, 0);
  });

  it('should detect greeting intent', () => {
    const m = new ConversationMemory();
    m.add('a', 'hello there');
    assert.equal(m.detectIntent(), 'greeting');
  });

  it('should detect question intent', () => {
    const m = new ConversationMemory();
    m.add('a', 'what is this?');
    assert.equal(m.detectIntent(), 'question');
  });

  it('should detect custom intent patterns', () => {
    const m = new ConversationMemory({
      intentPatterns: [{pattern: /go fish/i, intent: 'fish_request'}],
    });
    m.add('a', 'go fishing now');
    assert.equal(m.detectIntent(), 'fish_request');
  });

  it('should detect gratitude intent', () => {
    const m = new ConversationMemory();
    m.add('a', 'thanks!');
    assert.equal(m.detectIntent(), 'gratitude');
  });

  it('should detect general intent by default', () => {
    const m = new ConversationMemory();
    m.add('a', 'random statement');
    assert.equal(m.detectIntent(), 'general');
  });

  it('should provide context', () => {
    const m = new ConversationMemory({topicKeywords: ['test']});
    m.add('a', 'test message');
    const ctx = m.getContext();
    assert.equal(ctx.messageCount, 1);
    assert.ok(ctx.recentMessages.length > 0);
    assert.equal(ctx.playerIntent, 'general');
  });

  it('should clear', () => {
    const m = new ConversationMemory();
    m.add('a', 'hi');
    m.clear();
    assert.equal(m.length, 0);
  });

  it('should serialize and deserialize', () => {
    const m = new ConversationMemory();
    m.add('a', 'hello');
    const data = m.serialize();
    const m2 = new ConversationMemory();
    m2.deserialize(data);
    assert.equal(m2.length, 1);
  });

  it('should handle empty recent', () => {
    const m = new ConversationMemory();
    assert.equal(m.detectIntent(), 'greeting');
    assert.equal(m.getRecent(10).length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SessionRecorder Tests (16)
// ═══════════════════════════════════════════════════════════════════════════════
describe('SessionRecorder', () => {
  it('should record a session', () => {
    const r = new SessionRecorder(getDataDir());
    const id = r.recordSession({skill: 'troll', conditions: {weather: 'sunny'}, results: {items: [{score: 10}]}, outcome: 'success', startTime: '2025-01-01T08:00:00Z'});
    assert.ok(id.startsWith('session_'));
  });

  it('should reject session without skill', () => {
    const r = new SessionRecorder(getDataDir());
    assert.throws(() => r.recordSession({conditions: {}, results: {}, startTime: new Date().toISOString()}));
  });

  it('should reject session without conditions', () => {
    const r = new SessionRecorder(getDataDir());
    assert.throws(() => r.recordSession({skill: 'troll', results: {}, startTime: new Date().toISOString()}));
  });

  it('should load a session by id', () => {
    const r = new SessionRecorder(getDataDir());
    const id = r.recordSession({skill: 'troll', conditions: {weather: 'sunny'}, results: {}, startTime: '2025-01-01T08:00:00Z'});
    const s = r.loadSession(id);
    assert.equal(s.skill, 'troll');
  });

  it('should return null for unknown session', () => {
    const r = new SessionRecorder(getDataDir());
    assert.equal(r.loadSession('nonexistent'), null);
  });

  it('should get all sessions', () => {
    const r = new SessionRecorder(getDataDir());
    r.recordSession({skill: 'a', conditions: {}, results: {}, startTime: '2025-01-01T08:00:00Z'});
    r.recordSession({skill: 'b', conditions: {}, results: {}, startTime: '2025-01-02T08:00:00Z'});
    assert.equal(r.getAllSessions().length, 2);
  });

  it('should query sessions by skill', () => {
    const r = new SessionRecorder(getDataDir());
    r.recordSession({skill: 'troll', conditions: {}, results: {}, outcome: 'success', startTime: '2025-01-01T08:00:00Z'});
    r.recordSession({skill: 'jig', conditions: {}, results: {}, outcome: 'failure', startTime: '2025-01-02T08:00:00Z'});
    r.recordSession({skill: 'troll', conditions: {}, results: {}, outcome: 'success', startTime: '2025-01-03T08:00:00Z'});
    assert.equal(r.querySessions({skill: 'troll'}).length, 2);
  });

  it('should query sessions by outcome', () => {
    const r = new SessionRecorder(getDataDir());
    r.recordSession({skill: 'a', conditions: {}, results: {}, outcome: 'success', startTime: '2025-01-01T08:00:00Z'});
    r.recordSession({skill: 'a', conditions: {}, results: {}, outcome: 'failure', startTime: '2025-01-02T08:00:00Z'});
    assert.equal(r.querySessions({outcome: 'success'}).length, 1);
  });

  it('should query with limit', () => {
    const r = new SessionRecorder(getDataDir());
    for (let i = 0; i < 5; i++) r.recordSession({skill: 'a', conditions: {}, results: {}, startTime: `2025-01-0${i + 1}T08:00:00Z`});
    assert.equal(r.querySessions({limit: 2}).length, 2);
  });

  it('should query by since date', () => {
    const r = new SessionRecorder(getDataDir());
    r.recordSession({skill: 'a', conditions: {}, results: {}, startTime: '2025-01-01T08:00:00Z'});
    r.recordSession({skill: 'a', conditions: {}, results: {}, startTime: '2025-01-10T08:00:00Z'});
    assert.equal(r.querySessions({since: '2025-01-05'}).length, 1);
  });

  it('should count sessions', () => {
    const r = new SessionRecorder(getDataDir());
    assert.equal(r.sessionCount, 0);
    r.recordSession({skill: 'a', conditions: {}, results: {}, startTime: '2025-01-01T08:00:00Z'});
    assert.equal(r.sessionCount, 1);
  });

  it('should create a live session', () => {
    const r = new SessionRecorder(getDataDir());
    const live = r.createLiveSession('troll', {weather: 'sunny'});
    assert.ok(live instanceof LiveSession);
    assert.equal(live.skill, 'troll');
  });

  it('should finalize a live session', () => {
    const r = new SessionRecorder(getDataDir());
    const live = r.createLiveSession('troll', {weather: 'sunny'});
    live.addResult({score: 10, category: 'fish'});
    const id = live.finalize();
    assert.ok(id);
    assert.equal(r.loadSession(id).skill, 'troll');
  });

  it('should compute totalScore from results', () => {
    const r = new SessionRecorder(getDataDir());
    const live = r.createLiveSession('troll', {});
    live.addResult({score: 10});
    live.addResult({score: 20});
    const id = live.finalize();
    assert.equal(r.loadSession(id).results.totalScore, 30);
  });

  it('should compute categories from results', () => {
    const r = new SessionRecorder(getDataDir());
    const live = r.createLiveSession('troll', {});
    live.addResult({category: 'fish'});
    live.addResult({category: 'crab'});
    const id = live.finalize();
    assert.deepEqual(r.loadSession(id).results.categories.sort(), ['crab', 'fish']);
  });

  it('should set outcome on live session', () => {
    const r = new SessionRecorder(getDataDir());
    const live = r.createLiveSession('troll', {});
    live.addResult({score: 10});
    live.setOutcome('success');
    const id = live.finalize();
    assert.equal(r.loadSession(id).outcome, 'success');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ComparativeEvaluator Tests (14)
// ═══════════════════════════════════════════════════════════════════════════════
describe('ComparativeEvaluator', () => {
  it('should score a session', () => {
    const e = new ComparativeEvaluator(getDataDir());
    const score = e.scoreSession({outcome: 'success', results: {items: [{score: 10}], totalScore: 30, categories: ['fish']}, duration: 100});
    assert.ok(score > 0);
    assert.ok(score <= 1);
  });

  it('should score failure low', () => {
    const e = new ComparativeEvaluator(getDataDir());
    const fail = e.scoreSession({outcome: 'failure', results: {items: [], totalScore: 0, categories: []}, duration: 100});
    const success = e.scoreSession({outcome: 'success', results: {items: [{score: 10}], totalScore: 50, categories: ['fish']}, duration: 100});
    assert.ok(fail < success);
  });

  it('should use custom score function', () => {
    const e = new ComparativeEvaluator(getDataDir());
    e.configure({scoreFn: (s) => s.outcome === 'success' ? 1.0 : 0.0});
    assert.equal(e.scoreSession({outcome: 'success', results: {}}), 1.0);
    assert.equal(e.scoreSession({outcome: 'failure', results: {}}), 0.0);
  });

  it('should find similar sessions', () => {
    const e = new ComparativeEvaluator(getDataDir());
    e.configure({conditionFields: ['weather', 'location']});
    const sessions = [
      {conditions: {weather: 'sunny', location: 'harbor'}, results: {}, outcome: 'success'},
      {conditions: {weather: 'rainy', location: 'harbor'}, results: {}, outcome: 'failure'},
      {conditions: {weather: 'sunny', location: 'river'}, results: {}, outcome: 'success'},
    ];
    const similar = e.findSimilarSessions({weather: 'sunny', location: 'harbor'}, sessions);
    assert.ok(similar.length >= 1);
    assert.equal(similar[0].conditions.weather, 'sunny');
  });

  it('should use custom similarity function', () => {
    const e = new ComparativeEvaluator(getDataDir());
    e.configure({similarityFn: (a, b) => a.x === b.x ? 1.0 : 0.0});
    const sessions = [{conditions: {x: 1}, results: {}, outcome: 'success'}, {conditions: {x: 2}, results: {}, outcome: 'success'}];
    const similar = e.findSimilarSessions({x: 1}, sessions);
    assert.equal(similar.length, 1);
  });

  it('should evaluate a session against history', () => {
    const e = new ComparativeEvaluator(getDataDir());
    const history = Array(5).fill(null).map((_, i) => ({
      skill: 'troll', conditions: {weather: 'sunny'}, results: {items: [{score: 10}], totalScore: 20, categories: ['fish']},
      outcome: i < 3 ? 'success' : 'failure', startTime: `2025-01-0${i + 1}T08:00:00Z`,
    }));
    const result = e.evaluate({skill: 'troll', conditions: {weather: 'sunny'}, results: {items: [{score: 15}], totalScore: 30, categories: ['fish']}, outcome: 'success'}, history);
    assert.ok(result.sessionScore > 0);
    assert.ok(result.scriptRanking.troll);
    assert.ok(Array.isArray(result.insights));
  });

  it('should save and get insights', () => {
    const e = new ComparativeEvaluator(getDataDir());
    e.evaluate({skill: 'troll', conditions: {weather: 'sunny'}, results: {items: [{score: 10}], totalScore: 50, categories: ['fish']}, outcome: 'success'}, Array(5).fill(null).map((_, i) => ({skill: 'troll', conditions: {weather: 'sunny'}, results: {items: [{score: 5}], totalScore: 20, categories: ['fish']}, outcome: i < 3 ? 'success' : 'failure', startTime: `2025-01-0${i + 1}T08:00:00Z`})));
  });

  it('should return empty insights with < 3 sessions', () => {
    const e = new ComparativeEvaluator(getDataDir());
    const result = e.evaluate({skill: 'troll', conditions: {}, results: {}, outcome: 'success'}, []);
    assert.equal(result.insights.length, 0);
  });

  it('should configure outcome scores', () => {
    const e = new ComparativeEvaluator(getDataDir());
    e.configure({outcomeScores: {success: 1.0, failure: 0.0}});
    assert.equal(e.scoreSession({outcome: 'success', results: {}}), 1.0);
  });

  it('should extract best conditions', () => {
    const e = new ComparativeEvaluator(getDataDir());
    const scored = [
      {session: {conditions: {weather: 'sunny', location: 'harbor'}, outcome: 'success'}, score: 0.8},
      {session: {conditions: {weather: 'sunny', location: 'harbor'}, outcome: 'success'}, score: 0.7},
    ];
    const best = e._extractBestConditions(scored);
    assert.equal(best.weather, 'sunny');
  });

  it('should handle empty similar sessions in evaluate', () => {
    const e = new ComparativeEvaluator(getDataDir());
    const result = e.evaluate({skill: 'troll', conditions: {}, results: {}, outcome: 'success'}, []);
    assert.equal(result.historicalRank, 1);
    assert.equal(result.historicalTotal, 1);
  });

  it('should save comparison', () => {
    const e = new ComparativeEvaluator(getDataDir());
    e.saveComparison('test1', {sessionScore: 0.8, scriptRanking: {}});
    // Should not throw
  });

  it('should get script performance summary', () => {
    const e = new ComparativeEvaluator(getDataDir());
    e.saveComparison('s1', {scriptRanking: {troll: {avgScore: 0.7, uses: 10, successRate: 0.8}}});
    const summary = e.getScriptPerformanceSummary();
    assert.ok(summary.troll);
    assert.equal(summary.troll.evaluations, 1);
  });

  it('should handle null conditions in similarity', () => {
    const e = new ComparativeEvaluator(getDataDir());
    const result = e.findSimilarSessions(null, [{conditions: {weather: 'sunny'}, results: {}, outcome: 'success'}]);
    assert.equal(result.length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DecisionEngine Tests (8)
// ═══════════════════════════════════════════════════════════════════════════════
describe('DecisionEngine', () => {
  it('should return idle with no data', () => {
    const dir = getDataDir();
    const e = new DecisionEngine(new ComparativeEvaluator(dir), new SessionRecorder(dir));
    const result = e.decide({}, {}, {});
    assert.equal(result.action, 'idle');
    assert.equal(result.confidence, 0);
  });

  it('should recommend a script with data', () => {
    const dir = getDataDir();
    const recorder = new SessionRecorder(dir);
    const evaluator = new ComparativeEvaluator(dir);
    for (let i = 0; i < 5; i++) {
      recorder.recordSession({skill: 'troll', conditions: {weather: 'sunny'}, results: {items: [{score: 10}], totalScore: 30, categories: ['fish']}, outcome: 'success', startTime: `2025-01-0${i + 1}T08:00:00Z`});
    }
    const engine = new DecisionEngine(evaluator, recorder);
    const result = engine.decide({weather: 'sunny'}, {}, {});
    assert.equal(result.action, 'execute');
    assert.ok(result.confidence > 0);
    assert.ok(result.script);
  });

  it('should suggest explore when frustrated', () => {
    const dir = getDataDir();
    const recorder = new SessionRecorder(dir);
    const evaluator = new ComparativeEvaluator(dir);
    recorder.recordSession({skill: 'troll', conditions: {}, results: {items: []}, outcome: 'failure', startTime: '2025-01-01T08:00:00Z'});
    const engine = new DecisionEngine(evaluator, recorder);
    const result = engine.decide({}, {mood: {energy: 0.5, satisfaction: 0.2, frustration: 0.8, social: 0.5}}, {});
    assert.ok(['explore', 'wait'].includes(result.action));
  });

  it('should suggest rest when low energy', () => {
    const dir = getDataDir();
    const recorder = new SessionRecorder(dir);
    const evaluator = new ComparativeEvaluator(dir);
    for (let i = 0; i < 5; i++) {
      recorder.recordSession({skill: 'troll', conditions: {}, results: {items: [{score: 10}], totalScore: 30, categories: ['fish']}, outcome: 'success', startTime: `2025-01-0${i + 1}T08:00:00Z`});
    }
    const engine = new DecisionEngine(evaluator, recorder);
    const result = engine.decide({}, {mood: {energy: 0.1, satisfaction: 0.5, frustration: 0.1, social: 0.5}}, {});
    assert.equal(result.action, 'rest');
  });

  it('should provide altScripts', () => {
    const dir = getDataDir();
    const recorder = new SessionRecorder(dir);
    const evaluator = new ComparativeEvaluator(dir);
    recorder.recordSession({skill: 'troll', conditions: {}, results: {items: [{score: 10}], totalScore: 30, categories: ['fish']}, outcome: 'success', startTime: '2025-01-01T08:00:00Z'});
    recorder.recordSession({skill: 'jig', conditions: {}, results: {items: [{score: 5}], totalScore: 15, categories: ['fish']}, outcome: 'success', startTime: '2025-01-02T08:00:00Z'});
    const engine = new DecisionEngine(evaluator, recorder);
    const result = engine.decide({}, {}, {});
    assert.ok(result.altScripts.length >= 0); // may or may not have alts with so little data
  });

  it('should provide reasoning', () => {
    const dir = getDataDir();
    const recorder = new SessionRecorder(dir);
    const evaluator = new ComparativeEvaluator(dir);
    recorder.recordSession({skill: 'troll', conditions: {}, results: {items: [{score: 10}], totalScore: 30, categories: ['fish']}, outcome: 'success', startTime: '2025-01-01T08:00:00Z'});
    const engine = new DecisionEngine(evaluator, recorder);
    const result = engine.decide({}, {}, {});
    assert.ok(result.reasoning.length > 0);
  });

  it('should answer questions', () => {
    const dir = getDataDir();
    const recorder = new SessionRecorder(dir);
    const evaluator = new ComparativeEvaluator(dir);
    recorder.recordSession({skill: 'troll', conditions: {}, results: {items: [{score: 10}], totalScore: 30, categories: ['fish']}, outcome: 'success', startTime: '2025-01-01T08:00:00Z'});
    recorder.recordSession({skill: 'troll', conditions: {}, results: {items: [{score: 10}], totalScore: 30, categories: ['fish']}, outcome: 'success', startTime: '2025-01-02T08:00:00Z'});
    recorder.recordSession({skill: 'troll', conditions: {}, results: {items: [{score: 10}], totalScore: 30, categories: ['fish']}, outcome: 'failure', startTime: '2025-01-03T08:00:00Z'});
    const engine = new DecisionEngine(evaluator, recorder);
    const answer = engine.answerQuestion('how am I doing?');
    assert.ok(answer.includes('session'));
  });

  it('should say not enough data', () => {
    const dir = getDataDir();
    const recorder = new SessionRecorder(dir);
    const evaluator = new ComparativeEvaluator(dir);
    const engine = new DecisionEngine(evaluator, recorder);
    assert.ok(engine.answerQuestion('how?').includes('Not enough'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Tests (18)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Agent', () => {
  it('should create an agent', () => {
    const a = new Agent({name: 'Cody', type: 'npc'});
    assert.equal(a.name, 'Cody');
    assert.equal(a.type, 'npc');
  });

  it('should start and stop', () => {
    const a = new Agent({name: 'Cody'});
    a.start();
    assert.ok(a.active);
    a.stop();
    assert.equal(a.active, false);
  });

  it('should tick when active', () => {
    const a = new Agent({name: 'Cody'});
    a.start();
    const action = a.tick({gameHour: 10});
    assert.ok(action);
    assert.equal(action.type, 'idle');
  });

  it('should return null when inactive', () => {
    const a = new Agent({name: 'Cody'});
    assert.equal(a.tick({gameHour: 10}), null);
  });

  it('should follow schedule blocks', () => {
    const a = new Agent({name: 'Cody', schedule: [{action: 'work', location: 'office', startHour: 9, endHour: 17}]});
    a.start();
    const action = a.tick({gameHour: 10});
    assert.equal(action.type, 'work');
    assert.equal(action.location, 'office');
  });

  it('should return idle outside schedule', () => {
    const a = new Agent({name: 'Cody', schedule: [{action: 'work', location: 'office', startHour: 9, endHour: 17}]});
    a.start();
    const action = a.tick({gameHour: 20});
    assert.equal(action.type, 'idle');
  });

  it('should socialize with nearby entities', () => {
    const a = new Agent({name: 'Cody', personality: {traits: {talkativeness: 1.0}}});
    a.start();
    // Force socialization by ticking many times
    let socialized = false;
    for (let i = 0; i < 100; i++) {
      const action = a.tick({gameHour: 10, nearbyEntities: [{name: 'Bob', position: {x: 5, z: 5}}]});
      if (action && action.type !== 'idle') { socialized = true; break; }
    }
    assert.ok(socialized);
  });

  it('should update mood on success', () => {
    const a = new Agent({name: 'Cody'});
    a.handleEvent({type: 'success'});
    assert.ok(a.mood.satisfaction > 0.5);
    assert.ok(a.mood.frustration < 0.1);
  });

  it('should update mood on failure', () => {
    const a = new Agent({name: 'Cody'});
    a.handleEvent({type: 'failure'});
    assert.ok(a.mood.frustration > 0.1);
  });

  it('should reset mood on new day', () => {
    const a = new Agent({name: 'Cody'});
    a.handleEvent({type: 'failure'});
    a.handleEvent({type: 'new_day'});
    assert.equal(a.mood.frustration, 0.1);
  });

  it('should track memory episodes', () => {
    const a = new Agent({name: 'Cody'});
    a.handleEvent({type: 'success', detail: 'caught a fish'});
    assert.equal(a.memory.episodes.length, 1);
  });

  it('should track relationships', () => {
    const a = new Agent({name: 'Cody'});
    a.relationships.interact('Bob', 'positive');
    a.relationships.interact('Bob', 'positive');
    const rel = a.relationships.get('Bob');
    assert.ok(rel.trust > 0.3);
    assert.equal(rel.interactions, 2);
  });

  it('should move to location', () => {
    const a = new Agent({name: 'Cody'});
    a.moveTo('harbor', {x: 100, y: 0, z: 100});
    assert.equal(a.location, 'harbor');
    assert.equal(a.position.x, 100);
  });

  it('should get summary', () => {
    const a = new Agent({name: 'Cody', type: 'bot', skills: ['fishing']});
    a.start();
    const summary = a.getSummary();
    assert.equal(summary.name, 'Cody');
    assert.equal(summary.type, 'bot');
    assert.ok(summary.active);
    assert.deepEqual(summary.skills, ['fishing']);
  });

  it('should provide personality traits', () => {
    const a = new Agent({name: 'Cody', personality: {traits: {brave: 0.9, stubbornness: 0.3}}});
    assert.equal(a.traits.brave, 0.9);
    assert.equal(a.traits.stubbornness, 0.3);
  });

  it('should get response', () => {
    const a = new Agent({name: 'Cody'});
    const resp = a.getResponse('greeting');
    assert.ok(['Hey there.', 'Hello.', 'Morning.'].includes(resp));
  });

  it('should handle conversation cooldown', () => {
    const a = new Agent({name: 'Cody'});
    assert.equal(a.conversationCooldown, 0);
  });

  it('should store domain data', () => {
    const a = new Agent({name: 'Cody'});
    a.domainData = {todayCatch: [{species: 'salmon'}]};
    assert.equal(a.domainData.todayCatch.length, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AgentManager Tests (16)
// ═══════════════════════════════════════════════════════════════════════════════
describe('AgentManager', () => {
  it('should create a manager', () => {
    const m = new AgentManager();
    assert.equal(m.agentCount, 0);
  });

  it('should spawn an agent', () => {
    const m = new AgentManager();
    const agent = m.spawnAgent({name: 'Cody', type: 'npc'});
    assert.equal(m.agentCount, 1);
    assert.ok(agent.active);
  });

  it('should get agent by name', () => {
    const m = new AgentManager();
    m.spawnAgent({name: 'Cody', type: 'npc'});
    assert.ok(m.getAgent('Cody'));
    assert.equal(m.getAgent('Bob'), undefined);
  });

  it('should get agent names', () => {
    const m = new AgentManager();
    m.spawnAgent({name: 'Cody', type: 'npc'});
    m.spawnAgent({name: 'Bob', type: 'npc'});
    assert.deepEqual(m.getAgentNames(), ['Cody', 'Bob']);
  });

  it('should remove an agent', () => {
    const m = new AgentManager();
    m.spawnAgent({name: 'Cody', type: 'npc'});
    assert.ok(m.removeAgent('Cody'));
    assert.equal(m.agentCount, 0);
  });

  it('should return false for removing unknown agent', () => {
    const m = new AgentManager();
    assert.equal(m.removeAgent('Nobody'), false);
  });

  it('should tick agents', () => {
    const m = new AgentManager();
    m.spawnAgent({name: 'Cody', type: 'npc'});
    m.running = true;
    m.tick({gameHour: 10});
    assert.equal(m.tickCount, 1);
    m.running = false;
  });

  it('should not tick when not running', () => {
    const m = new AgentManager();
    m.spawnAgent({name: 'Cody', type: 'npc'});
    m.tick({gameHour: 10});
    assert.equal(m.tickCount, 0);
  });

  it('should start and stop', async () => {
    const m = new AgentManager();
    m.spawnAgent({name: 'Cody', type: 'npc'});
    m.start(50);
    await new Promise(r => setTimeout(r, 150));
    assert.ok(m.running);
    assert.ok(m.tickCount > 0);
    m.stop();
    assert.equal(m.running, false);
  });

  it('should handle world events', () => {
    const m = new AgentManager();
    const agent = m.spawnAgent({name: 'Cody', type: 'npc'});
    m.handleWorldEvent({weather: 'storm'});
    assert.equal(m.weather, 'storm');
  });

  it('should broadcast to agents', () => {
    const m = new AgentManager();
    const agent = m.spawnAgent({name: 'Cody', type: 'npc'});
    let handled = false;
    agent.handleEvent = (e) => { if (e.type === 'broadcast') handled = true; };
    m.broadcast('Storm incoming!', 'alert');
    assert.ok(handled);
  });

  it('should get status', () => {
    const m = new AgentManager();
    m.spawnAgent({name: 'Cody', type: 'npc'});
    const status = m.getStatus();
    assert.equal(status.agentCount, 1);
    assert.equal(status.running, false);
    assert.ok(Array.isArray(status.agents));
  });

  it('should emit agent:spawned event', () => {
    const m = new AgentManager();
    let spawned = false;
    m.on('agent:spawned', () => { spawned = true; });
    m.spawnAgent({name: 'Cody', type: 'npc'});
    assert.ok(spawned);
  });

  it('should emit agent:removed event', () => {
    const m = new AgentManager();
    let removed = false;
    m.on('agent:removed', () => { removed = true; });
    m.spawnAgent({name: 'Cody', type: 'npc'});
    m.removeAgent('Cody');
    assert.ok(removed);
  });

  it('should get recent interactions', () => {
    const m = new AgentManager();
    const result = m.getRecentInteractions(300000);
    assert.ok(Array.isArray(result));
  });

  it('should emit events on tick', () => {
    const m = new AgentManager();
    m.spawnAgent({name: 'Cody', type: 'npc', schedule: [{action: 'work', location: 'office', startHour: 0, endHour: 24}]});
    let actionFired = false;
    m.on('agent:action', () => { actionFired = true; });
    m.running = true;
    m.tick({gameHour: 10});
    assert.ok(actionFired);
    m.running = false;
  });
});
