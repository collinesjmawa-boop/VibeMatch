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
  where,
  addDoc,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit
} from 'firebase/firestore';
import { socket } from '../socket';
import './Dashboard.css';

export default function Dashboard() {
  const { vibe } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeUsers, setActiveUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);

  const [vibeGroups, setVibeGroups] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupPrivacy, setGroupPrivacy] = useState('public');

  // 1. Manage Presence (Lobby)
  useEffect(() => {
    if (!user || !vibe) return;
    const presenceRef = doc(db, 'vibe_presence', `${vibe}_${user.uid}`);
    setDoc(presenceRef, {
      uid: user.uid,
      name: user.displayName || 'Anonymous',
      vibe: vibe,
      lastSeen: Date.now()
    });
    return () => { deleteDoc(presenceRef); };
  }, [user, vibe]);

  // 2. Listen to Lobby & Groups
  useEffect(() => {
    if (!vibe) return;
    
    // Users
    const qUsers = query(collection(db, 'vibe_presence'), where('vibe', '==', vibe));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setActiveUsers(snapshot.docs.map(doc => doc.data()).filter(u => u.uid !== user?.uid));
      setLoading(false);
    });

    // Groups
    const qGroups = query(collection(db, 'vibe_groups'), where('vibe', '==', vibe), where('status', '==', 'active'));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      setVibeGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubUsers(); unsubGroups(); };
  }, [vibe, user]);

  // 3. Listen to Vibe Wall (Posts)
  useEffect(() => {
    if (!vibe) return;
    const q = query(
      collection(db, 'vibe_posts'), 
      where('vibe', '==', vibe),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(p);
    });

    return unsubscribe;
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
    socket.emit('send_call_invite', { toUid: otherUser.uid, fromName: user.displayName, roomId, type, vibe });
    navigate(`/room/${roomId}?init=true&type=${type}&vibe=${encodeURIComponent(vibe)}&with=${encodeURIComponent(otherUser.name)}`);
  };

  const handleCreateGroup = async () => {
    const groupId = `group_${user.uid}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'vibe_groups', groupId), {
        vibe,
        creatorId: user.uid,
        creatorName: user.displayName,
        privacy: groupPrivacy,
        status: 'active',
        createdAt: Date.now()
      });
      // Copy link to clipboard if private
      const link = `${window.location.origin}/room/${groupId}?type=video&vibe=${encodeURIComponent(vibe)}&with=${encodeURIComponent(user.displayName)}'s Group`;
      if (groupPrivacy === 'private') {
        navigator.clipboard.writeText(link);
        alert("Private Group Created! Link copied to clipboard. Share it with your colleagues! 🔗");
      }
      navigate(`/room/${groupId}?init=true&type=video&vibe=${encodeURIComponent(vibe)}&with=${encodeURIComponent(user.displayName)}'s Group`);
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  const joinGroup = (group) => {
    navigate(`/room/${group.id}?type=video&vibe=${encodeURIComponent(vibe)}&with=${encodeURIComponent(group.creatorName)}'s Group`);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    
    try {
      await addDoc(collection(db, 'vibe_posts'), {
        vibe,
        authorId: user.uid,
        authorName: user.displayName,
        content: newPost.trim(),
        createdAt: Date.now(),
        reactions: { love: [], fire: [], like: [] },
        comments: []
      });
      setNewPost('');
    } catch (err) {
      console.error("Error creating post:", err);
    }
  };

  const handleReaction = async (postId, type) => {
    const postRef = doc(db, 'vibe_posts', postId);
    const post = posts.find(p => p.id === postId);
    const hasReacted = post.reactions[type]?.includes(user.uid);
    
    await updateDoc(postRef, {
      [`reactions.${type}`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  return (
    <div className="dashboard-container">
      <header className="dash-header">
        <div className="dash-brand" onClick={() => navigate('/vibe')}>
          <span className="dash-logo">✨</span>
          <h1 className="dash-title">VibeMatch</h1>
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
            <button className="create-group-btn" onClick={() => setIsCreatingGroup(!isCreatingGroup)}>
              {isCreatingGroup ? '✖ Cancel' : '➕ Create Group'}
            </button>
          </div>

          {isCreatingGroup && (
            <div className="group-creator-box">
              <p>Start a collaborative viding session</p>
              <div className="privacy-toggle">
                <button className={groupPrivacy === 'public' ? 'active' : ''} onClick={() => setGroupPrivacy('public')}>Public</button>
                <button className={groupPrivacy === 'private' ? 'active' : ''} onClick={() => setGroupPrivacy('private')}>Private (Link Only)</button>
              </div>
              <button className="btn-primary" onClick={handleCreateGroup}>Launch Group Space →</button>
            </div>
          )}

          <div className="user-list">
            {vibeGroups.length > 0 && (
              <div className="vibe-groups-section">
                <span className="section-label">Active Groups</span>
                {vibeGroups.filter(g => g.privacy === 'public').map(group => (
                  <div key={group.id} className="user-card group-card">
                    <div className="user-avatar group">👥</div>
                    <div className="user-details">
                      <p className="user-name">{group.creatorName}'s Space</p>
                      <button className="join-group-btn" onClick={() => joinGroup(group)}>Join Group</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <span className="section-label">Online Individuals</span>
            {activeUsers.length > 0 ? (
              activeUsers.map(u => (
                <div key={u.uid} className="user-card">
                  <div className="user-avatar">{u.name.charAt(0)}</div>
                  <div className="user-details">
                    <p className="user-name">{u.name}</p>
                    <div className="call-actions">
                      <button className="call-btn chat" onClick={() => startCall(u, 'text')}>💬 Chat</button>
                      <button className="call-btn audio" onClick={() => startCall(u, 'audio')}>📞 Audio</button>
                      <button className="call-btn video" onClick={() => startCall(u, 'video')}>📹 Video</button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-lobby">
                <p>No active users nearby... yet! 🌟</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Vibe Wall (Posts) */}
        <section className="dash-panel feed-panel">
          <div className="panel-header">
            <h3>Vibe Wall</h3>
            <span className="vibe-count">{posts.length} Posts</span>
          </div>
          
          <div className="post-creator">
            <form onSubmit={handleCreatePost}>
              <textarea 
                placeholder={`Share a thought with other ${vibe} people...`}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
              <div className="creator-footer">
                <span className="char-count">{newPost.length}/280</span>
                <button className="btn-primary post-btn" disabled={!newPost.trim()}>Post Vibe →</button>
              </div>
            </form>
          </div>

          <div className="feed-list">
            {posts.map(post => (
              <div key={post.id} className="feed-card post-card">
                <div className="post-header">
                  <div className="post-avatar">{post.authorName?.charAt(0)}</div>
                  <div className="post-meta">
                    <span className="author">{post.authorName}</span>
                    <span className="time">{new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
                <p className="post-content">{post.content}</p>
                
                <div className="post-interactions">
                  <div className="reactions">
                    <button 
                      className={`react-btn ${post.reactions.love?.includes(user.uid) ? 'active' : ''}`}
                      onClick={() => handleReaction(post.id, 'love')}
                    >
                      ❤️ <span>{post.reactions.love?.length || 0}</span>
                    </button>
                    <button 
                      className={`react-btn ${post.reactions.like?.includes(user.uid) ? 'active' : ''}`}
                      onClick={() => handleReaction(post.id, 'like')}
                    >
                      👍 <span>{post.reactions.like?.length || 0}</span>
                    </button>
                    <button 
                      className={`react-btn ${post.reactions.fire?.includes(user.uid) ? 'active' : ''}`}
                      onClick={() => handleReaction(post.id, 'fire')}
                    >
                      🔥 <span>{post.reactions.fire?.length || 0}</span>
                    </button>
                  </div>
                  <button className="comment-btn">💬 {post.comments?.length || 0} Comments</button>
                </div>
              </div>
            ))}
            {posts.length === 0 && !loading && (
              <div className="empty-feed">
                <p>No posts yet in this vibe. Be the first!</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

