const jwt = require('jsonwebtoken');
const redisClient = require('../redis');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, code: 'AUTH_MISSING', message: 'Authorization header missing or invalid' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check Redis session
    const sessionData = await redisClient.get(`session:${decoded.userId}`);
    if (!sessionData) {
      return res.status(401).json({ error: true, code: 'AUTH_EXPIRED', message: 'Session expired or invalid' });
    }

    const session = JSON.parse(sessionData);
    if (session.token !== token) {
      // Token mismatch (e.g. user logged in elsewhere)
      return res.status(401).json({ error: true, code: 'AUTH_INVALID', message: 'Invalid session token' });
    }

    // Attach user payload from JWT to req
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: true, code: 'AUTH_EXPIRED', message: 'Token expired' });
    }
    return res.status(401).json({ error: true, code: 'AUTH_ERROR', message: 'Authentication failed' });
  }
};

module.exports = { requireAuth };
