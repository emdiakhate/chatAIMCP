import rateLimit from 'express-rate-limit';

/**
 * Rate limiter général pour toutes les routes API
 * 100 requêtes par 15 minutes par IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite à 100 requêtes par fenêtre
  message: {
    error: 'Trop de requêtes depuis cette IP, veuillez réessayer dans 15 minutes'
  },
  standardHeaders: true, // Retourner les infos de rate limit dans les headers `RateLimit-*`
  legacyHeaders: false, // Désactiver les headers `X-RateLimit-*`
  // Identifier les utilisateurs par IP
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
});

/**
 * Rate limiter strict pour l'authentification
 * 5 tentatives par 15 minutes par IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 tentatives de connexion
  message: {
    error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne pas compter les requêtes réussies
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
});

/**
 * Rate limiter pour les messages de chat
 * 30 messages par minute par utilisateur
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Maximum 30 messages par minute
  message: {
    error: 'Trop de messages envoyés, veuillez ralentir'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Identifier par userId si authentifié, sinon par IP
  keyGenerator: (req) => {
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}`;
    }
    return req.ip || req.connection.remoteAddress;
  },
});

/**
 * Rate limiter pour l'upload de fichiers
 * 20 uploads par heure par utilisateur
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // Maximum 20 uploads par heure
  message: {
    error: 'Limite d\'uploads atteinte, veuillez réessayer dans 1 heure'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}`;
    }
    return req.ip || req.connection.remoteAddress;
  },
});

/**
 * Rate limiter pour les connexions MCP
 * 10 connexions par minute par utilisateur
 */
export const mcpConnectionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Maximum 10 connexions MCP par minute
  message: {
    error: 'Trop de tentatives de connexion MCP, veuillez patienter'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}`;
    }
    return req.ip || req.connection.remoteAddress;
  },
});

/**
 * Rate limiter pour les recherches
 * 60 recherches par minute par utilisateur
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Maximum 60 recherches par minute
  message: {
    error: 'Trop de recherches, veuillez ralentir'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}`;
    }
    return req.ip || req.connection.remoteAddress;
  },
});
