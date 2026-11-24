import React from 'react';

export default function MemberUpdatesList({ updates }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '12px 18px' }}>Update ID</th>
            <th style={{ padding: '12px 18px' }}>Resident Phone</th>
            <th style={{ padding: '12px 18px' }}>Category</th>
            <th style={{ padding: '12px 18px' }}>Submitted Information</th>
            <th style={{ padding: '12px 18px' }}>Logged At</th>
          </tr>
        </thead>
        <tbody>
          {updates.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No member updates recorded yet.
              </td>
            </tr>
          ) : (
            updates.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 'bold' }}>#{u.id}</td>
                <td style={{ padding: '14px 18px' }}>{u.phone}</td>
                <td style={{ padding: '14px 18px' }}>{u.category}</td>
                <td style={{ padding: '14px 18px' }}>{u.details}</td>
                <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                  {new Date(u.createdAt).toLocaleString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
