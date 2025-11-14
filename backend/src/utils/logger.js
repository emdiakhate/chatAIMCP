import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Format pour la console (plus lisible)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Ajouter les métadonnées si présentes
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  })
);

// Configuration des transports
const transports = [
  // Console (niveau warn en prod pour performance)
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
  }),
];

// En production, ajouter des fichiers de logs
if (process.env.NODE_ENV === 'production') {
  const logsDir = path.join(__dirname, '../../logs');

  transports.push(
    // Logs d'erreur uniquement
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Tous les logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  );
}

// Créer le logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports,
  // Ne pas exit en cas d'erreur
  exitOnError: false,
});

/**
 * Helper pour logger les requêtes HTTP
 */
export const logRequest = (req, res, next) => {
  const start = Date.now();

  // Logger quand la réponse est terminée
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    // Si authentifié, ajouter l'user ID
    if (req.user && req.user.userId) {
      logData.userId = req.user.userId;
    }

    // Logger UNIQUEMENT les erreurs et requêtes lentes (optimisation performance)
    if (res.statusCode >= 500) {
      logger.error('Server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Client error', logData);
    } else if (duration > 3000) {
      // Abaissé à 3s pour détecter plus rapidement les problèmes
      logger.warn('Slow request', logData);
    }
    // Ne plus logger toutes les requêtes réussies pour optimiser les performances
  });

  next();
};

/**
 * Helper pour logger les erreurs
 */
export const logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  });
};

/**
 * Helper pour logger les opérations MCP
 */
export const logMCPOperation = (operation, data) => {
  logger.info(`MCP: ${operation}`, {
    category: 'mcp',
    operation,
    ...data,
  });
};

/**
 * Helper pour logger l'authentification
 */
export const logAuth = (action, data) => {
  logger.info(`Auth: ${action}`, {
    category: 'auth',
    action,
    ...data,
  });
};

/**
 * Helper pour logger les performances
 */
export const logPerformance = (operation, duration, data = {}) => {
  const level = duration > 10000 ? 'warn' : duration > 5000 ? 'info' : 'debug';

  logger[level](`Performance: ${operation}`, {
    category: 'performance',
    operation,
    duration: `${duration}ms`,
    ...data,
  });
};

export default logger;
