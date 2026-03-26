/**
 * @module craftmind/agent-framework/conversation-memory
 * @description Generic conversation tracking with configurable topic extraction
 * and intent detection.
 */

export class ConversationMemory {
  /**
   * @param {object} [options]
   * @param {number} [options.maxMessages=50]
   * @param {string[]} [options.topicKeywords] - Keywords to track
   * @param {Array<{pattern: RegExp, intent: string}>} [options.intentPatterns]
   */
  constructor(options = {}) {
    this.maxMessages = options.maxMessages || 50;
    this.topicKeywords = options.topicKeywords || [];
    this.intentPatterns = options.intentPatterns || [];
    this.history = [];
  }

  add(role, message, metadata) {
    this.history.push({role, message, time: Date.now(), metadata});
    if (this.history.length > this.maxMessages) this.history.shift();
  }

  getRecent(n = 10) {
    return this.history.slice(-n);
  }

  getFromSpeaker(speakerName, n = 10) {
    return this.history
      .filter(m => m.role === speakerName || m.metadata?.player === speakerName)
      .slice(-n);
  }

  extractTopics() {
    if (this.topicKeywords.length === 0) return [];
    const recent = this.getRecent(20);
    const counts = {};
    for (const msg of recent) {
      const lower = msg.message.toLowerCase();
      for (const kw of this.topicKeywords) {
        if (lower.includes(kw.toLowerCase())) counts[kw] = (counts[kw] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  detectIntent() {
    const recent = this.getRecent(1);
    if (recent.length === 0) return 'greeting';
    const text = recent[0].message;

    for (const {pattern, intent} of this.intentPatterns) {
      if (pattern.test(text)) return intent;
    }

    if (/^\s*[?!]/.test(text)) return 'question';
    if (/\?\s*$/.test(text)) return 'question';
    if (/thank|thanks/i.test(text)) return 'gratitude';
    if (/^(hi|hello|hey|sup|yo|greetings)/i.test(text)) return 'greeting';
    return 'general';
  }

  getContext() {
    return {
      recentMessages: this.getRecent(10).map(m => `${m.role}: ${m.message}`),
      topics: this.extractTopics(),
      playerIntent: this.detectIntent(),
      messageCount: this.history.length,
    };
  }

  clear() { this.history = []; }

  get length() { return this.history.length; }

  serialize() { return JSON.stringify(this.history); }

  deserialize(data) {
    try { this.history = JSON.parse(data); } catch { this.history = []; }
  }
}

export default ConversationMemory;
