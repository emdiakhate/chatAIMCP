import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database-sqlite-mcp.js';

const router = express.Router();

/**
 * Microsoft Teams OAuth Configuration
 * Uses Microsoft Graph API via Azure AD OAuth 2.0
 */
const TEAMS_CLIENT_ID = process.env.TEAMS_CLIENT_ID; // Azure AD App Client ID
const TEAMS_CLIENT_SECRET = process.env.TEAMS_CLIENT_SECRET; // Azure AD App Client Secret
const TEAMS_REDIRECT_URI = process.env.TEAMS_REDIRECT_URI || 'http://localhost:3001/api/auth/teams/callback';
const TEAMS_TENANT = process.env.TEAMS_TENANT || 'common'; // 'common', 'organizations', 'consumers', or specific tenant ID

/**
 * GET /api/auth/teams
 * Démarre le flux OAuth Microsoft Teams (Azure AD)
 */
router.get('/teams', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    if (!TEAMS_CLIENT_ID) {
      return res.status(500).send(`
        <html>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h2 style="color: #e74c3c;">Configuration Error</h2>
            <p>Microsoft Teams Client ID is not configured.</p>
            <p style="color: #666; font-size: 14px;">Please set TEAMS_CLIENT_ID in your environment variables.</p>
            <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #464EB8; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Close
            </button>
          </body>
        </html>
      `);
    }

    // Scopes Microsoft Graph requis pour Teams
    const scopes = [
      'User.Read',                    // Read user profile
      'Team.ReadBasic.All',           // Read basic team info
      'Channel.ReadBasic.All',        // Read basic channel info
      'ChannelMessage.Read.All',      // Read channel messages
      'ChannelMessage.Send',          // Send channel messages
      'Chat.Read',                    // Read chats
      'Chat.ReadWrite',               // Read and write chats
      'Files.Read.All',               // Read files in Teams
      'Files.ReadWrite.All',          // Read and write files in Teams
      'offline_access',               // Refresh token that doesn't expire
    ];

    // Générer l'URL d'autorisation Microsoft
    const state = JSON.stringify({ userId });
    const authUrl = new URL(`https://login.microsoftonline.com/${TEAMS_TENANT}/oauth2/v2.0/authorize`);

    authUrl.searchParams.append('client_id', TEAMS_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', TEAMS_REDIRECT_URI);
    authUrl.searchParams.append('response_mode', 'query');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('state', state);

    console.log('[Teams OAuth] Redirecting to:', authUrl.toString());

    res.redirect(authUrl.toString());

  } catch (error) {
    console.error('[Teams OAuth] Error starting flow:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">Error</h2>
          <p>${error.message}</p>
          <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #464EB8; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/auth/teams/callback
 * Callback OAuth Microsoft Teams
 */
router.get('/teams/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError, error_description } = req.query;

    // Gérer les erreurs OAuth
    if (oauthError) {
      console.error('[Teams OAuth] Authorization error:', oauthError, error_description);
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
                background: linear-gradient(135deg, #464EB8 0%, #5B67CA 100%);
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
                background: #464EB8;
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
              <p>${error_description || 'You cancelled the Microsoft Teams authorization or an error occurred.'}</p>
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

    console.log('[Teams OAuth] Exchanging code for token, userId:', userId);

    // Échanger le code contre un token
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${TEAMS_TENANT}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: TEAMS_CLIENT_ID,
        client_secret: TEAMS_CLIENT_SECRET,
        code,
        redirect_uri: TEAMS_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Microsoft token exchange failed: ${errorData}`);
    }

    const tokenData = await tokenResponse.json();

    console.log('[Teams OAuth] Token received');

    // Get user info from Microsoft Graph
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : {};

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Vérifier si une intégration existe déjà
    const existingResult = query(
      'SELECT id FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, 'teams']
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
            user_principal_name: userInfo.userPrincipalName,
            display_name: userInfo.displayName,
            mail: userInfo.mail,
            id: userInfo.id,
          }),
          userId,
          'teams'
        ]
      );
      console.log('[Teams OAuth] Integration updated');
    } else {
      // Créer une nouvelle intégration
      query(
        `INSERT INTO integrations
         (user_id, provider, access_token, refresh_token, expires_at, scopes, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          'teams',
          tokenData.access_token,
          tokenData.refresh_token,
          expiresAt,
          tokenData.scope,
          JSON.stringify({
            user_principal_name: userInfo.userPrincipalName,
            display_name: userInfo.displayName,
            mail: userInfo.mail,
            id: userInfo.id,
          })
        ]
      );
      console.log('[Teams OAuth] Integration created');
    }

    // Activer la connexion MCP Teams
    const teamsServerResult = query(
      "SELECT id FROM mcp_servers WHERE server_key = 'teams'",
      []
    );

    if (teamsServerResult.rows.length > 0) {
      const serverId = teamsServerResult.rows[0].id;

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
           (user_id, server_id, status)
           VALUES (?, ?, 'active')`,
          [userId, serverId]
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
              background: linear-gradient(135deg, #464EB8 0%, #5B67CA 100%);
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
            .user-info {
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
            <h1>Microsoft Teams Connected!</h1>
            <p>Your Microsoft Teams account has been successfully connected to ChatAI.</p>
            ${userInfo.displayName ? `
            <div class="user-info">
              <strong>User:</strong> ${userInfo.displayName}<br>
              ${userInfo.mail ? `<strong>Email:</strong> ${userInfo.mail}` : ''}
            </div>
            ` : ''}
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
    console.error('[Teams OAuth] Callback error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">Error</h2>
          <p>${error.message}</p>
          <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #464EB8; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/auth/teams/status
 * Vérifier le statut de l'intégration Teams
 */
router.get('/teams/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = query(
      'SELECT * FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, 'teams']
    );

    if (result.rows.length === 0) {
      return res.json({
        connected: false,
        message: 'Microsoft Teams not connected'
      });
    }

    const integration = result.rows[0];
    const metadata = JSON.parse(integration.metadata || '{}');

    // Check if token is expired
    const isExpired = integration.expires_at && new Date(integration.expires_at) < new Date();

    res.json({
      connected: true,
      user_name: metadata.display_name,
      user_email: metadata.mail,
      scopes: integration.scopes,
      connected_at: integration.created_at,
      expires_at: integration.expires_at,
      is_expired: isExpired
    });

  } catch (error) {
    console.error('[Teams OAuth] Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
