const dataStore = require('../stores/dataStore');
const env = require('../config/env');

/**
 * Controller for WhatsApp Flows Endpoint
 * Handles Meta Flows submissions and terminal screen response
 */
exports.handleFlowSubmission = async (req, res) => {
  const body = req.body || {};

  // 1. Handle Meta Flow Builder Health Check / Ping
  if (body.action === 'ping') {
    return res.status(200).json({
      version: '3.0',
      data: { status: 'active' },
    });
  }

  // 2. Extract submitted flow payload (supports both nested 'data' or flat body)
  const data = body.data || body;
  const category = data.category || body.category || 'General';
  const description = data.description || data.issue || body.description || 'No description provided';
  const flowToken = body.flow_token || data.flow_token;

  // 3. Resolve the exact member's phone number from the dynamic flow_token
  const memberPhone = dataStore.getFlowPhone(flowToken) || data.phone || body.phone || 'WhatsApp User';

  // 4. Generate mock ticket ID (e.g. TKT-501)
  const ticketId = dataStore.generateFlowTicketId();

  // 5. Log the data to console
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 [WhatsApp Flow Endpoint] New Submission Received:');
  console.log(`   • Member Phone: ${memberPhone}`);
  console.log(`   • Flow Token:   ${flowToken}`);
  console.log(`   • Category:     ${category}`);
  console.log(`   • Description:  ${description}`);
  console.log(`   • Ticket ID:    ${ticketId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Store in in-memory store linked to this exact member
  dataStore.createTicket({
    ticketCode: ticketId,
    phone: memberPhone,
    category,
    description,
  });

  // 5. Build terminal success response matching WhatsApp Flows specification
  const successMessage = `Your ticket #${ticketId} has been submitted successfully.`;

  const responsePayload = {
    version: '3.0',
    screen: 'SUCCESS',
    data: {
      ticket_id: ticketId,
      message: successMessage,
      extension_message_response: {
        params: {
          flow_token: flowToken,
          ticket_id: ticketId,
          message: successMessage,
        },
      },
    },
  };

  return res.status(200).json(responsePayload);
};
