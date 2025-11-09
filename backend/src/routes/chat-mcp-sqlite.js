import express from 'express';
import db, { query } from '../config/database-sqlite-mcp.js';
import { authenticateToken } from '../middleware/auth.js';
import toolExecutor from '../mcp/tool-executor.js';
import mcpClientManager from '../mcp/client-manager.js';
import { getApiKey } from './auth-apikey.js';
import {
  chatCompletion,
  convertGeminiHistoryToOpenAI,
  extractTextFromResponse,
  extractToolCallsFromResponse,
  prepareToolResponseMessages
} from '../utils/openrouter.js';
import { llmRouter, PROVIDERS } from '../services/llm-router.js';

const router = express.Router();

/**
 * Helper pour parser JSON
 */
const parseJson = (str) => {
  try {
    return str ? JSON.parse(str) : null;
  } catch (e) {
    return null;
  }
};

/**
 * POST /api/chat
 * Endpoint de chat avec support MCP complet
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { conversationId, message, provider, model } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID and message are required'
      });
    }

    // Vérifier que la conversation existe et appartient à l'utilisateur
    const conversationResult = query(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
      [conversationId, req.user.userId]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Enregistrer le message utilisateur
    query(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [conversationId, 'user', message]
    );

    // Récupérer les connexions MCP actives de l'utilisateur
    const connectionsResult = query(`
      SELECT
        c.*,
        s.*
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.user_id = ? AND c.status = 'active'
    `, [req.user.userId]);

    const activeConnections = connectionsResult.rows;

    // Récupérer tous les outils disponibles
    let availableTools = [];
    const toolsMetadata = [];

    for (const connection of activeConnections) {
      try {
        // Parser les config_overrides pour appliquer les modifications
        const configOverrides = parseJson(connection.config_overrides) || {};
        
        // Construire la configuration du serveur avec les overrides
        let serverArgs = parseJson(connection.args) || [];
        
        // Si c'est le serveur filesystem et qu'un chemin est spécifié dans config_overrides
        if (connection.server_key === 'filesystem' && configOverrides.allowedPath) {
          // Gérer plusieurs chemins (array) ou un seul chemin (string)
          const paths = Array.isArray(configOverrides.allowedPath)
            ? configOverrides.allowedPath
            : [configOverrides.allowedPath];
          // Le serveur filesystem accepte plusieurs chemins comme arguments séparés
          serverArgs = ['-y', '@modelcontextprotocol/server-filesystem', ...paths];
        }

        // Build environment variables
        const envVars = {
          ...(parseJson(connection.env) || {}),
          ...(parseJson(connection.credentials) || {}),
          // Ajouter FILESYSTEM_ALLOWED_PATHS si spécifié
          ...(configOverrides.allowedPath
            ? {
                FILESYSTEM_ALLOWED_PATHS: Array.isArray(configOverrides.allowedPath)
                  ? configOverrides.allowedPath.join(',')
                  : configOverrides.allowedPath
              }
            : {})
        };

        // Inject API keys for API key-based servers
        const apiKeyServers = {
          'anthropic': 'ANTHROPIC_API_KEY',
          'openai': 'OPENAI_API_KEY',
          'hubspot': 'HUBSPOT_API_KEY',
          'airtable': 'AIRTABLE_API_KEY',
          'linear': 'LINEAR_API_KEY',
        };

        if (apiKeyServers[connection.server_key]) {
          const apiKey = getApiKey(req.user.userId, connection.server_key);
          if (apiKey) {
            envVars[apiKeyServers[connection.server_key]] = apiKey;
            console.log(`[Chat MCP] API key injected for ${connection.server_key}`);
          } else {
            console.warn(`[Chat MCP] No API key found for ${connection.server_key}, server may fail`);
          }
        }

        const serverConfig = {
          id: connection.server_id,
          name: connection.name,
          transport_type: connection.transport_type,
          command: connection.command,
          args: serverArgs,
          env: envVars,
          url: connection.url
        };

        const tools = await mcpClientManager.listTools(
          req.user.userId,
          connection.server_id,
          serverConfig
        );

        // Formater les outils pour OpenAI/OpenRouter
        const formattedTools = tools.map(tool => ({
          type: 'function',
          function: {
            name: `${connection.server_key}__${tool.name}`,
            description: `[${connection.name}] ${tool.description}`,
            parameters: tool.inputSchema || {}
          }
        }));

        availableTools.push(...formattedTools);

        // Garder les métadonnées pour l'exécution
        tools.forEach(tool => {
          toolsMetadata.push({
            compositeName: `${connection.server_key}__${tool.name}`,
            originalName: tool.name,
            serverId: connection.server_id,
            serverKey: connection.server_key,
            serverConfig
          });
        });

      } catch (error) {
        console.error(`Erreur lors de la récupération des outils pour ${connection.name}:`, error);
      }
    }

    // Récupérer les préférences LLM de l'utilisateur
    const userResult = query('SELECT llm_provider, llm_model, llm_settings FROM users WHERE id = ?', [req.user.userId]);
    const userPrefs = userResult.rows[0] || {};
    // Utiliser provider/model du body si fournis, sinon les préférences utilisateur, sinon les valeurs par défaut
    const llmProvider = provider || userPrefs.llm_provider || llmRouter.defaultProvider;
    const llmModel = model || userPrefs.llm_model || llmRouter.defaultModel;
    const llmSettings = userPrefs.llm_settings ? JSON.parse(userPrefs.llm_settings) : {};

    console.log(`[Chat MCP] Using LLM: ${llmProvider}/${llmModel}`);

    // Fallback to OpenRouter if needed (for compatibility)
    const useOpenRouter = !llmRouter.groqApiKey && !llmRouter.openrouterApiKey;

    // Récupérer l'historique de la conversation
    const messagesResult = query(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );

    // System prompt pour guider le modèle
    const systemPrompt = {
      role: 'system',
      content: `You are an intelligent AI assistant with access to powerful tools via the Model Context Protocol (MCP).

Available tools: ${availableTools.length > 0 ? availableTools.map(t => t.function.name).join(', ') : 'none'}

Guidelines:
- ACTIVELY use the available tools when they can help answer the user's question
- Always prefer using tools over making assumptions
- For filesystem operations, use the filesystem tools
- For email-related queries, use the gmail tools
- For document storage, use the gdrive tools
- For code-related tasks, use the github tools
- Explain what you're doing when using tools
- If a tool call fails, explain the error clearly and suggest alternatives
- Provide clear, concise, and helpful responses
- When multiple tools are needed, call them in sequence to build up information

Remember: You are empowered to take action using these tools. Don't just describe what could be done - actually use the tools to accomplish tasks for the user.`
    };

    // Convertir l'historique au format OpenAI (exclure le dernier message déjà ajouté)
    const chatHistory = convertGeminiHistoryToOpenAI(
      messagesResult.rows
        .slice(0, -1)
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
    );

    // Ajouter le system prompt et le nouveau message
    let messages = [
      systemPrompt,
      ...chatHistory,
      {
        role: 'user',
        content: message
      }
    ];

    let toolCalls = [];
    let iterations = 0;
    const MAX_ITERATIONS = 5;
    let finalResponse = '';

    // Boucle de tool calling
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      console.log(`[Chat MCP] Itération ${iterations}`);

      // Appeler LLM (OpenRouter ou custom provider)
      let result;

      if (useOpenRouter) {
        // Fallback to OpenRouter (legacy)
        if (!process.env.OPENROUTER_API_KEY) {
          throw new Error('No LLM provider configured. Please set GROQ_API_KEY or OPENROUTER_API_KEY');
        }
        result = await chatCompletion(
        process.env.OPENROUTER_API_KEY,
        messages,
        {
          model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-pro',
            temperature: llmSettings.temperature || 0.7,
            max_tokens: llmSettings.maxTokens || 4096,
          tools: availableTools.length > 0 ? availableTools : undefined,
          tool_choice: availableTools.length > 0 ? 'auto' : undefined
        }
      );
      } else {
        // Use LLM Router for consistent handling and cost tracking
        result = await llmRouter.call({
          messages,
          provider: llmProvider,
          model: llmModel,
          temperature: llmSettings.temperature || 0.7,
          maxTokens: llmSettings.maxTokens || 4096,
          enableFallback: llmSettings.enableFallback !== false
        });

        // Convert result to the expected format
        if (!result.choices) {
          result = {
            choices: [{
              message: {
                role: 'assistant',
                content: result.content
              }
            }],
            usage: result.usage,
            _llmRouter: { // Store LLM Router metadata
              provider: result.provider,
              model: result.model,
              usage: result.usage,
              cost: result.cost
            }
          };
        }
      }

      // Vérifier s'il y a des tool calls
      const extractedToolCalls = extractToolCallsFromResponse(result);

      if (!extractedToolCalls || extractedToolCalls.length === 0) {
        // Pas de tool calls, extraire la réponse finale
        finalResponse = extractTextFromResponse(result);
        console.log('[Chat MCP] Réponse finale (sans outils)');
        break;
      }

      console.log(`[Chat MCP] ${extractedToolCalls.length} outil(s) à appeler`);

      // Ajouter le message de l'assistant avec tool calls
      const assistantMessage = result.choices[0].message;
      messages.push(assistantMessage);

      // Exécuter les tool calls
      const toolResults = [];

      for (const toolCall of extractedToolCalls) {
        const toolMeta = toolsMetadata.find(t => t.compositeName === toolCall.name);

        if (!toolMeta) {
          console.error(`[Chat MCP] Outil non trouvé: ${toolCall.name}`);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({
              error: 'Tool not found'
            })
          });
          continue;
        }

        console.log(`[Chat MCP] Exécution: ${toolCall.name}`);

        try {
          const execResult = await toolExecutor.executeTool(
            req.user.userId,
            toolMeta.serverId,
            toolMeta.serverConfig,
            toolMeta.originalName,
            toolCall.args,
            conversationId
          );

          const toolCallData = {
            tool: toolMeta.originalName,
            server: toolMeta.serverKey,
            args: toolCall.args,
            result: execResult.result,
            success: execResult.success,
            executionTime: execResult.executionTime
          };

          // Ajouter fileData si présent (pour les read_file)
          if (execResult.fileData) {
            toolCallData.fileData = execResult.fileData;
            console.log(`[Chat MCP] Fichier détecté: ${execResult.fileData.fileName}`);
          }

          toolCalls.push(toolCallData);

          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(execResult.result)
          });

        } catch (error) {
          console.error(`[Chat MCP] Erreur d'exécution:`, error);

          toolCalls.push({
            tool: toolMeta.originalName,
            server: toolMeta.serverKey,
            args: toolCall.args,
            error: error.message,
            success: false
          });

          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({
              error: error.message
            })
          });
        }
      }

      // Ajouter les résultats des outils aux messages
      messages.push(...toolResults);
    }

    // Si on a atteint la limite d'itérations, faire un dernier appel pour la réponse
    if (iterations >= MAX_ITERATIONS && !finalResponse) {
      console.log('[Chat MCP] Limite d\'itérations atteinte, appel final');

      const finalResult = await chatCompletion(
        process.env.OPENROUTER_API_KEY,
        messages,
        {
          model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-pro',
          temperature: 0.7,
          max_tokens: 4096
        }
      );

      finalResponse = extractTextFromResponse(finalResult);
    }

    // Enregistrer la réponse de l'assistant
    const messageResult = query(
      'INSERT INTO messages (conversation_id, role, content, sources) VALUES (?, ?, ?, ?)',
      [
        conversationId,
        'assistant',
        finalResponse,
        toolCalls.length > 0 ? JSON.stringify(toolCalls) : null
      ]
    );

    const messageId = messageResult.lastInsertRowid;

    // Track LLM usage statistics if available
    if (result._llmRouter) {
      try {
        const llmData = result._llmRouter;
        query(`
          INSERT INTO llm_usage_stats (
            user_id, conversation_id, message_id, provider, model,
            input_tokens, output_tokens, total_tokens,
            input_cost, output_cost, total_cost, currency
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          req.user.userId,
          conversationId,
          messageId,
          llmData.provider,
          llmData.model,
          llmData.usage.inputTokens || 0,
          llmData.usage.outputTokens || 0,
          llmData.usage.totalTokens || 0,
          llmData.cost.input || 0,
          llmData.cost.output || 0,
          llmData.cost.total || 0,
          llmData.cost.currency || 'USD'
        ]);
        console.log(`[Chat MCP] Tracked usage: ${llmData.usage.totalTokens} tokens, $${llmData.cost.total.toFixed(6)}`);
      } catch (trackingError) {
        console.error('[Chat MCP] Failed to track LLM usage:', trackingError);
        // Don't fail the request if tracking fails
      }
    }

    // Mettre à jour le timestamp de la conversation
    query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );

    // Récupérer tous les messages mis à jour pour la compatibilité avec le frontend
    const updatedMessagesResult = query(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );

    // Formater les messages pour le frontend
    const formattedMessages = updatedMessagesResult.rows.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      sources: parseJson(msg.sources),
      created_at: msg.created_at
    }));

    res.json({
      messages: formattedMessages,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    });

  } catch (error) {
    console.error('❌ Erreur dans /api/chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat',
      details: error.message
    });
  }
});

/**
 * GET /api/chat/available-tools
 * Liste tous les outils disponibles pour l'utilisateur
 */
