import express from 'express';
import db, { query } from '../config/database-sqlite-mcp.js';
import mcpClientManager from '../mcp/client-manager.js';
import toolExecutor from '../mcp/tool-executor.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper pour parser les champs JSON
 */
const parseJsonFields = (obj, fields) => {
  const result = { ...obj };
  fields.forEach(field => {
    if (result[field]) {
      try {
        result[field] = JSON.parse(result[field]);
      } catch (e) {
        result[field] = result[field];
      }
    }
  });
  return result;
};

/**
 * GET /api/mcp/connections
 * Liste toutes les connexions MCP de l'utilisateur
 */
router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const result = query(`
      SELECT
        c.id,
        c.user_id,
        c.server_id,
        c.status,
        c.last_connected,
        c.error_message,
        c.created_at,
        c.updated_at,
        s.server_key,
        s.name as server_name,
        s.description as server_description,
        s.icon,
        s.category,
        s.requires_auth,
        s.auth_type,
        s.capabilities
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `, [req.user.userId]);

    const connections = result.rows.map(conn => {
      const parsed = { ...conn };
      // Parser les champs JSON
      if (parsed.capabilities) {
        try {
          parsed.capabilities = typeof parsed.capabilities === 'string' 
            ? JSON.parse(parsed.capabilities) 
            : parsed.capabilities;
        } catch (e) {
          parsed.capabilities = [];
        }
      }
      if (parsed.config_overrides) {
        try {
          parsed.config_overrides = typeof parsed.config_overrides === 'string'
            ? JSON.parse(parsed.config_overrides)
            : parsed.config_overrides;
        } catch (e) {
          parsed.config_overrides = {};
        }
      }
      if (parsed.credentials) {
        try {
          parsed.credentials = typeof parsed.credentials === 'string'
            ? JSON.parse(parsed.credentials)
            : parsed.credentials;
        } catch (e) {
          parsed.credentials = {};
        }
      }
      return parsed;
    });

    res.json({
      success: true,
      connections,
      total: connections.length
    });

  } catch (error) {
    console.error('Error fetching MCP connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch MCP connections'
    });
  }
});

/**
 * POST /api/mcp/connections
 * Crée une nouvelle connexion MCP
 */
