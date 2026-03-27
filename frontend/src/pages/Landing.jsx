import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const NINE_VIBES = [
  { id: 'connect', emoji: '🤎', name: 'Connect', tagline: 'Romance & dating', channels: ['Seeking Real Connection', 'First Dates & Ideas', 'Long-Term Love', 'Heartbreak & Healing', 'Couples Space'] },
  { id: 'play', emoji: '🎨', name: 'Play', tagline: 'Fun & hobbies', channels: ['Gaming Sessions', 'Arts, Crafts & DIY', 'Music Production', 'Book Club', 'Sports Talk'] },
  { id: 'build', emoji: '🔥', name: 'Build', tagline: 'Business & ambition', channels: ['Entrepreneurship', 'Career Growth', 'Networking', 'Side Hustles', 'Tech & Startups'] },
  { id: 'gather', emoji: '🙌', name: 'Gather', tagline: 'Local community', channels: ['Local Events', 'Volunteering', 'City Life', 'Neighbor Support'] },
  { id: 'carry', emoji: '🌧️', name: 'Carry', tagline: 'Grief & heaviness', channels: ['Grief & Loss', 'Mental Health Support', 'Anxiety & Overwhelm', 'Silent Suffering'] },
  { id: 'rise', emoji: '🌱', name: 'Rise', tagline: 'Recovery & resilience', channels: ['Sobriety Journey', 'Starting Over', 'Physical Healing', 'Rebuilding Confidence'] },
  { id: 'seek', emoji: '🕯️', name: 'Seek', tagline: 'Spirituality & meaning', channels: ['Open Faith Dialogues', 'Meditation & Mindfulness', 'Questioning & Exploring'] },
  { id: 'justbe', emoji: '🌙', name: 'Just Be', tagline: 'Presence & company', channels: ['Late Night Chat', 'No Agenda', 'Introvert Space', 'Simply Present'] },
  { id: 'open', emoji: '✨', name: 'Open', tagline: 'Type your own vibe', channels: [] }
];

export default function Landing() {
  const navigate = useNavigate();
  const [openVibe, setOpenVibe] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

  const handleVibeClick = (vibe) => {
    if (openVibe?.id === vibe.id) {
      setOpenVibe(null);
      setSelectedChannel(null);
    } else {
      setOpenVibe(vibe);
      setSelectedChannel(null);
    }
  };

  const handleEnterFully = () => navigate('/auth');

  const handleBrowseGuest = () => {
    if (openVibe) {
      const dest = selectedChannel
        ? `${openVibe.name} · ${selectedChannel}`
        : openVibe.name;
      navigate(`/dashboard/${encodeURIComponent(dest)}?guest=true`);
    } else {
      navigate('/vibe?guest=true');
    }
  };

  return (
    <div className="landing-container">
      <div className="landing-ambient" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-brand">
          <span className="landing-logo-icon">✦</span>
          <h1 className="landing-logo-text">VibeMatch</h1>
        </div>
        <button className="landing-header-cta" onClick={handleEnterFully}>
          Enter Fully →
        </button>
      </header>

      <main>
        <section className="landing-hero">
          <p className="landing-question">
            Something brought you here tonight.
          </p>
          <p className="landing-sub">
            Find the space that fits where you are right now. Real people, real conversations.
          </p>
          <div className="landing-hero-ctas">
            <button className="btn-primary landing-enter-btn" onClick={handleEnterFully}>
              Enter Fully →
            </button>
            <button className="landing-guest-btn" onClick={handleBrowseGuest}>
              Browse as Guest
            </button>
          </div>
        </section>

        <section className="landing-vibes-section">
          <p className="landing-section-label">Where would you like to be?</p>
          <div className="landing-vibe-grid">
            {NINE_VIBES.map((vibe) => (
              <button
                key={vibe.id}
                className={`landing-vibe-card ${openVibe?.id === vibe.id ? 'expanded' : ''}`}
                onClick={() => handleVibeClick(vibe)}
                aria-expanded={openVibe?.id === vibe.id}
              >
                <span className="landing-vibe-emoji">{vibe.emoji}</span>
                <span className="landing-vibe-name">{vibe.name}</span>
                <span className="landing-vibe-tag">{vibe.tagline}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom sheet peek when a vibe is selected */}
      {openVibe && (
        <div className="landing-bottom-sheet" role="dialog" aria-label={`${openVibe.name} channels`}>
          <div className="sheet-handle" aria-hidden="true" />
          <div className="sheet-header">
            <div className="sheet-vibe-info">
              <span className="sheet-vibe-emoji">{openVibe.emoji}</span>
              <div>
                <div className="sheet-vibe-name">{openVibe.name}</div>
                <div className="sheet-vibe-tagline">{openVibe.tagline}</div>
              </div>
            </div>
            <button
              className="sheet-close"
              onClick={() => { setOpenVibe(null); setSelectedChannel(null); }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="sheet-channels">
            {openVibe.id === 'open' ? (
              <div style={{ padding: '0 20px', width: '100%' }}>
                <input 
                  type="text" 
                  placeholder="What vibe are you looking for?"
                  value={selectedChannel || ''}
                  onChange={e => setSelectedChannel(e.target.value)}
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '1rem' }}
                  autoFocus
                />
              </div>
            ) : (
              openVibe.channels.map((ch) => (
                <button
                  key={ch}
                  className={`sheet-channel-chip ${selectedChannel === ch ? 'selected' : ''}`}
                  onClick={() => setSelectedChannel(selectedChannel === ch ? null : ch)}
                >
                  {ch}
                </button>
              ))
            )}
          </div>

          <div className="sheet-ctas">
            <button className="btn-primary" onClick={() => {
              const dest = selectedChannel && openVibe.id !== 'open'
                ? `${openVibe.name} · ${selectedChannel}`
                : selectedChannel || openVibe.name;
              navigate(`/auth?next=${encodeURIComponent('/dashboard/' + encodeURIComponent(dest))}`);
            }}>
              Enter Fully →
            </button>
            <button className="landing-guest-btn" onClick={handleBrowseGuest}>
              Browse as Guest
            </button>
          </div>
        </div>
      )}

      <footer className="landing-footer">
        A space for real people. Be kind.
      </footer>
    </div>
  );
}
