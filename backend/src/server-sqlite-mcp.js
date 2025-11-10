import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, seedMCPServers, runMigrations } from './config/database-sqlite-mcp.js';

// Routes SQLite
import authRoutes from './routes/auth.js';
import conversationsRoutes from './routes/conversations.js';
import integrationsRoutes from './routes/integrations.js';
import googleCallbackRoutes from './routes/googleCallback.js';

// Routes MCP SQLite
import mcpServersRoutes from './routes/mcp-servers-sqlite.js';
import mcpConnectionsRoutes from './routes/mcp-connections-sqlite.js';
import chatMCPRoutes from './routes/chat-mcp-sqlite.js';
import chatStreamRoutes from './routes/chat-stream.js';
import mcpMemoryRoutes from './routes/mcp-memory-sqlite.js';
import oauthGoogleRoutes from './routes/oauth-google.js';
import oauthSlackRoutes from './routes/oauth-slack.js';
import oauthSalesforceRoutes from './routes/oauth-salesforce.js';
import oauthTeamsRoutes from './routes/oauth-teams.js';
import authApiKeyRoutes from './routes/auth-apikey.js';
import llmRoutes from './routes/llm.js';

// Gestionnaires MCP
import mcpClientManager from './mcp/client-manager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parser JSON
app.use(express.json());

// Initialisation de la base de données
console.log('🔄 Initialisation de la base de données SQLite avec MCP...');
initDatabase();
runMigrations();
seedMCPServers();
console.log('✅ Base de données SQLite avec MCP initialisée');

// === ROUTES EXISTANTES (SQLite) ===
app.use('/api/auth', authRoutes);
app.use('/api', integrationsRoutes);
app.use('/api', conversationsRoutes);
app.use(googleCallbackRoutes);

// === ROUTES MCP (SQLite) ===
app.use('/api/mcp', mcpServersRoutes);
app.use('/api/mcp', mcpConnectionsRoutes);
app.use('/api/mcp', mcpMemoryRoutes);
app.use('/api', chatMCPRoutes);
app.use('/api/chat', chatStreamRoutes); // Routes de streaming et features avancées

// === ROUTES OAUTH ===
app.use('/api/auth', oauthGoogleRoutes);
app.use('/api/auth', oauthSlackRoutes);
app.use('/api/auth', oauthSalesforceRoutes);
app.use('/api/auth', oauthTeamsRoutes);

// === ROUTES API KEY ===
app.use('/api/auth', authApiKeyRoutes);

// === ROUTES LLM ===
app.use('/api/llm', llmRoutes);

// Health check
app.get('/health', (req, res) => {
  const stats = mcpClientManager.getStats();
  res.json({
    status: 'ok',
    version: '2.0.0-mcp-sqlite',
    database: 'SQLite',
    timestamp: new Date().toISOString(),
    mcp: {
      activeClients: stats.totalActiveClients,
      activeUsers: stats.totalUsers
    }
  });
});

// Info sur l'API
app.get('/api/info', (req, res) => {
  res.json({
    name: 'ChatAI MCP API (SQLite)',
    version: '2.0.0-sqlite',
    database: 'SQLite',
    features: [
      'Multi-LLM support (OpenRouter)',
      'Model Context Protocol (MCP) integration',
      'Tool calling and function execution',
      'SQLite database (no PostgreSQL required)',
      'Real-time MCP server management',
      'Integrated OAuth for multiple providers'
    ],
    endpoints: {
      auth: [
        'POST /api/auth/signup',
        'POST /api/auth/login',
        'GET /api/auth/me',
        'GET /api/auth/google (OAuth)',
        'GET /api/auth/google/callback',
        'GET /api/auth/google/status'
      ],
      chat: [
        'POST /api/chat',
        'GET /api/chat/available-tools'
      ],
      conversations: [
        'GET /api/conversations',
        'POST /api/conversations',
        'GET /api/conversations/:id',
        'PUT /api/conversations/:id',
        'DELETE /api/conversations/:id'
      ],
      mcp: [
        'GET /api/mcp/servers',
        'GET /api/mcp/servers/:id',
        'POST /api/mcp/servers',
        'PUT /api/mcp/servers/:id',
        'DELETE /api/mcp/servers/:id',
        'GET /api/mcp/categories',
        'GET /api/mcp/connections',
        'POST /api/mcp/connections',
        'PATCH /api/mcp/connections/:id/config',
        'DELETE /api/mcp/connections/:id',
        'POST /api/mcp/connections/:id/test',
        'GET /api/mcp/connections/:id/tools',
        'POST /api/mcp/tools/execute',
        'GET /api/mcp/stats',
        'GET /api/mcp/memory/list',
        'POST /api/mcp/memory/store',
        'DELETE /api/mcp/memory/:id'
      ]
    }
  });
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Démarrer le serveur
const server = app.listen(PORT, () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 ChatAI MCP Server v2.0.0 (SQLite)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server:          http://localhost:${PORT}`);
  console.log(`🏥 Health check:    http://localhost:${PORT}/health`);
  console.log(`📚 API info:        http://localhost:${PORT}/api/info`);
  console.log(`🎨 Frontend:        ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log('');
  console.log('✨ MCP Features (SQLite):');
  console.log('   • Tool calling via Model Context Protocol');
  console.log('   • Dynamic server connection management');
  console.log('   • Multi-provider OAuth integration');
  console.log('   • Real-time tool execution tracking');
  console.log('   • SQLite database (no PostgreSQL needed!)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

// Gestion propre de l'arrêt
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} reçu, arrêt gracieux...`);

  server.close(() => {
    console.log('🔌 Serveur HTTP fermé');

    // Fermer toutes les connexions MCP
    const stats = mcpClientManager.getStats();
    if (stats.totalActiveClients > 0) {
      console.log(`🔌 Fermeture de ${stats.totalActiveClients} clients MCP...`);
    }

    console.log('✅ Arrêt terminé proprement');
    process.exit(0);
  });

  // Force l'arrêt après 10 secondes
  setTimeout(() => {
    console.error('⚠️  Arrêt forcé après timeout');
    process.exit(1);
  }, 10000);
};

// Écouter les signaux d'arrêt
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;
