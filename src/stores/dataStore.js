/**
 * In-memory data store for Sangam WhatsApp Support POC.
 */

const sessions = new Map();     // phone -> { step: string, category?: string, draft?: string }
const flowSessions = new Map(); // flowToken -> { phone: string, createdAt: string }
const tickets = [];             // Array of ticket records
const memberUpdates = [];       // Array of member detail change logs
let ticketCounter = 100;
let flowTicketCounter = 500;
let updateCounter = 1;

module.exports = {
  // --- Sessions ---
  getSession(phone) {
    return sessions.get(phone) || { step: 'IDLE' };
  },
  setSession(phone, data) {
    sessions.set(phone, { ...this.getSession(phone), ...data, updatedAt: new Date().toISOString() });
  },
  clearSession(phone) {
    sessions.set(phone, { step: 'IDLE' });
  },

  // --- Dynamic Flow Session Mapping ---
  saveFlowSession(flowToken, phone) {
    flowSessions.set(flowToken, { phone, createdAt: new Date().toISOString() });
  },
  getFlowPhone(flowToken) {
    // 1. Look up in active flow sessions map
    const session = flowSessions.get(flowToken);
    if (session?.phone) return session.phone;

    // 2. Fallback: Parse directly if token follows format `flow_<phone>_<timestamp>`
    if (flowToken && typeof flowToken === 'string') {
      const match = flowToken.match(/^flow_(\d+)_/);
      if (match) return match[1];
    }
    return null;
  },

  // --- Tickets ---
  generateFlowTicketId() {
    flowTicketCounter += 1;
    return `TKT-${flowTicketCounter}`;
  },

  createTicket({ phone, category, description, ticketCode }) {
    let code = ticketCode;
    if (!code) {
      ticketCounter += 1;
      code = `TKT-${ticketCounter}`;
    }
    const newTicket = {
      ticketCode: code,
      phone: phone || 'WhatsApp User',
      category: category || 'General',
      description,
      query: description, // backward compatibility
      status: 'OPEN',
      remarks: null,
      createdAt: new Date().toISOString(),
      closedAt: null,
    };
    tickets.push(newTicket);
    return newTicket;
  },

  findTicket(codeOrId) {
    return tickets.find(
      (t) => t.ticketCode === codeOrId || String(t.ticketCode).toLowerCase() === String(codeOrId).toLowerCase()
    );
  },

  closeTicket(codeOrId, remarks) {
    const ticket = this.findTicket(codeOrId);
    if (!ticket) return null;
    ticket.status = 'CLOSED';
    ticket.remarks = remarks.trim();
    ticket.closedAt = new Date().toISOString();
    return ticket;
  },

  getAllTickets() {
    return tickets;
  },

  getMemberTickets(phone) {
    return tickets
      .filter((t) => t.phone === phone)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getTicketStats() {
    return {
      count: tickets.length,
      openCount: tickets.filter((t) => t.status === 'OPEN').length,
      closedCount: tickets.filter((t) => t.status === 'CLOSED').length,
      tickets,
    };
  },

  // --- Member Updates ---
  addMemberUpdate({ phone, category, details }) {
    const updateRecord = {
      id: updateCounter++,
      phone,
      category: category || 'General',
      details,
      createdAt: new Date().toISOString(),
    };
    memberUpdates.push(updateRecord);
    return updateRecord;
  },

  getAllMemberUpdates() {
    return memberUpdates;
  },
};
