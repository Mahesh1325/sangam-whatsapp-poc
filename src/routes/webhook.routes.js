const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// GET /webhook/whatsapp - Meta Webhook Verification
router.get('/whatsapp', webhookController.verifyWebhook);

// POST /webhook/whatsapp - Meta Incoming Webhook Events
router.post('/whatsapp', webhookController.handleIncoming);

module.exports = router;
