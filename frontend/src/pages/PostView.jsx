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

  if (loading) return <div className="loading-screen">✦ Shuffling through the Vibe Wall...</div>;
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
          <span className="logo">✦</span>
          <h1>VibeMatch</h1>
        </div>
        <button className="join-btn-top" onClick={() => navigate('/auth')}>Join This Vibe</button>
      </header>

      <main className="post-view-main">
        <article className="post-card standalone">
          <div className="vibe-tag">Vibe: <strong>{post.vibe}</strong></div>
          
          <header className="post-header">
            <div className="post-avatar">{post.authorName?.charAt(0)}</div>
            <div className="post-meta">
              <span className="author">{post.authorName}</span>
              <span className="time">{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </header>

          <section className="post-body">
            <p className="post-content">{post.content}</p>
          </section>

          <footer className="guest-footer">
            <div className="guest-stats">
              <span>✦ {post.resonances?.length || 0} resounded</span>
              <span>📤 {post.shares || 0} shared</span>
            </div>
            
            <div className="cta-box">
              <p>Someone shared this moment from the {post.vibe} space.</p>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/auth')}>
                Register to Join the Conversation →
              </button>
              <button className="btn-ghost" style={{ width: '100%', marginTop: '12px' }} onClick={() => navigate('/')}>
                Browse Other Vibes
              </button>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}
