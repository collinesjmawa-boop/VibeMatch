import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { socket } from '../socket';
import './Dashboard.css';

export default function Dashboard() {
  const { vibe } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeUsers, setActiveUsers] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Manage Presence
  useEffect(() => {
    if (!user || !vibe) return;

    const presenceRef = doc(db, 'vibe_presence', `${vibe}_${user.uid}`);
    
    // Set presence
    setDoc(presenceRef, {
      uid: user.uid,
      name: user.displayName || 'Anonymous',
      vibe: vibe,
      lastSeen: Date.now()
    });

    // Cleanup presence on unmount
    return () => {
      deleteDoc(presenceRef);
    };
  }, [user, vibe]);

  // 2. Listen to Lobby
  useEffect(() => {
    if (!vibe) return;
    const q = query(collection(db, 'vibe_presence'), where('vibe', '==', vibe));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(doc => doc.data())
        .filter(u => u.uid !== user?.uid); // Don't show self
      setActiveUsers(users);
      setLoading(false);
    });

    return unsubscribe;
  }, [vibe, user]);

  // 3. Simulated Vibe Feed (Placeholder for promotions/news)
  useEffect(() => {
    const mockFeed = [
      { id: 1, type: 'news', title: `Trending in ${vibe}`, content: `People are discussing new trends in ${vibe} this week. Join a room to talk about it!`, promoted: false },
      { id: 2, type: 'promo', title: 'Featured Service', content: `Professional ${vibe} coaching available. Check out our latest session.`, promoted: true },
      { id: 3, type: 'event', title: 'Live Meetup', content: `Global ${vibe} meet happening on Zoom this Saturday. Dont miss out!`, promoted: false }
    ];
    setFeedItems(mockFeed);
  }, [vibe]);

  // 4. Handle Incoming Calls
  useEffect(() => {
    socket.on('receive_call_invite', (data) => {
      if (data.toUid === user.uid) {
        if (window.confirm(`${data.fromName} is calling you for ${data.type} in ${data.vibe}. Accept?`)) {
          navigate(`/room/${data.roomId}?type=${data.type}&vibe=${encodeURIComponent(data.vibe)}&with=${encodeURIComponent(data.fromName)}`);
        }
      }
    });
    return () => socket.off('receive_call_invite');
  }, [user, navigate]);

  const startCall = (otherUser, type) => {
    const roomId = `room_${user.uid}_${otherUser.uid}`;
    // Notify the other user
    socket.emit('send_call_invite', {
      toUid: otherUser.uid,
      fromName: user.displayName,
      roomId,
      type,
      vibe
    });
    // Navigate self
    navigate(`/room/${roomId}?init=true&type=${type}&vibe=${encodeURIComponent(vibe)}&with=${encodeURIComponent(otherUser.name)}`);
  };

  return (
    <div className="dashboard-container">
      <header className="dash-header">
        <div className="dash-brand" onClick={() => navigate('/vibe')}>
          <span className="dash-logo">✨</span>
          <h1 className="dash-title">VibeMatch Dashboard</h1>
        </div>
        <div className="dash-vibe-badge">
          Current Vibe: <strong>{vibe}</strong>
        </div>
        <button className="back-btn" onClick={() => navigate('/vibe')}>Switch Vibe</button>
      </header>

      <main className="dash-main">
        {/* Left Panel: Lobby */}
        <section className="dash-panel lobby-panel">
          <div className="panel-header">
            <h3>Live Lobby</h3>
            <span className="pulse-dot"></span>
          </div>
          <div className="user-list">
            {activeUsers.length > 0 ? (
              activeUsers.map(u => (
                <div key={u.uid} className="user-card">
                  <div className="user-avatar">{u.name.charAt(0)}</div>
                  <div className="user-details">
                    <p className="user-name">{u.name}</p>
                    <div className="call-actions">
                      <button className="call-btn audio" onClick={() => startCall(u, 'audio')}>📞 Audio</button>
                      <button className="call-btn video" onClick={() => startCall(u, 'video')}>📹 Video</button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-lobby">
                <p>You're the first one here! 🌟</p>
                <span>Hanging tight... others with this vibe will appear here soon.</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Feed */}
        <section className="dash-panel feed-panel">
          <div className="panel-header">
            <h3>Vibe Feed</h3>
          </div>
          <div className="feed-list">
            {feedItems.map(item => (
              <div key={item.id} className={`feed-card ${item.promoted ? 'promoted' : ''}`}>
                {item.promoted && <span className="promoted-tag">Promoted</span>}
                <h4>{item.title}</h4>
                <p>{item.content}</p>
                <button className="feed-btn">Learn More →</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
