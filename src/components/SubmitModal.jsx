import React, { useState } from 'react';

export default function SubmitModal({ isOpen, onClose, onSubmit, dailyLength }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subcontractor, setSubcontractor] = useState("");
  const [workers, setWorkers] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      date,
      subcontractor,
      workers: parseInt(workers, 10),
      installed_length: dailyLength
    });
    onClose();
    setSubcontractor("");
    setWorkers(0);
  };

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
        <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>Submit Daily Work</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8', fontSize: '0.9rem' }}>Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: 'white' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8', fontSize: '0.9rem' }}>Subcontractor</label>
          <input 
            type="text" 
            value={subcontractor} 
            onChange={e => setSubcontractor(e.target.value)}
            placeholder="e.g. Company A"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: 'white' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8', fontSize: '0.9rem' }}>Workers</label>
          <input 
            type="number" 
            value={workers} 
            onChange={e => setWorkers(e.target.value)}
            min="0"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: 'white' }}
          />
        </div>

        <div style={{ marginBottom: '24px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <div style={{ fontSize: '0.85rem', color: '#86efac' }}>Daily Installed Length</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>{dailyLength.toFixed(2)} m</div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #475569', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
