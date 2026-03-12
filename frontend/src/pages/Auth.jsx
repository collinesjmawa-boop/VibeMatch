import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signInWithPopup 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import './Auth.css';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      
      // Check if user exists in Firestore, if not create record
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          createdAt: Date.now()
        });
      }
      
      navigate('/vibe');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: name.trim() });
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: name.trim(),
          email,
          createdAt: Date.now()
        });
      }
      navigate('/vibe');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-bg-blob blob1"></div>
      <div className="auth-bg-blob blob2"></div>

      <div className="glass-panel auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">✨</span>
          <h1 className="auth-logo-text">VibeMatch</h1>
          <p className="auth-logo-sub">Connect with your vibe. No pressure.</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>
            Create Account
          </button>
          <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>
            Sign In
          </button>
        </div>

        <button className="google-btn" onClick={handleGoogleSignIn} disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
          Continue with Google
        </button>

        <div className="or-divider"><span>OR</span></div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              className="input-field"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          )}
          <input
            type="email"
            className="input-field"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="input-field"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Sign In →' : 'Create My Account →'}
          </button>
        </form>

        <div className="auth-footer">
          <span>By continuing, you agree to be respectful to others.</span>
        </div>
      </div>
    </div>
  );
}

