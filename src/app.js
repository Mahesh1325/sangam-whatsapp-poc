const express = require('express');
const webhookRoutes = require('./routes/webhook.routes');
const flowRoutes = require('./routes/flow.routes');
const adminRoutes = require('./routes/admin.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const flowController = require('./controllers/flow.controller');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. WhatsApp Flows Endpoint (POST /whatsapp/flow-endpoint)
app.post('/whatsapp/flow-endpoint', flowController.handleFlowSubmission);
app.use('/whatsapp', flowRoutes);

// 2. Meta WhatsApp Webhooks (GET & POST /webhook/whatsapp)
app.use('/webhook', webhookRoutes);

// 3. Admin APIs & Live Dashboard
app.use('/admin', adminRoutes);
app.use('/dashboard', dashboardRoutes);

// Root route redirect to dashboard for convenience
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

module.exports = app;
