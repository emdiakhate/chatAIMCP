import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database-sqlite-mcp.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Encryption helpers for API keys
 */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * POST /api/auth/apikey/:provider
 * Configure API key for a provider (HubSpot, OpenAI, Anthropic, Airtable, Linear)
 */
router.post('/apikey/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const { api_key } = req.body;
    const userId = req.user.userId;

    // Validate provider
    const validProviders = ['hubspot', 'openai', 'anthropic', 'airtable', 'linear'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `Invalid provider. Must be one of: ${validProviders.join(', ')}`
      });
    }

    // Validate API key
    if (!api_key || typeof api_key !== 'string' || api_key.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }

    console.log(`[API Key Config] Configuring ${provider} for user ${userId}`);

    // Encrypt the API key
    const encryptedKey = encrypt(api_key.trim());

    // Check if integration already exists
    const existingResult = query(
      'SELECT id FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );

    if (existingResult.rows.length > 0) {
      // Update existing integration
      query(
        `UPDATE integrations
         SET access_token = ?,
             updated_at = datetime('now')
         WHERE user_id = ? AND provider = ?`,
        [encryptedKey, userId, provider]
      );
      console.log(`[API Key Config] ${provider} integration updated`);
    } else {
      // Create new integration
      // Pour les API keys, scopes est NULL (pas de scopes OAuth)
      query(
        `INSERT INTO integrations
         (user_id, provider, access_token, scopes)
         VALUES (?, ?, ?, ?)`,
        [userId, provider, encryptedKey, null]
      );
      console.log(`[API Key Config] ${provider} integration created`);
    }

    // Activate MCP connection for this provider
    const serverResult = query(
      "SELECT id FROM mcp_servers WHERE server_key = ?",
      [provider]
    );

    if (serverResult.rows.length > 0) {
      const serverId = serverResult.rows[0].id;

      // Check if connection exists
      const connectionResult = query(
        'SELECT id FROM user_mcp_connections WHERE user_id = ? AND server_id = ?',
        [userId, serverId]
      );

      if (connectionResult.rows.length > 0) {
        // Update status to active
        query(
          "UPDATE user_mcp_connections SET status = 'active', updated_at = datetime('now') WHERE id = ?",
          [connectionResult.rows[0].id]
        );
      } else {
        // Create connection
        query(
          `INSERT INTO user_mcp_connections
           (user_id, server_id, status)
           VALUES (?, ?, 'active')`,
          [userId, serverId]
        );
      }

      console.log(`[API Key Config] MCP connection activated for ${provider}`);
    }

    res.json({
      success: true,
      message: `${provider} API key configured successfully`,
      provider
    });

  } catch (error) {
    console.error('[API Key Config] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to configure API key'
    });
  }
});

/**
 * GET /api/auth/apikey/:provider/status
 * Check if API key is configured for a provider
 */
router.get('/apikey/:provider/status', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.userId;

    const result = query(
      'SELECT * FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );

    if (result.rows.length === 0) {
      return res.json({
        connected: false,
        message: `${provider} not configured`
      });
    }

    const integration = result.rows[0];

    res.json({
      connected: true,
      provider,
      configured_at: integration.created_at,
      updated_at: integration.updated_at
    });

  } catch (error) {
    console.error('[API Key Config] Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/auth/apikey/:provider
 * Remove API key configuration for a provider
 */
router.delete('/apikey/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.userId;

    console.log(`[API Key Config] Removing ${provider} for user ${userId}`);

    // Delete integration
    query(
      'DELETE FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );

    // Deactivate MCP connection
    const serverResult = query(
      "SELECT id FROM mcp_servers WHERE server_key = ?",
      [provider]
    );

    if (serverResult.rows.length > 0) {
      const serverId = serverResult.rows[0].id;
      query(
        "UPDATE user_mcp_connections SET status = 'inactive', updated_at = datetime('now') WHERE user_id = ? AND server_id = ?",
        [userId, serverId]
      );
    }

    res.json({
      success: true,
      message: `${provider} API key removed successfully`
    });

  } catch (error) {
    console.error('[API Key Config] Delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to get decrypted API key for a provider
 * Used by MCP servers when making API calls
 */
export function getApiKey(userId, provider) {
  try {
    const result = query(
      'SELECT access_token FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const encryptedKey = result.rows[0].access_token;
    return decrypt(encryptedKey);
  } catch (error) {
    console.error(`[API Key] Error getting ${provider} key:`, error);
    return null;
  }
}

export default router;
