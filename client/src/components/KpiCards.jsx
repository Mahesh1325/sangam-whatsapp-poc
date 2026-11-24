import React from 'react';
import { AlertCircle, CheckCircle2, Layers, UserCheck } from 'lucide-react';

export default function KpiCards({ openCount, closedCount, totalCount, updatesCount }) {
  const cards = [
    {
      label: 'Open Tickets',
      value: openCount,
      sub: 'Requires Admin Attention',
      color: 'var(--warning)',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.25)',
      icon: <AlertCircle size={20} color="var(--warning)" />
    },
    {
      label: 'Closed Tickets',
      value: closedCount,
      sub: 'Resolved & Notified',
      color: 'var(--success)',
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.25)',
      icon: <CheckCircle2 size={20} color="var(--success)" />
    },
    {
      label: 'Total Volume',
      value: totalCount,
      sub: 'All Support Issues',
      color: 'var(--accent)',
      bg: 'rgba(37, 99, 235, 0.08)',
      border: 'rgba(37, 99, 235, 0.25)',
      icon: <Layers size={20} color="var(--accent)" />
    },
    {
      label: 'Profile Updates',
      value: updatesCount,
      sub: 'Member Detail Logs',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.08)',
      border: 'rgba(139, 92, 246, 0.25)',
      icon: <UserCheck size={20} color="#8b5cf6" />
    }
  ];

  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      {cards.map((c, i) => (
        <div
          key={i}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{c.label}</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: c.color, marginTop: '4px', letterSpacing: '-0.03em' }}>
              {c.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{c.sub}</div>
          </div>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: c.bg,
            border: `1px solid ${c.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {c.icon}
          </div>
        </div>
      ))}
    </section>
  );
}
