const dataStore = require('../stores/dataStore');
const whatsapp = require('./whatsapp.service');
const env = require('../config/env');

/**
 * Chatbot Service: Handles incoming message logic and conversation state transitions
 */
class ChatbotService {
  /**
   * Main entrypoint for processing any incoming message from WhatsApp Webhook
   */
  async handleIncomingMessage(message) {
    if (!message) return;

    const phone = message.from;
    const rawText = message.text?.body?.trim() || '';
    const textLower = rawText.toLowerCase();

    // Extract ID if an interactive button or list item was clicked
    const interactive = message.interactive;
    const actionId = interactive?.button_reply?.id || interactive?.list_reply?.id;
    const session = dataStore.getSession(phone);

    console.log(`📩 [Chatbot] From ${phone} | Action: ${actionId || interactive?.type || 'none'} | Step: ${session.step} | Text: "${rawText}"`);

    // 1. Global Reset / Navigation Commands
    if (actionId === 'MENU_MAIN' || ['hi', 'hello', 'menu', 'start', 'help', 'main menu'].includes(textLower)) {
      dataStore.clearSession(phone);
      await whatsapp.sendMainMenu(phone);
      return;
    }

    // 2. Check My Tickets Command or Button
    if (actionId === 'CHECK_MY_TICKETS' || ['my tickets', 'check tickets', 'check my tickets', 'tickets', 'status'].includes(textLower)) {
      dataStore.clearSession(phone);
      await this.handleCheckMyTickets(phone);
      return;
    }

    // 3. WhatsApp Flow Completion Reply (nfm_reply)
    if (interactive?.type === 'nfm_reply') {
      await this.handleFlowCompletionReply(phone, interactive.nfm_reply);
      return;
    }

    // 4. Trigger WhatsApp Flow for Tickets
    if (actionId === 'MENU_TICKET' || ['ticket', 'raise ticket', 'raise a ticket', 'support ticket'].includes(textLower)) {
      dataStore.clearSession(phone);
      await this.sendTicketFlow(phone);
      return;
    }

    // 5. Main Menu Button Actions
    if (actionId === 'MENU_INFO') {
      dataStore.setSession(phone, { step: 'IN_INFO_MENU' });
      await this.sendInfoList(phone);
      return;
    }

    if (actionId === 'MENU_UPDATE') {
      dataStore.setSession(phone, { step: 'AWAITING_UPDATE_CATEGORY' });
      await this.sendUpdateCategoryButtons(phone);
      return;
    }

    // 6. "Info" Topic Selections (from List Message)
    if (['INFO_MEMBERSHIP', 'INFO_EVENTS', 'INFO_OFFICE'].includes(actionId)) {
      await this.handleInfoTopicSelection(phone, actionId);
      return;
    }

    // 7. "Update Details" - Step 1: Category Selection
    if (['UPD_PHONE_EMAIL', 'UPD_ADDRESS', 'UPD_FAMILY'].includes(actionId)) {
      await this.handleUpdateCategoryChosen(phone, actionId);
      return;
    }

    // 8. Multi-step Text Input Processing (Update Details)
    if (session.step === 'AWAITING_UPDATE_TEXT' && rawText) {
      await this.handleUpdateTextReceived(phone, session, rawText);
      return;
    }

    // Fallback ticket text reply handler (if session was previously waiting for description)
    if (session.step === 'AWAITING_TICKET_DESC' && rawText) {
      await this.handleTicketDescriptionReceived(phone, session, rawText);
      return;
    }

    // 9. Fallback for unrecognized text or messages
    dataStore.setSession(phone, { step: 'MAIN_MENU' });
    await whatsapp.sendMainMenu(
      phone,
      `Hello! We received your message: "${rawText.slice(0, 45)}"\n\nPlease select an option from the menu below:`
    );
  }

  // --- Handlers for WhatsApp Flow (Requirement 4) ---
  async sendTicketFlow(phone) {
    const flowId = env.FLOW_ID || '123456789012345';
    // Generate a unique per-user token and map it in dataStore
    const flowToken = `flow_${phone}_${Date.now()}`;
    dataStore.saveFlowSession(flowToken, phone);

    console.log(`🚀 [Chatbot] Sending WhatsApp Flow interactive message to ${phone}`);
    console.log(`   • Flow ID:    ${flowId}`);
    console.log(`   • Flow Token: ${flowToken} (tied to member: +${phone})`);

    return whatsapp.sendFlowMessage({
      to: phone,
      headerText: 'Sangam Support Ticket',
      bodyText: 'Please tap the button below to open our interactive form and submit your support ticket details.',
      footerText: 'Sangam Community Association',
      ctaText: 'Raise Ticket',
      flowId,
      flowToken,
      initialScreen: 'TICKET_SCREEN',
    });
  }

