const { requireAuth } = require('./authMiddleware');

const requireAdmin = [
  requireAuth,
  (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Admin access required' });
    }
  }
];

module.exports = { requireAdmin };
