import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
  collection, onSnapshot, doc, setDoc, deleteDoc, query, where, addDoc, updateDoc, arrayUnion, arrayRemove, limit
} from 'firebase/firestore';
import { socket } from '../socket';

import WaitlistModal from '../components/WaitlistModal';
import ReportModal from '../components/ReportModal';
import AICompanion from '../components/AICompanion';

import './Dashboard.css';

// Pre-defined state words
const STATE_WORDS = ["Heavy", "Curious", "Lost", "Hopeful", "Scattered", "Grateful", "Numb", "Driven", "Tender", "Exhausted"];

export default function Dashboard() {
  const { vibe: rawVibeParam } = useParams();
  const decodedPath = decodeURIComponent(rawVibeParam);
  const isChannel = decodedPath.includes(' · ');
  const parentVibe = isChannel ? decodedPath.split(' · ')[0] : decodedPath;
  const channelName = isChannel ? decodedPath.split(' · ')[1] : decodedPath;

  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isGuestMode = new URLSearchParams(location.search).get('guest') === 'true';

  // ── Modals & UI State ─────────────────────────────────────
  const [showStateWordModal, setShowStateWordModal] = useState(!isGuestMode);
  const [stateWordText, setStateWordText] = useState('');
  const [introText, setIntroText] = useState('');
  
  const [selectedUserIntro, setSelectedUserIntro] = useState(null); // for intro sheet

  const [waitlistOpts, setWaitlistOpts] = useState(null); // { title: '', subtitle: '' }
  const [reportOpts, setReportOpts] = useState(null);     // { targetUid, contentSnapshot }

  // ── Data State ────────────────────────────────────────────
  const [activeUsers, setActiveUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [vibeGroups, setVibeGroups] = useState([]);
  
  const [newPost, setNewPost] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);

  // ── Connection Request State ──────────────────────────────
  const [showReachModal, setShowReachModal] = useState(null); // Target user object
  const [intentionText, setIntentionText] = useState('');
  
  const [incomingRequest, setIncomingRequest] = useState(null);

  // ── Active user's presence ref ────────────────────────────
  const presenceId = user ? `${parentVibe}_${user.uid}` : null;

  useEffect(() => {
    if (!user || isGuestMode) return;
    // We defer writing presence until they pass the State Word modal.
  }, [user, isGuestMode]);

  const commitStateWord = async () => {
    if (!stateWordText) return;
    setShowStateWordModal(false);
    
    // Write presence with intro
    await setDoc(doc(db, 'vibe_presence', presenceId), {
      uid: user.uid,
      name: userProfile?.displayName || user.displayName,
      vibe: parentVibe,
      channel: channelName,
      stateWord: stateWordText,
      intro: introText.trim(),
      introExpiresAt: Date.now() + 86400000,
      lastSeen: Date.now()
    });
  };

  // Cleanup presence on unmount
  useEffect(() => {
    return () => {
      if (presenceId && !isGuestMode) {
        deleteDoc(doc(db, 'vibe_presence', presenceId)).catch(e => console.error(e));
      }
    };
  }, [presenceId, isGuestMode]);

  // ── Listen to Lobby ───────────────────────────────────────
  useEffect(() => {
    const qUsers = query(collection(db, 'vibe_presence'), where('vibe', '==', parentVibe), where('channel', '==', channelName));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const all = snapshot.docs.map(doc => doc.data());
      // Filter out self and expired intros
      setActiveUsers(all.filter(u => u.uid !== user?.uid && u.lastSeen > Date.now() - 3600000)); // only seen in last 1hr
    });

    const qGroups = query(collection(db, 'vibe_groups'), where('vibe', '==', parentVibe), where('status', '==', 'active'));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      setVibeGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubUsers(); unsubGroups(); };
  }, [parentVibe, channelName, user]);

  // ── Listen to Posts ───────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'vibe_posts'),
      where('vibe', '==', parentVibe),
      where('channel', '==', channelName),
      limit(50)
    );
    const unsubPosts = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const p = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(post => !post.expiresAt || post.expiresAt > now) // filter expired client-side
        .sort((a, b) => b.createdAt - a.createdAt);
      setPosts(p);
      setLoadingPosts(false);
    });
    return unsubPosts;
  }, [parentVibe, channelName]);

  // ── Listen to Connection Requests ─────────────────────────
  useEffect(() => {
    if (!user || isGuestMode) return;
    
    socket.on('connection_request', (data) => {
      if (data.toUid === user.uid) {
        setIncomingRequest(data);
      }
    });
    
    socket.on('connection_accepted', (data) => {
      if (data.fromUid === user.uid || data.toUid === user.uid) {
        // Both users are routed to the room
        navigate(`/room/${data.roomId}?vibe=${encodeURIComponent(parentVibe)}&channel=${encodeURIComponent(channelName)}`);
      }
    });

    return () => {
      socket.off('connection_request');
      socket.off('connection_accepted');
    };
  }, [user, isGuestMode, navigate, parentVibe, channelName]);


  // ── Handlers ──────────────────────────────────────────────
  const handleReachTowardSubmit = async () => {
    if (!intentionText.trim()) return;
    
    const reqData = {
      fromUid: user.uid,
      fromName: userProfile?.displayName,
      toUid: showReachModal.uid,
      vibe: parentVibe,
      channel: channelName,
      intention: intentionText.trim(),
      roomId: `room_${user.uid}_${showReachModal.uid}`,
      timestamp: Date.now()
    };
    
    // Save to Firestore for audit (optional), but emit directly for realtime
    await addDoc(collection(db, 'connection_requests'), { ...reqData, status: 'pending', expiresAt: Date.now() + 172800000 });
    
    socket.emit('send_connection_request', reqData);
    
    setShowReachModal(null);
    setIntentionText('');
    alert('Intention extended gracefully.');
  };

  const handleAcceptRequest = () => {
    socket.emit('accept_connection_request', incomingRequest);
    navigate(`/room/${incomingRequest.roomId}?vibe=${encodeURIComponent(parentVibe)}&channel=${encodeURIComponent(channelName)}`);
  };

  const handleDeclineRequest = () => {
    // Dissolves silently
    setIncomingRequest(null);
  };

  const handleCreateGroup = () => {
    setWaitlistOpts({
      title: 'Ticketed Creator Rooms',
      subtitle: 'Host deeply engaging, ticketed spaces for your audience. Currently in preview.'
    });
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim() || isGuestMode) return;
    try {
      await addDoc(collection(db, 'vibe_posts'), {
        vibe: parentVibe,
        channel: channelName,
        authorId: user.uid,
        authorName: userProfile?.displayName || user.displayName,
        content: newPost.trim(),
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000, // 24hr expiry
        resonances: [], // array of UIDs
        saves: [],
        gifts: [], // 'I needed this' daily tracker
        shares: 0
      });
      setNewPost('');
    } catch (err) {
      console.error(err);
      alert('Failed to post. Check connection.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this thought forever?")) return;
    await deleteDoc(doc(db, 'vibe_posts', postId));
  };


  // ── Resonance Hold Gesture ────────────────────────────────
  const holdTimers = useRef({});
  
  const startResonance = (postId) => {
    if (isGuestMode) return;
    holdTimers.current[postId] = setTimeout(async () => {
      // Complete resonance
      const postRef = doc(db, 'vibe_posts', postId);
      const post = posts.find(p => p.id === postId);
      if (!post.resonances?.includes(user.uid)) {
        await updateDoc(postRef, { resonances: arrayUnion(user.uid) });
      } else {
        await updateDoc(postRef, { resonances: arrayRemove(user.uid) });
      }
    }, 2000); // 2 second hold
  };

  const cancelResonance = (postId) => {
    if (holdTimers.current[postId]) {
      clearTimeout(holdTimers.current[postId]);
      delete holdTimers.current[postId];
    }
  };

  // ── Utilities ─────────────────────────────────────────────
  const hasResonated = (post) => post.resonances?.includes(user?.uid);
  
  const handleGift = async (post) => {
    // Mock daily limit checking
    const postRef = doc(db, 'vibe_posts', post.id);
    await updateDoc(postRef, { gifts: arrayUnion(user?.uid) });
    alert("Someone needed this — the author has been quietly notified.");
  };

  const handleSaveToArchive = async (post) => {
    const postRef = doc(db, 'vibe_posts', post.id);
    await updateDoc(postRef, { saves: arrayUnion(user?.uid) });
  };


  // ── Render Helpers ────────────────────────────────────────
  // Calculate expiry percentage for arc
  const getExpiryPct = (post) => {
    if (!post.expiresAt) return 0;
    const total = 86400000;
    const remaining = post.expiresAt - Date.now();
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  };


  return (
    <div className="dashboard-container">
      
      {/* 1. State Word Modal (Blocking if unauthed/no state) */}
      {showStateWordModal && !isGuestMode && (
        <div className="state-word-overlay">
          <div className="state-word-modal">
            <h2>One word.</h2>
            <p>Where are you right now?</p>
            
            <div className="word-grid">
              {STATE_WORDS.map(w => (
                <button 
                  key={w} 
                  className={`word-chip ${stateWordText === w ? 'selected' : ''}`}
                  onClick={() => setStateWordText(w)}
                >
                  {w}
                </button>
              ))}
            </div>
            
            <div className="word-custom-input">
              <input 
                type="text" 
                placeholder="Or type your own word..." 
                value={stateWordText}
                onChange={(e) => setStateWordText(e.target.value)}
              />
            </div>

            <div className="intro-textarea">
              <textarea 
                placeholder={`Prompt: Why did you come to ${channelName} today?`}
                value={introText}
                onChange={e => setIntroText(e.target.value.slice(0, 300))}
              />
              <span className="intro-char-count">{introText.length} / 300</span>
            </div>

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!stateWordText} onClick={commitStateWord}>
              Enter Space →
            </button>
          </div>
        </div>
      )}

      {/* 2. Modals */}
      {waitlistOpts && <WaitlistModal title={waitlistOpts.title} subtitle={waitlistOpts.subtitle} onClose={() => setWaitlistOpts(null)} />}
      
      {reportOpts && <ReportModal 
          reportedUid={reportOpts.targetUid} 
          contentSnapshot={reportOpts.contentSnapshot}
          reporterUid={user?.uid}
          vibe={parentVibe}
          channel={channelName}
          onClose={() => setReportOpts(null)} 
      />}

      {/* Connection Initiation */}
      {showReachModal && (
        <div className="connection-overlay">
          <div className="connection-modal">
            <h2>Reach Toward</h2>
            <p>Why are you reaching toward <span className="connection-from">{showReachModal.name}</span> right now?</p>
            
            <div className="intention-form">
              <label>Your Intention (up to 120 chars)</label>
              <textarea 
                value={intentionText}
                onChange={e => setIntentionText(e.target.value.slice(0, 120))}
                placeholder="I read your intro and felt less alone..."
              />
              <div className="intention-preview">
                They will see: "{userProfile?.displayName || 'Someone'} would like to connect — {intentionText}"
              </div>
            </div>

            <div className="connection-actions" style={{ marginTop: '20px' }}>
              <button className="btn-ghost" onClick={() => setShowReachModal(null)}>Cancel</button>
              <button className="btn-primary" disabled={!intentionText} onClick={handleReachTowardSubmit}>Extend →</button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Connection Request */}
      {incomingRequest && (
        <div className="connection-overlay">
          <div className="connection-modal">
            <h2>An Extended Hand</h2>
            <p><span className="connection-from">{incomingRequest.fromName}</span> is reaching toward you.</p>
            
            <div className="connection-intention">
              "{incomingRequest.intention}"
            </div>

            <div className="connection-actions">
              <button className="btn-ghost" onClick={handleDeclineRequest}>Not Now</button>
              <button className="btn-primary" onClick={handleAcceptRequest}>Accept</button>
            </div>
          </div>
        </div>
      )}

      {/* Intro Sheet */}
      {selectedUserIntro && (
        <div className="intro-sheet-overlay" onClick={() => setSelectedUserIntro(null)}>
          <div className="intro-sheet" onClick={e => e.stopPropagation()}>
            <div className="intro-sheet-handle"></div>
            <h3 className="intro-sheet-name">{selectedUserIntro.name}</h3>
            {selectedUserIntro.stateWord && (
              <span className="intro-sheet-word">{selectedUserIntro.stateWord}</span>
            )}
            <p className="intro-sheet-text">
              {selectedUserIntro.intro || "No introduction written."}
            </p>
            {!isGuestMode && selectedUserIntro.uid !== user?.uid && (
              <button className="btn-primary" style={{ marginTop: '24px', width: '100%', justifyContent: 'center' }} onClick={() => {
                setShowReachModal(selectedUserIntro);
                setSelectedUserIntro(null);
              }}>
                Reach Toward
              </button>
            )}
          </div>
        </div>
      )}


      {/* Header */}
      <header className="dash-header">
        <div className="dash-brand" onClick={() => navigate('/vibe')}>
          <span className="dash-logo">✦</span>
          <h1 className="dash-title">VibeMatch</h1>
        </div>
        <div className="dash-vibe-badge">
          <strong>{parentVibe}</strong> {isChannel && `· ${channelName}`}
        </div>
        <button className="back-btn" onClick={() => navigate('/vibe')}>Places</button>
      </header>

      {isGuestMode && (
        <div className="guest-banner">
          <span>You are browsing quietly as a guest.</span>
          <a href="/auth">Enter Fully to participate →</a>
        </div>
      )}

      <main className="dash-main">
        {/* LOBBY */}
        <section className="dash-panel lobby-panel">
          <div className="panel-header">
            <h3>People</h3>
            {!isGuestMode && <button className="create-group-btn" onClick={handleCreateGroup}>➕ Group</button>}
          </div>

          <div className="user-list">
            <span className="section-label">Online In This Space</span>
            
            {activeUsers.map(u => (
              <div key={u.uid} className="user-card" onClick={() => setSelectedUserIntro(u)}>
                <div className="user-avatar">{u.name.charAt(0)}</div>
                <div className="user-details">
                  <p className="user-name">{u.name}</p>
                  {u.stateWord && <span className="user-state-word">{u.stateWord}</span>}
                </div>
              </div>
            ))}

            {activeUsers.length === 0 && (
              <div className="empty-lobby">
                <p>It's quiet in here right now.</p>
              </div>
            )}
          </div>
        </section>

        {/* WALL */}
        <section className="dash-panel feed-panel">
          
          {!isGuestMode && (
            <div className="post-creator">
              <form onSubmit={handlePostSubmit}>
                <textarea 
                  placeholder={`Write softly to the ${channelName} space... (expires in 24h)`}
                  value={newPost}
                  onChange={e => setNewPost(e.target.value.slice(0, 300))}
                />
                <div className="creator-footer">
                  <span className="char-count">{newPost.length}/300</span>
                  <button className="btn-primary post-btn" disabled={!newPost.trim() || isGuestMode}>Release Thought</button>
                </div>
              </form>
            </div>
          )}

          {activeUsers.length === 0 && !loadingPosts && (
            <AICompanion vibe={parentVibe} channel={channelName} />
          )}

          {activeUsers.length > 0 && !loadingPosts && (
             <div className="ai-someone-joined">
                <span>Someone is in the space with you.</span>
             </div>
          )}

          <div className="feed-list">
            {posts.map(post => {
               // Calculate glow intensity based on resonances
               const resCount = post.resonances?.length || 0;
               const glowOpacity = Math.min(0.4, resCount * 0.05);
               const boxShadow = resCount > 0 ? `0 0 ${20 + resCount*5}px rgba(201,149,106,${glowOpacity})` : 'none';

               return (
                <div key={post.id} className="feed-card" style={{ boxShadow }}>
                  <div className="expiry-arc" style={{ '--expiry-pct': `${getExpiryPct(post)}%` }}></div>
                  <div className="post-header">
                    <div className="post-avatar">{post.authorName?.charAt(0)}</div>
                    <div className="post-meta">
                      <span className="author">{post.authorName}</span>
                      <span className="time">{new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="post-actions-top">
                      <button className="post-action-btn" title="Report" onClick={() => setReportOpts({ targetUid: post.authorId, contentSnapshot: post.content })}>
                        🚩
                      </button>
                      {post.authorId === user?.uid && (
                        <button className="post-action-btn delete" onClick={() => handleDeletePost(post.id)}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="post-body">
                    <p className="post-content">{post.content}</p>
                  </div>
                  
                  <div className="post-interactions">
                    {/* Resonance Hold */}
                    <button 
                      className={`resonance-btn ${hasResonated(post) ? 'resonated' : ''}`}
                      onPointerDown={() => startResonance(post.id)}
                      onPointerUp={() => cancelResonance(post.id)}
                      onPointerLeave={() => cancelResonance(post.id)}
                      title="Hold to Resonate"
                    >
                      <div className="ring" style={{ '--progress': '0%' }}></div>
                      ✦ Resonate {resCount > 0 ? `(${resCount})` : ''}
                    </button>
                    
                    {/* Gift */}
                    <button 
                      className={`gift-btn ${post.gifts?.includes(user?.uid) ? 'given' : ''}`}
                      onClick={() => handleGift(post)}
                      disabled={post.gifts?.includes(user?.uid) || post.authorId === user?.uid}
                    >
                      I Needed This
                    </button>

                    {/* Save */}
                    <button 
                      className={`save-btn ${post.saves?.includes(user?.uid) ? 'saved' : ''}`}
                      onClick={() => handleSaveToArchive(post)}
                      title="Save to Archive"
                    >
                      🔖
                    </button>

                    {post.authorId === user?.uid && (
                      <button 
                        className="preserve-btn" 
                        style={{ marginLeft: 'auto' }}
                        onClick={() => setWaitlistOpts({ title: 'Memory Preservation', subtitle: 'Preserve this moment permanently. Coming soon.' })}
                      >
                        Preserve This
                      </button>
                    )}
                  </div>
                </div>
               );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