router.get('/chat/available-tools', authenticateToken, async (req, res) => {
  try {
    const connectionsResult = query(`
      SELECT
        c.*,
        s.*
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.user_id = ? AND c.status = 'active'
    `, [req.user.userId]);

    const activeConnections = connectionsResult.rows;
    const allTools = [];

    for (const connection of activeConnections) {
      try {
        // Parser les config_overrides pour appliquer les modifications
        const configOverrides = parseJson(connection.config_overrides) || {};
        
        // Construire la configuration du serveur avec les overrides
        let serverArgs = parseJson(connection.args) || [];
        
        // Si c'est le serveur filesystem et qu'un chemin est spécifié dans config_overrides
        if (connection.server_key === 'filesystem' && configOverrides.allowedPath) {
          // Gérer plusieurs chemins (array) ou un seul chemin (string)
          const paths = Array.isArray(configOverrides.allowedPath)
            ? configOverrides.allowedPath
            : [configOverrides.allowedPath];
          // Le serveur filesystem accepte plusieurs chemins comme arguments séparés
          serverArgs = ['-y', '@modelcontextprotocol/server-filesystem', ...paths];
        }

        // Build environment variables
        const envVars = {
          ...(parseJson(connection.env) || {}),
          ...(parseJson(connection.credentials) || {}),
          // Ajouter FILESYSTEM_ALLOWED_PATHS si spécifié
          ...(configOverrides.allowedPath
            ? {
                FILESYSTEM_ALLOWED_PATHS: Array.isArray(configOverrides.allowedPath)
                  ? configOverrides.allowedPath.join(',')
                  : configOverrides.allowedPath
              }
            : {})
        };

        // Inject API keys for API key-based servers
        const apiKeyServers = {
          'anthropic': 'ANTHROPIC_API_KEY',
          'openai': 'OPENAI_API_KEY',
          'hubspot': 'HUBSPOT_API_KEY',
          'airtable': 'AIRTABLE_API_KEY',
          'linear': 'LINEAR_API_KEY',
        };

        if (apiKeyServers[connection.server_key]) {
          const apiKey = getApiKey(req.user.userId, connection.server_key);
          if (apiKey) {
            envVars[apiKeyServers[connection.server_key]] = apiKey;
            console.log(`[Chat MCP] API key injected for ${connection.server_key}`);
          } else {
            console.warn(`[Chat MCP] No API key found for ${connection.server_key}, server may fail`);
          }
        }

        const serverConfig = {
          id: connection.server_id,
          name: connection.name,
          transport_type: connection.transport_type,
          command: connection.command,
          args: serverArgs,
          env: envVars,
          url: connection.url
        };

        const tools = await mcpClientManager.listTools(
          req.user.userId,
          connection.server_id,
          serverConfig
        );

        allTools.push({
          server: {
            id: connection.server_id,
            key: connection.server_key,
            name: connection.name,
            icon: connection.icon
          },
          tools
        });

      } catch (error) {
        console.error(`Error fetching tools for ${connection.name}:`, error);
      }
    }

    res.json({
      success: true,
      servers: allTools
    });

  } catch (error) {
    console.error('Error fetching available tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available tools'
    });
  }
});

export default router;
