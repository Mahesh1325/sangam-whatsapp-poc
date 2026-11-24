import React from 'react';
import { Search, CheckCircle } from 'lucide-react';

export default function TicketList({
  tickets,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  remarksMap,
  onRemarksChange,
  onResolveTicket
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--card-shadow)' }}>
      {/* Table Header Toolbar */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--surface-elevated)'
      }}>
        <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>
          Tickets Queue ({tickets.length})
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px' }}>
            {['ALL', 'OPEN', 'CLOSED'].map((f) => (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                style={{
                  background: filter === f ? 'var(--accent)' : 'transparent',
                  color: filter === f ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease'
                }}>
                {f}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search code, phone, issue..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '7px 12px 7px 34px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                width: '240px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 20px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ticket Code</th>
              <th style={{ padding: '12px 20px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resident Phone</th>
              <th style={{ padding: '12px 20px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</th>
              <th style={{ padding: '12px 20px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Issue Description</th>
              <th style={{ padding: '12px 20px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
              <th style={{ padding: '12px 20px', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resolution &amp; Remarks</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No tickets found matching your filter criteria.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.ticketCode} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent)' }}>
                    #{t.ticketCode}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    +{t.phone}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      background: 'rgba(37, 99, 235, 0.1)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(37, 99, 235, 0.2)',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {t.category || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', maxWidth: '320px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {t.description || t.query}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      letterSpacing: '0.04em',
                      background: t.status === 'OPEN' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      color: t.status === 'OPEN' ? 'var(--warning)' : 'var(--success)',
                      border: t.status === 'OPEN' ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)'
                    }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {t.status === 'OPEN' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Type remarks to resident..."
                          value={remarksMap[t.ticketCode] || ''}
                          onChange={(e) => onRemarksChange(t.ticketCode, e.target.value)}
                          style={{
                            background: 'var(--surface-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '7px 12px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            width: '220px',
                            outline: 'none'
                          }}
                        />
                        <button
                          onClick={() => onResolveTicket(t.ticketCode)}
                          style={{
                            background: 'var(--accent)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '7px 14px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}>
                          Resolve
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        <CheckCircle size={14} color="var(--success)" />
                        <span>{t.remarks || 'Resolved'}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
