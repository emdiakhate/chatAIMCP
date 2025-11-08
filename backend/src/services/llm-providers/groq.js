/**
 * Groq LLM Provider
 * Supports: Llama 3.1 70B, Llama 3.1 8B, Mixtral, Gemma
 * Pricing: Very low cost (~$0.59/M tokens for Llama 70B)
 * Speed: Ultra-fast inference
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1';

export const GROQ_MODELS = {
  'llama-3.1-70b': {
    id: 'llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B',
    contextWindow: 131072,
    cost: { input: 0.00059, output: 0.00079 }, // per 1K tokens
    speed: 'ultra-fast',
    quality: 'excellent',
    useCase: 'general, code, reasoning'
  },
  'llama-3.1-8b': {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    contextWindow: 131072,
    cost: { input: 0.00005, output: 0.00008 },
    speed: 'ultra-fast',
    quality: 'good',
    useCase: 'simple tasks, fast responses'
  },
  'mixtral-8x7b': {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    contextWindow: 32768,
    cost: { input: 0.00024, output: 0.00024 },
    speed: 'very-fast',
    quality: 'excellent',
    useCase: 'general, multilingual'
  },
  'gemma-7b': {
    id: 'gemma-7b-it',
    name: 'Gemma 7B',
    contextWindow: 8192,
    cost: { input: 0.00007, output: 0.00007 },
    speed: 'fast',
    quality: 'good',
    useCase: 'simple tasks, low cost'
  }
};

/**
 * Call Groq API
 */
export async function callGroq({ model, messages, temperature = 0.7, maxTokens = 2000, apiKey }) {
  if (!apiKey) {
    throw new Error('Groq API key is required');
  }

  const modelConfig = GROQ_MODELS[model] || GROQ_MODELS['llama-3.1-70b'];

  const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
    throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
    cost: calculateCost(data.usage, modelConfig),
  };
}

/**
 * Stream response from Groq
 */
export async function streamGroq({ model, messages, temperature = 0.7, maxTokens = 2000, apiKey }) {
  if (!apiKey) {
    throw new Error('Groq API key is required');
  }

  const modelConfig = GROQ_MODELS[model] || GROQ_MODELS['llama-3.1-70b'];

  const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
    throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
  }

  return response.body;
}

/**
 * Calculate cost for a request
 */
function calculateCost(usage, modelConfig) {
  const inputCost = (usage.prompt_tokens / 1000) * modelConfig.cost.input;
  const outputCost = (usage.completion_tokens / 1000) * modelConfig.cost.output;
  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
    currency: 'USD',
  };
}
