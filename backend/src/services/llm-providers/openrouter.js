/**
 * OpenRouter LLM Provider
 * Unified API for multiple LLM providers (OpenAI, Anthropic, Google, Meta, etc.)
 * Pricing: Variable by model, generally cheaper than direct APIs
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export const OPENROUTER_MODELS = {
  // Anthropic Claude
  'claude-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    cost: { input: 0.003, output: 0.015 }, // per 1K tokens
    quality: 'excellent',
    useCase: 'complex reasoning, code, analysis'
  },
  'claude-haiku': {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    cost: { input: 0.0008, output: 0.004 },
    quality: 'good',
    useCase: 'fast responses, simple tasks'
  },

  // Google Gemini
  'gemini-pro': {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    contextWindow: 2000000,
    cost: { input: 0.00125, output: 0.005 },
    quality: 'excellent',
    useCase: 'large context, multimodal'
  },
  'gemini-flash': {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini Flash 1.5',
    contextWindow: 1000000,
    cost: { input: 0.000075, output: 0.0003 },
    quality: 'good',
    useCase: 'fast, low cost'
  },

  // OpenAI GPT
  'gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    contextWindow: 128000,
    cost: { input: 0.0025, output: 0.01 },
    quality: 'excellent',
    useCase: 'general purpose, vision'
  },
  'gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    contextWindow: 128000,
    cost: { input: 0.00015, output: 0.0006 },
    quality: 'good',
    useCase: 'low cost, fast'
  },

  // Meta Llama (via OpenRouter)
  'llama-3.1-405b': {
    id: 'meta-llama/llama-3.1-405b-instruct',
    name: 'Llama 3.1 405B',
    contextWindow: 128000,
    cost: { input: 0.0027, output: 0.0027 },
    quality: 'excellent',
    useCase: 'open source, powerful'
  },
  'llama-3.1-70b': {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    contextWindow: 128000,
    cost: { input: 0.00052, output: 0.00075 },
    quality: 'excellent',
    useCase: 'balanced cost/quality'
  },

  // Mistral
  'mistral-large': {
    id: 'mistralai/mistral-large',
    name: 'Mistral Large',
    contextWindow: 128000,
    cost: { input: 0.002, output: 0.006 },
    quality: 'excellent',
    useCase: 'multilingual, reasoning'
  }
};

/**
 * Call OpenRouter API
 */
export async function callOpenRouter({
  model,
  messages,
  temperature = 0.7,
  maxTokens = 2000,
  apiKey,
  appName = 'ChatAI-MCP'
}) {
  if (!apiKey) {
    throw new Error('OpenRouter API key is required');
  }

  const modelConfig = OPENROUTER_MODELS[model] || OPENROUTER_MODELS['gemini-flash'];

  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/yourusername/chatai-mcp',
      'X-Title': appName,
    },
    body: JSON.stringify({
      model: modelConfig.id,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    cost: calculateCost(data.usage, modelConfig),
  };
}

/**
 * Stream response from OpenRouter
 */
export async function streamOpenRouter({
  model,
  messages,
  temperature = 0.7,
  maxTokens = 2000,
  apiKey,
  appName = 'ChatAI-MCP'
}) {
  if (!apiKey) {
    throw new Error('OpenRouter API key is required');
  }

  const modelConfig = OPENROUTER_MODELS[model] || OPENROUTER_MODELS['gemini-flash'];

  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/yourusername/chatai-mcp',
      'X-Title': appName,
    },
    body: JSON.stringify({
      model: modelConfig.id,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
  }

  return response.body;
}

/**
 * Calculate cost for a request
 */
function calculateCost(usage, modelConfig) {
  if (!usage) {
    return { input: 0, output: 0, total: 0, currency: 'USD' };
  }

  const inputCost = (usage.prompt_tokens / 1000) * modelConfig.cost.input;
  const outputCost = (usage.completion_tokens / 1000) * modelConfig.cost.output;

  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
    currency: 'USD',
  };
}
