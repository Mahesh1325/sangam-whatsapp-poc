/**
 * API service for Admin Operations & Live Chat
 */

export const api = {
  // Tickets
  async getTickets() {
    const res = await fetch('/admin/tickets');
    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
  },

  async closeTicket(ticketCode, remarks) {
    const res = await fetch(`/admin/tickets/${ticketCode}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remarks }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to close ticket');
    }
    return res.json();
  },

  // Member Updates
  async getUpdates() {
    const res = await fetch('/admin/updates');
    if (!res.ok) throw new Error('Failed to fetch updates');
    return res.json();
  },

  // Live WhatsApp Chat
  async getConversations() {
    const res = await fetch('/admin/chat/conversations');
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  async getChatHistory(phone) {
    const res = await fetch(`/admin/chat/${phone}`);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  async sendReply(phone, message) {
    const res = await fetch('/admin/chat/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to send WhatsApp message');
    }
    return res.json();
  },
};
