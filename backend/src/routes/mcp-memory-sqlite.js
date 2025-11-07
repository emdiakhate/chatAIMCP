import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import mcpClientManager from '../mcp/client-manager.js';
import db, { query } from '../config/database-sqlite-mcp.js';

const router = express.Router();

/**
 * GET /api/mcp/memory/list
 * Récupère tous les souvenirs de l'utilisateur via Memory MCP
 */
router.get('/memory/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Récupérer la connexion Memory MCP de l'utilisateur
    const connectionResult = query(`
      SELECT c.*, s.server_key, s.name as server_name
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.user_id = ? AND s.server_key = 'memory' AND c.status = 'active'
      LIMIT 1
    `, [userId]);

    if (connectionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Memory MCP not connected. Please connect it first.',
        memories: []
      });
    }

    const connection = connectionResult.rows[0];

    // Créer/récupérer le client MCP si nécessaire
    let client = mcpClientManager.getClient(userId, connection.server_id);

    if (!client) {
      // Récupérer les infos du serveur
      const serverResult = query('SELECT * FROM mcp_servers WHERE id = ?', [connection.server_id]);
      const server = serverResult.rows[0];

      if (!server) {
        return res.status(404).json({
          success: false,
          error: 'Memory MCP server not found'
        });
      }

      // Créer le client MCP
      const serverConfig = {
        transport_type: server.transport_type,
        command: server.command,
        args: server.args ? JSON.parse(server.args) : [],
        env: server.env ? JSON.parse(server.env) : {}
      };

      client = await mcpClientManager.createClient(userId, connection.server_id, serverConfig);
    }

    // Appeler l'outil "search_memories" du Memory MCP
    // Le Memory MCP n'a pas de "list all", on utilise search avec query vide
    const result = await mcpClientManager.executeTool(
      userId,
      connection.server_id,
      'search_memories',
      { query: '' } // Query vide pour tout récupérer
    );

    // Parser le résultat
    let memories = [];
    if (result.success && result.content && result.content.length > 0) {
      const content = result.content[0];
      if (content.type === 'text') {
        // Parser le texte retourné par Memory MCP
        // Format attendu: liste de souvenirs
        try {
          // Le Memory MCP retourne généralement du texte, on va le structurer
          const lines = content.text.split('\n').filter(line => line.trim());
          memories = lines.map((line, index) => ({
            id: `mem-${index}`,
            content: line,
            createdAt: new Date().toISOString(),
            tags: []
          }));
        } catch (e) {
          console.error('Error parsing memories:', e);
        }
      }
    }

    res.json({
      success: true,
      memories
    });

  } catch (error) {
    console.error('Error listing memories:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list memories'
    });
  }
});

/**
 * POST /api/mcp/memory/store
 * Stocke un nouveau souvenir via Memory MCP
 */
router.post('/memory/store', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { content, tags } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Memory content is required'
      });
    }

    // Récupérer la connexion Memory MCP
    const connectionResult = query(`
      SELECT c.*, s.server_key, s.name as server_name
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.user_id = ? AND s.server_key = 'memory' AND c.status = 'active'
      LIMIT 1
    `, [userId]);

    if (connectionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Memory MCP not connected. Please connect it first.'
      });
    }

    const connection = connectionResult.rows[0];

    // Créer/récupérer le client MCP
    let client = mcpClientManager.getClient(userId, connection.server_id);

    if (!client) {
      const serverResult = query('SELECT * FROM mcp_servers WHERE id = ?', [connection.server_id]);
      const server = serverResult.rows[0];

      const serverConfig = {
        transport_type: server.transport_type,
        command: server.command,
        args: server.args ? JSON.parse(server.args) : [],
        env: server.env ? JSON.parse(server.env) : {}
      };

      client = await mcpClientManager.createClient(userId, connection.server_id, serverConfig);
    }

    // Préparer le contenu avec tags si fournis
    let memoryContent = content;
    if (tags && tags.length > 0) {
      memoryContent = `[Tags: ${tags.join(', ')}] ${content}`;
    }

    // Appeler l'outil "store_memory" du Memory MCP
    const result = await mcpClientManager.executeTool(
      userId,
      connection.server_id,
      'store_memory',
      {
        content: memoryContent
      }
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to store memory'
      });
    }

    // Logger dans mcp_tool_calls
    query(`
      INSERT INTO mcp_tool_calls (
        user_id, server_id, tool_name, parameters, result, success, execution_time, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      userId,
      connection.server_id,
      'store_memory',
      JSON.stringify({ content: memoryContent }),
      JSON.stringify(result),
      result.success ? 1 : 0,
      result.executionTime || 0
    ]);

    res.json({
      success: true,
      memory: {
        id: `mem-${Date.now()}`,
        content,
        tags: tags || [],
        createdAt: new Date().toISOString()
      },
      message: 'Memory stored successfully'
    });

  } catch (error) {
    console.error('Error storing memory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to store memory'
    });
  }
});

/**
 * DELETE /api/mcp/memory/:id
 * Supprime un souvenir (Note: Memory MCP ne supporte pas la suppression individuelle)
 * On retourne juste success pour l'instant
 */
router.delete('/memory/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Note: Le Memory MCP standard ne supporte pas la suppression de souvenirs individuels
    // Il faudrait étendre le serveur MCP ou utiliser un serveur custom
    // Pour l'instant, on simule le succès

    console.log(`[Memory] Delete request for memory ${id} by user ${userId}`);
    console.log('⚠️  Memory MCP does not support individual deletion - operation simulated');

    res.json({
      success: true,
      message: 'Memory deletion simulated (not supported by standard Memory MCP)'
    });

  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete memory'
    });
  }
});

export default router;
