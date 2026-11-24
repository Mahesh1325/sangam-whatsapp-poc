const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Authentication Middleware: Protects Dashboard & Admin API routes
 */
module.exports = function authMiddleware(req, res, next) {
  // 1. Check token in cookies or Authorization header
  const token = req.cookies?.sangam_token || req.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    // If request accepts HTML (browser viewing /dashboard), redirect to /login
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
};
