import React from 'react';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 3000
    }}>
      <div style={{
        backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', color: 'white', width: '300px',
        border: '1px solid #334155'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '12px', fontSize: '1.25rem', color: '#ef4444' }}>{title}</h2>
        <p style={{ color: '#cbd5e1', marginBottom: '24px' }}>{message}</p>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #475569', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
