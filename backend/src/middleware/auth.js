import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  // Accepter le token depuis les headers (Bearer token) ou depuis les query params (pour OAuth popups)
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.split(' ')[1];
  const tokenFromQuery = req.query.token;
  const token = tokenFromHeader || tokenFromQuery;

  if (!token) {
    console.error('[Auth] No token found in request:', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      hasQueryToken: !!tokenFromQuery,
      queryParams: Object.keys(req.query)
    });
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    console.log('[Auth] Token verified for user:', user.userId, 'on path:', req.path);
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
