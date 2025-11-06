import express from 'express';
import { query, getClient } from '../config/database-pg.js';
import mcpClientManager from '../mcp/client-manager.js';
import toolExecutor from '../mcp/tool-executor.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/mcp/connections
 * Liste toutes les connexions MCP de l'utilisateur
 */
router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
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
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `, [req.user.userId]);

    const connections = result.rows.map(conn => ({
      ...conn,
      capabilities: conn.capabilities || []
    }));

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
  const client = await getClient();

  try {
    const { server_id, credentials, config_overrides } = req.body;

    if (!server_id) {
      return res.status(400).json({
        success: false,
        error: 'server_id is required'
      });
    }

    await client.query('BEGIN');

    // Récupérer les infos du serveur
    const serverResult = await client.query(
      'SELECT * FROM mcp_servers WHERE id = $1',
      [server_id]
    );

    if (serverResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    const server = serverResult.rows[0];

    // Vérifier si une connexion existe déjà
    const existingResult = await client.query(
      'SELECT id FROM user_mcp_connections WHERE user_id = $1 AND server_id = $2',
      [req.user.userId, server_id]
    );

    let connection;

    if (existingResult.rows.length > 0) {
      // Mettre à jour la connexion existante
      const updateResult = await client.query(`
        UPDATE user_mcp_connections
        SET
          status = 'active',
          credentials = $1,
          config_overrides = $2,
          last_connected = CURRENT_TIMESTAMP,
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3 AND server_id = $4
        RETURNING *
      `, [
        JSON.stringify(credentials || {}),
        JSON.stringify(config_overrides || {}),
        req.user.userId,
        server_id
      ]);

      connection = updateResult.rows[0];
    } else {
      // Créer une nouvelle connexion
      const insertResult = await client.query(`
        INSERT INTO user_mcp_connections (
          user_id, server_id, status, credentials, config_overrides, last_connected
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        req.user.userId,
        server_id,
        'active',
        JSON.stringify(credentials || {}),
        JSON.stringify(config_overrides || {})
      ]);

      connection = insertResult.rows[0];
    }

    await client.query('COMMIT');

    // Préparer la config pour le client MCP
    const serverConfig = {
      id: server.id,
      name: server.name,
      transport_type: server.transport_type,
      command: server.command,
      args: server.args || [],
      env: {
        ...(server.env || {}),
        ...(credentials || {})
      },
      url: server.url
    };

    // Tester la connexion
    try {
      await mcpClientManager.createClient(
        req.user.userId,
        server_id,
        serverConfig
      );

      // Mettre à jour le statut de connexion
      await query(
        'UPDATE user_mcp_connections SET status = $1, last_connected = CURRENT_TIMESTAMP WHERE id = $2',
        ['active', connection.id]
      );

    } catch (connError) {
      console.error('Error connecting to MCP server:', connError);

      await query(
        'UPDATE user_mcp_connections SET status = $1, error_message = $2 WHERE id = $3',
        ['error', connError.message, connection.id]
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to connect to MCP server',
        details: connError.message
      });
    }

    res.status(201).json({
      success: true,
      connection: {
        ...connection,
        server_name: server.name,
        server_key: server.server_key,
        icon: server.icon
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating MCP connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create MCP connection'
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/mcp/connections/:id
 * Supprime une connexion MCP
 */
router.delete('/connections/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer les infos de la connexion
    const connectionResult = await query(
      'SELECT * FROM user_mcp_connections WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (connectionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    const connection = connectionResult.rows[0];

    // Déconnecter le client MCP
    await mcpClientManager.disconnectClient(req.user.userId, connection.server_id);

    // Supprimer la connexion de la DB
    await query(
      'DELETE FROM user_mcp_connections WHERE id = $1',
      [id]
    );

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
    const result = await query(`
      SELECT
        c.*,
        s.*
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.id = $1 AND c.user_id = $2
    `, [id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    const connection = result.rows[0];

    // Préparer la config
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

    // Tester la connexion
    const tools = await mcpClientManager.listTools(
      req.user.userId,
      connection.server_id,
      serverConfig
    );

    // Mettre à jour le statut
    await query(
      'UPDATE user_mcp_connections SET status = $1, last_connected = CURRENT_TIMESTAMP, error_message = NULL WHERE id = $2',
      ['active', id]
    );

    res.json({
      success: true,
      message: 'Connection test successful',
      tools: tools.map(t => ({
        name: t.name,
        description: t.description
      }))
    });

  } catch (error) {
    console.error('Error testing MCP connection:', error);

    // Mettre à jour le statut d'erreur
    await query(
      'UPDATE user_mcp_connections SET status = $1, error_message = $2 WHERE id = $3',
      ['error', error.message, req.params.id]
    );

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

    // Récupérer la connexion
    const result = await query(`
      SELECT
        c.*,
        s.*
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.id = $1 AND c.user_id = $2
    `, [id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    const connection = result.rows[0];

    // Préparer la config
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

    // Récupérer les outils
    const tools = await mcpClientManager.listTools(
      req.user.userId,
      connection.server_id,
      serverConfig
    );

    res.json({
      success: true,
      tools
    });

  } catch (error) {
    console.error('Error fetching tools:', error);
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
    const { connection_id, tool_name, arguments: args, conversation_id } = req.body;

    if (!connection_id || !tool_name) {
      return res.status(400).json({
        success: false,
        error: 'connection_id and tool_name are required'
      });
    }

    // Récupérer la connexion
    const result = await query(`
      SELECT
        c.*,
        s.*
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.id = $1 AND c.user_id = $2 AND c.status = 'active'
    `, [connection_id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Active connection not found'
      });
    }

    const connection = result.rows[0];

    // Préparer la config
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
    const result_exec = await toolExecutor.executeTool(
      req.user.userId,
      connection.server_id,
      serverConfig,
      tool_name,
      args || {},
      conversation_id
    );

    // Logger dans la DB
    await query(`
      INSERT INTO mcp_tool_calls (
        user_id, conversation_id, server_id, tool_name,
        parameters, result, error_message, execution_time, success
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      req.user.userId,
      conversation_id || null,
      connection.server_id,
      tool_name,
      JSON.stringify(args || {}),
      result_exec.success ? JSON.stringify(result_exec.result) : null,
      result_exec.error || null,
      result_exec.executionTime,
      result_exec.success
    ]);

    res.json(result_exec);

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
 * Récupère les statistiques d'utilisation MCP de l'utilisateur
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Stats des tool calls
    const toolStatsResult = await query(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_calls,
        AVG(execution_time) as avg_execution_time,
        MAX(created_at) as last_call
      FROM mcp_tool_calls
      WHERE user_id = $1
    `, [req.user.userId]);

    // Top outils utilisés
    const topToolsResult = await query(`
      SELECT
        tool_name,
        COUNT(*) as count,
        AVG(execution_time) as avg_time
      FROM mcp_tool_calls
      WHERE user_id = $1 AND success = true
      GROUP BY tool_name
      ORDER BY count DESC
      LIMIT 10
    `, [req.user.userId]);

    // Stats par serveur
    const serverStatsResult = await query(`
      SELECT
        s.name,
        s.icon,
        COUNT(tc.id) as call_count,
        SUM(CASE WHEN tc.success = true THEN 1 ELSE 0 END) as successful_calls
      FROM mcp_servers s
      JOIN user_mcp_connections c ON s.id = c.server_id
      LEFT JOIN mcp_tool_calls tc ON s.id = tc.server_id AND tc.user_id = $1
      WHERE c.user_id = $1
      GROUP BY s.id, s.name, s.icon
      ORDER BY call_count DESC
    `, [req.user.userId]);

    const stats = toolStatsResult.rows[0];

    res.json({
      success: true,
      stats: {
        totalCalls: parseInt(stats.total_calls) || 0,
        successfulCalls: parseInt(stats.successful_calls) || 0,
        successRate: stats.total_calls > 0
          ? ((stats.successful_calls / stats.total_calls) * 100).toFixed(2) + '%'
          : '0%',
        avgExecutionTime: stats.avg_execution_time ? Math.round(stats.avg_execution_time) : 0,
        lastCall: stats.last_call
      },
      topTools: topToolsResult.rows.map(row => ({
        name: row.tool_name,
        count: parseInt(row.count),
        avgTime: Math.round(row.avg_time)
      })),
      serverStats: serverStatsResult.rows.map(row => ({
        name: row.name,
        icon: row.icon,
        callCount: parseInt(row.call_count) || 0,
        successfulCalls: parseInt(row.successful_calls) || 0
      }))
    });

  } catch (error) {
    console.error('Error fetching MCP stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch MCP stats'
    });
  }
});

export default router;
