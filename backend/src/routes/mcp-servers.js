import express from 'express';
import { query, getClient } from '../config/database-pg.js';
import serverRegistry from '../mcp/server-registry.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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
        icon, category, is_public, requires_auth, auth_type,
        auth_provider, capabilities, setup_instructions, is_custom
      FROM mcp_servers
      WHERE is_public = true OR created_by = $1
    `;
    const params = [req.user.userId];

    if (category) {
      queryText += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    if (search) {
      queryText += ` AND (name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    queryText += ' ORDER BY category, name';

    const result = await query(queryText, params);

    // Parser les champs JSONB
    const servers = result.rows.map(server => ({
      ...server,
      capabilities: server.capabilities || [],
      args: server.args || [],
      env: server.env || {},
      scopes: server.scopes || []
    }));

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

    const result = await query(`
      SELECT *
      FROM mcp_servers
      WHERE id = $1 AND (is_public = true OR created_by = $2)
    `, [id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    const server = result.rows[0];

    // Parser les champs JSONB
    server.capabilities = server.capabilities || [];
    server.args = server.args || [];
    server.env = server.env || {};
    server.scopes = server.scopes || [];

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
    const existing = await query(
      'SELECT id FROM mcp_servers WHERE server_key = $1',
      [server_key]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A server with this key already exists'
      });
    }

    // Insérer le serveur
    const result = await query(`
      INSERT INTO mcp_servers (
        server_key, name, description, transport_type, command, args, env, url,
        icon, category, is_public, requires_auth, auth_type, auth_provider,
        scopes, capabilities, setup_instructions, is_custom, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
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
      false, // is_public (custom servers are private by default)
      requires_auth || false,
      auth_type || null,
      auth_provider || null,
      JSON.stringify(scopes || []),
      JSON.stringify(capabilities || []),
      setup_instructions || null,
      true, // is_custom
      req.user.userId
    ]);

    const server = result.rows[0];
    server.args = args || [];
    server.env = env || {};
    server.scopes = scopes || [];
    server.capabilities = capabilities || [];

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
    const existing = await query(
      'SELECT * FROM mcp_servers WHERE id = $1 AND created_by = $2 AND is_custom = true',
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
    let paramCount = 1;

    const allowedFields = [
      'name', 'description', 'command', 'args', 'env', 'url',
      'icon', 'category', 'requires_auth', 'auth_type', 'auth_provider',
      'scopes', 'capabilities', 'setup_instructions'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);

        // JSON fields
        if (['args', 'env', 'scopes', 'capabilities'].includes(field)) {
          params.push(JSON.stringify(req.body[field]));
        } else {
          params.push(req.body[field]);
        }

        paramCount++;
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

    const result = await query(`
      UPDATE mcp_servers
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, params);

    const server = result.rows[0];
    server.args = server.args || [];
    server.env = server.env || {};
    server.scopes = server.scopes || [];
    server.capabilities = server.capabilities || [];

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

    const result = await query(
      'DELETE FROM mcp_servers WHERE id = $1 AND created_by = $2 AND is_custom = true RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
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
    const result = await query(`
      SELECT
        category,
        COUNT(*) as server_count
      FROM mcp_servers
      WHERE is_public = true
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
