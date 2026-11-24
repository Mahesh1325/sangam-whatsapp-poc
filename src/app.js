const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const webhookRoutes = require('./routes/webhook.routes');
const flowRoutes = require('./routes/flow.routes');
const adminRoutes = require('./routes/admin.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const authRoutes = require('./routes/auth.routes');
const flowController = require('./controllers/flow.controller');
const authMiddleware = require('./middlewares/auth.middleware');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets from built React frontend
app.use(express.static(path.join(__dirname, '../public')));

// 1. Authentication Routes (Public: /login, /api/login, /logout)
app.use('/', authRoutes);

// 2. WhatsApp Flows Endpoint (Public: POST /whatsapp/flow-endpoint)
app.post('/whatsapp/flow-endpoint', flowController.handleFlowSubmission);
app.use('/whatsapp', flowRoutes);

// 3. Meta WhatsApp Webhooks (Public: GET & POST /webhook/whatsapp)
app.use('/webhook', webhookRoutes);

// 4. Admin APIs & Live Dashboard (Protected by Secure JWT & Session Cookie)
app.use('/admin', authMiddleware, adminRoutes);
app.use('/dashboard', authMiddleware, dashboardRoutes);

// Root route redirect to dashboard (will redirect to /login if unauthenticated)
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

module.exports = app;
