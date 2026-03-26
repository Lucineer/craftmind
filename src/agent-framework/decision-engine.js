/**
 * @module craftmind/agent-framework/decision-engine
 * @description Generic data-driven decision engine with personality modifiers.
 */

export class DecisionEngine {
  /**
   * @param {import('./comparative-evaluator.js').ComparativeEvaluator} evaluator
   * @param {import('./session-recorder.js').SessionRecorder} recorder
   */
  constructor(evaluator, recorder) {
    this.evaluator = evaluator;
    this.recorder = recorder;
  }

  decide(conditions, personality, memory) {
    const traits = personality?.traits || personality || {};
    const mood = personality?.mood || {energy: 0.5, satisfaction: 0.5, frustration: 0.1, social: 0.5};
    const working = memory?.working || memory || {};

    const allSessions = this.recorder.getAllSessions();
    const insights = this.evaluator.getAllInsights();
    const perfSummary = this.evaluator.getScriptPerformanceSummary();

    const candidates = this._scoreScripts(conditions, allSessions, perfSummary);

    if (candidates.length === 0) {
      return {action: 'idle', script: null, confidence: 0, reasoning: ['No data available yet.'], altScripts: []};
    }

    this._applyPersonalityModifiers(candidates, traits, mood, working, allSessions);
    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0];
    const altScripts = candidates.slice(1, 4).map(c => c.name);
    const reasoning = [...best.reasons];
    const relevantInsights = this._findRelevantInsights(insights, conditions);
    reasoning.push(...relevantInsights.slice(0, 2));

    let action = 'execute';
    if (best.score < 0.3) {
      action = mood.frustration > 0.5 ? 'explore' : 'wait';
      reasoning.push(best.score < 0.3 ? 'Low confidence — exploring alternatives.' : 'Low confidence.');
    }
    if (mood.energy < 0.2) {
      action = 'rest';
      reasoning.push('Low energy — resting.');
    }

    return {action, script: best.name, confidence: best.score, reasoning: [...new Set(reasoning)], altScripts};
  }

  _scoreScripts(conditions, allSessions, perfSummary) {
    const scriptNames = [...new Set(allSessions.map(s => s.skill))];
    if (scriptNames.length === 0) return [];
    return scriptNames.map(name => {
      const sessions = allSessions.filter(s => s.skill === name);
      return this._calculateScriptScore(name, conditions, sessions, perfSummary);
    });
  }

  _calculateScriptScore(scriptName, conditions, sessions, perfSummary) {
    const reasons = [];
    let score = 0.3;
    if (sessions.length === 0) return {name: scriptName, score: 0.1, reasons: ['No prior sessions.']};
    const successes = sessions.filter(s => s.outcome === 'success' || s.outcome === 'partial').length;
    const rate = successes / sessions.length;
    score += rate * 0.3;
    reasons.push(`${scriptName}: ${(rate * 100).toFixed(0)}% success (${sessions.length} uses)`);

    const perf = perfSummary[scriptName];
    if (perf && perf.evaluations > 0) score += (perf.totalScore / perf.evaluations) * 0.2;

    const similar = this.evaluator.findSimilarSessions(conditions, sessions);
    if (similar.length > 0) {
      const similarRate = similar.filter(s => s.outcome !== 'failure').length / similar.length;
      score += similarRate * 0.2;
      if (similar.length >= 3) reasons.push(`${similar.length} similar sessions, ${similarRate * 100 > 60 ? 'good' : 'mixed'} results`);
    }

    if (conditions.target) {
      const targetSessions = sessions.filter(s => s.results?.categories?.includes?.(conditions.target) || s.results?.speciesCaught?.includes?.(conditions.target));
      if (targetSessions.length > 0) {
        const tr = targetSessions.filter(s => s.outcome !== 'failure').length / targetSessions.length;
        score += tr * 0.15;
      }
    }

    const recent = sessions.slice(-5);
    if (recent.length >= 2) {
      const rr = recent.filter(s => s.outcome !== 'failure').length / recent.length;
      if (rr > 0.6) { score += 0.1; reasons.push('Recently performing well'); }
    }

    return {name: scriptName, score: Math.min(1, Math.max(0, score)), reasons};
  }

  _applyPersonalityModifiers(candidates, traits, mood, working, allSessions) {
    const stubbornness = traits.stubbornness || 0;
    const curiosity = traits.curiosity || 0;

    if (stubbornness > 0.5) {
      for (const c of candidates) {
        const uses = allSessions.filter(s => s.skill === c.name).length;
        if (uses >= 5) c.score += 0.05 * stubbornness;
        else if (uses <= 1) { c.score -= 0.05 * stubbornness; c.reasons.push('Not enough history (stubborn)'); }
      }
    }
    if (mood.frustration > 0.5) {
      const fails = allSessions.filter(s => s.outcome === 'failure').slice(-3).map(s => s.skill);
      for (const c of candidates) {
        if (fails.includes(c.name)) c.score -= 0.15 * mood.frustration;
        else { c.score += 0.05 * mood.frustration; c.reasons.push('Trying something different'); }
      }
    }
    if (curiosity > 0.5) {
      for (const c of candidates) {
        if (allSessions.filter(s => s.skill === c.name).length <= 2) c.score += 0.03 * curiosity;
      }
    }
  }

  _findRelevantInsights(insights, conditions) {
    const keys = Object.keys(conditions).filter(k => conditions[k] !== undefined);
    return insights.filter(i => keys.some(k => i.toLowerCase().includes(conditions[k]?.toString().toLowerCase())));
  }

  answerQuestion(question) {
    const sessions = this.recorder.getAllSessions();
    if (sessions.length < 3) return 'Not enough data yet.';
    const total = sessions.length;
    const successes = sessions.filter(s => s.outcome !== 'failure' && s.outcome !== 'aborted').length;
    return `Recorded ${total} sessions with ${successes} successes (${(successes/total*100).toFixed(0)}%).`;
  }
}

export default DecisionEngine;
