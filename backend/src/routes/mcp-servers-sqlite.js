import express from 'express';
import db, { query } from '../config/database-sqlite-mcp.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper pour parser les champs JSON
 */
const parseJsonFields = (server) => {
  try {
    return {
      ...server,
      capabilities: server.capabilities ? JSON.parse(server.capabilities) : [],
      args: server.args ? JSON.parse(server.args) : [],
      env: server.env ? JSON.parse(server.env) : {},
      scopes: server.scopes ? JSON.parse(server.scopes) : [],
      is_public: Boolean(server.is_public),
      requires_auth: Boolean(server.requires_auth),
      is_custom: Boolean(server.is_custom)
    };
  } catch (e) {
    console.error('Error parsing JSON fields:', e);
    return {
      ...server,
      capabilities: [],
      args: [],
      env: {},
      scopes: []
    };
  }
};

/**
 * GET /api/mcp/servers
 * Liste tous les serveurs MCP disponibles
 */
router.get('/servers', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;

    let queryText = `
      SELECT
        id, server_key, name, description, transport_type,
        icon, category, status, is_public, requires_auth, auth_type,
        auth_provider, capabilities, setup_instructions, is_custom, args, env, scopes
      FROM mcp_servers
      WHERE is_public = 1 OR created_by = ?
    `;
    const params = [req.user.userId];

    if (category) {
      queryText += ` AND category = ?`;
      params.push(category);
    }

    if (search) {
      queryText += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    queryText += ' ORDER BY category, name';

    const result = query(queryText, params);

    // Parser les champs JSON
    const servers = result.rows.map(parseJsonFields);

    res.json({
      success: true,
      servers,
      total: servers.length
    });

  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch MCP servers'
    });
  }
});

/**
 * GET /api/mcp/servers/:id
 * Récupère les détails d'un serveur MCP spécifique
 */
router.get('/servers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = query(`
      SELECT *
      FROM mcp_servers
      WHERE id = ? AND (is_public = 1 OR created_by = ?)
    `, [id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    const server = parseJsonFields(result.rows[0]);

    res.json({
      success: true,
      server
    });

  } catch (error) {
    console.error('Error fetching MCP server:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch MCP server'
    });
  }
});

/**
 * POST /api/mcp/servers
 * Crée un serveur MCP personnalisé
 */
router.post('/servers', authenticateToken, async (req, res) => {
  try {
    const {
      server_key,
      name,
      description,
      transport_type,
      command,
      args,
      env,
      url,
      icon,
      category,
      requires_auth,
      auth_type,
      auth_provider,
      scopes,
      capabilities,
      setup_instructions
    } = req.body;

    // Validation
    if (!server_key || !name || !transport_type) {
      return res.status(400).json({
        success: false,
        error: 'server_key, name, and transport_type are required'
      });
    }

    if (!['stdio', 'sse'].includes(transport_type)) {
      return res.status(400).json({
        success: false,
        error: 'transport_type must be "stdio" or "sse"'
      });
    }

    if (transport_type === 'stdio' && !command) {
      return res.status(400).json({
        success: false,
        error: 'command is required for stdio transport'
      });
    }

    if (transport_type === 'sse' && !url) {
      return res.status(400).json({
        success: false,
        error: 'url is required for sse transport'
      });
    }

    // Vérifier que le server_key n'existe pas déjà
    const existing = query(
      'SELECT id FROM mcp_servers WHERE server_key = ?',
      [server_key]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A server with this key already exists'
      });
    }

    // Insérer le serveur
    const insertResult = query(`
      INSERT INTO mcp_servers (
        server_key, name, description, transport_type, command, args, env, url,
        icon, category, is_public, requires_auth, auth_type, auth_provider,
        scopes, capabilities, setup_instructions, is_custom, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      server_key,
      name,
      description,
      transport_type,
      command || null,
      JSON.stringify(args || []),
      JSON.stringify(env || {}),
      url || null,
      icon || '🔧',
      category || 'utility',
      0, // is_public (custom servers are private by default)
      requires_auth ? 1 : 0,
      auth_type || null,
      auth_provider || null,
      JSON.stringify(scopes || []),
      JSON.stringify(capabilities || []),
      setup_instructions || null,
      1, // is_custom
      req.user.userId
    ]);

    // Récupérer le serveur créé
    const serverId = insertResult.lastInsertRowid;
    const result = query('SELECT * FROM mcp_servers WHERE id = ?', [serverId]);
    const server = parseJsonFields(result.rows[0]);

    res.status(201).json({
      success: true,
      server
    });

  } catch (error) {
    console.error('Error creating MCP server:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create MCP server'
    });
  }
});

/**
 * PUT /api/mcp/servers/:id
 * Met à jour un serveur MCP personnalisé
 */
router.put('/servers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le serveur appartient à l'utilisateur
    const existing = query(
      'SELECT * FROM mcp_servers WHERE id = ? AND created_by = ? AND is_custom = 1',
      [id, req.user.userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Custom server not found or access denied'
      });
    }

    const updates = [];
    const params = [];

    const allowedFields = [
      'name', 'description', 'command', 'args', 'env', 'url',
      'icon', 'category', 'requires_auth', 'auth_type', 'auth_provider',
      'scopes', 'capabilities', 'setup_instructions'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);

        // JSON fields
        if (['args', 'env', 'scopes', 'capabilities'].includes(field)) {
          params.push(JSON.stringify(req.body[field]));
        } else if (field === 'requires_auth') {
          params.push(req.body[field] ? 1 : 0);
        } else {
          params.push(req.body[field]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    query(`
      UPDATE mcp_servers
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    // Récupérer le serveur mis à jour
    const result = query('SELECT * FROM mcp_servers WHERE id = ?', [id]);
    const server = parseJsonFields(result.rows[0]);

    res.json({
      success: true,
      server
    });

  } catch (error) {
    console.error('Error updating MCP server:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update MCP server'
    });
  }
});

/**
 * DELETE /api/mcp/servers/:id
 * Supprime un serveur MCP personnalisé
 */
router.delete('/servers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = query(
      'DELETE FROM mcp_servers WHERE id = ? AND created_by = ? AND is_custom = 1',
      [id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Custom server not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Server deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting MCP server:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete MCP server'
    });
  }
});

/**
 * GET /api/mcp/categories
 * Liste les catégories de serveurs MCP
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = query(`
      SELECT
        category,
        COUNT(*) as server_count
      FROM mcp_servers
      WHERE is_public = 1
      GROUP BY category
      ORDER BY category
    `);

    const categories = result.rows.map(row => ({
      key: row.category,
      name: row.category,
      serverCount: parseInt(row.server_count)
    }));

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

export default router;
