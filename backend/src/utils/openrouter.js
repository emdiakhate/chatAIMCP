/**
 * Helper pour l'API OpenRouter
 * Remplace l'utilisation directe de l'API Gemini
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-pro';

/**
 * Envoie un message à OpenRouter et récupère la réponse
 * @param {string} apiKey - Clé API OpenRouter
 * @param {Array} messages - Historique des messages au format OpenAI
 * @param {Object} options - Options supplémentaires (temperature, max_tokens, tools, etc.)
 * @returns {Promise<Object>} Réponse de l'API
 */
export async function chatCompletion(apiKey, messages, options = {}) {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    max_tokens = 4096,
    tools = null,
    tool_choice = null
  } = options;

  const body = {
    model,
    messages,
    temperature,
    max_tokens
  };

  // Ajouter les outils si fournis (pour function calling)
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (tool_choice) {
      body.tool_choice = tool_choice;
    }
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'ChatAI MCP'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Convertit l'historique de messages au format Gemini vers le format OpenAI
 * @param {Array} geminiHistory - Historique au format Gemini
 * @returns {Array} Historique au format OpenAI
 */
export function convertGeminiHistoryToOpenAI(geminiHistory) {
  return geminiHistory.map(msg => {
    if (msg.role === 'model') {
      return {
        role: 'assistant',
        content: msg.parts?.[0]?.text || msg.content || ''
      };
    }
    return {
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.parts?.[0]?.text || msg.content || ''
    };
  });
}

/**
 * Convertit les outils au format Gemini vers le format OpenAI
 * @param {Array} geminiTools - Outils au format Gemini
 * @returns {Array} Outils au format OpenAI
 */
export function convertGeminiToolsToOpenAI(geminiTools) {
  if (!geminiTools || geminiTools.length === 0) return null;

  // Gemini utilise functionDeclarations, OpenAI utilise tools
  const functionDeclarations = geminiTools[0]?.functionDeclarations || [];
  
  return functionDeclarations.map(func => ({
    type: 'function',
    function: {
      name: func.name,
      description: func.description || '',
      parameters: func.parameters || {}
    }
  }));
}

/**
 * Extrait la réponse textuelle de la réponse OpenRouter
 * @param {Object} openRouterResponse - Réponse de l'API OpenRouter
 * @returns {string} Texte de la réponse
 */
export function extractTextFromResponse(openRouterResponse) {
  const choice = openRouterResponse.choices?.[0];
  if (!choice) {
    throw new Error('No response from OpenRouter');
  }

  // Si c'est un tool call
  if (choice.message?.tool_calls) {
    return null; // Indique qu'il y a des tool calls
  }

  return choice.message?.content || '';
}

/**
 * Extrait les tool calls de la réponse OpenRouter
 * @param {Object} openRouterResponse - Réponse de l'API OpenRouter
 * @returns {Array} Liste des tool calls
 */
export function extractToolCallsFromResponse(openRouterResponse) {
  const choice = openRouterResponse.choices?.[0];
  if (!choice?.message?.tool_calls) {
    return [];
  }

  return choice.message.tool_calls.map(tc => ({
    id: tc.id,
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments || '{}')
  }));
}

/**
 * Prépare les messages pour un tool call response
 * @param {Array} toolCalls - Tool calls à répondre
 * @param {Array} toolResults - Résultats des tool calls (format: [{id, result}])
 * @returns {Array} Messages au format OpenAI pour la réponse
 */
export function prepareToolResponseMessages(toolCalls, toolResults) {
  const messages = [];

  // Ajouter le message assistant avec les tool calls
  messages.push({
    role: 'assistant',
    content: null,
    tool_calls: toolCalls.map(tc => ({
      id: tc.id,
      type: 'function',
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.args)
      }
    }))
  });

  // Ajouter les réponses des outils
  toolResults.forEach((result) => {
    messages.push({
      role: 'tool',
      tool_call_id: result.id,
      content: JSON.stringify(result.result)
    });
  });

  return messages;
}

