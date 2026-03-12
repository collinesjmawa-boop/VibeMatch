import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import './Room.css';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins default

  useEffect(() => {
    // Join the specific room
    socket.emit('join_room', roomId);

    // Listen for incoming messages
    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for someone leaving
    socket.on('user_left', () => {
      alert("Your vibe partner has left the room.");
      navigate("/");
    });

    // Timer logic
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSessionEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      socket.off('receive_message');
      socket.off('user_left');
      socket.emit('leave_room', roomId);
    };
  }, [roomId, navigate]);

  const handleSessionEnd = () => {
    alert("Vibe session ended!");
    navigate("/");
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
      roomId,
      text: inputMessage,
      senderId: socket.id,
      senderName: 'Me' // In a complete app, use the actual profile name
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, { ...newMessage, id: Date.now(), senderId: 'me' }]);
    
    // Send to server
    socket.emit('send_message', newMessage);
    
    setInputMessage('');
  };

  return (
    <div className="room-container mood-gradient-chill">
      
      {/* Header */}
      <header className="room-header glass-panel">
        <div className="room-info">
          <span className="vibe-badge">🔥 Energetic Vibe</span>
          <div className="participant-count">👥 2 connected</div>
        </div>
        
        <div className="timer-wrapper">
          <div className={`timer-text ${timeLeft < 60 ? 'urgent' : ''}`}>
            ⏳ {formatTime(timeLeft)}
          </div>
        </div>

        <button className="leave-btn" onClick={() => navigate('/')}>
          Leave Room
        </button>
      </header>

      {/* Main Grid: Video/Audio and Chat */}
      <div className="room-layout">
        
        {/* Media Placeholder */}
        <div className="media-section glass-panel">
          <div className="media-placeholder">
            <div className="avatar-pulse">
              <span className="emoji-avatar">👽</span>
            </div>
            <h3>Anonymous User</h3>
            <p>Audio Connected</p>
          </div>
        </div>

        {/* Chat Section */}
        <div className="chat-section glass-panel">
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <p>Say hi! Don't overthink it.</p>
                <div className="icebreaker">✨ Icebreaker: What's the best thing that happened this week?</div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                  <div className="msg-bubble">{msg.text}</div>
                </div>
              ))
            )}
          </div>

          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              className="chat-input input-field" 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <button type="submit" className="send-btn" disabled={!inputMessage.trim()}>
              Send
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
