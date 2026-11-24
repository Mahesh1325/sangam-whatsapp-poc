import React, { useRef, useEffect } from 'react';
import { 
  Send, 
  CheckCheck, 
  ExternalLink, 
  Phone, 
  ShieldCheck, 
  User
} from 'lucide-react';

// Generates consistent pleasing avatar colors based on name or phone
function getAvatarColor(identifier) {
  const colors = [
    '#2563eb', '#7c3aed', '#db2777', '#ea580c', 
    '#059669', '#0891b2', '#4f46e5', '#d97706'
  ];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Extracts 1-2 initials from name or phone number
function getInitials(name, phone) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (phone) {
    const clean = phone.replace(/[^0-9]/g, '');
    return clean.slice(-2);
  }
  return 'WA';
}

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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cleanPhone = (selectedPhone || '').replace(/[^0-9]/g, '');
  const waWebUrl = cleanPhone ? `https://web.whatsapp.com/send?phone=${cleanPhone}` : '#';

  const selectedConv = conversations.find(c => c.phone === selectedPhone);
  const activeName = selectedConv?.name || null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '320px 1fr',
      height: '660px',
      maxHeight: 'calc(100vh - 280px)',
      minHeight: '480px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: 'var(--card-shadow)'
    }}>
      {/* ─── LEFT: WhatsApp Contacts / Chat List ─── */}
      <div style={{
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'var(--surface)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-elevated)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Phone size={16} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>WhatsApp Chats</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Meta Verified Customers</div>
            </div>
          </div>
          <span style={{
            background: 'rgba(37, 211, 102, 0.15)',
            color: '#25D366',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {conversations.length}
          </span>
        </div>

        {/* Contact Items */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <div style={{ fontSize: '26px', marginBottom: '8px' }}>💬</div>
              No active conversations yet.<br />
              <span style={{ fontSize: '11px' }}>Incoming WhatsApp chats appear here.</span>
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = selectedPhone === c.phone;
              const initials = getInitials(c.name, c.phone);
              const avatarBg = getAvatarColor(c.name || c.phone);

              return (
                <div
                  key={c.phone}
                  onClick={() => onSelectPhone(c.phone)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: isSelected ? 'var(--surface-hover)' : 'transparent',
                    borderLeft: isSelected ? '4px solid #25D366' : '4px solid transparent',
                    transition: 'all 0.15s ease'
                  }}>
                  {/* Dynamic Initial Avatar */}
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: avatarBg,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '14px',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}>
                    {initials}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                      <span style={{
                        fontWeight: isSelected ? '700' : '600',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {c.name ? c.name : `+${c.phone}`}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {c.name && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        +{c.phone}
                      </div>
                    )}

                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {c.lastSender === 'admin' && <CheckCheck size={13} color="#2563eb" />}
                      <span>{c.lastMessage}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT: Authentic WhatsApp Chat Wallpaper & Bubbles ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--wa-wallpaper)' }}>
        {/* Top Header */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          {selectedPhone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: getAvatarColor(activeName || selectedPhone),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '700',
                fontSize: '15px'
              }}>
                {getInitials(activeName, selectedPhone)}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                  {activeName ? `${activeName} (+${selectedPhone})` : `+${selectedPhone}`}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></span>
                  24-Hour Customer Window Active
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-muted)' }}>
              No conversation selected
            </div>
          )}

          {selectedPhone && (
            <a
              href={waWebUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(37, 211, 102, 0.12)',
                color: '#25D366',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none'
              }}>
              <ExternalLink size={13} />
              Open WhatsApp Web
            </a>
          )}
        </div>

        {/* Message Thread (Wallpaper Background) */}
        <div style={{
          flex: 1,
          minHeight: 0,
          padding: '20px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Security Banner */}
          <div style={{
            margin: '0 auto 8px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <ShieldCheck size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>Messages are synced live with Meta WhatsApp Cloud API.</span>
          </div>

          {!selectedPhone ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
              Select a resident on the left to view the conversation.
            </div>
          ) : messages.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '13px' }}>
              No messages exchanged yet with this resident.
            </div>
          ) : (
            messages.map((m) => {
              const isAdmin = m.sender === 'admin';
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                    maxWidth: '65%',
                    minWidth: '130px',
                    background: isAdmin ? 'var(--wa-bubble-admin)' : 'var(--wa-bubble-resident)',
                    color: isAdmin ? 'var(--wa-bubble-admin-text)' : 'var(--wa-bubble-resident-text)',
                    padding: '8px 12px 6px',
                    borderRadius: '8px',
                    borderTopRightRadius: isAdmin ? '2px' : '8px',
                    borderTopLeftRadius: !isAdmin ? '2px' : '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
                    fontSize: '13px',
                    lineHeight: '1.45',
                    border: '1px solid var(--border-subtle)'
                  }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: isAdmin ? '#059669' : '#2563eb',
                    marginBottom: '3px'
                  }}>
                    {isAdmin ? 'Admin' : (m.name || 'Resident')}
                  </div>

                  <div style={{ wordBreak: 'break-word' }}>
                    {m.text}
                  </div>

                  <div style={{
                    fontSize: '10px',
                    opacity: 0.7,
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px'
                  }}>
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isAdmin && <CheckCheck size={14} color="#2563eb" />}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <form
          onSubmit={onSendReply}
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0
          }}>
          <input
            type="text"
            placeholder={selectedPhone ? "Type a WhatsApp reply directly to resident..." : "Select a conversation first..."}
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            disabled={!selectedPhone || isSending}
            style={{
              flex: 1,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '10px 18px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={!selectedPhone || !replyText.trim() || isSending}
            style={{
              background: !selectedPhone || !replyText.trim() || isSending ? 'var(--border)' : '#25D366',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: !selectedPhone || !replyText.trim() || isSending ? 'not-allowed' : 'pointer',
              boxShadow: !selectedPhone || !replyText.trim() || isSending ? 'none' : '0 2px 8px rgba(37, 211, 102, 0.35)',
              transition: 'all 0.15s ease'
            }}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
