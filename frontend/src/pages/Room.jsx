import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import { useAuth } from '../contexts/AuthContext';
import './Room.css';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const initialType = queryParams.get('type') || 'text';
  const withUser = queryParams.get('with') || 'Someone';

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [callType, setCallType] = useState(initialType); // 'text', 'audio', 'video'
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(initialType !== 'video');

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    socket.emit('join_room', roomId);

    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('user_left', () => {
      alert(`${withUser} has left.`);
      navigate('/vibe');
    });

    // WebRTC Signaling
    socket.on('webrtc_signal', async (data) => {
      if (data.type === 'offer') {
        await handleOffer(data.offer);
      } else if (data.type === 'answer') {
        await handleAnswer(data.answer);
      } else if (data.type === 'candidate') {
        await handleCandidate(data.candidate);
      }
    });

    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);

    if (initialType !== 'text') {
      startMedia();
    }

    return () => {
      clearInterval(timer);
      socket.off('receive_message');
      socket.off('user_left');
      socket.off('webrtc_signal');
      socket.emit('leave_room', roomId);
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, navigate, withUser, initialType]);

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: initialType === 'video'
      });
      localStream.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      
      initPeerConnection();
      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });

      // If we are the one starting the call, create offer
      if (queryParams.get('init') === 'true') {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.emit('webrtc_signal', { roomId, type: 'offer', offer });
      }
    } catch (err) {
      console.error("Media error:", err);
    }
  };

  const initPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_signal', { roomId, type: 'candidate', candidate: event.candidate });
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
  };

  const handleOffer = async (offer) => {
    if (!peerConnection.current) initPeerConnection();
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    socket.emit('webrtc_signal', { roomId, type: 'answer', answer });
  };

  const handleAnswer = async (answer) => {
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleCandidate = async (candidate) => {
    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const msg = { roomId, text: inputMessage, senderName: user.displayName };
    setMessages(prev => [...prev, { ...msg, id: Date.now(), senderId: 'me' }]);
    socket.emit('send_message', msg);
    setInputMessage('');
  };

  return (
    <div className="room-container">
      <header className="room-header">
        <div className="room-info">
          <span className="vibe-badge">✨ {queryParams.get('vibe') || 'Vibe'}</span>
          <span className="with-user">Talking with <strong>{withUser}</strong></span>
        </div>
        <div className="timer-box">{formatTime(timeLeft)}</div>
        <button className="leave-btn" onClick={() => navigate('/vibe')}>End Session</button>
      </header>

      <div className="room-content">
        <div className="media-grid">
          <div className="video-card remote">
            <video ref={remoteVideoRef} autoPlay playsInline className="video-stream"></video>
            {!remoteVideoRef.current?.srcObject && (
              <div className="video-placeholder">
                <div className="avatar-big">{withUser.charAt(0)}</div>
                <p>Waiting for {withUser}...</p>
              </div>
            )}
          </div>
          
          <div className="video-card local">
            <video ref={localVideoRef} autoPlay playsInline muted className="video-stream"></video>
            <div className="local-tag">You</div>
          </div>

          <div className="media-controls">
            <button className={`control-btn ${isMuted ? 'off' : ''}`} onClick={() => {
              localStream.current.getAudioTracks()[0].enabled = isMuted;
              setIsMuted(!isMuted);
            }}>
              {isMuted ? '🔇 Unmute' : '🎤 Mute'}
            </button>
            <button className={`control-btn ${isCameraOff ? 'off' : ''}`} onClick={() => {
              if (localStream.current.getVideoTracks()[0]) {
                localStream.current.getVideoTracks()[0].enabled = isCameraOff;
                setIsCameraOff(!isCameraOff);
              }
            }}>
              {isCameraOff ? '📷 Cam On' : '📹 Cam Off'}
            </button>
          </div>
        </div>

        <div className="chat-panel">
          <div className="chat-history">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.senderId === 'me' ? 'sent' : 'received'}`}>
                <div className="msg-content">
                  {m.senderId !== 'me' && <span className="sender">{m.senderName}</span>}
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
          </div>
          <form className="chat-field" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder="Type your message..." 
              value={inputMessage} 
              onChange={e => setInputMessage(e.target.value)} 
            />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
