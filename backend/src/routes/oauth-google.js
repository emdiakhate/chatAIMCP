import express from 'express';
import { google } from 'googleapis';
import { authenticateToken } from '../middleware/auth.js';
import db, { query } from '../config/database-sqlite-mcp.js';

const router = express.Router();

// Configuration OAuth2 Google
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️  GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
}

/**
 * Créer un client OAuth2
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * GET /api/auth/google
 * Démarre le flow OAuth Google
 * Query params: scope (gmail, drive, etc.)
 */
router.get('/google', authenticateToken, (req, res) => {
  try {
    const { scope } = req.query;
    const userId = req.user.userId;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).send(`
        <html>
          <body>
            <h1>OAuth Configuration Error</h1>
            <p>Google OAuth credentials are not configured on the server.</p>
            <p>Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.</p>
            <button onclick="window.close()">Close</button>
          </body>
        </html>
      `);
    }

    const oauth2Client = createOAuth2Client();

    // Déterminer les scopes en fonction du paramètre
    let scopes = [];
    if (scope === 'gmail') {
      scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose'
      ];
    } else if (scope === 'drive') {
      scopes = [
        'https://www.googleapis.com/auth/drive.readonly'
      ];
    } else {
      // Par défaut: Gmail + Drive
      scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/drive.readonly'
      ];
    }

    // Générer l'URL d'autorisation
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Pour obtenir un refresh token
      scope: scopes,
      state: JSON.stringify({ userId, scope }) // Passer le userId dans le state
    });

    // Rediriger vers Google OAuth
    res.redirect(authUrl);

  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>OAuth Error</h1>
          <p>Failed to start OAuth flow: ${error.message}</p>
          <button onclick="window.close()">Close</button>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/auth/google/callback
 * Callback OAuth Google
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Vérifier s'il y a une erreur
    if (error) {
      console.error('OAuth error:', error);
      return res.send(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>You can close this window and try again.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Missing Authorization Code</h1>
            <p>No authorization code received from Google.</p>
            <button onclick="window.close()">Close</button>
          </body>
        </html>
      `);
    }

    // Parser le state pour récupérer userId et scope
    const stateData = JSON.parse(state || '{}');
    const { userId, scope } = stateData;

    if (!userId) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Invalid State</h1>
            <p>User information missing. Please try again.</p>
            <button onclick="window.close()">Close</button>
          </body>
        </html>
      `);
    }

    const oauth2Client = createOAuth2Client();

    // Échanger le code contre des tokens
    const { tokens } = await oauth2Client.getToken(code);

    const {
      access_token,
      refresh_token,
      expiry_date,
      scope: grantedScopes
    } = tokens;

    // Stocker les tokens dans la table integrations
    const provider = scope === 'gmail' ? 'google-gmail' : 'google';
    const expiresAt = expiry_date ? new Date(expiry_date).toISOString() : null;

    // Vérifier si une intégration existe déjà
    const existingResult = query(
      'SELECT * FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );

    if (existingResult.rows.length > 0) {
      // Mettre à jour
      query(`
        UPDATE integrations
        SET access_token = ?, refresh_token = ?, expires_at = ?, scopes = ?, created_at = datetime('now')
        WHERE user_id = ? AND provider = ?
      `, [
        access_token,
        refresh_token || existingResult.rows[0].refresh_token, // Garder l'ancien refresh_token si pas de nouveau
        expiresAt,
        grantedScopes,
        userId,
        provider
      ]);
    } else {
      // Insérer
      query(`
        INSERT INTO integrations (user_id, provider, access_token, refresh_token, expires_at, scopes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        userId,
        provider,
        access_token,
        refresh_token,
        expiresAt,
        grantedScopes
      ]);
    }

    console.log(`✅ OAuth successful for user ${userId}, provider ${provider}`);

    // Page de succès
    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .success-box {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            .checkmark {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              display: block;
              stroke-width: 4;
              stroke: #4caf50;
              stroke-miterlimit: 10;
              margin: 0 auto 20px;
              box-shadow: inset 0px 0px 0px #4caf50;
              animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
            }
            .checkmark__circle {
              stroke-dasharray: 166;
              stroke-dashoffset: 166;
              stroke-width: 4;
              stroke-miterlimit: 10;
              stroke: #4caf50;
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
            @keyframes scale {
              0%, 100% { transform: none; }
              50% { transform: scale3d(1.1, 1.1, 1); }
            }
            @keyframes fill {
              100% { box-shadow: inset 0px 0px 0px 40px #4caf50; }
            }
            h1 { color: #333; margin: 0 0 10px 0; }
            p { color: #666; margin: 0 0 20px 0; }
            .close-btn {
              background: #667eea;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
            }
            .close-btn:hover {
              background: #5568d3;
            }
          </style>
        </head>
        <body>
          <div class="success-box">
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
              <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h1>Authorization Successful!</h1>
            <p>${scope === 'gmail' ? 'Gmail' : 'Google'} has been connected to your account.</p>
            <p>You can now close this window and return to the application.</p>
            <button class="close-btn" onclick="window.close()">Close Window</button>
          </div>
          <script>
            // Auto-close after 5 seconds
            setTimeout(() => {
              window.close();
            }, 5000);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>OAuth Callback Error</h1>
          <p>Failed to complete authorization: ${error.message}</p>
          <button onclick="window.close()">Close</button>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/auth/google/status
 * Vérifie le statut de l'intégration Google
 */
router.get('/google/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { scope } = req.query;

    const provider = scope === 'gmail' ? 'google-gmail' : 'google';

    const result = query(
      'SELECT provider, scopes, expires_at, created_at FROM integrations WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        connected: false
      });
    }

    const integration = result.rows[0];
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
    const isExpired = expiresAt && expiresAt < new Date();

    res.json({
      success: true,
      connected: true,
      provider: integration.provider,
      scopes: integration.scopes,
      expiresAt: integration.expires_at,
      isExpired,
      connectedAt: integration.created_at
    });

  } catch (error) {
    console.error('Error checking Google status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
