import React from 'react';
import { Search } from 'lucide-react';

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
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
          {['ALL', 'OPEN', 'CLOSED'].map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              style={{
                background: filter === f ? 'var(--surface-hover)' : 'transparent',
                color: filter === f ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                borderRadius: '4px'
              }}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search tickets, phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 12px 6px 30px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 18px' }}>Ticket Code</th>
              <th style={{ padding: '12px 18px' }}>Resident Phone</th>
              <th style={{ padding: '12px 18px' }}>Category</th>
              <th style={{ padding: '12px 18px' }}>Issue Description</th>
              <th style={{ padding: '12px 18px' }}>Status</th>
              <th style={{ padding: '12px 18px' }}>Resolution Remarks</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No tickets found.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.ticketCode} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                    #{t.ticketCode}
                  </td>
                  <td style={{ padding: '14px 18px' }}>{t.phone}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {t.category || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', maxWidth: '300px' }}>{t.description || t.query}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: t.status === 'OPEN' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: t.status === 'OPEN' ? 'var(--warning)' : 'var(--success)'
                    }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {t.status === 'OPEN' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Type resolution remark..."
                          value={remarksMap[t.ticketCode] || ''}
                          onChange={(e) => onRemarksChange(t.ticketCode, e.target.value)}
                          style={{
                            background: 'var(--surface-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            width: '200px'
                          }}
                        />
                        <button
                          onClick={() => onResolveTicket(t.ticketCode)}
                          style={{
                            background: 'var(--accent)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}>
                          Resolve
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        ✓ {t.remarks || 'Resolved'}
                      </span>
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
