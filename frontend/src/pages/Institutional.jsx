import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function Institutional() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', org: '', email: '', role: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.org || !form.email) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'institutional_enquiries'), {
        ...form,
        createdAt: Date.now()
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Failed to submit enquiry. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="landing-container">
      <div className="landing-ambient" />
      <header className="landing-header">
        <div className="landing-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <span className="landing-logo-icon">✦</span>
          <h1 className="landing-logo-text">VibeMatch</h1>
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '40px auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <h1 className="editorial" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>VibeMatch for Institutions</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '40px' }}>
          We are partnering with healthcare providers, universities, and faith organisations to bring emotionally resonant group connections to communities that need them most.
        </p>

        {success ? (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '32px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--accent-sage)', marginBottom: '8px' }}>Enquiry Received</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Our partnerships team will be in touch with you shortly.</p>
            <button className="btn-ghost" style={{ marginTop: '24px' }} onClick={() => navigate('/')}>Return to Home</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '32px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Organisation / Institution</label>
              <input type="text" value={form.org} onChange={e => setForm({...form, org: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Work Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Role (Optional)</label>
              <input type="text" value={form.role} onChange={e => setForm({...form, role: e.target.value})} />
            </div>
            
            <button className="btn-primary" style={{ marginTop: '16px', justifyContent: 'center' }} disabled={loading || !form.name || !form.org || !form.email}>
              {loading ? 'Submitting...' : 'Request Information →'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
