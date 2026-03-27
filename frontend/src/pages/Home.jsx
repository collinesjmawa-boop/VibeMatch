import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

// The Nine Vibes — Universal Human Experiences
const NINE_VIBES = [
  { id: 'connect', emoji: '🤎', name: 'Connect', tagline: 'Romance & dating', color: 'var(--vibe-connect, #A87C5C)', channels: ['Seeking Real Connection', 'First Dates & Ideas', 'Long-Term Love', 'Heartbreak & Healing', 'Couples Space'] },
  { id: 'play', emoji: '🎨', name: 'Play', tagline: 'Fun & hobbies', color: 'var(--vibe-play, #D1A372)', channels: ['Gaming Sessions', 'Arts, Crafts & DIY', 'Music Production', 'Book Club', 'Sports Talk'] },
  { id: 'build', emoji: '🔥', name: 'Build', tagline: 'Business & ambition', color: 'var(--vibe-build, #DF755A)', channels: ['Entrepreneurship', 'Career Growth', 'Networking', 'Side Hustles', 'Tech & Startups'] },
  { id: 'gather', emoji: '🙌', name: 'Gather', tagline: 'Local community', color: 'var(--vibe-gather, #A68B75)', channels: ['Local Events', 'Volunteering', 'City Life', 'Neighbor Support'] },
  { id: 'carry', emoji: '🌧️', name: 'Carry', tagline: 'Grief & heaviness', color: 'var(--vibe-carry, #5A6D71)', channels: ['Grief & Loss', 'Mental Health Support', 'Anxiety & Overwhelm', 'Silent Suffering'] },
  { id: 'rise', emoji: '🌱', name: 'Rise', tagline: 'Recovery & resilience', color: 'var(--vibe-rise, #7D9E8C)', channels: ['Sobriety Journey', 'Starting Over', 'Physical Healing', 'Rebuilding Confidence'] },
  { id: 'seek', emoji: '🕯️', name: 'Seek', tagline: 'Spirituality & meaning', color: 'var(--vibe-seek, #E2C29B)', channels: ['Open Faith Dialogues', 'Meditation & Mindfulness', 'Questioning & Exploring'] },
  { id: 'justbe', emoji: '🌙', name: 'Just Be', tagline: 'Presence & company', color: 'var(--vibe-justbe, #54648A)', channels: ['Late Night Chat', 'No Agenda', 'Introvert Space', 'Simply Present'] },
  { id: 'open', emoji: '✨', name: 'Open', tagline: 'Type your own vibe', color: 'var(--vibe-open, #C9956A)', channels: [] }
];

export default function Home() {
  const [activeVibe, setActiveVibe] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleVibeClick = (vibe) => {
    if (activeVibe?.id === vibe.id) {
      setActiveVibe(null);
      setSelectedChannel(null);
    } else {
      setActiveVibe(vibe);
      setSelectedChannel(null);
    }
  };

  const handleEnter = () => {
    const destination = selectedChannel && activeVibe.id !== 'open'
      ? `${activeVibe.name} · ${selectedChannel}`
      : selectedChannel || activeVibe.name;
    navigate(`/dashboard/${encodeURIComponent(destination)}`);
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="brand-logo">
          <span className="logo-icon">✦</span>
          <h1 className="logo-text">VibeMatch</h1>
        </div>
        <div className="user-info">
          <span className="user-greeting">
            {user?.displayName?.split(' ')[0] || 'Welcome'}
          </span>
          <button className="logout-btn" onClick={logout}>Leave</button>
        </div>
      </header>

      <main className="vibe-select-main">
        <div className="vibe-hero">
          <p className="vibe-question editorial">Something brought you here tonight.</p>
          <p className="vibe-sub">Where would you like to be?</p>
        </div>

        <div className="nine-vibes-grid">
          {NINE_VIBES.map((vibe) => (
            <button
              key={vibe.id}
              className={`vibe-card ${activeVibe?.id === vibe.id ? 'active' : ''}`}
              onClick={() => handleVibeClick(vibe)}
              style={{ '--vibe-color': vibe.color }}
            >
              <span className="vibe-emoji">{vibe.emoji}</span>
              <div className="vibe-info">
                <span className="vibe-name">{vibe.name}</span>
                <span className="vibe-tagline">{vibe.tagline}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Channel Bottom Sheet */}
        {activeVibe && (
          <div className="channel-sheet">
            <div className="channel-sheet-header">
              <span className="channel-vibe-label">
                {activeVibe.emoji} {activeVibe.name}
              </span>
              <p className="channel-prompt">Choose a channel, or enter the whole vibe.</p>
            </div>
            <div className="channel-list">
              {activeVibe.id === 'open' ? (
                <div style={{ padding: '0 20px', width: '100%' }}>
                  <input 
                    type="text" 
                    placeholder="Enter any vibe or space..."
                    value={selectedChannel || ''}
                    onChange={e => setSelectedChannel(e.target.value)}
                    style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '1rem' }}
                    autoFocus
                  />
                </div>
              ) : (
                activeVibe.channels.map((ch) => (
                  <button
                    key={ch}
                    className={`channel-chip ${selectedChannel === ch ? 'active' : ''}`}
                    onClick={() => setSelectedChannel(selectedChannel === ch ? null : ch)}
                  >
                    {ch}
                  </button>
                ))
              )}
            </div>
            <div className="channel-enter-row">
              <div className="enter-preview">
                <span>Entering:</span>
                <strong>{selectedChannel && activeVibe.id !== 'open' ? `${activeVibe.name} · ${selectedChannel}` : selectedChannel || activeVibe.name}</strong>
              </div>
              <button className="btn-primary enter-btn" onClick={handleEnter}>
                Enter Fully →
              </button>
            </div>
          </div>
        )}

        {!activeVibe && (
          <p className="select-hint">Tap any vibe to see its channels</p>
        )}
      </main>
    </div>
  );
}
