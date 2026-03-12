import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Home.css';

const presetVibes = [
  { id: 'chill', label: 'Chill & Chatty', color: 'var(--accent-chill)', emoji: '☕' },
  { id: 'energy', label: 'Need Motivation', color: 'var(--accent-energy)', emoji: '🔥' },
  { id: 'romantic', label: 'Romantic', color: 'var(--accent-romantic)', emoji: '✨' },
  { id: 'focus', label: 'Deep Focus', color: 'var(--accent-focus)', emoji: '🧠' },
];

export default function Home() {
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [customInterest, setCustomInterest] = useState('');
  
  // New Registration Fields
  const [profileName, setProfileName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for match events from the server
    socket.on('match_found', (data) => {
      setIsSearching(false);
      navigate(`/room/${data.roomId}`);
    });

    return () => {
      socket.off('match_found');
    };
  }, [navigate]);

  const handleJoin = () => {
    const vibeToJoin = selectedVibe || customInterest.trim().toLowerCase();
    if (!vibeToJoin) return;
    if (!profileName.trim()) {
      alert("Please enter a name to continue.");
      return;
    }
    
    setIsSearching(true);
    // Send full profile details to backend
    socket.emit('find_match', { 
      vibe: vibeToJoin, 
      profileName: profileName.trim(),
      email: email.trim(),
      phone: phone.trim()
    });
  };

  return (
    <div className="home-container">
      <div className="glass-panel main-panel">
        <div className="logo-container">
          <div className="brand-logo">
            <span className="logo-icon">✨</span>
            <h1 className="logo-text">VibeMatch</h1>
          </div>
          <div className="logo-sub">Instant Connections. Zero Pressure.</div>
        </div>

        <div className="form-section">
          <h2>1. Who are you?</h2>
          <div className="input-group">
            <input 
              type="text" 
              className="input-field" 
              placeholder="Your Name (Required)" 
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              disabled={isSearching}
              required
            />
            <input 
              type="email" 
              className="input-field" 
              placeholder="Email (Optional)" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSearching}
            />
            <input 
              type="tel" 
              className="input-field" 
              placeholder="Phone Number (Optional)" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSearching}
            />
          </div>
        </div>

        <div className="form-section">
          <h2>2. What's your vibe right now?</h2>
          
          <div className="vibe-grid">
            {presetVibes.map(vibe => (
              <button 
                key={vibe.id}
                className={`vibe-btn ${selectedVibe === vibe.id ? 'active' : ''}`}
                style={{ '--vibe-color': vibe.color }}
                onClick={() => { setSelectedVibe(vibe.id); setCustomInterest(''); }}
                disabled={isSearching}
              >
                <span className="vibe-emoji">{vibe.emoji}</span>
                <span className="vibe-label">{vibe.label}</span>
              </button>
            ))}
          </div>

          <div className="or-divider"><span>OR</span></div>

          <input 
            type="text" 
            className="input-field" 
            placeholder="Type a custom interest (e.g. Ugandan politics, pray)..." 
            value={customInterest}
            onChange={(e) => { setCustomInterest(e.target.value); setSelectedVibe(null); }}
            disabled={isSearching}
          />
        </div>

        <button 
          className="btn-primary join-btn" 
          disabled={(!selectedVibe && !customInterest) || !profileName || isSearching}
          onClick={handleJoin}
        >
          {isSearching ? "Searching for a vibe match... 🎧" : "Find My Vibe 🚀"}
        </button>
      </div>
    </div>
  );
}
