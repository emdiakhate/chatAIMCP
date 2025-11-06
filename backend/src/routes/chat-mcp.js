import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query, getClient } from '../config/database-pg.js';
import { authenticateToken } from '../middleware/auth.js';
import toolExecutor from '../mcp/tool-executor.js';
import mcpClientManager from '../mcp/client-manager.js';

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

        // Formater les outils pour Gemini
        const formattedTools = tools.map(tool => ({
          name: `${connection.server_key}__${tool.name}`,
          description: `[${connection.name}] ${tool.description}`,
          parameters: tool.inputSchema || {}
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

    // Initialiser Gemini
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      tools: availableTools.length > 0 ? [{
        functionDeclarations: availableTools
      }] : undefined
    });

    // Récupérer l'historique de la conversation
    const messagesResult = await query(
      'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );

    const chatHistory = messagesResult.rows
      .slice(0, -1) // Exclure le dernier message (déjà ajouté)
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

    // Démarrer le chat
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
      }
    });

    // Envoyer le message et gérer les appels d'outils
    let result = await chat.sendMessage(message);
    let response = result.response;
    let toolCalls = [];
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    // Boucle de tool calling
    while (response.functionCalls && iterations < MAX_ITERATIONS) {
      iterations++;
      console.log(`[Chat MCP] Itération ${iterations}: ${response.functionCalls.length} outils appelés`);

      const functionCalls = response.functionCalls;
      const functionResponses = [];

      // Exécuter chaque outil appelé
      for (const functionCall of functionCalls) {
        const toolMeta = toolsMetadata.find(t => t.compositeName === functionCall.name);

        if (!toolMeta) {
          console.error(`Outil inconnu: ${functionCall.name}`);
          functionResponses.push({
            name: functionCall.name,
            response: {
              error: 'Tool not found'
            }
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
          functionCall.args || {},
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
          JSON.stringify(functionCall.args || {}),
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

        // Préparer la réponse pour Gemini
        functionResponses.push({
          name: functionCall.name,
          response: toolResult.success ? toolResult.result : {
            error: toolResult.error
          }
        });
      }

      // Continuer la conversation avec les résultats des outils
      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    // Obtenir la réponse finale
    const finalResponse = response.text();

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
