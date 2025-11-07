import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database-sqlite-mcp.js';

const router = express.Router();

/**
 * Slack OAuth Configuration
 */
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || 'http://localhost:3001/api/auth/slack/callback';

/**
 * GET /api/auth/slack
 * Démarre le flux OAuth Slack
 */
router.get('/slack', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    if (!SLACK_CLIENT_ID) {
      return res.status(500).send(`
        <html>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h2 style="color: #e01e5a;">Configuration Error</h2>
            <p>Slack Client ID is not configured.</p>
            <p style="color: #666; font-size: 14px;">Please set SLACK_CLIENT_ID in your environment variables.</p>
            <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #611f69; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Close
            </button>
          </body>
        </html>
      `);
    }

    // Scopes Slack requis pour l'intégration
    const scopes = [
      'channels:read',       // Lire les infos des channels publics
      'channels:history',    // Lire l'historique des channels publics
      'chat:write',          // Envoyer des messages
      'files:read',          // Lire les fichiers
      'files:write',         // Upload des fichiers
      'groups:read',         // Lire les infos des channels privés
      'groups:history',      // Lire l'historique des channels privés
      'im:read',            // Lire les DMs
      'im:history',         // Lire l'historique des DMs
      'users:read',         // Lire les infos des users
      'team:read',          // Lire les infos du workspace
    ];

    // Générer l'URL d'autorisation Slack
    const state = JSON.stringify({ userId });
    const authUrl = new URL('https://slack.com/oauth/v2/authorize');

    authUrl.searchParams.append('client_id', SLACK_CLIENT_ID);
    authUrl.searchParams.append('scope', scopes.join(','));
    authUrl.searchParams.append('redirect_uri', SLACK_REDIRECT_URI);
    authUrl.searchParams.append('state', state);

    console.log('[Slack OAuth] Redirecting to:', authUrl.toString());

    res.redirect(authUrl.toString());

  } catch (error) {
    console.error('[Slack OAuth] Error starting flow:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2 style="color: #e01e5a;">Error</h2>
          <p>${error.message}</p>
          <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #611f69; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/auth/slack/callback
 * Callback OAuth Slack
 */
router.get('/slack/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Gérer les erreurs OAuth
    if (oauthError) {
      console.error('[Slack OAuth] Authorization error:', oauthError);
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
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
                color: #e01e5a;
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
                background: #611f69;
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
              <p>You cancelled the Slack authorization or an error occurred.</p>
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

    console.log('[Slack OAuth] Exchanging code for token, userId:', userId);

    // Échanger le code contre un token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: SLACK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      throw new Error(`Slack API error: ${tokenData.error}`);
    }

    console.log('[Slack OAuth] Token received for team:', tokenData.team.name);

    // Stocker les tokens dans la table integrations
    const expiresAt = null; // Slack tokens n'expirent pas par défaut

    // Vérifier si une intégration existe déjà
    const existingResult = query(
      'SELECT id FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, 'slack']
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
          tokenData.refresh_token || null,
          expiresAt,
          tokenData.scope,
          JSON.stringify({
            team_id: tokenData.team.id,
            team_name: tokenData.team.name,
            bot_user_id: tokenData.bot_user_id,
            authed_user: tokenData.authed_user,
          }),
          userId,
          'slack'
        ]
      );
      console.log('[Slack OAuth] Integration updated');
    } else {
      // Créer une nouvelle intégration
      query(
        `INSERT INTO integrations
         (user_id, provider, access_token, refresh_token, expires_at, scopes, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          'slack',
          tokenData.access_token,
          tokenData.refresh_token || null,
          expiresAt,
          tokenData.scope,
          JSON.stringify({
            team_id: tokenData.team.id,
            team_name: tokenData.team.name,
            bot_user_id: tokenData.bot_user_id,
            authed_user: tokenData.authed_user,
          })
        ]
      );
      console.log('[Slack OAuth] Integration created');
    }

    // Activer la connexion MCP Slack
    const slackServerResult = query(
      "SELECT id FROM mcp_servers WHERE server_key = 'slack'",
      []
    );

    if (slackServerResult.rows.length > 0) {
      const serverId = slackServerResult.rows[0].id;

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
          [userId, serverId, JSON.stringify({ team: tokenData.team.name })]
        );
      }
    }

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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            .team-info {
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
            <h1>Slack Connected!</h1>
            <p>Your Slack workspace has been successfully connected to ChatAI.</p>
            <div class="team-info">
              <strong>Workspace:</strong> ${tokenData.team.name}
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
    console.error('[Slack OAuth] Callback error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2 style="color: #e01e5a;">Error</h2>
          <p>${error.message}</p>
          <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #611f69; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/auth/slack/status
 * Vérifier le statut de l'intégration Slack
 */
router.get('/slack/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = query(
      'SELECT * FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, 'slack']
    );

    if (result.rows.length === 0) {
      return res.json({
        connected: false,
        message: 'Slack not connected'
      });
    }

    const integration = result.rows[0];
    const metadata = JSON.parse(integration.metadata || '{}');

    res.json({
      connected: true,
      team_name: metadata.team_name,
      team_id: metadata.team_id,
      scopes: integration.scopes,
      connected_at: integration.created_at
    });

  } catch (error) {
    console.error('[Slack OAuth] Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
