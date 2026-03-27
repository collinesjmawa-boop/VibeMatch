import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export default function NamePicker() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/vibe';

  const [selectedName, setSelectedName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Split Google displayName into parts
  const nameParts = (user.displayName || '').split(' ').filter(Boolean);

  const handleConfirm = async () => {
    if (!selectedName) { setError('Please pick a name.'); return; }
    setLoading(true); setError('');
    try {
      await updateProfile(auth.currentUser, { displayName: selectedName });
      const parts = user.displayName.split(' ');
      await setDoc(doc(db, 'users', user.uid), {
        uid:         user.uid,
        firstName:   parts[0] || '',
        lastName:    parts[parts.length - 1] || '',
        displayName: selectedName,
        email:       user.email,
        emailVerified: user.emailVerified,
        isPremium:   false,
        createdAt:   Date.now()
      });
      await refreshProfile();
      navigate(nextPath);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-ambient" />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">✦</span>
          <h1 className="auth-logo-text">One Last Thing</h1>
          <p className="auth-logo-sub">How should people know you?</p>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20, lineHeight: 1.6 }}>
          Choose one of your names to appear publicly. Your other names stay private.
        </p>

        <div className="word-grid" style={{ marginBottom: 20 }}>
          {nameParts.map((part) => (
            <button
              key={part}
              className={`word-chip ${selectedName === part ? 'selected' : ''}`}
              onClick={() => setSelectedName(part)}
            >
              {part}
            </button>
          ))}
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}

        <button className="btn-primary auth-submit" onClick={handleConfirm} disabled={loading || !selectedName}>
          {loading ? 'Saving…' : `Continue as ${selectedName || '…'} →`}
        </button>

        <p className="auth-trust-statement" style={{ marginTop: 16 }}>
          Your full name is held privately and never shared publicly.
        </p>
      </div>
    </div>
  );
}
