/**
 * @module craftmind/agent-framework/action-planner
 * @description Generic NL→structured action planner. Games inject their
 * action schema, system prompt, and context builders.
 */

export class ActionPlanner {
  /**
   * @param {object} options
   * @param {object} [options.actionSchema] - ActionSchema instance
   * @param {string} [options.systemPrompt] - Base system prompt
   * @param {function} [options.getGameState] - () => Object of current game state
   * @param {function} [options.getPersonality] - () => Object of personality traits
   * @param {function} [options.getMemory] - () => conversation context
   * @param {Array<{pattern: RegExp, action: object}>} [options.fallbackPatterns]
   */
  constructor(options = {}) {
    this.actionSchema = options.actionSchema || null;
    this.systemPrompt = options.systemPrompt || 'You are an AI agent. Convert user requests into structured actions.';
    this.getGameState = options.getGameState || (() => ({}));
    this.getPersonality = options.getPersonality || (() => ({}));
    this.getMemory = options.getMemory || (() => ({}));
    this.fallbackPatterns = options.fallbackPatterns || [];
  }

  /**
   * Plan actions from natural language input.
   * @param {string} input - Natural language command or question
   * @param {string} [playerName] - Name of the requesting player
   * @returns {Promise<{actions: Array, dialogue: string|null, fallback: boolean}>}
   */
  async plan(input, playerName = 'player') {
    // Try fallback patterns first (no LLM needed)
    const fallbackResult = this._tryFallback(input);
    if (fallbackResult) {
      return fallbackResult;
    }

    // If we have an LLM client, use it
    if (this._llmClient) {
      return await this._planWithLLM(input, playerName);
    }

    // No LLM, no fallback — return unknown
    return {
      actions: [],
      dialogue: null,
      fallback: false,
    };
  }

  /**
   * Set an LLM client for AI-powered planning.
   * @param {{chat: function(string): Promise<string>}} client
   */
  setLLMClient(client) {
    this._llmClient = client;
  }

  /**
   * Try matching input against fallback patterns.
   * @private
   */
  _tryFallback(input) {
    const lower = input.toLowerCase().trim();

    for (const {pattern, action} of this.fallbackPatterns) {
      if (pattern.test(lower)) {
        return {
          actions: [{...action, params: action.params || {}}],
          dialogue: action.dialogue || null,
          fallback: true,
        };
      }
    }

    return null;
  }

  /**
   * Plan using LLM.
   * @private
   */
  async _planWithLLM(input, playerName) {
    const gameState = this.getGameState();
    const personality = this.getPersonality();
    const memory = this.getMemory();

    const availableActions = this.actionSchema
      ? this.actionSchema.allTypes().map(t => `${t.name}: ${t.description}`).join('\n')
      : 'No actions registered.';

    const prompt = `${this.systemPrompt}

Available actions:
${availableActions}

Current game state: ${JSON.stringify(gameState)}
Personality: ${JSON.stringify(personality)}
Conversation context: ${JSON.stringify(memory)}

Player "${playerName}" says: "${input}"

Respond with a JSON object: {"actions": [...], "dialogue": "optional response to player"}
Each action: {"type": "ACTION_NAME", "params": {...}, "reasoning": "why"}
If no action needed, return empty actions array. Keep dialogue short (1 sentence).`;

    try {
      const response = await this._llmClient.chat(prompt);
      const parsed = this._parseLLMResponse(response);
      return {
        actions: parsed.actions || [],
        dialogue: parsed.dialogue || null,
        fallback: false,
      };
    } catch {
      return {actions: [], dialogue: null, fallback: false};
    }
  }

  /**
   * Parse LLM response into structured actions.
   * @private
   */
  _parseLLMResponse(response) {
    if (!response) return {actions: [], dialogue: null};

    // Try JSON extraction
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through
      }
    }

    // Try parsing action mentions from plain text
    if (this.actionSchema) {
      const allTypes = this.actionSchema.allTypes().map(t => t.name);
      const mentioned = allTypes.filter(t => response.toUpperCase().includes(t.toUpperCase()));
      if (mentioned.length > 0) {
        return {
          actions: [{type: mentioned[0], params: {}, reasoning: 'Extracted from LLM response'}],
          dialogue: response.substring(0, 100),
        };
      }
    }

    return {actions: [], dialogue: response.substring(0, 100)};
  }

  /**
   * Build context summary for external use.
   * @returns {Object}
   */
  getContext() {
    return {
      systemPrompt: this.systemPrompt,
      gameState: this.getGameState(),
      personality: this.getPersonality(),
      hasLLM: !!this._llmClient,
      actionCount: this.actionSchema ? this.actionSchema.size : 0,
    };
  }
}

export default ActionPlanner;
