#!/usr/bin/env node

/**
 * Script de diagnostic pour vérifier la configuration des clés API
 * Usage: node check-api-keys.js <user_id>
 */

import { query } from './src/config/database-sqlite-mcp.js';
import { getApiKey } from './src/routes/auth-apikey.js';

const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node check-api-keys.js <user_id>');
  console.log('Example: node check-api-keys.js 1');
  process.exit(1);
}

console.log('\n🔍 Diagnostic des clés API');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`User ID: ${userId}\n`);

// Vérifier toutes les intégrations
const integrations = query(
  'SELECT id, provider, created_at, updated_at FROM integrations WHERE user_id = ?',
  [userId]
);

if (integrations.rows.length === 0) {
  console.log('❌ Aucune intégration trouvée pour cet utilisateur\n');
  console.log('Pour ajouter une clé API OpenAI:');
  console.log('1. Aller dans MCP Tools');
  console.log('2. Trouver "OpenAI (GPT & DALL-E)"');
  console.log('3. Cliquer sur "Configure"');
  console.log('4. Ajouter votre clé API\n');
  process.exit(0);
}

console.log(`✅ ${integrations.rows.length} intégration(s) trouvée(s):\n`);

integrations.rows.forEach((integration) => {
  console.log(`📦 Provider: ${integration.provider}`);
  console.log(`   ID: ${integration.id}`);
  console.log(`   Créé: ${integration.created_at}`);
  console.log(`   Mis à jour: ${integration.updated_at}`);

  // Essayer de récupérer la clé
  const apiKey = getApiKey(userId, integration.provider);

  if (apiKey) {
    console.log(`   ✅ Clé API: ${apiKey.substring(0, 10)}... (${apiKey.length} chars)`);

    // Vérifier le format de la clé
    if (integration.provider === 'openai') {
      if (apiKey.startsWith('sk-')) {
        console.log(`   ✅ Format valide: commence par 'sk-'`);
      } else {
        console.log(`   ⚠️  Format inhabituel: ne commence pas par 'sk-'`);
      }
    }
  } else {
    console.log(`   ❌ Impossible de récupérer la clé (erreur de décryptage?)`);
  }

  console.log('');
});

// Vérifier les connexions MCP associées
const providers = integrations.rows.map(r => `'${r.provider}'`).join(',');
const mcpConnections = query(`
  SELECT
    c.id, c.status, c.user_id,
    s.server_key, s.name
  FROM user_mcp_connections c
  JOIN mcp_servers s ON c.server_id = s.id
  WHERE c.user_id = ? AND s.server_key IN (${providers})
`, [userId]);

if (mcpConnections.rows.length > 0) {
  console.log('🔌 Connexions MCP associées:\n');
  mcpConnections.rows.forEach((conn) => {
    console.log(`   ${conn.status === 'active' ? '✅' : '⭕'} ${conn.name} (${conn.server_key})`);
    console.log(`      Status: ${conn.status}`);
  });
  console.log('');
}

// Test spécifique pour OpenAI
const openaiKey = getApiKey(userId, 'openai');
if (openaiKey) {
  console.log('🎤 Test Voice Input (OpenAI Whisper):\n');
  console.log('   ✅ Clé OpenAI configurée et récupérable');
  console.log('   ✅ Le bouton micro devrait fonctionner\n');

  console.log('Pour tester:');
  console.log('1. Cliquer sur le micro dans le chat');
  console.log('2. Parler clairement');
  console.log('3. Recliquer pour arrêter');
  console.log('4. Le texte devrait apparaître transcrit\n');
} else {
  console.log('🎤 Voice Input (OpenAI Whisper):\n');
  console.log('   ❌ Clé OpenAI non trouvée');
  console.log('   ❌ Le bouton micro ne fonctionnera pas\n');

  console.log('Pour configurer:');
  console.log('1. Aller dans MCP Tools');
  console.log('2. Chercher "OpenAI"');
  console.log('3. Ajouter votre clé API OpenAI (sk-...)\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
