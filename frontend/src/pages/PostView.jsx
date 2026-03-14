import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import './PostView.css';

export default function PostView() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'vibe_posts', postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error("Error fetching post:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (loading) return <div className="loading-screen">✨ Shuffling through the Vibe Wall...</div>;
  if (!post) return (
    <div className="error-view">
      <h2>Vibe Not Found! 💨</h2>
      <p>This post might have been deleted or is no longer in this vibe.</p>
      <button className="btn-primary" onClick={() => navigate('/')}>Back to VibeMatch</button>
    </div>
  );

  return (
    <div className="post-view-container">
      <header className="post-view-header">
        <div className="brand" onClick={() => navigate('/')}>
          <span className="logo">✨</span>
          <h1>VibeMatch</h1>
        </div>
        <button className="join-btn-top" onClick={() => navigate('/auth')}>Join This Vibe</button>
      </header>

      <main className="post-view-main">
        <div className="post-card standalone">
          <div className="vibe-tag">Vibe: <strong>{post.vibe}</strong></div>
          
          <div className="post-header">
            <div className="post-avatar">{post.authorName?.charAt(0)}</div>
            <div className="post-meta">
              <span className="author">{post.authorName}</span>
              <span className="time">{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="post-body">
            <p className="post-content">{post.content}</p>
          </div>

          <div className="guest-footer">
            <div className="guest-stats">
              <span>❤️ {post.reactions?.love?.length || 0}</span>
              <span>👍 {post.reactions?.like?.length || 0}</span>
              <span>💬 {post.comments?.length || 0}</span>
            </div>
            
            <div className="cta-box">
              <p>Want to react or join the conversation?</p>
              <button className="btn-primary" onClick={() => navigate('/auth')}>
                Register to Join the {post.vibe} Vibe →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
