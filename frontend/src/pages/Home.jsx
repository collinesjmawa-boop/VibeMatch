import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const vibeCategories = [
  {
    group: '🎯 Learn & Grow',
    vibes: ['Coding & Tech', 'Study Together', 'Language Exchange', 'Science Talk', 'Career Advice']
  },
  {
    group: '📖 Spirituality',
    vibes: ['Read Bible Together', 'Pray Together', 'Meditation', 'Quran Study', 'Faith & Life']
  },
  {
    group: '💰 Money & Finance',
    vibes: ['Financial Advice', 'Investment Talk', 'Crypto & Stocks', 'Business Ideas', 'Budgeting Help']
  },
  {
    group: '💬 Social Vibes',
    vibes: ['Chill & Chatty', 'Vent & Listen', 'Need Motivation', 'Make Friends', 'Debate Club']
  },
  {
    group: '❤️ Romance',
    vibes: ['Romantic', 'Dating Advice', 'Heartbreak Support', 'Relationship Goals']
  },
  {
    group: '🎮 Fun & Hobbies',
    vibes: ['Gaming', 'Music Lovers', 'Art & Creativity', 'Movies & Shows', 'Cooking & Food']
  },
  {
    group: '💼 Business',
    vibes: ['Networking', 'Pitch My Idea', 'Find a Co-founder', 'Freelancer\'s Corner']
  },
  {
    group: '🌍 Local & Community',
    vibes: ['Ugandan Politics', 'African Culture', 'Community Events', 'Health & Wellness']
  },
];

export default function Home() {
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [customInterest, setCustomInterest] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSelectVibe = (vibe) => {
    setSelectedVibe(vibe);
    setCustomInterest('');
  };

  const handleJoin = () => {
    const vibeToJoin = selectedVibe || customInterest.trim();
    if (!vibeToJoin) return;
    navigate(`/dashboard/${encodeURIComponent(vibeToJoin)}`);
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="brand-logo">
          <span className="logo-icon">✨</span>
          <h1 className="logo-text">VibeMatch</h1>
        </div>
        <div className="user-info">
          <span className="user-greeting">Hi, {user?.displayName || 'Friend'} 👋</span>
          <button className="logout-btn" onClick={logout}>Sign Out</button>
        </div>
      </header>

      <main className="vibe-select-main">
        <div className="vibe-select-header">
          <h2>What's your vibe right now?</h2>
          <p>Choose a category or type anything — we'll find your people.</p>
        </div>

        <div className="vibe-categories">
          {vibeCategories.map((cat) => (
            <div key={cat.group} className="vibe-category-block">
              <h3 className="category-label">{cat.group}</h3>
              <div className="vibe-chips">
                {cat.vibes.map((vibe) => (
                  <button
                    key={vibe}
                    className={`vibe-chip ${selectedVibe === vibe ? 'active' : ''}`}
                    onClick={() => handleSelectVibe(vibe)}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="custom-vibe-section">
          <div className="or-divider"><span>OR TYPE ANY VIBE</span></div>
          <input
            type="text"
            className="input-field"
            placeholder="E.g. 'Ugandan politics', 'Jazz music', 'Grief support'..."
            value={customInterest}
            onChange={(e) => { setCustomInterest(e.target.value); setSelectedVibe(null); }}
          />
        </div>

        <div className="selected-vibe-bar">
          {(selectedVibe || customInterest) ? (
            <div className="selected-vibe-preview">
              <span>Your vibe: <strong>{selectedVibe || customInterest}</strong></span>
              <button className="btn-primary join-btn" onClick={handleJoin}>
                Enter My Vibe Space →
              </button>
            </div>
          ) : (
            <div className="selected-vibe-placeholder">
              Select a vibe above to get started ↑
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