  async handleFlowCompletionReply(phone, nfmReply) {
    let responseData = {};
    try {
      responseData = JSON.parse(nfmReply?.response_json || '{}');
    } catch (err) {
      console.warn('Could not parse nfm_reply response_json:', nfmReply?.response_json);
    }

    console.log('📋 [Chatbot] Flow completed by member (nfm_reply):', responseData);

    const category = responseData.category || 'General';
    const description = responseData.description || 'Submitted via WhatsApp Flow';

    // If ticket was not already created by flow endpoint, create it now
    let ticketCode = responseData.ticket_id;
    if (!ticketCode) {
      const newTicket = dataStore.createTicket({
        phone,
        category,
        description,
      });
      ticketCode = newTicket.ticketCode;
    }

    await whatsapp.sendReplyButtons(
      phone,
      `✅ Your support ticket *#${ticketCode}* has been submitted via WhatsApp Flow!\n\n• *Category:* ${category}\n• *Status:* 🟢 OPEN\n\nOur administration team will review and update you shortly.`,
      [
        { id: 'CHECK_MY_TICKETS', title: 'Check My Tickets' },
        { id: 'MENU_MAIN', title: 'Main Menu' },
      ]
    );
  }

  // --- Handlers for Info Flow ---
  async sendInfoList(phone) {
    return whatsapp.sendListMessage(
      phone,
      'Sangam Information',
      'Please select a topic from the list below to view details:',
      'Sangam Community Support',
      'View Topics',
      [
        {
          title: 'Information Directory',
          rows: [
            {
              id: 'INFO_MEMBERSHIP',
              title: 'Membership & Renewal',
              description: 'Rules, annual fees & renewal dates',
            },
            {
              id: 'INFO_EVENTS',
              title: 'Events & Meetings',
              description: 'Upcoming community schedule & meetings',
            },
            {
              id: 'INFO_OFFICE',
              title: 'Office Contact',
              description: 'Office hours, address & helpline info',
            },
          ],
        },
      ]
    );
  }

  async handleInfoTopicSelection(phone, topicId) {
    dataStore.clearSession(phone);

    if (topicId === 'INFO_MEMBERSHIP') {
      await whatsapp.sendReplyButtons(
        phone,
        '📜 *Sangam Membership & Renewal*\n\n' +
        '• *Renewal Window:* Annual renewal is due by March 31st each year.\n' +
        '• *Member Privileges:* Access to community hall, cultural festival passes, library, and AGM voting rights.\n' +
        '• *Fee Structure:* Annual Membership: ₹1,000/yr | Life Membership: ₹10,000 one-time.\n' +
        '• *Payment Options:* Pay online via the Sangam portal or at our Sangam Bhavan office counter.',
        [
          { id: 'MENU_MAIN', title: 'Main Menu' },
          { id: 'MENU_TICKET', title: 'Raise a Ticket' },
        ]
      );
      return;
    }

    if (topicId === 'INFO_EVENTS') {
      await whatsapp.sendReplyButtons(
        phone,
        '📅 *Upcoming Sangam Events & Meetings*\n\n' +
        '1. *Monthly Committee Meeting:* 1st Sunday of every month at 10:30 AM (Sangam Bhavan).\n' +
        '2. *Annual Cultural Fest & Dinner:* Dec 15–16 at Community Grounds.\n' +
        '3. *Youth Badminton Tournament:* Next Saturday, 8:00 AM onwards.\n\n' +
        'All members and their families are warmly welcome to participate!',
        [
          { id: 'MENU_MAIN', title: 'Main Menu' },
          { id: 'MENU_TICKET', title: 'Raise a Ticket' },
        ]
      );
      return;
    }

    if (topicId === 'INFO_OFFICE') {
      await whatsapp.sendReplyButtons(
        phone,
        '🏢 *Sangam Office Contact & Helpline*\n\n' +
        '• *Address:* Sangam Bhavan, 2nd Main Road, Sector 4\n' +
        '• *Working Hours:* Monday – Saturday | 9:00 AM – 6:00 PM (Closed Sundays)\n' +
        '• *Helpline:* +91 98765 43210\n' +
        '• *Support Email:* support@sangam.org\n' +
        '• *Secretary Desk:* Available Tue & Thu (4:00 PM – 6:00 PM)',
        [
          { id: 'MENU_MAIN', title: 'Main Menu' },
          { id: 'MENU_TICKET', title: 'Raise a Ticket' },
        ]
      );
      return;
    }
  }

