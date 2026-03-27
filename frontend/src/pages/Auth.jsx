import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, googleProvider, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyGate, setVerifyGate] = useState(false);
  const [gateUser, setGateUser] = useState(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/vibe';
  const { refreshProfile } = useAuth();

  // ── Display name validation ─────────────────────────────
  const displayNameValid = () => {
    if (!displayName) return null;
    const dn = displayName.trim().toLowerCase();
    return dn === firstName.trim().toLowerCase() || dn === lastName.trim().toLowerCase();
  };

  // ── Google Sign-In ──────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError(''); setMessage(''); setLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        // New Google user — needs NamePicker; redirect there
        navigate(`/name-picker?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      await refreshProfile();
      navigate(nextPath);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  // ── Reset Password ──────────────────────────────────────
  const handleResetPassword = async () => {
    if (!email) { setError('Enter your email above first.'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('A path back has been sent. Check your inbox.');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  // ── Resend verification ─────────────────────────────────
  const handleResendVerification = async () => {
    if (!gateUser) return;
    setLoading(true);
    try {
      await sendEmailVerification(gateUser);
      setMessage('Verification email resent. Check your inbox.');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      if (isLogin) {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        // Reload to get fresh emailVerified flag
        await user.reload();
        if (!user.emailVerified) {
          setGateUser(user);
          setVerifyGate(true);
          setLoading(false);
          return;
        }
        await refreshProfile();
        navigate(nextPath);
      } else {
        // Registration validation
        if (!firstName.trim()) { setError('We need your first name.'); setLoading(false); return; }
        if (!lastName.trim())  { setError('We need your last name.'); setLoading(false); return; }
        if (!displayNameValid()) {
          setError('Your display name must be exactly your first name or last name.');
          setLoading(false); return;
        }

        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        const dn = displayName.trim();

        // Upload Profile Picture
        let photoURL = '';
        if (photoFile) {
          const fileRef = ref(storage, `avatars/${user.uid}`);
          await uploadBytes(fileRef, photoFile);
          photoURL = await getDownloadURL(fileRef);
        }

        await updateProfile(user, { displayName: dn, photoURL });
        await setDoc(doc(db, 'users', user.uid), {
          uid:         user.uid,
          firstName:   firstName.trim(),
          lastName:    lastName.trim(),
          displayName: dn,
          photoURL,
          email,
          emailVerified: false,
          isPremium:   false,
          createdAt:   Date.now()
        });
        await sendEmailVerification(user);
        setGateUser(user);
        setVerifyGate(true);
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  // ── Email Verification Gate ─────────────────────────────
  if (verifyGate) {
    return (
      <div className="auth-container">
        <div className="auth-ambient" />
        <div className="auth-card">
          <div className="verify-gate">
            <span style={{ fontSize: '2.5rem' }}>✉️</span>
            <h2>Check Your Inbox</h2>
            <p>
              We sent a link to <strong>{gateUser?.email}</strong>.<br />
              Your identity must be verified before you can enter.
            </p>
            {error   && <div className="auth-error">{error}</div>}
            {message && <div className="auth-success">{message}</div>}
            <button className="btn-primary auth-submit" onClick={handleResendVerification} disabled={loading}>
              {loading ? 'Sending…' : 'Resend Verification Link'}
            </button>
            <button className="btn-ghost" style={{ marginTop: 10, width: '100%' }}
              onClick={async () => {
                if (gateUser) {
                  await gateUser.reload();
                  if (gateUser.emailVerified) {
                    await refreshProfile();
                    navigate(nextPath);
                  } else {
                    setError('Email not verified yet. Please check your inbox.');
                  }
                }
              }}
            >
              I've verified — let me in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Auth Form ──────────────────────────────────────
  return (
    <div className="auth-container">
      <div className="auth-ambient" />

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">✦</span>
          <h1 className="auth-logo-text">VibeMatch</h1>
          <p className="auth-logo-sub">
            {isLogin ? 'Welcome back.' : 'Something brought you here.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
          >
            Enter Fully
          </button>
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
          >
            Come Back
          </button>
        </div>

        <div className="auth-social-section">
          <button className="google-btn" onClick={handleGoogleSignIn} disabled={loading}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            Continue with Google
          </button>
          <div className="or-divider"><span>or continue with email</span></div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div>
                <input
                  type="text"
                  className="input-field"
                  placeholder="How should people know you? (first or last name)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                {displayName && (
                  <p className={`display-name-hint ${displayNameValid() ? 'valid' : 'invalid'}`}>
                    {displayNameValid()
                      ? `✓ "${displayName}" — people will know you by this name.`
                      : `Must be exactly your first name ("${firstName}") or last name ("${lastName}").`}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '4px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Profile Picture (Optional)
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                  style={{ color: 'var(--text-primary)', marginBottom: '6px' }}
                />
              </div>
            </>
          )}

          <input
            type="email"
            className="input-field"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field password-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '◎' : '○'}
            </button>
          </div>

          {isLogin && (
            <div className="auth-extra-actions">
              <button
                type="button"
                className="forgot-password-link"
                onClick={handleResetPassword}
                disabled={loading}
              >
                I've lost my way — send a reset
              </button>
            </div>
          )}

          {!isLogin && (
            <p className="auth-trust-statement">
              Your full name is held privately. It is shared only with legal authorities in verified cases of abuse.
            </p>
          )}

          {error   && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading
              ? 'One moment…'
              : isLogin
              ? 'Come Back →'
              : 'Enter Fully →'}
          </button>
        </form>

        <div className="auth-footer">
          <span>This is a space for real people. Be kind.</span>
        </div>
      </div>
    </div>
  );
}
