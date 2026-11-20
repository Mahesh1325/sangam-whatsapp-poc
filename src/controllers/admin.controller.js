const dataStore = require('../stores/dataStore');
const whatsapp = require('../services/whatsapp.service');

/**
 * Admin Controller: View Tickets, View Member Updates, and Close Ticket
 */
exports.getTickets = (req, res) => {
  const stats = dataStore.getTicketStats();
  res.json(stats);
};

exports.getUpdates = (req, res) => {
  const updates = dataStore.getAllMemberUpdates();
  res.json({
    count: updates.length,
    updates,
  });
};

exports.closeTicket = async (req, res) => {
  const code = req.params.code || req.params.id;
  const { remarks } = req.body;

  if (!remarks || !remarks.trim()) {
    return res.status(400).json({ error: 'Closing remarks are required.' });
  }

  const ticket = dataStore.closeTicket(code, remarks);
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
