const dataStore = require('../stores/dataStore');
const whatsapp = require('../services/whatsapp.service');

/**
 * Admin Controller: View Tickets, View Member Updates, and Close Ticket
 */
exports.getTickets = async (req, res) => {
  try {
    const stats = await dataStore.getTicketStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUpdates = async (req, res) => {
  try {
    const updates = await dataStore.getAllMemberUpdates();
    res.json({
      count: updates.length,
      updates,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.closeTicket = async (req, res) => {
  const code = req.params.code || req.params.id;
  const { remarks } = req.body;

  if (!remarks || !remarks.trim()) {
    return res.status(400).json({ error: 'Closing remarks are required.' });
  }

  const ticket = await dataStore.closeTicket(code, remarks);
  if (!ticket) {
    return res.status(404).json({ error: `Ticket #${code} not found.` });
  }

  // Notify member on WhatsApp
  try {
    await whatsapp.sendReplyButtons(
      ticket.phone,
      `🔒 Your ticket *#${ticket.ticketCode}* has been *CLOSED*.\n\n` +
      `• *Category:* ${ticket.category || 'General'}\n` +
      `• *Issue:* ${ticket.description || ticket.query}\n` +
      `• *Admin Remarks:* ${ticket.remarks}\n\n` +
      `Thank you for contacting Sangam Support! Reply "Menu" anytime if you need further assistance.`,
      [
        { id: 'CHECK_MY_TICKETS', title: 'Check My Tickets' },
        { id: 'MENU_MAIN', title: 'Main Menu' },
      ]
    );
  } catch (err) {
    console.error('Failed to notify member via WhatsApp:', err.message);
  }

  console.log('🔒 Ticket Closed:', ticket);
  return res.json({ message: 'Ticket closed and member notified.', ticket });
};

/**
 * Live Chat Endpoints
 */
exports.getConversations = async (req, res) => {
  try {
    const conversations = await dataStore.getRecentConversations();
    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const { phone } = req.params;
    const messages = await dataStore.getChatHistory(phone);
    res.json({ phone, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendLiveReply = async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message || !message.trim()) {
    return res.status(400).json({ error: 'Phone number and message are required.' });
  }

  const cleanText = message.trim();

  // 1. Send via WhatsApp API
  try {
    await whatsapp.sendTextMessage(phone, cleanText);

    // 2. Record in Chat Store
    const savedMsg = await dataStore.addChatMessage({
      phone,
      sender: 'admin',
      text: cleanText,
    });

    console.log(`💬 [Live Chat] Admin replied to ${phone}: "${cleanText}"`);
    return res.json({ success: true, message: savedMsg });
  } catch (err) {
    console.error('Failed to send admin live reply:', err.message);
    return res.status(500).json({ error: 'Failed to send WhatsApp message', details: err.message });
  }
};
