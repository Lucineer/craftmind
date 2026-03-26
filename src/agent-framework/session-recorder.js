/**
 * @module craftmind/agent-framework/session-recorder
 * @description Generic session recording and querying. Works for any domain.
 */

import {writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync} from 'fs';
import {join} from 'path';

const MAX_EVENTS = 500;

export class SessionRecorder {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.sessionsDir = join(dataDir, 'sessions');
    this._ensureDir(this.sessionsDir);
  }

  _ensureDir(dir) {
    if (!existsSync(dir)) mkdirSync(dir, {recursive: true});
  }

  _generateId() {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  recordSession(session) {
    const id = session.id || this._generateId();
    const full = {...session, id, recordedAt: new Date().toISOString()};

    if (!full.skill) throw new Error('Session must have a skill name');
    if (full.conditions === undefined || full.conditions === null) throw new Error('Session must have conditions');
    if (!full.results) full.results = {catches: [], totalWeight: 0, speciesCaught: []};
    if (!full.events) full.events = [];
    if (!full.outcome) full.outcome = 'failure';

    if (full.events.length > MAX_EVENTS) full.events = full.events.slice(-MAX_EVENTS);
    if (full.results.totalWeight === undefined || full.results.totalWeight === null) {
      full.results.totalWeight = (full.results.catches || []).reduce((s, c) => s + (c.weight || 0), 0);
    }
    if (!full.results.speciesCaught) {
      full.results.speciesCaught = [...new Set((full.results.catches || []).map(c => c.species).filter(Boolean))];
    }

    writeFileSync(join(this.sessionsDir, `${id}.json`), JSON.stringify(full, null, 2));
    return id;
  }

  loadSession(id) {
    const p = join(this.sessionsDir, `${id}.json`);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, 'utf-8'));
  }

  getAllSessions() {
    if (!existsSync(this.sessionsDir)) return [];
    return readdirSync(this.sessionsDir).filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(readFileSync(join(this.sessionsDir, f), 'utf-8')))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }

  querySessions(query = {}) {
    let results = this.getAllSessions();
    if (query.skill) results = results.filter(s => s.skill === query.skill);
    if (query.outcome) results = results.filter(s => s.outcome === query.outcome);
    if (query.since) {
      const t = new Date(query.since).getTime();
      results = results.filter(s => new Date(s.startTime).getTime() >= t);
    }
    if (query.before) {
      const t = new Date(query.before).getTime();
      results = results.filter(s => new Date(s.startTime).getTime() < t);
    }
    if (query.species) results = results.filter(s => s.results?.speciesCaught?.includes(query.species));
    if (query.minCatches) results = results.filter(s => s.results?.catches?.length >= query.minCatches);
    if (query.limit) results = results.slice(-query.limit);
    return results;
  }

  get sessionCount() {
    if (!existsSync(this.sessionsDir)) return 0;
    return readdirSync(this.sessionsDir).filter(f => f.endsWith('.json')).length;
  }

  createLiveSession(skill, conditions) {
    return new LiveSession(skill, conditions, this);
  }
}

export class LiveSession {
  constructor(skill, conditions, recorder) {
    this.skill = skill;
    this.conditions = conditions;
    this.recorder = recorder;
    this.startTime = new Date();
    this.events = [];
    this._results = [];
    this._outcome = 'failure';
  }

  addEvent(type, detail = {}) {
    this.events.push({time: Date.now() - this.startTime.getTime(), type, detail});
  }

  addResult(entry) {
    this._results.push(entry);
    this.addEvent('result', entry);
  }

  setOutcome(outcome) { this._outcome = outcome; }

  finalize() {
    const endTime = new Date();
    const duration = (endTime.getTime() - this.startTime.getTime()) / 1000;
    const outcome = this._results.length > 0
      ? (this._outcome === 'failure' ? 'partial' : this._outcome)
      : this._outcome;

    return this.recorder.recordSession({
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      skill: this.skill,
      conditions: {...this.conditions},
      events: this.events,
      results: {
        items: this._results,
        totalScore: this._results.reduce((s, r) => s + (r.score || 0), 0),
        categories: [...new Set(this._results.map(r => r.category).filter(Boolean))],
      },
      outcome,
    });
  }
}

export default SessionRecorder;
