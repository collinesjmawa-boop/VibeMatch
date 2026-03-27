import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function ReportModal({ onClose, reportedUid, contentSnapshot, vibe, channel, reporterUid }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'abuse_reports'), {
        reportedUid,
        reporterUid,
        vibe,
        channel,
        contentSnapshot,
        reason: reason.trim(),
        status: 'pending',
        createdAt: Date.now()
      });
      setSuccess(true);
      setTimeout(onClose, 2000); // auto-close after 2s
    } catch (err) {
      console.error(err);
      alert('Failed to send report. Please try again or contact support.');
    }
    setLoading(false);
  };

  return (
    <div className="state-word-overlay">
      <div className="state-word-modal">
        <h2 style={{ color: '#f4a99a' }}>Report to Moderators</h2>
        
        {success ? (
          <p style={{ color: 'var(--accent-sage)', textAlign: 'center', marginTop: '20px' }}>
            Report sent securely. We will review this immediately.
          </p>
        ) : (
          <>
            <p style={{ textAlign: 'left', marginTop: '16px' }}>
              We take safety seriously. Holding space for real emotion requires a foundation of trust.
            </p>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', fontStyle: 'italic', borderLeft: '2px solid var(--accent-ember-dim)' }}>
              "{contentSnapshot.substring(0, 100)}{contentSnapshot.length > 100 ? '...' : ''}"
            </div>
            
            <textarea 
              placeholder="If you can, briefly describe what happened..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', minHeight: '80px', marginBottom: '16px', background: 'var(--bg-elevated)', resize: 'none' }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={onClose} 
                className="btn-ghost" 
                style={{ flex: 1 }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                className="btn-primary" 
                style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-ember-dim)', color: '#f4a99a' }}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
