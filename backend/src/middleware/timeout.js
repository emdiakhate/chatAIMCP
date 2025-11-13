/**
 * Middleware pour gérer les timeouts des requêtes
 * Annule automatiquement les requêtes qui prennent trop de temps
 *
 * @param {number} timeout - Timeout en millisecondes (default: 30s)
 * @returns {Function} Middleware Express
 */
export const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    // Ne pas appliquer de timeout sur les routes SSE (streaming)
    if (req.path.includes('/stream') || req.path.includes('/chat')) {
      return next();
    }

    // Créer un timer
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`⏱️  Request timeout: ${req.method} ${req.path}`);
        res.status(408).json({
          error: 'La requête a pris trop de temps',
          message: 'Request timeout - veuillez réessayer'
        });
      }
    }, timeout);

    // Nettoyer le timer quand la réponse est envoyée
    const originalSend = res.send;
    res.send = function (...args) {
      clearTimeout(timeoutId);
      return originalSend.apply(res, args);
    };

    const originalJson = res.json;
    res.json = function (...args) {
      clearTimeout(timeoutId);
      return originalJson.apply(res, args);
    };

    // Nettoyer le timer si la connexion est fermée
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

/**
 * Middleware spécifique pour les routes MCP
 * Timeout plus long pour les opérations MCP (60s)
 */
export const mcpTimeout = requestTimeout(60000);

/**
 * Middleware pour les routes d'authentification
 * Timeout court (10s)
 */
export const authTimeout = requestTimeout(10000);

/**
 * Middleware pour les uploads
 * Timeout long (5 minutes)
 */
export const uploadTimeout = requestTimeout(5 * 60 * 1000);
