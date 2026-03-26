/**
 * @module craftmind/agent-framework/comparative-evaluator
 * @description Generic comparative evaluator with configurable scoring and similarity.
 */

import {writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync} from 'fs';
import {join} from 'path';

export class ComparativeEvaluator {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.comparisonsDir = join(dataDir, 'comparisons');
    this.insightsDir = join(dataDir, 'insights');
    this._ensureDir(this.comparisonsDir);
    this._ensureDir(this.insightsDir);

    // Configurable scoring and similarity
    this._scoreFn = null;
    this._similarityFn = null;
    this._outcomeScores = {success: 0.8, partial: 0.5, failure: 0.1, aborted: 0.0};
    this._conditionFields = [];
    this._numericFields = [];
  }

  _ensureDir(dir) {
    if (!existsSync(dir)) mkdirSync(dir, {recursive: true});
  }

  /**
   * Configure scoring.
   * @param {{outcomeScores?: Object, scoreFn?: function, similarityFn?: function, conditionFields?: string[], numericFields?: Array<{key:string, tolerance:number}>}} config
   */
  configure(config = {}) {
    if (config.outcomeScores) this._outcomeScores = config.outcomeScores;
    if (config.scoreFn) this._scoreFn = config.scoreFn;
    if (config.similarityFn) this._similarityFn = config.similarityFn;
    if (config.conditionFields) this._conditionFields = config.conditionFields;
    if (config.numericFields) this._numericFields = config.numericFields;
  }

  scoreSession(session) {
    if (this._scoreFn) return this._scoreFn(session);
    // Default scoring
    const items = session.results?.items?.length || session.results?.catches?.length || 0;
    const score = session.results?.totalScore || session.results?.totalWeight || 0;
    const categories = session.results?.categories?.length || session.results?.speciesCaught?.length || 0;
    const duration = session.duration || 1;
    let s = this._outcomeScores[session.outcome] || 0.1;
    s += Math.min(0.3, (items / duration) * 3600 * 0.06);
    s += Math.min(0.2, (score / 50) * 0.2);
    s += Math.min(0.1, categories * 0.03);
    return Math.min(1, Math.max(0, s));
  }

  findSimilarSessions(conditions, allSessions) {
    if (this._similarityFn) {
      return allSessions
        .map(s => ({session: s, similarity: this._similarityFn(conditions, s.conditions)}))
        .filter(({similarity}) => similarity >= 0.3)
        .sort((a, b) => b.similarity - a.similarity)
        .map(({session}) => session);
    }
    // Default similarity
    const exactFields = this._conditionFields.length > 0 ? this._conditionFields : ['weather', 'tide', 'timeOfDay', 'location'];
    return allSessions
      .map(s => ({session: s, similarity: this._defaultSimilarity(conditions, s.conditions, exactFields)}))
      .filter(({similarity}) => similarity >= 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .map(({session}) => session);
  }

  _defaultSimilarity(a, b, exactFields) {
    if (!a || !b) return 0;
    let matches = 0, total = 0;
    for (const f of exactFields) {
      if (a[f] !== undefined || b[f] !== undefined) {
        total++;
        if (a[f] === b[f]) matches++;
      }
    }
    for (const {key, tolerance} of this._numericFields) {
      if (a[key] !== undefined && b[key] !== undefined) {
        total++;
        if (Math.abs(a[key] - b[key]) <= tolerance) matches++;
      }
    }
    return total > 0 ? matches / total : 0;
  }

  evaluate(session, history) {
    const score = this.scoreSession(session);
    const similar = this.findSimilarSessions(session.conditions, history);
    const scored = similar.map(s => ({session: s, score: this.scoreSession(s)}));
    const betterThan = scored.filter(s => s.score > score).length;
    const historicalRank = betterThan + 1;
    const historicalTotal = scored.length + 1;

    const scriptStats = {};
    for (const s of scored) {
      const name = s.session.skill;
      if (!scriptStats[name]) scriptStats[name] = {scores: [], uses: 0, successes: 0};
      scriptStats[name].scores.push(s.score);
      scriptStats[name].uses++;
      if (s.session.outcome === 'success' || s.session.outcome === 'partial') scriptStats[name].successes++;
    }
    const currentName = session.skill;
    if (!scriptStats[currentName]) scriptStats[currentName] = {scores: [], uses: 0, successes: 0};
    scriptStats[currentName].scores.push(score);
    scriptStats[currentName].uses++;
    if (session.outcome === 'success' || session.outcome === 'partial') scriptStats[currentName].successes++;

    const scriptRanking = {};
    let bestScript = currentName, bestAvg = 0;
    for (const [name, stats] of Object.entries(scriptStats)) {
      const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
      const rate = stats.uses > 0 ? stats.successes / stats.uses : 0;
      scriptRanking[name] = {avgScore: avg, uses: stats.uses, successRate: rate};
      if (avg > bestAvg) { bestAvg = avg; bestScript = name; }
    }

    const insights = this._generateInsights(scored, scriptStats);
    const bestConditions = this._extractBestConditions(scored.slice(0, 5));

    return {sessionScore: score, historicalRank, historicalTotal, bestScript, bestConditions, insights, scriptRanking};
  }

  _extractBestConditions(topSessions) {
    if (topSessions.length === 0) return {};
    const conditions = {};
    const fields = this._conditionFields.length > 0 ? this._conditionFields : ['tide', 'weather', 'location'];
    for (const field of fields) {
      const values = topSessions.map(s => s.session.conditions?.[field]).filter(Boolean);
      if (values.length === 0) continue;
      if (typeof values[0] === 'number') {
        conditions[field] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      } else {
        const freq = {};
        for (const v of values) freq[v] = (freq[v] || 0) + 1;
        conditions[field] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
      }
    }
    return conditions;
  }

  _generateInsights(scored, scriptStats) {
    const insights = [];
    if (scored.length < 3) return insights;

    const sorted = Object.entries(scriptStats).sort((a, b) => b[1].avgScore - a[1].avgScore);
    if (sorted.length >= 2 && sorted[0][1].uses >= 3) {
      insights.push(`Best approach: ${sorted[0][0]} (${(sorted[0][1].successRate * 100).toFixed(0)}% success, ${sorted[0][1].uses} uses)`);
    }
    return insights.slice(0, 10);
  }

  saveComparison(sessionId, evaluation) {
    writeFileSync(join(this.comparisonsDir, `${sessionId}.json`), JSON.stringify({sessionId, ...evaluation, evaluatedAt: new Date().toISOString()}, null, 2));
  }

  getAllInsights() {
    if (!existsSync(this.insightsDir)) return [];
    return readdirSync(this.insightsDir).filter(f => f.endsWith('.json'))
      .flatMap(f => { try { return JSON.parse(readFileSync(join(this.insightsDir, f), 'utf-8')).insights || []; } catch { return []; } });
  }

  getScriptPerformanceSummary() {
    if (!existsSync(this.comparisonsDir)) return {};
    const summary = {};
    for (const f of readdirSync(this.comparisonsDir).filter(f => f.endsWith('.json'))) {
      try {
        const data = JSON.parse(readFileSync(join(this.comparisonsDir, f), 'utf-8'));
        if (!data.scriptRanking) continue;
        for (const [name, stats] of Object.entries(data.scriptRanking)) {
          if (!summary[name]) summary[name] = {totalScore: 0, totalUses: 0, totalSuccesses: 0, evaluations: 0};
          summary[name].totalScore += stats.avgScore;
          summary[name].totalUses += stats.uses;
          summary[name].totalSuccesses += Math.round(stats.successRate * stats.uses);
          summary[name].evaluations++;
        }
      } catch { continue; }
    }
    return summary;
  }
}

export default ComparativeEvaluator;
