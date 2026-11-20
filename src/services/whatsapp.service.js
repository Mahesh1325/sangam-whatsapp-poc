const env = require('../config/env');

/**
 * Low-level sender for Meta WhatsApp Cloud API
 */
async function sendWhatsAppMessage(payload) {
  try {
    const res = await fetch(env.GRAPH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('WhatsApp API Error:', JSON.stringify(data, null, 2));
    }
    return data;
  } catch (err) {
    console.error('WhatsApp API network error:', err.message);
    return null;
  }
}

/**
 * Send plain text message
 */
async function sendTextMessage(to, text) {
  return sendWhatsAppMessage({
    to,
    type: 'text',
    text: { body: text },
  });
}

/**
 * Send interactive reply buttons (max 3 buttons, button title max 20 chars)
 */
async function sendReplyButtons(to, bodyText, buttons) {
  return sendWhatsAppMessage({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: 'reply',
          reply: {
            id: b.id,
            title: b.title.slice(0, 20),
          },
        })),
      },
    },
  });
}

/**
 * Send interactive list message (sections with rows)
 */
async function sendListMessage(to, headerText, bodyText, footerText, buttonLabel, sections) {
  return sendWhatsAppMessage({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText.slice(0, 60) },
      body: { text: bodyText },
      footer: { text: footerText.slice(0, 60) },
      action: {
        button: buttonLabel.slice(0, 20),
        sections,
      },
    },
  });
}

/**
 * Send WhatsApp Flow interactive message
 */
async function sendFlowMessage({
  to,
  headerText = 'Sangam Support Ticket',
  bodyText = 'Please tap below to open our interactive form and submit your support ticket details.',
  footerText = 'Sangam Community Association',
  ctaText = 'Raise Ticket',
  flowId = env.FLOW_ID,
  flowToken = env.FLOW_TOKEN,
  initialScreen = 'START',
  flowActionPayload = {},
}) {
  const payload = {
    to,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: {
        type: 'text',
        text: headerText.slice(0, 60),
      },
      body: {
        text: bodyText,
      },
      footer: {
        text: footerText.slice(0, 60),
      },
      action: {
        name: 'flow',
        parameters: {
          ...(env.FLOW_MODE === 'draft' ? { mode: 'draft' } : {}),
          flow_message_version: '3',
          flow_token: flowToken,
          flow_id: flowId,
          flow_cta: ctaText.slice(0, 20),
          flow_action: 'navigate',
          flow_action_payload: {
            screen: initialScreen,
            ...flowActionPayload,
          },
        },
      },
    },
  };

  return sendWhatsAppMessage(payload);
}

/**
 * Send 3-Button Main Menu
 */
async function sendMainMenu(to, customGreeting) {
  const greeting = customGreeting || 'Welcome to Sangam Support! How can we help you today?';
  return sendReplyButtons(to, greeting, [
    { id: 'MENU_INFO', title: 'Info' },
    { id: 'MENU_UPDATE', title: 'Update Details' },
    { id: 'MENU_TICKET', title: 'Raise a Ticket' },
  ]);
}

module.exports = {
  sendWhatsAppMessage,
  sendTextMessage,
  sendReplyButtons,
  sendListMessage,
  sendFlowMessage,
  sendMainMenu,
};
