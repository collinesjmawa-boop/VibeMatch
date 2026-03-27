import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function WaitlistModal({ onClose, title, subtitle }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'waitlist'), {
        email: email.trim(),
        feature: title,
        createdAt: Date.now()
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Failed to join the waitlist. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="state-word-overlay">
      <div className="state-word-modal" style={{ textAlign: 'center' }}>
        <h2>{title}</h2>
        <p>{subtitle}</p>

        {success ? (
          <div style={{ margin: '24px 0', color: 'var(--accent-sage)', fontWeight: 500 }}>
            You're on the list. We'll be in touch.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ margin: '24px 0' }}>
            <input 
              type="email" 
              placeholder="Your email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginBottom: '12px', background: 'var(--bg-elevated)' }}
              autoFocus
            />
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading || !email.trim()}>
              {loading ? 'Joining…' : 'Join the Waitlist →'}
            </button>
          </form>
        )}

        <button className="btn-ghost" onClick={onClose} style={{ width: '100%' }}>
          {success ? 'Close' : 'Not right now'}
        </button>
      </div>
    </div>
  );
}
