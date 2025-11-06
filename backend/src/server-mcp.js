import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, seedMCPServers, closePool } from './config/database-pg.js';

// Routes PostgreSQL
import authRoutes from './routes/auth-pg.js';
import conversationsRoutes from './routes/conversations-pg.js';
import integrationsRoutes from './routes/integrations.js';
import googleCallbackRoutes from './routes/googleCallback.js';

// Nouvelles routes MCP
import mcpServersRoutes from './routes/mcp-servers.js';
import mcpConnectionsRoutes from './routes/mcp-connections.js';
import chatMCPRoutes from './routes/chat-mcp.js';

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
const initializeApp = async () => {
  try {
    console.log('🔄 Initialisation de la base de données PostgreSQL...');
    await initDatabase();

    console.log('🔄 Seed des serveurs MCP...');
    await seedMCPServers();

    console.log('✅ Application initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
};

// Attendre l'initialisation avant de démarrer
await initializeApp();

// === ROUTES EXISTANTES ===
app.use('/api/auth', authRoutes);
app.use('/api', integrationsRoutes);
app.use('/api', conversationsRoutes);
app.use(googleCallbackRoutes);

// === NOUVELLES ROUTES MCP ===
app.use('/api/mcp', mcpServersRoutes);
app.use('/api/mcp', mcpConnectionsRoutes);
app.use('/api', chatMCPRoutes);

// Health check
app.get('/health', (req, res) => {
  const stats = mcpClientManager.getStats();
  res.json({
    status: 'ok',
    version: '2.0.0-mcp',
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
    name: 'ChatAI MCP API',
    version: '2.0.0',
    features: [
      'Multi-LLM support (Gemini, Claude)',
      'Model Context Protocol (MCP) integration',
      'Tool calling and function execution',
      'Multi-tenant architecture',
      'PostgreSQL database',
      'Real-time MCP server management',
      'Integrated OAuth for multiple providers'
    ],
    endpoints: {
      auth: [
        'POST /api/auth/signup',
        'POST /api/auth/login',
        'GET /api/auth/me'
      ],
      chat: [
        'POST /api/chat',
        'GET /api/chat/available-tools'
      ],
      conversations: [
        'GET /api/conversations',
        'POST /api/conversations',
        'GET /api/conversations/:id',
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
        'DELETE /api/mcp/connections/:id',
        'POST /api/mcp/connections/:id/test',
        'GET /api/mcp/connections/:id/tools',
        'POST /api/mcp/tools/execute',
        'GET /api/mcp/stats'
      ]
    }
  });
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);

  // Erreurs spécifiques PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        return res.status(409).json({
          success: false,
          error: 'Resource already exists'
        });
      case '23503': // Foreign key violation
        return res.status(400).json({
          success: false,
          error: 'Invalid reference'
        });
      case '23502': // Not null violation
        return res.status(400).json({
          success: false,
          error: 'Missing required field'
        });
      default:
        break;
    }
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
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
  console.log('🚀 ChatAI MCP Server v2.0.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server:          http://localhost:${PORT}`);
  console.log(`🏥 Health check:    http://localhost:${PORT}/health`);
  console.log(`📚 API info:        http://localhost:${PORT}/api/info`);
  console.log(`🎨 Frontend:        ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log('');
  console.log('✨ MCP Features:');
  console.log('   • Tool calling via Model Context Protocol');
  console.log('   • Dynamic server connection management');
  console.log('   • Multi-provider OAuth integration');
  console.log('   • Real-time tool execution tracking');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

// Gestion propre de l'arrêt
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} reçu, arrêt gracieux...`);

  server.close(async () => {
    console.log('🔌 Serveur HTTP fermé');

    // Fermer toutes les connexions MCP
    const stats = mcpClientManager.getStats();
    if (stats.totalActiveClients > 0) {
      console.log(`🔌 Fermeture de ${stats.totalActiveClients} clients MCP...`);
      // Note: Implémenter une méthode closeAll() dans mcpClientManager si nécessaire
    }

    // Fermer le pool PostgreSQL
    await closePool();

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
