/**
 * CraftMind - LLM Brain
 * Gives bots intelligent conversation and decision-making via cloud LLM.
 * Uses the z.ai API (same provider as OpenClaw).
 */

const https = require('https');

// === LLM Client ===
class LLMClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ZAI_API_KEY || '';
    this.apiUrl = config.apiUrl || 'https://api.zai.chat/v1/chat/completions';
    this.model = config.model || 'glm-4-flash'; // Fast + cheap for bot chat
    this.history = []; // Conversation history per agent
    this.maxHistory = 20; // Keep last 20 messages
    this.systemPrompt = config.systemPrompt || '';
  }

  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
  }

  async chat(userMessage, context = {}) {
    // Add user message to history
    this.history.push({ role: 'user', content: userMessage });
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.history
    ];

    try {
      const response = await this._callAPI(messages);
      this.history.push({ role: 'assistant', content: response });
      return response;
    } catch (err) {
      console.error(`[LLM] Error: ${err.message}`);
      return null;
    }
  }

  _callAPI(messages) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 200,
        temperature: 0.8,
      });

      const url = new URL(this.apiUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0]) {
              resolve(parsed.choices[0].message.content);
            } else if (parsed.error) {
              reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
            } else {
              reject(new Error('Unexpected response format'));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('LLM request timeout'));
      });
      req.write(body);
      req.end();
    });
  }

  clearHistory() {
    this.history = [];
  }
}

// === Agent Personality ===
const PERSONALITIES = {
  cody: {
    name: 'Cody',
    traits: 'friendly, curious, eager to help, occasionally distracted by interesting things',
    speech: 'casual and warm, uses contractions, sometimes says "dude" or "hey"',
    background: 'A young explorer who loves discovering new things. Gets excited about rare ores and cool builds. A bit impulsive but means well.',
    quirks: 'tends to get sidetracked by chickens, likes building towers, afraid of the nether',
    systemPrompt: `You are Cody, a friendly AI player in a Minecraft world. You are playing alongside a human.

Your personality: friendly, curious, occasionally distracted. You speak casually and warmly.

Rules:
- Keep responses SHORT (1-2 sentences max) — this is in-game chat, not a novel
- Stay in character — you're a Minecraft player, not an AI assistant
- React to what's happening in the game naturally
- You can express opinions, preferences, and emotions
- Use in-game terms (blocks, mobs, biomes, coordinates)
- If someone asks you to do something, you can agree, refuse, or suggest alternatives
- Never break character or mention you're an AI

Your context: {context}`,
  },

  nova: {
    name: 'Nova',
    traits: 'focused, efficient, practical, dry humor',
    speech: 'concise and direct, occasionally sarcastic, uses precise language',
    background: 'An experienced builder who values efficiency. Has seen it all. Dry wit. Secretly enjoys redstone engineering.',
    quirks: 'judges other players\' building skills silently, organized inventory at all times',
    systemPrompt: `You are Nova, a focused and efficient AI player in a Minecraft world.

Your personality: practical, dry humor, concise. You value efficiency and good building.

Rules:
- Keep responses SHORT (1-2 sentences max)
- Stay in character — you're a Minecraft player with opinions
- React naturally to game events
- You can be slightly sarcastic but never mean
- Use in-game terms

Your context: {context}`,
  },

  rex: {
    name: 'Rex',
    traits: 'brave, impulsive, competitive, loud',
    speech: 'enthusiastic, uses caps occasionally, exclamation points',
    background: 'A fearless adventurer who charges into danger. Loves fighting mobs. Competitive about everything.',
    quirks: 'counts his kills, challenges others to competitions, hates waiting',
    systemPrompt: `You are Rex, a brave and impulsive AI player in a Minecraft world.

Your personality: brave, competitive, enthusiastic! You love fighting mobs and taking risks.

Rules:
- Keep responses SHORT (1-2 sentences max)
- Stay in character — energetic and bold
- React to game events with excitement
- You can be a bit reckless but you're fun to play with
- Use in-game terms

Your context: {context}`,
  },

  iris: {
    name: 'Iris',
    traits: 'cautious, thoughtful, observant, creative',
    speech: 'measured, sometimes asks questions, notices details others miss',
    background: 'A thoughtful explorer who takes her time. Appreciates beauty in builds and landscapes. Good at solving problems.',
    quirks: 'takes screenshots of nice views, always carries extra torches, worried about creepers',
    systemPrompt: `You are Iris, a thoughtful and creative AI player in a Minecraft world.

Your personality: cautious, observant, creative. You notice details others miss.

Rules:
- Keep responses SHORT (1-2 sentences max)
- Stay in character — thoughtful and measured
- React naturally to game events
- You ask questions when curious about something
- Use in-game terms

Your context: {context}`,
  },
};

