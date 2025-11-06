import express from 'express';
import { query, getClient } from '../config/database-pg.js';
import { authenticateToken } from '../middleware/auth.js';
import toolExecutor from '../mcp/tool-executor.js';
import mcpClientManager from '../mcp/client-manager.js';
import {
  chatCompletion,
  convertGeminiHistoryToOpenAI,
  convertGeminiToolsToOpenAI,
  extractTextFromResponse,
  extractToolCallsFromResponse,
  prepareToolResponseMessages
} from '../utils/openrouter.js';

const router = express.Router();

/**
 * POST /api/chat
 * Nouveau endpoint de chat avec support MCP complet
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID and message are required'
      });
    }

    // Vérifier que la conversation existe et appartient à l'utilisateur
    const conversationResult = await query(
      'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, req.user.userId]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Enregistrer le message utilisateur
    await query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [conversationId, 'user', message]
    );

    // Récupérer les connexions MCP actives de l'utilisateur
    const connectionsResult = await query(`
      SELECT
        c.*,
        s.*
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.user_id = $1 AND c.status = 'active'
    `, [req.user.userId]);

    const activeConnections = connectionsResult.rows;

    // Récupérer tous les outils disponibles
    let availableTools = [];
    const toolsMetadata = [];

    for (const connection of activeConnections) {
      try {
        const serverConfig = {
          id: connection.server_id,
          name: connection.name,
          transport_type: connection.transport_type,
          command: connection.command,
          args: connection.args || [],
          env: {
            ...(connection.env || {}),
            ...(connection.credentials || {})
          },
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

    // Vérifier la clé API OpenRouter
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Récupérer l'historique de la conversation
    const messagesResult = await query(
      'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
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

      // Appeler OpenRouter
      const result = await chatCompletion(
        process.env.OPENROUTER_API_KEY,
        messages,
        {
          model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-pro',
          temperature: 0.7,
          max_tokens: 4096,
          tools: availableTools.length > 0 ? availableTools : undefined,
          tool_choice: availableTools.length > 0 ? 'auto' : null
        }
      );

      // Vérifier s'il y a des tool calls
      const extractedToolCalls = extractToolCallsFromResponse(result);

      if (extractedToolCalls.length === 0) {
        // Pas de tool calls, récupérer la réponse textuelle
        finalResponse = extractTextFromResponse(result);
        break;
      }

      // Il y a des tool calls à exécuter
      console.log(`[Chat MCP] Itération ${iterations}: ${extractedToolCalls.length} outils appelés`);

      const toolResults = [];

      // Exécuter chaque outil appelé
      for (const toolCall of extractedToolCalls) {
        const toolMeta = toolsMetadata.find(t => t.compositeName === toolCall.name);

        if (!toolMeta) {
          console.error(`Outil inconnu: ${toolCall.name}`);
          toolResults.push({
            id: toolCall.id,
            result: { error: 'Tool not found' }
          });
          continue;
        }

        console.log(`[Chat MCP] Exécution: ${toolMeta.originalName} sur ${toolMeta.serverKey}`);

        // Exécuter l'outil via le tool executor
        const toolResult = await toolExecutor.executeTool(
          req.user.userId,
          toolMeta.serverId,
          toolMeta.serverConfig,
          toolMeta.originalName,
          toolCall.args || {},
          conversationId
        );

        // Logger dans la DB
        await query(`
          INSERT INTO mcp_tool_calls (
            user_id, conversation_id, server_id, tool_name,
            parameters, result, error_message, execution_time, success
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          req.user.userId,
          conversationId,
          toolMeta.serverId,
          toolMeta.originalName,
          JSON.stringify(toolCall.args || {}),
          toolResult.success ? JSON.stringify(toolResult.result) : null,
          toolResult.error || null,
          toolResult.executionTime,
          toolResult.success
        ]);

        toolCalls.push({
          tool: toolMeta.originalName,
          server: toolMeta.serverKey,
          success: toolResult.success,
          executionTime: toolResult.executionTime
        });

        toolResults.push({
          id: toolCall.id,
          result: toolResult.success ? toolResult.result : { error: toolResult.error }
        });
      }

      // Préparer les messages pour la réponse avec les résultats des outils
      const toolResponseMessages = prepareToolResponseMessages(extractedToolCalls, toolResults);
      messages = [...messages, ...toolResponseMessages];
    }

    if (!finalResponse && iterations >= MAX_ITERATIONS) {
      finalResponse = 'Maximum iterations reached. Please try again.';
    }

    // Enregistrer la réponse de l'assistant
    await query(
      'INSERT INTO messages (conversation_id, role, content, sources) VALUES ($1, $2, $3, $4)',
      [conversationId, 'assistant', finalResponse, toolCalls.length > 0 ? JSON.stringify(toolCalls) : null]
    );

    // Mettre à jour la conversation
    await query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    // Récupérer tous les messages mis à jour
    const updatedMessagesResult = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );

    res.json({
      success: true,
      messages: updatedMessagesResult.rows,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      toolCallCount: toolCalls.length
    });

  } catch (error) {
    console.error('[Chat MCP] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message'
    });
  }
});

/**
 * GET /api/chat/available-tools
 * Liste tous les outils disponibles pour l'utilisateur dans le contexte du chat
 */
router.get('/chat/available-tools', authenticateToken, async (req, res) => {
  try {
    const connectionsResult = await query(`
      SELECT
        c.id as connection_id,
        c.server_id,
        s.server_key,
        s.name as server_name,
        s.icon,
        s.category
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.user_id = $1 AND c.status = 'active'
      ORDER BY s.category, s.name
    `, [req.user.userId]);

    const connections = connectionsResult.rows;
    const toolsByServer = [];

    for (const connection of connections) {
      try {
        const serverResult = await query(
          'SELECT * FROM mcp_servers WHERE id = $1',
          [connection.server_id]
        );

        const server = serverResult.rows[0];

        const serverConfig = {
          id: server.id,
          name: server.name,
          transport_type: server.transport_type,
          command: server.command,
          args: server.args || [],
          env: server.env || {},
          url: server.url
        };

        const tools = await mcpClientManager.listTools(
          req.user.userId,
          connection.server_id,
          serverConfig
        );

        toolsByServer.push({
          connectionId: connection.connection_id,
          serverId: connection.server_id,
          serverKey: connection.server_key,
          serverName: connection.server_name,
          icon: connection.icon,
          category: connection.category,
          tools: tools.map(t => ({
            name: t.name,
            description: t.description
          }))
        });

      } catch (error) {
        console.error(`Erreur pour le serveur ${connection.server_name}:`, error);
      }
    }

    res.json({
      success: true,
      toolsByServer,
      totalServers: toolsByServer.length,
      totalTools: toolsByServer.reduce((sum, server) => sum + server.tools.length, 0)
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
