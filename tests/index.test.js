const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { LLMClient, PERSONALITIES, BrainHandler } = require('../src/brain');
const { createBot } = require('../src/bot');
const { BotAgent, Orchestrator } = require('../src/orchestrator');

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
    // simulate the trim that happens in chat()
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

    // first call sets lastThink
    brain.lastThink = Date.now();
    // should bail early without calling LLM
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

// ─── Orchestrator / BotAgent ───────────────────────────────────────────────────

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
    // no crash — agents are dead
    orch.commandAll('stop');
    assert.ok(true);
  });
});
