const env = require('../config/env');
const chatbotService = require('../services/chatbot.service');

/**
 * Webhook Controller: Meta Verification (GET) and Incoming Notifications (POST)
 */
exports.verifyWebhook = (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

  if (mode === 'subscribe' && token === env.VERIFY_TOKEN) {
    console.log('✅ Webhook verified by Meta!');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Webhook verification failed. Token mismatch.');
  return res.sendStatus(403);
};

exports.handleIncoming = async (req, res) => {
  // Always acknowledge immediately with 200 HTTP status to Meta
  res.sendStatus(200);

  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message) {
      await chatbotService.handleIncomingMessage(message);
    }
  } catch (err) {
    console.error('Error handling incoming webhook:', err);
  }
};
