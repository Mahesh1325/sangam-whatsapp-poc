import React from 'react';

export default function KpiCards({ openCount, closedCount, totalCount, updatesCount }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Open Tickets</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--warning)', marginTop: '4px' }}>{openCount}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Requires Admin Attention</div>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Closed Tickets</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)', marginTop: '4px' }}>{closedCount}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Resolved & Notified</div>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Volume</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{totalCount}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>All Support Issues</div>
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Profile Updates</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent)', marginTop: '4px' }}>{updatesCount}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Member Information Logs</div>
      </div>
    </section>
  );
}
