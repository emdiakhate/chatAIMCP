import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { initDatabase } from './config/database.js';
import { generalLimiter, authLimiter } from './middleware/rateLimiter.js';
import { requestTimeout } from './middleware/timeout.js';
import logger, { logRequest } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import integrationsRoutes from './routes/integrations.js';
import conversationsRoutes from './routes/conversations.js';
import chatRoutes from './routes/chat.js';
import googleCallbackRoutes from './routes/googleCallback.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Compression middleware pour réduire la taille des réponses
app.use(compression({
  filter: (req, res) => {
    // Toujours compresser SSE (text/event-stream)
    if (res.getHeader('Content-Type') === 'text/event-stream') {
      return true;
    }
    return compression.filter(req, res);
  },
  level: 6, // Niveau de compression (0-9, 6 est un bon compromis)
  threshold: 1024, // Compresser seulement si > 1KB
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// Logging des requêtes HTTP
app.use(logRequest);

// Timeout global (30s) - sauf pour streaming
app.use(requestTimeout(30000));

// Rate limiting global
app.use('/api/', generalLimiter);

initDatabase();

// Rate limiting spécifique pour l'authentification
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', integrationsRoutes);
app.use('/api', conversationsRoutes);
app.use('/api', chatRoutes);
app.use(googleCallbackRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  logger.error('Server error', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.userId,
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});
