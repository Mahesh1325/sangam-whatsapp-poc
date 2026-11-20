require('dotenv').config();
const app = require('./src/app');
const env = require('./src/config/env');

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Sangam WhatsApp POC running on http://localhost:${env.PORT}`);
  console.log(`📊 Live Admin Dashboard: http://localhost:${env.PORT}/dashboard`);
  console.log(`🔗 Webhook Verification URL: http://localhost:${env.PORT}/webhook/whatsapp`);
  console.log(`📋 WhatsApp Flow Endpoint: http://localhost:${env.PORT}/whatsapp/flow-endpoint`);
});

module.exports = { app, server };
