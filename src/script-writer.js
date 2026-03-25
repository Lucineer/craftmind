/**
 * @module craftmind/script-writer
 * @description LLM-driven behavior script generation and modification.
 *
 * Uses an LLM to suggest script changes based on context, performance data,
 * and novelty events. Includes quality scoring, A/B testing, and graceful fallback.
 *
 * @example
 * const writer = new ScriptWriter({ apiKey: process.env.ZAI_API_KEY });
 * const mods = await writer.suggestScriptChanges({
 *   currentScript: fishermanScript,
 *   context: 'Fish keep diving deep when I use surface bait.',
 *   availableActions: ['change_bait', 'change_depth'],
 *   availableConditions: ['depth', 'bait_type', 'catch_rate'],
 * });
 */

const { BehaviorScript, diffScripts, validateScript } = require('./behavior-script');
const { SEVERITY } = require('./novelty-detector');

/**
 * @typedef {Object} ScriptModification
 * @property {Array} added
 * @property {Array} removed
 * @property {Array} modified
 * @property {string} reasoning
 * @property {number} qualityScore
 */

class ScriptWriter {
  /**
   * @param {{ apiKey?: string, apiUrl?: string, model?: string }} [opts]
   */
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || process.env.ZAI_API_KEY || '';
    this.apiUrl = opts.apiUrl || 'https://z.ai/api/v1/chat/completions';
    this.model = opts.model || 'glm-4.7-flash';
    /** @type {Object[]} */
    this._abTests = [];
    /** @type {number} */
    this._requestCount = 0;
  }

  /** @type {boolean} */
  get available() {
    return !!this.apiKey;
  }

  /**
   * Suggest script modifications using LLM.
   * @param {{ currentScript: Array, context?: string, noveltyEvents?: Array, availableActions?: string[], availableConditions?: string[], performanceData?: Object }} params
   * @returns {Promise<ScriptModification>}
   */
  async suggestScriptChanges(params) {
    if (!this.available) {
      return this._fallbackResponse(params);
    }

    const { currentScript, context = '', noveltyEvents = [], availableActions = [], availableConditions = [], performanceData } = params;

    const prompt = this._buildPrompt({ currentScript, context, noveltyEvents, availableActions, availableConditions, performanceData });

    try {
      this._requestCount++;
      const response = await this._callLLM(prompt);
      const parsed = this._parseResponse(response, currentScript);
      parsed.qualityScore = this._scoreQuality(parsed, context);
      return parsed;
    } catch (err) {
      return this._fallbackResponse(params);
    }
  }

  /**
   * Generate a human-readable explanation of modifications.
   * @param {ScriptModification} mods
   * @returns {string}
   */
  explain(mods) {
    const parts = [];

    if (mods.reasoning) {
      parts.push(`📋 Reasoning: ${mods.reasoning}`);
    }

    if (mods.added?.length) {
      parts.push(`\n✅ Added ${mods.added.length} rule(s):`);
      for (const rule of mods.added) {
        parts.push(`  • [${rule.id}] When: ${rule.condition} → ${rule.action} (priority: ${rule.priority})`);
      }
    }

    if (mods.removed?.length) {
      parts.push(`\n❌ Removed ${mods.removed.length} rule(s):`);
      for (const rule of mods.removed) {
        parts.push(`  • [${rule.id}] ${rule.condition} → ${rule.action}`);
      }
    }

    if (mods.modified?.length) {
      parts.push(`\n✏️ Modified ${mods.modified.length} rule(s):`);
      for (const m of mods.modified) {
        parts.push(`  • [${m.id}] "${m.old.condition} → ${m.old.action}" → "${m.new.condition} → ${m.new.action}"`);
      }
    }

    if (mods.qualityScore !== undefined) {
      parts.push(`\n⭐ Quality: ${mods.qualityScore}/100`);
    }

    return parts.join('\n');
  }

  /**
   * Start an A/B test between two scripts.
   * @param {Array} scriptA
   * @param {Array} scriptB
   * @param {{ duration?: number, metric?: string }} [opts]
   * @returns {string} Test ID
   */
  startABTest(scriptA, scriptB, opts = {}) {
    const id = `ab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this._abTests.push({
      id,
      scriptA: { rules: scriptA, score: 0, count: 0 },
      scriptB: { rules: scriptB, score: 0, count: 0 },
      startedAt: Date.now(),
      duration: opts.duration ?? 300000, // 5 min default
      metric: opts.metric || 'success',
      winner: null,
    });
    return id;
  }

  /**
   * Record a result for an A/B test.
   * @param {string} testId
   * @param {'A'|'B'} variant
   * @param {number} score
   */
  recordABResult(testId, variant, score) {
    const test = this._abTests.find(t => t.id === testId);
    if (!test) return;
    const v = variant === 'A' ? test.scriptA : test.scriptB;
    v.count++;
    v.score += score;
  }

  /**
   * Check A/B test results. Returns winner if test is complete.
   * @param {string} testId
   * @returns {{ complete: boolean, winner?: 'A'|'B', scores?: { A: number, B: number } }|null}
   */
  getABResult(testId) {
    const test = this._abTests.find(t => t.id === testId);
    if (!test) return null;

    const elapsed = Date.now() - test.startedAt;
    const complete = elapsed >= test.duration;
    const scoreA = test.scriptA.count > 0 ? test.scriptA.score / test.scriptA.count : 0;
    const scoreB = test.scriptB.count > 0 ? test.scriptB.score / test.scriptB.count : 0;

    if (complete && !test.winner) {
      test.winner = scoreA >= scoreB ? 'A' : 'B';
    }

    return {
      complete,
      winner: test.winner,
      scores: { A: Math.round(scoreA * 100) / 100, B: Math.round(scoreB * 100) / 100 },
    };
  }

  /**
   * Compress context history into a compact summary for the prompt.
   * @param {Array} events - History of events/actions.
   * @param {number} [maxTokens=500]
   * @returns {string}
   */
  compressContext(events, maxTokens = 500) {
    if (!events.length) return 'No recent history.';
    // Simple: take last N events, summarize
    const recent = events.slice(-20);
    const lines = recent.map((e, i) => {
      if (typeof e === 'string') return e;
      const ts = e.timestamp ? new Date(e.timestamp).toISOString().slice(11, 19) : '??';
      return `[${ts}] ${e.key || e.action || e.type || JSON.stringify(e).slice(0, 60)}`;
    });
    // Rough token estimate: ~4 chars per token
    let result = lines.join('\n');
    if (result.length > maxTokens * 4) {
      result = result.slice(-(maxTokens * 4));
      result = '...(truncated)\n' + result;
    }
    return result;
  }

  // ── Private ──

  _buildPrompt({ currentScript, context, noveltyEvents, availableActions, availableConditions, performanceData }) {
    return `You are a behavior script optimizer for CraftMind bots. Suggest modifications to improve bot performance.

CURRENT SCRIPT:
${JSON.stringify(currentScript, null, 2)}

${context ? `CONTEXT/PROBLEM:\n${context}` : ''}
${noveltyEvents?.length ? `RECENT NOVELTY EVENTS:\n${JSON.stringify(noveltyEvents.slice(-5), null, 2)}` : ''}
${performanceData ? `PERFORMANCE DATA:\n${JSON.stringify(performanceData)}` : ''}

AVAILABLE ACTIONS: ${availableActions.join(', ') || '(any)'}
AVAILABLE CONDITIONS: ${availableConditions.join(', ') || '(any state keys)'}

RESPOND WITH VALID JSON ONLY:
{
  "reasoning": "Brief explanation of why these changes help",
  "added": [{ "id": "unique_id", "condition": "state_key AND ...", "action": "action_name", "priority": 10 }],
  "removed": ["rule_id_to_remove"],
  "modified": [{ "id": "rule_id", "condition": "new_condition", "action": "new_action", "priority": 15 }]
}

Rules:
- IDs must be unique alphanumeric strings
- Conditions use: AND, OR, NOT, >, <, ==, != with state key names
- Priority: higher number = higher priority (evaluated first)
- Only suggest changes that directly address the context/problem
- If no changes needed, return empty arrays with reasoning explaining why`;
  }

  async _callLLM(prompt) {
    const resp = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  }

  _parseResponse(text, currentScript) {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    const raw = jsonMatch[1] || text;

    try {
      const parsed = JSON.parse(raw.trim());
      const result = {
        reasoning: parsed.reasoning || '',
        added: parsed.added || [],
        removed: parsed.removed || [],
        modified: parsed.modified || [],
      };

      // Validate added rules
      const validation = validateScript(result.added);
      if (!validation.valid) {
        console.warn('[ScriptWriter] Generated rules have validation errors:', validation.errors);
      }

      // Resolve removed rule IDs to full rules
      result.removed = result.removed.map(id => {
        const rule = currentScript.find(r => r.id === id);
        return rule || { id, condition: '?', action: '?', priority: 0 };
      });

      return result;
    } catch (e) {
      console.warn('[ScriptWriter] Failed to parse LLM response:', e.message);
      return { reasoning: 'Failed to parse suggestions', added: [], removed: [], modified: [] };
    }
  }

  _scoreQuality(mods, context) {
    let score = 50; // base

    // Has reasoning
    if (mods.reasoning && mods.reasoning.length > 10) score += 10;

    // Relevant to context
    if (context && mods.reasoning?.toLowerCase().includes(context.slice(0, 20).toLowerCase())) score += 10;

    // Reasonable number of changes
    const totalChanges = (mods.added?.length || 0) + (mods.removed?.length || 0) + (mods.modified?.length || 0);
    if (totalChanges >= 1 && totalChanges <= 5) score += 15;
    if (totalChanges > 10) score -= 20;

    // Priorities are reasonable
    const allRules = [...(mods.added || []), ...(mods.modified || [])];
    if (allRules.every(r => r.priority >= 0 && r.priority <= 100)) score += 5;

    // Valid conditions (spot check)
    if (allRules.every(r => r.condition && r.condition.length > 0)) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  _fallbackResponse(params) {
    return {
      reasoning: 'LLM unavailable — no modifications suggested',
      added: [],
      removed: [],
      modified: [],
      qualityScore: 0,
    };
  }
}

module.exports = { ScriptWriter };