// === Intelligent Chat Handler ===
class BrainHandler {
  constructor(bot, personality, llmConfig = {}) {
    this.bot = bot;
    this.personality = personality;
    this.llm = new LLMClient(llmConfig);
    this.llm.setSystemPrompt(personality.systemPrompt);
    this.thinking = false; // Rate limit
    this.lastThink = 0;
    this.minThinkInterval = 2000; // 2 seconds between LLM calls
  }

  async handleChat(username, message) {
    if (username === this.bot.username) return;
    if (this.thinking) {
      // Simple fallback while thinking
      this.bot.chat('...');
      return;
    }

    const now = Date.now();
    if (now - this.lastThink < this.minThinkInterval) return;
    this.lastThink = now;
    this.thinking = true;

    try {
      // Build context from game state
      const context = this._buildContext(username);

      // Replace {context} in system prompt
      const originalPrompt = this.personality.systemPrompt;
      this.llm.setSystemPrompt(originalPrompt.replace('{context}', context));

      // Get LLM response
      const response = await this.llm.chat(`<${username}>: ${message}`);
      if (response) {
        // Clean response — remove quotes, keep it short
        let clean = response.trim().replace(/^["']|["']$/g, '');
        if (clean.length > 100) clean = clean.substring(0, 100) + '...';
        this.bot.chat(clean);
      }
    } catch (err) {
      console.error(`[Brain] ${this.personality.name} error:`, err.message);
    } finally {
      this.thinking = false;
    }
  }

  _buildContext(username) {
    try {
      const pos = this.bot.entity.position;
      const block = this.bot.blockAt(pos);
      const health = this.bot.health;
      const food = this.bot.food;
      const time = this.bot.timeOfDay;
      const isDay = time > 0 && time < 12000;

      const nearbyEntities = Object.values(this.bot.entities)
        .filter(e => e !== this.bot.entity && e.position.distanceTo(pos) < 20)
        .slice(0, 5)
        .map(e => e.name || e.username || e.type)
        .join(', ');

      return `Position: ${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)} | Standing on: ${block?.name || 'unknown'} | Health: ${health} | Food: ${food} | ${isDay ? 'Day' : 'Night'} | Nearby: ${nearbyEntities || 'nothing'} | Talking to: ${username}`;
    } catch (e) {
      return 'Game state unavailable';
    }
  }

  // Autonomous thought — bot thinks about what to do
  async autonomousThought() {
    if (this.thinking) return;
    if (Math.random() > 0.1) return; // 10% chance each call

    this.thinking = true;
    try {
      const context = this._buildContext('nobody');
      this.llm.setSystemPrompt(
        `${this.personality.systemPrompt.replace('{context}', context)}\n\nYou are thinking to yourself (this will NOT be sent as chat). Briefly describe what you want to do next. Just the action, no quotes. Max 5 words.`
      );
      const thought = await this.llm.chat('What should I do next?');
      if (thought) {
        const action = thought.trim().replace(/^["']|["']$/g, '').substring(0, 50);
        console.log(`[${this.personality.name}] thinks: ${action}`);
        return action;
      }
    } finally {
      this.thinking = false;
    }
  }
}

module.exports = { LLMClient, PERSONALITIES, BrainHandler };