  // --- Handlers for Update Details Flow ---
  async sendUpdateCategoryButtons(phone) {
    return whatsapp.sendReplyButtons(
      phone,
      '📝 *Update Member Details*\n\nPlease select which information you would like to update:',
      [
        { id: 'UPD_PHONE_EMAIL', title: 'Phone / Email' },
        { id: 'UPD_ADDRESS', title: 'Address' },
        { id: 'UPD_FAMILY', title: 'Family Info' },
      ]
    );
  }

  async handleUpdateCategoryChosen(phone, actionId) {
    const categoryMap = {
      UPD_PHONE_EMAIL: 'Phone / Email',
      UPD_ADDRESS: 'Address',
      UPD_FAMILY: 'Family Info',
    };
    const chosenCategory = categoryMap[actionId];
    dataStore.setSession(phone, { step: 'AWAITING_UPDATE_TEXT', category: chosenCategory });

    let prompt = '';
    if (chosenCategory === 'Phone / Email') {
      prompt = '✏️ *Update Phone / Email*\n\nPlease reply with your new phone number and/or email address:';
    } else if (chosenCategory === 'Address') {
      prompt = '✏️ *Update Address*\n\nPlease reply with your new full residential/postal address:';
    } else {
      prompt = '✏️ *Update Family Info*\n\nPlease reply with the updated family details (Names, Relationships, Age/DOB):';
    }

    await whatsapp.sendTextMessage(phone, prompt);
  }

  async handleUpdateTextReceived(phone, session, text) {
    const updateRecord = dataStore.addMemberUpdate({
      phone,
      category: session.category || 'General',
      details: text,
    });
    dataStore.clearSession(phone);

    console.log('📌 [Chatbot] Member update recorded:', updateRecord);

    await whatsapp.sendReplyButtons(
      phone,
      `✅ *Update Request Recorded!*\n\n` +
      `• *Category:* ${updateRecord.category}\n` +
      `• *Details:* ${text}\n\n` +
      `Our administration desk has logged your request and will verify your records within 24 hours.`,
      [
        { id: 'MENU_MAIN', title: 'Main Menu' },
        { id: 'CHECK_MY_TICKETS', title: 'Check My Tickets' },
      ]
    );
  }

  async handleTicketDescriptionReceived(phone, session, description) {
    const newTicket = dataStore.createTicket({
      phone,
      category: session.category || 'General',
      description,
    });
    dataStore.clearSession(phone);

    console.log('🆕 [Chatbot] New ticket created via text:', newTicket);

    await whatsapp.sendReplyButtons(
      phone,
      `✅ Ticket *#${newTicket.ticketCode}* created successfully!\n\n` +
      `• *Category:* ${newTicket.category}\n` +
      `• *Issue:* ${description}\n` +
      `• *Status:* 🟢 OPEN\n\n` +
      `Our support team has been notified. You can track this ticket anytime using the button below.`,
      [
        { id: 'CHECK_MY_TICKETS', title: 'Check My Tickets' },
        { id: 'MENU_MAIN', title: 'Main Menu' },
      ]
    );
  }

  // --- Handlers for Check My Tickets Flow ---
  async handleCheckMyTickets(phone) {
    const userTickets = dataStore.getMemberTickets(phone);

    if (userTickets.length === 0) {
      await whatsapp.sendReplyButtons(
        phone,
        '📋 *Sangam Ticket History*\n\nYou do not have any registered support tickets under this phone number.',
        [
          { id: 'MENU_TICKET', title: 'Raise a Ticket' },
          { id: 'MENU_MAIN', title: 'Main Menu' },
        ]
      );
      return;
    }

    let summaryText = `📋 *Your Support Tickets (${userTickets.length})*\n\n`;

    userTickets.slice(0, 5).forEach((t) => {
      const statusIcon = t.status === 'OPEN' ? '🟢 *OPEN*' : '⚪ *CLOSED*';
      summaryText += `🎫 *#${t.ticketCode}* • ${statusIcon}\n`;
      summaryText += `• *Category:* ${t.category}\n`;
      summaryText += `• *Issue:* ${t.description || t.query}\n`;
      if (t.status === 'CLOSED' && t.remarks) {
        summaryText += `• *Admin Remarks:* ${t.remarks}\n`;
      }
      const formattedDate = new Date(t.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      summaryText += `• *Date:* ${formattedDate}\n\n`;
    });

    await whatsapp.sendReplyButtons(phone, summaryText.trim(), [
      { id: 'MENU_TICKET', title: 'Raise a Ticket' },
      { id: 'MENU_MAIN', title: 'Main Menu' },
    ]);
  }
}

module.exports = new ChatbotService();
