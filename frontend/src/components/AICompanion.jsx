import { useState, useRef, useEffect } from 'react';

export default function AICompanion({ vibe, channel }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: `I am here. It is quiet. How are you feeling in ${channel || vibe}?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      // Remove trailing slash if present
      if (BACKEND_URL.endsWith('/')) BACKEND_URL = BACKEND_URL.slice(0, -1);
      
      const res = await fetch(`${BACKEND_URL}/api/ai-companion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe,
          channel: channel || vibe,
          history: newMessages.map(m => ({ role: m.role, text: m.text }))
        })
      });
      const data = await res.json();
      if (data.error) {
        setMessages([...newMessages, { role: 'ai', text: "I'm sorry, I seem to be unavailable right now." }]);
      } else {
        setMessages([...newMessages, { role: 'ai', text: data.reply }]);
      }
    } catch (err) {
      console.error("AI Companion Error:", err);
      setMessages([...newMessages, { role: 'ai', text: "I've lost my connection to the space..." }]);
    }
    setLoading(false);
  };

  return (
    <div className="ai-companion-widget">
      <div className="ai-companion-label">
        <div className="ai-dot"></div>
        <span>Companion Present</span>
      </div>
      <p className="ai-companion-desc">
        A listening presence — not a person. Here to hold space when it's quiet.
      </p>

      <div className="ai-chat-history" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`ai-chat-msg ${m.role === 'user' ? 'user-msg' : 'ai-msg'}`}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="ai-chat-msg ai-msg" style={{ opacity: 0.7 }}>
            Thinking...
          </div>
        )}
      </div>

      <div className="ai-input-row">
        <input
          type="text"
          placeholder="Speak into the quiet..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="ai-send-btn" onClick={handleSend} disabled={!input.trim() || loading}>
          Share
        </button>
      </div>
    </div>
  );
}
