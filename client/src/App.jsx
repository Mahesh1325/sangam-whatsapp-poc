import React, { useState, useEffect } from 'react';
import { Ticket, UserCheck, MessageSquare } from 'lucide-react';
import Navbar from './components/Navbar';
import KpiCards from './components/KpiCards';
import TicketList from './components/TicketList';
import MemberUpdatesList from './components/MemberUpdatesList';
import LiveChat from './components/LiveChat';
import { api } from './services/api';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('sangam_theme') || 'dark');
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'updates' | 'chat'

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sangam_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };
  const [tickets, setTickets] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketFilter, setTicketFilter] = useState('ALL');
  const [remarksMap, setRemarksMap] = useState({});
  const [isSending, setIsSending] = useState(false);

  // Load Tickets & Updates
  const loadData = async () => {
    try {
      const [ticketsData, updatesData] = await Promise.all([
        api.getTickets().catch(() => ({ tickets: [] })),
        api.getUpdates().catch(() => ({ updates: [] })),
      ]);
      setTickets(ticketsData.tickets || []);
      setUpdates(updatesData.updates || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  // Load Conversations
  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      const convList = data.conversations || [];
      setConversations(convList);
      if (!selectedPhone && convList.length > 0) {
        setSelectedPhone(convList[0].phone);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  // Load Chat Messages for Selected Phone
  const loadChatHistory = async (phone) => {
    if (!phone) return;
    try {
      const data = await api.getChatHistory(phone);
      setChatMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadConversations();
    const interval = setInterval(() => {
      loadData();
      if (activeTab === 'chat') {
        loadConversations();
        if (selectedPhone) loadChatHistory(selectedPhone);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab, selectedPhone]);

  useEffect(() => {
    if (selectedPhone) {
      loadChatHistory(selectedPhone);
    }
  }, [selectedPhone]);

  const handleResolveTicket = async (ticketCode) => {
    const remarks = remarksMap[ticketCode]?.trim();
    if (!remarks) {
      alert('Please enter closing remarks for the resident.');
      return;
    }

    try {
      await api.closeTicket(ticketCode, remarks);
      setRemarksMap((prev) => ({ ...prev, [ticketCode]: '' }));
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedPhone || !replyText.trim() || isSending) return;

    setIsSending(true);
    try {
      await api.sendReply(selectedPhone, replyText.trim());
      setReplyText('');
      await loadChatHistory(selectedPhone);
      await loadConversations();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesFilter = ticketFilter === 'ALL' || t.status === ticketFilter;
    const matchesSearch =
      (t.ticketCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.phone || '').includes(searchQuery) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const closedCount = tickets.filter((t) => t.status === 'CLOSED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar onRefresh={loadData} theme={theme} onToggleTheme={toggleTheme} />

      <main style={{ flex: 1, padding: '24px 28px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        <KpiCards
          openCount={openCount}
          closedCount={closedCount}
          totalCount={tickets.length}
          updatesCount={updates.length}
        />

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('tickets')}
            style={{
              background: activeTab === 'tickets' ? 'var(--accent)' : 'var(--tab-inactive-bg)',
              color: activeTab === 'tickets' ? '#ffffff' : 'var(--tab-inactive-text)',
              border: activeTab === 'tickets' ? '1px solid var(--accent)' : '1px solid var(--border)',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '700',
              boxShadow: activeTab === 'tickets' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)'
            }}>
            <Ticket size={16} /> Support Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            style={{
              background: activeTab === 'updates' ? 'var(--accent)' : 'var(--tab-inactive-bg)',
              color: activeTab === 'updates' ? '#ffffff' : 'var(--tab-inactive-text)',
              border: activeTab === 'updates' ? '1px solid var(--accent)' : '1px solid var(--border)',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '700',
              boxShadow: activeTab === 'updates' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)'
            }}>
            <UserCheck size={16} /> Member Updates ({updates.length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              background: activeTab === 'chat' ? 'var(--accent)' : 'var(--tab-inactive-bg)',
              color: activeTab === 'chat' ? '#ffffff' : 'var(--tab-inactive-text)',
              border: activeTab === 'chat' ? '1px solid var(--accent)' : '1px solid var(--border)',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '700',
              boxShadow: activeTab === 'chat' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)'
            }}>
            <MessageSquare size={16} /> Live WhatsApp Chat ({conversations.length})
          </button>
        </div>

        {activeTab === 'tickets' && (
          <TicketList
            tickets={filteredTickets}
            filter={ticketFilter}
            onFilterChange={setTicketFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            remarksMap={remarksMap}
            onRemarksChange={(code, val) => setRemarksMap((prev) => ({ ...prev, [code]: val }))}
            onResolveTicket={handleResolveTicket}
          />
        )}

        {activeTab === 'updates' && (
          <MemberUpdatesList updates={updates} />
        )}

        {activeTab === 'chat' && (
          <LiveChat
            conversations={conversations}
            selectedPhone={selectedPhone}
            onSelectPhone={setSelectedPhone}
            messages={chatMessages}
            replyText={replyText}
            onReplyTextChange={setReplyText}
            onSendReply={handleSendReply}
            isSending={isSending}
          />
        )}
      </main>
    </div>
  );
}