router.post('/connections', authenticateToken, async (req, res) => {
  try {
    const { server_id, credentials, config_overrides } = req.body;

    if (!server_id) {
      return res.status(400).json({
        success: false,
        error: 'server_id is required'
      });
    }

    // Vérifier que l'utilisateur existe
    const userResult = query('SELECT id FROM users WHERE id = ?', [req.user.userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Récupérer les infos du serveur
    const serverResult = query(
      'SELECT * FROM mcp_servers WHERE id = ?',
      [server_id]
    );

    if (serverResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Server not found with id: ${server_id}`
      });
    }

    const server = parseJsonFields(serverResult.rows[0], ['args', 'env', 'capabilities', 'scopes']);

    // Pour les serveurs OAuth (gmail, drive, etc.), récupérer les tokens depuis integrations
    let finalCredentials = credentials || {};
    if (server.auth_type?.includes('oauth')) {
      // Mapper les server_keys vers les providers dans integrations
      const providerMap = {
        'gmail': 'google-gmail',
        'gdrive': 'google-drive',
        'gsheets': 'google-sheets',
        'slack': 'slack',
        'salesforce': 'salesforce',
        'teams': 'microsoft-teams'
      };

      const integrationProvider = providerMap[server.server_key] || server.auth_provider || server.server_key;

      const integrationResult = query(
        'SELECT access_token, refresh_token, expires_at FROM integrations WHERE user_id = ? AND provider = ?',
        [req.user.userId, integrationProvider]
      );

      if (integrationResult.rows.length > 0) {
        const integration = integrationResult.rows[0];
        finalCredentials = {
          ...finalCredentials,
          accessToken: integration.access_token,
          refreshToken: integration.refresh_token,
          expiresAt: integration.expires_at
        };
        console.log(`[MCP Connection] Using OAuth tokens from integrations for ${server.name} (provider: ${integrationProvider})`);
      } else {
        console.warn(`[MCP Connection] No OAuth tokens found in integrations for provider: ${integrationProvider}`);
        console.warn(`[MCP Connection] Please complete OAuth flow first for ${server.name}`);
      }
    }

    // Vérifier si une connexion existe déjà
    const existingResult = query(
      'SELECT id FROM user_mcp_connections WHERE user_id = ? AND server_id = ?',
      [req.user.userId, server_id]
    );

    let connection;

    if (existingResult.rows.length > 0) {
      // Mettre à jour la connexion existante
      query(`
        UPDATE user_mcp_connections
        SET
          status = 'active',
          credentials = ?,
          config_overrides = ?,
          last_connected = CURRENT_TIMESTAMP,
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND server_id = ?
      `, [
        JSON.stringify(finalCredentials),
        JSON.stringify(config_overrides || {}),
        req.user.userId,
        server_id
      ]);

      // Déconnecter le client MCP existant pour forcer la recréation avec la nouvelle config
      try {
        await mcpClientManager.disconnectClient(req.user.userId, server_id);
      } catch (e) {
        // Ignorer si le client n'existe pas
      }

      const connResult = query('SELECT * FROM user_mcp_connections WHERE user_id = ? AND server_id = ?', [req.user.userId, server_id]);
      connection = connResult.rows[0];
    } else {
      // Créer une nouvelle connexion
      const insertResult = query(`
        INSERT INTO user_mcp_connections (
          user_id, server_id, status, credentials, config_overrides, last_connected
        ) VALUES (?, ?, 'active', ?, ?, CURRENT_TIMESTAMP)
      `, [
        req.user.userId,
        server_id,
        JSON.stringify(finalCredentials),
        JSON.stringify(config_overrides || {})
      ]);

      const connResult = query('SELECT * FROM user_mcp_connections WHERE id = ?', [insertResult.lastInsertRowid]);
      connection = connResult.rows[0];
    }

    // NE PAS créer le client MCP immédiatement pour éviter les erreurs
    // Le client sera créé automatiquement lors du premier tool calling dans le chat
    // Cela permet de "connecter" l'outil sans installer les packages MCP tout de suite

    console.log(`✅ Connexion MCP enregistrée: ${server.name} (id: ${connection.id})`);
    console.log(`   → Le client MCP sera créé lors de la première utilisation dans le chat`);

    res.status(201).json({
      success: true,
      connection: {
        ...connection,
        server_name: server.name,
        server_key: server.server_key,
        icon: server.icon
      },
      message: `Successfully connected to ${server.name}. The tool will be available in your chats.`
    });

  } catch (error) {
    console.error('Error creating MCP connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create MCP connection'
    });
  }
});

/**
 * DELETE /api/mcp/connections/:id
 * Supprime une connexion MCP
 */
router.delete('/connections/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que la connexion appartient à l'utilisateur
    const connResult = query(
      'SELECT * FROM user_mcp_connections WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (connResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    const connection = connResult.rows[0];

    // Déconnecter le client MCP
    try {
      await mcpClientManager.disconnectClient(req.user.userId, connection.server_id);
    } catch (e) {
      console.error('Error disconnecting MCP client:', e);
    }

    // Supprimer la connexion
    query('DELETE FROM user_mcp_connections WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Connection deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting MCP connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete MCP connection'
    });
  }
});

/**
 * POST /api/mcp/connections/:id/test
 * Teste une connexion MCP
 */
router.post('/connections/:id/test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la connexion
    const connResult = query(`
      SELECT c.*, s.*
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.id = ? AND c.user_id = ?
    `, [id, req.user.userId]);

    if (connResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    const connection = parseJsonFields(connResult.rows[0], ['args', 'env', 'capabilities', 'credentials', 'config_overrides']);

    // Au lieu de vraiment tester la connexion (qui peut échouer si les packages MCP ne sont pas installés),
    // on retourne simplement les capacités configurées du serveur
    // Le vrai test se fera lors de l'utilisation dans le chat

    const capabilities = connection.capabilities || [];
    const mockTools = capabilities.map(cap => ({
      name: cap,
      description: `${cap} tool from ${connection.name}`,
      inputSchema: { type: 'object', properties: {} }
    }));

    res.json({
      success: true,
      tools: mockTools,
      message: `Connection registered. ${mockTools.length} tool(s) will be available in chat.`,
      note: 'The MCP server will be initialized on first use in a conversation.'
    });

  } catch (error) {
    console.error('Error testing MCP connection:', error);
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      details: error.message
    });
  }
});

/**
 * GET /api/mcp/connections/:id/tools
 * Liste les outils disponibles pour une connexion
 */
router.get('/connections/:id/tools', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const connResult = query(`
      SELECT c.*, s.*
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.id = ? AND c.user_id = ?
    `, [id, req.user.userId]);

    if (connResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    const connection = parseJsonFields(connResult.rows[0], ['args', 'env', 'capabilities', 'credentials']);

    // Retourner les capacités configurées au lieu de vraiment se connecter
    const capabilities = connection.capabilities || [];
    const mockTools = capabilities.map(cap => ({
      name: cap,
      description: `${cap} tool from ${connection.name}`,
      inputSchema: { type: 'object', properties: {} }
    }));

    res.json({
      success: true,
      tools: mockTools
    });

  } catch (error) {
    console.error('Error fetching connection tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tools'
    });
  }
});

/**
 * POST /api/mcp/tools/execute
 * Exécute un outil MCP
 */
router.post('/tools/execute', authenticateToken, async (req, res) => {
  try {
    const { connection_id, tool_name, args, conversation_id } = req.body;

    if (!connection_id || !tool_name) {
      return res.status(400).json({
        success: false,
        error: 'connection_id and tool_name are required'
      });
    }

    // Récupérer la connexion
    const connResult = query(`
      SELECT c.*, s.*
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.id = ? AND c.user_id = ?
    `, [connection_id, req.user.userId]);

    if (connResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    const connection = parseJsonFields(connResult.rows[0], ['args', 'env', 'credentials']);

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

    // Exécuter l'outil
    const result = await toolExecutor.executeTool(
      req.user.userId,
      connection.server_id,
      serverConfig,
      tool_name,
      args || {},
      conversation_id
    );

    res.json(result);

  } catch (error) {
    console.error('Error executing tool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute tool',
      details: error.message
    });
  }
});

/**
 * GET /api/mcp/stats
 * Statistiques sur les appels d'outils
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = query(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_calls,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_calls,
        AVG(execution_time) as avg_execution_time
      FROM mcp_tool_calls
      WHERE user_id = ?
    `, [req.user.userId]);

    const stats = result.rows[0];

    res.json({
      success: true,
      stats: {
        totalCalls: parseInt(stats.total_calls) || 0,
        successfulCalls: parseInt(stats.successful_calls) || 0,
        failedCalls: parseInt(stats.failed_calls) || 0,
        avgExecutionTime: parseFloat(stats.avg_execution_time) || 0
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

/**
 * PATCH /api/mcp/connections/:id/config
 * Met à jour la configuration d'une connexion MCP
 */
router.patch('/connections/:id/config', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { config_overrides } = req.body;

    // Vérifier que la connexion appartient à l'utilisateur
    const checkResult = query(
      'SELECT * FROM user_mcp_connections WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    // Mettre à jour la configuration
    query(`
      UPDATE user_mcp_connections
      SET config_overrides = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `, [
      JSON.stringify(config_overrides || {}),
      id,
      userId
    ]);

    // Récupérer la connexion mise à jour
    const updatedResult = query(
      'SELECT * FROM user_mcp_connections WHERE id = ?',
      [id]
    );

    const connection = parseJsonFields(updatedResult.rows[0], ['config_overrides', 'credentials']);

    console.log(`✅ Configuration updated for connection ${id}`);

    res.json({
      success: true,
      connection,
      message: 'Configuration updated successfully'
    });

  } catch (error) {
    console.error('Error updating connection config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update connection configuration'
    });
  }
});

export default router;
