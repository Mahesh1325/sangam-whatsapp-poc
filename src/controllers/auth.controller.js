const jwt = require('jsonwebtoken');
const path = require('path');
const dataStore = require('../stores/dataStore');
const env = require('../config/env');

exports.renderLoginPage = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
};

exports.login = async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await dataStore.verifyAdminUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role || 'admin' },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set secure HTTP-only cookie
    res.cookie('sangam_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, redirect: '/dashboard' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('sangam_token');
  res.redirect('/login');
};
