#!/usr/bin/env node

/**
 * Script de diagnostic pour vérifier les intégrations Google stockées
 * Usage: node check-google-integrations.js [userId]
 */

import { initDatabase } from './src/config/database-sqlite-mcp.js';
import db from './src/config/database-sqlite-mcp.js';

const userId = process.argv[2] ? parseInt(process.argv[2], 10) : 1;

async function checkGoogleIntegrations() {
  try {
    // Initialiser la base de données
    initDatabase();
    
    const query = (sql, params = []) => {
      const stmt = db.prepare(sql);
      const result = stmt.all(...params);
      return { rows: result };
    };

    console.log(`\n🔍 Vérification des intégrations Google pour l'utilisateur ${userId}...\n`);

    // Vérifier toutes les intégrations Google
    const googleProviders = ['google-gmail', 'google-drive', 'google-sheets'];
    
    for (const provider of googleProviders) {
      const result = query(
        'SELECT id, provider, scopes, expires_at, created_at, updated_at, LENGTH(access_token) as token_length, LENGTH(refresh_token) as refresh_length FROM integrations WHERE user_id = ? AND provider = ?',
        [userId, provider]
      );

      if (result.rows.length > 0) {
        const integration = result.rows[0];
        const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
        const isExpired = expiresAt && expiresAt < new Date();
        
        console.log(`✅ ${provider}:`);
        console.log(`   - ID: ${integration.id}`);
        console.log(`   - Scopes: ${integration.scopes || 'N/A'}`);
        console.log(`   - Access Token: ${integration.token_length > 0 ? '✅ Présent (' + integration.token_length + ' chars)' : '❌ Manquant'}`);
        console.log(`   - Refresh Token: ${integration.refresh_length > 0 ? '✅ Présent (' + integration.refresh_length + ' chars)' : '❌ Manquant'}`);
        console.log(`   - Expires At: ${expiresAt ? expiresAt.toISOString() : 'N/A'}`);
        console.log(`   - Expired: ${isExpired ? '⚠️  OUI' : '✅ Non'}`);
        console.log(`   - Created At: ${integration.created_at || 'N/A'}`);
        console.log(`   - Updated At: ${integration.updated_at || 'N/A'}`);
        console.log('');
      } else {
        console.log(`❌ ${provider}: Non trouvé dans la base de données\n`);
      }
    }

    // Vérifier les connexions MCP actives
    console.log('\n🔗 Connexions MCP actives pour Google:\n');
    
    const connectionsResult = query(`
      SELECT c.*, s.name, s.server_key, s.auth_type
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.user_id = ? AND c.status = 'active' AND s.server_key IN ('gmail', 'gdrive', 'gsheets')
    `, [userId]);

    if (connectionsResult.rows.length > 0) {
      for (const connection of connectionsResult.rows) {
        console.log(`✅ ${connection.name} (${connection.server_key}):`);
        console.log(`   - Server ID: ${connection.server_id}`);
        console.log(`   - Auth Type: ${connection.auth_type || 'N/A'}`);
        console.log(`   - Status: ${connection.status}`);
        console.log('');
      }
    } else {
      console.log('❌ Aucune connexion MCP active trouvée pour Google\n');
    }

    // Vérifier les variables d'environnement Google
    console.log('\n🔐 Variables d\'environnement Google:\n');
    console.log(`   - GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Défini (' + process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...)' : '❌ Non défini'}`);
    console.log(`   - GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Défini (' + process.env.GOOGLE_CLIENT_SECRET.substring(0, 10) + '...)' : '❌ Non défini'}`);
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkGoogleIntegrations();

