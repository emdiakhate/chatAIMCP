import { google } from 'googleapis';
import db from '../config/database-sqlite-mcp.js';

export const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
  );
};

/**
 * Rafraîchit un token Google expiré si nécessaire
 * @param {number} userId - ID de l'utilisateur
 * @param {string} provider - Provider (google-gmail, google-drive, google-sheets)
 * @returns {Promise<{access_token: string, refresh_token: string, expires_at: string}>}
 */
export const refreshGoogleTokenIfNeeded = async (userId, provider) => {
  const query = (sql, params = []) => {
    const stmt = db.prepare(sql);
    const result = stmt.all(...params);
    return { rows: result };
  };

  const integrationResult = query(
    'SELECT * FROM integrations WHERE user_id = ? AND provider = ?',
    [userId, provider]
  );

  if (integrationResult.rows.length === 0) {
    throw new Error(`No integration found for provider: ${provider}`);
  }

  const integration = integrationResult.rows[0];
  
  // Vérifier si le token est expiré
  const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();
  
  // Si le token n'est pas expiré, retourner les tokens actuels
  if (!isExpired && integration.access_token) {
    return {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expires_at: integration.expires_at
    };
  }

  // Si pas de refresh_token, on ne peut pas rafraîchir
  if (!integration.refresh_token) {
    console.warn(`[Token Refresh] No refresh_token for ${provider}, token expired. User needs to re-authenticate.`);
    throw new Error(`Token expired and no refresh_token available for ${provider}. Please re-authenticate.`);
  }

  // Rafraîchir le token
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: integration.refresh_token
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    const newExpiresAt = credentials.expiry_date 
      ? new Date(credentials.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(); // Par défaut 1h

    // Mettre à jour dans la base de données
    const updateStmt = db.prepare(`
      UPDATE integrations
      SET access_token = ?, expires_at = ?, updated_at = datetime('now')
      WHERE user_id = ? AND provider = ?
    `);
    updateStmt.run(
      credentials.access_token,
      newExpiresAt,
      userId,
      provider
    );

    console.log(`✅ Token refreshed for ${provider} (user ${userId})`);

    return {
      access_token: credentials.access_token,
      refresh_token: integration.refresh_token, // Le refresh_token ne change pas
      expires_at: newExpiresAt
    };
  } catch (error) {
    console.error(`❌ Error refreshing token for ${provider}:`, error);
    throw new Error(`Failed to refresh token for ${provider}: ${error.message}`);
  }
};

export const getAuthenticatedClient = async (userId) => {
  const integration = db.prepare(
    'SELECT * FROM integrations WHERE user_id = ? AND provider = ?'
  ).get(userId, 'google');

  if (!integration) {
    throw new Error('Google integration not found');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: new Date(integration.expires_at).getTime(),
  });

  oauth2Client.on('tokens', (tokens) => {
    if (tokens.access_token) {
      const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600) * 1000);
      db.prepare(
        'UPDATE integrations SET access_token = ?, expires_at = ? WHERE user_id = ? AND provider = ?'
      ).run(tokens.access_token, expiresAt.toISOString(), userId, 'google');
    }
  });

  return oauth2Client;
};

export const searchGoogleDrive = async (oauth2Client, query, maxResults = 5) => {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.list({
    q: `fullText contains '${query}' and trashed=false`,
    fields: 'files(id, name, webViewLink, mimeType, modifiedTime)',
    pageSize: maxResults,
    orderBy: 'modifiedTime desc',
  });

  return response.data.files.map(file => ({
    title: file.name,
    url: file.webViewLink,
    type: 'drive',
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime,
  }));
};

export const searchGmail = async (oauth2Client, query, maxResults = 5) => {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  if (!response.data.messages) {
    return [];
  }

  const messages = await Promise.all(
    response.data.messages.map(async (msg) => {
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = details.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      return {
        title: subject,
        url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
        type: 'gmail',
        from,
        date,
      };
    })
  );

  return messages;
};
