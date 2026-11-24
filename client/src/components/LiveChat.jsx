import React from 'react';
import { Send } from 'lucide-react';

export default function LiveChat({
  conversations,
  selectedPhone,
  onSelectPhone,
  messages,
  replyText,
  onReplyTextChange,
  onSendReply,
  isSending
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      height: '600px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      overflow: 'hidden'
    }}>
      {/* Conversations List */}
      <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 'bold', fontSize: '13px' }}>
          Active WhatsApp Chats
        </div>
        {conversations.length === 0 ? (
          <div style={{ padding: '24px 16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
            No incoming conversations yet.
          </div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.phone}
              onClick={() => onSelectPhone(c.phone)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                background: selectedPhone === c.phone ? 'var(--surface-hover)' : 'transparent'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '13px' }}>
                <span>{c.phone}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                  {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.lastMessage}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Conversation Window */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{selectedPhone || 'Select conversation'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Two-way Meta Cloud API messaging</div>
          </div>
          <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
            24h Window Active
          </span>
        </div>

        {/* Chat Messages */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg)' }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '13px' }}>
              {selectedPhone ? 'No messages exchanged yet.' : 'Select a resident on the left to view history.'}
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-start' : 'flex-end',
                  maxWidth: '65%',
                  background: m.sender === 'user' ? 'var(--surface-elevated)' : 'var(--accent)',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  border: m.sender === 'user' ? '1px solid var(--border)' : 'none'
                }}>
                <div>{m.text}</div>
                <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7, textAlign: 'right' }}>
                  {m.sender === 'user' ? 'Resident' : 'Admin'} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={onSendReply} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', background: 'var(--surface-elevated)' }}>
          <input
            type="text"
            placeholder="Type a WhatsApp reply directly to resident..."
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            disabled={!selectedPhone || isSending}
            style={{
              flex: 1,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!selectedPhone || !replyText.trim() || isSending}
            style={{
              background: 'var(--accent)',
              border: 'none',
              color: '#fff',
              borderRadius: '6px',
              padding: '0 18px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
            <Send size={14} /> {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
