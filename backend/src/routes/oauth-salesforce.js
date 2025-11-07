import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database-sqlite-mcp.js';

const router = express.Router();

/**
 * Salesforce OAuth Configuration
 */
const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;
const SALESFORCE_REDIRECT_URI = process.env.SALESFORCE_REDIRECT_URI || 'http://localhost:3001/api/auth/salesforce/callback';
// Support both production (login.salesforce.com) and sandbox (test.salesforce.com)
const SALESFORCE_LOGIN_URL = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

/**
 * GET /api/auth/salesforce
 * Démarre le flux OAuth Salesforce
 */
router.get('/salesforce', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    if (!SALESFORCE_CLIENT_ID) {
      return res.status(500).send(`
        <html>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h2 style="color: #e74c3c;">Configuration Error</h2>
            <p>Salesforce Client ID is not configured.</p>
            <p style="color: #666; font-size: 14px;">Please set SALESFORCE_CLIENT_ID in your environment variables.</p>
            <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #0176d3; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Close
            </button>
          </body>
        </html>
      `);
    }

    // Scopes Salesforce requis
    const scopes = [
      'api',              // Full access to all data accessible by the logged-in user
      'refresh_token',    // Allows refreshing access token
      'offline_access',   // Allows refresh token that doesn't expire
      'openid',           // OpenID Connect support
      'profile',          // Access to user's profile information
      'email',            // Access to user's email
    ];

    // Générer l'URL d'autorisation Salesforce
    const state = JSON.stringify({ userId });
    const authUrl = new URL(`${SALESFORCE_LOGIN_URL}/services/oauth2/authorize`);

    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', SALESFORCE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', SALESFORCE_REDIRECT_URI);
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('prompt', 'consent'); // Force re-consent pour debugging

    console.log('[Salesforce OAuth] Redirecting to:', authUrl.toString());

    res.redirect(authUrl.toString());

  } catch (error) {
    console.error('[Salesforce OAuth] Error starting flow:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">Error</h2>
          <p>${error.message}</p>
          <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #0176d3; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/auth/salesforce/callback
 * Callback OAuth Salesforce
 */
router.get('/salesforce/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Gérer les erreurs OAuth
    if (oauthError) {
      console.error('[Salesforce OAuth] Authorization error:', oauthError);
      return res.send(`
        <html>
          <head>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #0176d3 0%, #1589ee 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
              }
              .error-icon {
                width: 64px;
                height: 64px;
                background: #fee;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-center;
                margin: 0 auto 20px;
                color: #e74c3c;
                font-size: 32px;
              }
              h1 {
                color: #1a1a1a;
                margin: 0 0 10px;
                font-size: 24px;
              }
              p {
                color: #666;
                line-height: 1.6;
              }
              button {
                margin-top: 20px;
                padding: 12px 24px;
                background: #0176d3;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">✕</div>
              <h1>Authorization Denied</h1>
              <p>You cancelled the Salesforce authorization or an error occurred.</p>
              <button onclick="window.close()">Close Window</button>
            </div>
            <script>
              setTimeout(() => window.close(), 5000);
            </script>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Parser le state pour récupérer userId
    const { userId } = JSON.parse(state);

    console.log('[Salesforce OAuth] Exchanging code for token, userId:', userId);

    // Échanger le code contre un token
    const tokenResponse = await fetch(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SALESFORCE_CLIENT_ID,
        client_secret: SALESFORCE_CLIENT_SECRET,
        redirect_uri: SALESFORCE_REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Salesforce token exchange failed: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();

    console.log('[Salesforce OAuth] Token received, instance:', tokenData.instance_url);

    // Stocker les tokens dans la table integrations
    // Calculate expiration date
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 7200) * 1000).toISOString();

    // Vérifier si une intégration existe déjà
    const existingResult = query(
      'SELECT id FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, 'salesforce']
    );

    if (existingResult.rows.length > 0) {
      // Mettre à jour l'intégration existante
      query(
        `UPDATE integrations
         SET access_token = ?,
             refresh_token = ?,
             expires_at = ?,
             scopes = ?,
             metadata = ?,
             updated_at = datetime('now')
         WHERE user_id = ? AND provider = ?`,
        [
          tokenData.access_token,
          tokenData.refresh_token,
          expiresAt,
          tokenData.scope,
          JSON.stringify({
            instance_url: tokenData.instance_url,
            id: tokenData.id,
            token_type: tokenData.token_type,
            issued_at: tokenData.issued_at,
          }),
          userId,
          'salesforce'
        ]
      );
      console.log('[Salesforce OAuth] Integration updated');
    } else {
      // Créer une nouvelle intégration
      query(
        `INSERT INTO integrations
         (user_id, provider, access_token, refresh_token, expires_at, scopes, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          'salesforce',
          tokenData.access_token,
          tokenData.refresh_token,
          expiresAt,
          tokenData.scope,
          JSON.stringify({
            instance_url: tokenData.instance_url,
            id: tokenData.id,
            token_type: tokenData.token_type,
            issued_at: tokenData.issued_at,
          })
        ]
      );
      console.log('[Salesforce OAuth] Integration created');
    }

    // Activer la connexion MCP Salesforce
    const salesforceServerResult = query(
      "SELECT id FROM mcp_servers WHERE server_key = 'salesforce'",
      []
    );

    if (salesforceServerResult.rows.length > 0) {
      const serverId = salesforceServerResult.rows[0].id;

      // Vérifier si une connexion existe
      const connectionResult = query(
        'SELECT id FROM user_mcp_connections WHERE user_id = ? AND server_id = ?',
        [userId, serverId]
      );

      if (connectionResult.rows.length > 0) {
        // Mettre à jour le statut
        query(
          "UPDATE user_mcp_connections SET status = 'active', updated_at = datetime('now') WHERE id = ?",
          [connectionResult.rows[0].id]
        );
      } else {
        // Créer la connexion
        query(
          `INSERT INTO user_mcp_connections
           (user_id, server_id, status, config_overrides)
           VALUES (?, ?, 'active', ?)`,
          [userId, serverId, JSON.stringify({ instance_url: tokenData.instance_url })]
        );
      }
    }

    // Extract organization name from instance URL
    const orgName = tokenData.instance_url.replace('https://', '').split('.')[0];

    // Afficher une page de succès animée
    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #0176d3 0%, #1589ee 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
            }
            .checkmark {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              display: block;
              stroke-width: 3;
              stroke: #10b981;
              stroke-miterlimit: 10;
              margin: 0 auto 20px;
              box-shadow: inset 0px 0px 0px #10b981;
              animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;
            }
            .checkmark__circle {
              stroke-dasharray: 166;
              stroke-dashoffset: 166;
              stroke-width: 3;
              stroke-miterlimit: 10;
              stroke: #10b981;
              fill: none;
              animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
            .checkmark__check {
              transform-origin: 50% 50%;
              stroke-dasharray: 48;
              stroke-dashoffset: 48;
              animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
            }
            @keyframes stroke {
              100% { stroke-dashoffset: 0; }
            }
            @keyframes fill {
              100% { box-shadow: inset 0px 0px 0px 30px #10b981; }
            }
            h1 {
              color: #1a1a1a;
              margin: 0 0 10px;
              font-size: 24px;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
            .org-info {
              background: #f9fafb;
              padding: 12px;
              border-radius: 8px;
              margin-top: 20px;
              font-size: 14px;
              color: #374151;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
              <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h1>Salesforce Connected!</h1>
            <p>Your Salesforce org has been successfully connected to ChatAI.</p>
            <div class="org-info">
              <strong>Instance:</strong> ${orgName}<br>
              <strong>URL:</strong> ${tokenData.instance_url}
            </div>
            <p style="margin-top: 20px; font-size: 14px; color: #9ca3af;">
              This window will close automatically in 5 seconds...
            </p>
          </div>
          <script>
            setTimeout(() => window.close(), 5000);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('[Salesforce OAuth] Callback error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">Error</h2>
          <p>${error.message}</p>
          <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #0176d3; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/auth/salesforce/status
 * Vérifier le statut de l'intégration Salesforce
 */
router.get('/salesforce/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = query(
      'SELECT * FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, 'salesforce']
    );

    if (result.rows.length === 0) {
      return res.json({
        connected: false,
        message: 'Salesforce not connected'
      });
    }

    const integration = result.rows[0];
    const metadata = JSON.parse(integration.metadata || '{}');

    // Check if token is expired
    const isExpired = integration.expires_at && new Date(integration.expires_at) < new Date();

    res.json({
      connected: true,
      instance_url: metadata.instance_url,
      scopes: integration.scopes,
      connected_at: integration.created_at,
      expires_at: integration.expires_at,
      is_expired: isExpired
    });

  } catch (error) {
    console.error('[Salesforce OAuth] Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
