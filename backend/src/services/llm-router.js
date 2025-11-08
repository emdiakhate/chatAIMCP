/**
 * LLM Router - Intelligent routing to multiple LLM providers
 *
 * Supports:
 * - Groq (Llama 70B/8B, Mixtral, Gemma) - Ultra-fast, low cost
 * - OpenRouter (Claude, Gemini, GPT, Llama) - Unified API, competitive pricing
 * - Direct APIs (OpenAI, Anthropic via MCP) - Premium quality
 *
 * Features:
 * - Cost tracking and optimization
 * - Automatic fallback on errors
 * - Smart model selection based on task type
 */

import { callGroq, streamGroq, GROQ_MODELS } from './llm-providers/groq.js';
import { callOpenRouter, streamOpenRouter, OPENROUTER_MODELS } from './llm-providers/openrouter.js';

/**
 * Available providers
 */
export const PROVIDERS = {
  GROQ: 'groq',
  OPENROUTER: 'openrouter',
};

/**
 * Default configurations
 */
const DEFAULT_CONFIG = {
  provider: PROVIDERS.GROQ,
  model: 'llama-3.1-70b',
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * Task-based routing rules
 * Automatically select the best model for each task type
 */
const TASK_ROUTING = {
  // Simple tasks → Use cheapest/fastest models
  simple_qa: {
    provider: PROVIDERS.GROQ,
    model: 'llama-3.1-8b',
    description: 'Simple Q&A, facts, basic info'
  },
  translation: {
    provider: PROVIDERS.GROQ,
    model: 'llama-3.1-8b',
    description: 'Text translation'
  },
  summarization: {
    provider: PROVIDERS.GROQ,
    model: 'llama-3.1-70b',
    description: 'Summarize text, extract key points'
  },

  // Code tasks → Use Llama 70B (excellent for code)
  code_generation: {
    provider: PROVIDERS.GROQ,
    model: 'llama-3.1-70b',
    description: 'Generate code, debug, explain code'
  },
  code_review: {
    provider: PROVIDERS.GROQ,
    model: 'llama-3.1-70b',
    description: 'Review code, find bugs'
  },

  // Complex reasoning → Use best models via OpenRouter
  complex_reasoning: {
    provider: PROVIDERS.OPENROUTER,
    model: 'claude-sonnet',
    description: 'Complex analysis, deep reasoning'
  },
  research: {
    provider: PROVIDERS.OPENROUTER,
    model: 'gemini-pro',
    description: 'Research, large context analysis'
  },

  // Default → Balanced performance/cost
  default: {
    provider: PROVIDERS.GROQ,
    model: 'llama-3.1-70b',
    description: 'General purpose tasks'
  }
};

/**
 * Main router class
 */
export class LLMRouter {
  constructor(config = {}) {
    this.groqApiKey = config.groqApiKey || process.env.GROQ_API_KEY;
    this.openrouterApiKey = config.openrouterApiKey || process.env.OPENROUTER_API_KEY;
    this.defaultProvider = config.defaultProvider || DEFAULT_CONFIG.provider;
    this.defaultModel = config.defaultModel || DEFAULT_CONFIG.model;
  }

  /**
   * Call LLM with automatic routing
   */
  async call({
    messages,
    provider = this.defaultProvider,
    model = this.defaultModel,
    taskType = 'default',
    temperature = 0.7,
    maxTokens = 2000,
    enableFallback = true
  }) {
    try {
      // If taskType is specified, use task-based routing
      if (taskType !== 'default' && TASK_ROUTING[taskType]) {
        const route = TASK_ROUTING[taskType];
        provider = route.provider;
        model = route.model;
        console.log(`[LLM Router] Task-based routing: ${taskType} → ${provider}/${model}`);
      }

      console.log(`[LLM Router] Calling ${provider}/${model} (${messages.length} messages)`);

      let result;

      if (provider === PROVIDERS.GROQ) {
        result = await this.callGroq({ model, messages, temperature, maxTokens });
      } else if (provider === PROVIDERS.OPENROUTER) {
        result = await this.callOpenRouter({ model, messages, temperature, maxTokens });
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      console.log(`[LLM Router] Success: ${result.usage.totalTokens} tokens, $${result.cost.total.toFixed(6)}`);

      return {
        ...result,
        provider,
        model,
      };

    } catch (error) {
      console.error(`[LLM Router] Error with ${provider}/${model}:`, error.message);

      // Fallback to alternative provider
      if (enableFallback) {
        console.log('[LLM Router] Attempting fallback...');
        const fallbackProvider = provider === PROVIDERS.GROQ ? PROVIDERS.OPENROUTER : PROVIDERS.GROQ;
        const fallbackModel = fallbackProvider === PROVIDERS.GROQ ? 'llama-3.1-70b' : 'gemini-flash';

        return this.call({
          messages,
          provider: fallbackProvider,
          model: fallbackModel,
          temperature,
          maxTokens,
          enableFallback: false // Prevent infinite fallback
        });
      }

      throw error;
    }
  }

  /**
   * Call Groq provider
   */
  async callGroq({ model, messages, temperature, maxTokens }) {
    if (!this.groqApiKey) {
      throw new Error('Groq API key not configured. Set GROQ_API_KEY environment variable.');
    }

    return callGroq({
      model,
      messages,
      temperature,
      maxTokens,
      apiKey: this.groqApiKey
    });
  }

  /**
   * Call OpenRouter provider
   */
  async callOpenRouter({ model, messages, temperature, maxTokens }) {
    if (!this.openrouterApiKey) {
      throw new Error('OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable.');
    }

    return callOpenRouter({
      model,
      messages,
      temperature,
      maxTokens,
      apiKey: this.openrouterApiKey
    });
  }

  /**
   * Stream response from LLM
   */
  async stream({
    messages,
    provider = this.defaultProvider,
    model = this.defaultModel,
    temperature = 0.7,
    maxTokens = 2000
  }) {
    console.log(`[LLM Router] Streaming from ${provider}/${model}`);

    if (provider === PROVIDERS.GROQ) {
      if (!this.groqApiKey) {
        throw new Error('Groq API key not configured');
      }
      return streamGroq({ model, messages, temperature, maxTokens, apiKey: this.groqApiKey });
    } else if (provider === PROVIDERS.OPENROUTER) {
      if (!this.openrouterApiKey) {
        throw new Error('OpenRouter API key not configured');
      }
      return streamOpenRouter({ model, messages, temperature, maxTokens, apiKey: this.openrouterApiKey });
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    const models = [];

    if (this.groqApiKey) {
      Object.entries(GROQ_MODELS).forEach(([key, config]) => {
        models.push({
          id: key,
          provider: PROVIDERS.GROQ,
          name: config.name,
          contextWindow: config.contextWindow,
          cost: config.cost,
          quality: config.quality,
          useCase: config.useCase,
          available: true
        });
      });
    }

    if (this.openrouterApiKey) {
      Object.entries(OPENROUTER_MODELS).forEach(([key, config]) => {
        models.push({
          id: key,
          provider: PROVIDERS.OPENROUTER,
          name: config.name,
          contextWindow: config.contextWindow,
          cost: config.cost,
          quality: config.quality,
          useCase: config.useCase,
          available: true
        });
      });
    }

    return models;
  }

  /**
   * Get recommended model for a task
   */
  getRecommendedModel(taskType) {
    return TASK_ROUTING[taskType] || TASK_ROUTING.default;
  }
}

// Export singleton instance
export const llmRouter = new LLMRouter();

// Export task routing for reference
export { TASK_ROUTING };
