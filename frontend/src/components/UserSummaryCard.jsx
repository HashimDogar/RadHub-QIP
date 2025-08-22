import React from "react";

export default function UserSummaryCard({ user }) {
  // Minimal non-opinionated placeholder so your build doesn't fail.
  // Replace with your real summary later.
  return (
    <section style={{
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 16,
      background: '#fff',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      marginBottom: 16
    }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>User Summary</h2>
      <div style={{ marginTop: 8, color: '#374151' }}>
        {user ? (
          <>
            <div><strong>Name:</strong> {user.name || '—'}</div>
            <div><strong>Email:</strong> {user.email || '—'}</div>
          </>
        ) : (
          <div>No user data provided.</div>
        )}
      </div>
    </section>
  );
}
