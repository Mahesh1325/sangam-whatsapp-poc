/**
 * Supabase Store for Sangam WhatsApp Support POC.
 * Directly reads & writes to Supabase PostgreSQL with in-memory fallback.
 */
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

// Fast volatile state for active conversation turns & flow tokens
const sessions = new Map();     // phone -> { step: string, category?: string, draft?: string }
const flowSessions = new Map(); // flowToken -> { phone: string, createdAt: string }

// In-memory fallbacks only used if Supabase is offline/not configured
const memTickets = [];
const memMemberUpdates = [];
const memChatMessages = [];
const memAdminUsers = [];
let ticketCounter = 100;
let flowTicketCounter = 500;
let updateCounter = 1;
let chatMsgCounter = 1;

module.exports = {
  // --- Admin User Management ---
  async createAdminUser(username, plainPassword, role = 'admin') {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

    if (supabase) {
      const { data, error } = await supabase
        .from('admin_users')
        .upsert(
          { username, password_hash: passwordHash, role },
          { onConflict: 'username' }
        )
        .select()
        .single();

      if (error) throw new Error(`Supabase error creating admin: ${error.message}`);
      return data;
    }

    // In-memory fallback
    const existingIndex = memAdminUsers.findIndex((u) => u.username === username);
    const userObj = {
      id: `usr_${Date.now()}`,
      username,
      password_hash: passwordHash,
      role,
      created_at: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      memAdminUsers[existingIndex] = userObj;
    } else {
      memAdminUsers.push(userObj);
    }
    return userObj;
  },

  async verifyAdminUser(username, plainPassword) {
    let user = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (!error && data) user = data;
    }

    if (!user) {
      user = memAdminUsers.find((u) => u.username === username);
    }

    if (!user) return null;

    const matches = await bcrypt.compare(plainPassword, user.password_hash);
    return matches ? user : null;
  },

  // --- Sessions (Chatbot State Machine) ---
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
    const session = flowSessions.get(flowToken);
    if (session?.phone) return session.phone;

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

  async createTicket({ phone, category, description, ticketCode }) {
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
      query: description,
      status: 'OPEN',
      remarks: null,
      createdAt: new Date().toISOString(),
      closedAt: null,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .insert({
            ticket_code: newTicket.ticketCode,
            phone: newTicket.phone,
            category: newTicket.category,
            description: newTicket.description,
            status: newTicket.status,
          })
          .select()
          .single();

        if (error) console.error('Supabase createTicket error:', error.message);
        if (data) {
          return {
            ticketCode: data.ticket_code,
            phone: data.phone,
            category: data.category,
            description: data.description,
            query: data.description,
            status: data.status,
            remarks: data.remarks,
            createdAt: data.created_at,
            closedAt: data.closed_at,
          };
        }
      } catch (err) {
        console.error('Supabase createTicket error:', err.message);
      }
    }

    // Fallback to memory
    memTickets.push(newTicket);
    return newTicket;
  },

  async findTicket(codeOrId) {
    if (supabase) {
      try {
        const { data } = await supabase
          .from('tickets')
          .select('*')
          .ilike('ticket_code', String(codeOrId).trim())
          .maybeSingle();

        if (data) {
          return {
            ticketCode: data.ticket_code,
            phone: data.phone,
            category: data.category,
            description: data.description,
            query: data.description,
            status: data.status,
            remarks: data.remarks,
            createdAt: data.created_at,
            closedAt: data.closed_at,
          };
        }
      } catch (err) {
        console.error('Supabase findTicket error:', err.message);
      }
    }

    return memTickets.find(
      (t) => t.ticketCode === codeOrId || String(t.ticketCode).toLowerCase() === String(codeOrId).toLowerCase()
    );
  },

  async closeTicket(codeOrId, remarks) {
    const trimmedRemarks = (remarks || '').trim();
    const closedTime = new Date().toISOString();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .update({
            status: 'CLOSED',
            remarks: trimmedRemarks,
            closed_at: closedTime,
          })
          .ilike('ticket_code', String(codeOrId).trim())
          .select()
          .maybeSingle();

        if (!error && data) {
          return {
            ticketCode: data.ticket_code,
            phone: data.phone,
            category: data.category,
            description: data.description,
            query: data.description,
            status: data.status,
            remarks: data.remarks,
            createdAt: data.created_at,
            closedAt: data.closed_at,
          };
        }
      } catch (err) {
        console.error('Supabase closeTicket error:', err.message);
      }
    }

    const ticket = memTickets.find(
      (t) => t.ticketCode === codeOrId || String(t.ticketCode).toLowerCase() === String(codeOrId).toLowerCase()
    );
    if (!ticket) return null;
    ticket.status = 'CLOSED';
    ticket.remarks = trimmedRemarks;
    ticket.closedAt = closedTime;
    return ticket;
  },

  async getAllTickets() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data.map((t) => ({
            ticketCode: t.ticket_code,
            phone: t.phone,
            category: t.category,
            description: t.description,
            query: t.description,
            status: t.status,
            remarks: t.remarks,
            createdAt: t.created_at,
            closedAt: t.closed_at,
          }));
        }
      } catch (err) {
        console.error('Supabase getAllTickets error:', err.message);
      }
    }
    return memTickets;
  },

  async getMemberTickets(phone) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('phone', phone)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data.map((t) => ({
            ticketCode: t.ticket_code,
            phone: t.phone,
            category: t.category,
            description: t.description,
            query: t.description,
            status: t.status,
            remarks: t.remarks,
            createdAt: t.created_at,
            closedAt: t.closed_at,
          }));
        }
      } catch (err) {
        console.error('Supabase getMemberTickets error:', err.message);
      }
    }
    return memTickets
      .filter((t) => t.phone === phone)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getTicketStats() {
    const all = await this.getAllTickets();
    return {
      count: all.length,
      openCount: all.filter((t) => t.status === 'OPEN').length,
      closedCount: all.filter((t) => t.status === 'CLOSED').length,
      tickets: all,
    };
  },

  // --- Member Updates ---
  async addMemberUpdate({ phone, category, details }) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('member_updates')
          .insert({
            phone,
            category: category || 'General',
            details,
          })
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            phone: data.phone,
            category: data.category,
            details: data.details,
            createdAt: data.created_at,
          };
        }
      } catch (err) {
        console.error('Supabase addMemberUpdate error:', err.message);
      }
    }

    const updateRecord = {
      id: updateCounter++,
      phone,
      category: category || 'General',
      details,
      createdAt: new Date().toISOString(),
    };
    memMemberUpdates.push(updateRecord);
    return updateRecord;
  },

  async getAllMemberUpdates() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('member_updates')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data.map((u) => ({
            id: u.id,
            phone: u.phone,
            category: u.category,
            details: u.details,
            createdAt: u.created_at,
          }));
        }
      } catch (err) {
        console.error('Supabase getAllMemberUpdates error:', err.message);
      }
    }
    return memMemberUpdates;
  },

  // --- Live Chat Messages ---
  async addChatMessage({ phone, sender, text }) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            phone,
            sender: sender || 'user',
            text: text || '',
          })
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            phone: data.phone,
            sender: data.sender,
            text: data.text,
            timestamp: data.created_at,
          };
        }
      } catch (err) {
        console.error('Supabase addChatMessage error:', err.message);
      }
    }

    const msg = {
      id: chatMsgCounter++,
      phone: phone || 'WhatsApp User',
      sender: sender || 'user',
      text: text || '',
      timestamp: new Date().toISOString(),
    };
    memChatMessages.push(msg);
    if (memChatMessages.length > 1000) memChatMessages.shift();
    return msg;
  },

  async getChatHistory(phone) {
    if (supabase) {
      try {
        let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
        if (phone) {
          query = query.eq('phone', phone);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          return data.map((m) => ({
            id: m.id,
            phone: m.phone,
            sender: m.sender,
            text: m.text,
            timestamp: m.created_at,
          }));
        }
      } catch (err) {
        console.error('Supabase getChatHistory error:', err.message);
      }
    }

    if (!phone) return memChatMessages;
    return memChatMessages.filter((m) => m.phone === phone);
  },

  async getRecentConversations() {
    if (supabase) {
      try {
        // Fetch all recent messages ordered newest first
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (!error && Array.isArray(data)) {
          const convMap = new Map();
          for (const msg of data) {
            if (!convMap.has(msg.phone)) {
              convMap.set(msg.phone, {
                phone: msg.phone,
                lastMessage: msg.text,
                lastSender: msg.sender,
                timestamp: msg.created_at,
              });
            }
          }
          return Array.from(convMap.values());
        }
      } catch (err) {
        console.error('Supabase getRecentConversations error:', err.message);
      }
    }

    const convMap = new Map();
    for (let i = memChatMessages.length - 1; i >= 0; i--) {
      const msg = memChatMessages[i];
      if (!convMap.has(msg.phone)) {
        convMap.set(msg.phone, {
          phone: msg.phone,
          lastMessage: msg.text,
          lastSender: msg.sender,
          timestamp: msg.timestamp,
        });
      }
    }
    return Array.from(convMap.values());
  },
};
