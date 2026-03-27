import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import { useAuth } from '../contexts/AuthContext';
import WaitlistModal from '../components/WaitlistModal';
import ReportModal from '../components/ReportModal';
import './Room.css';

// THEMES
const FREE_THEMES = [
  { id: 'ember', name: 'Deep Ember', bg: 'rgba(201,149,106,0.06)', swatch: '#C9956A' },
  { id: 'moonrise', name: 'Moonrise', bg: 'rgba(125,158,140,0.06)', swatch: '#7D9E8C' },
  { id: 'storm', name: 'Storm', bg: 'rgba(120,135,165,0.06)', swatch: '#7887A5' }
];
const PREMIUM_THEMES = [
  { id: 'midnight', name: 'Midnight Sun', bg: 'rgba(215,85,65,0.06)', swatch: '#D75541', locked: true },
  { id: 'forest', name: 'Deep Forest', bg: 'rgba(40,80,60,0.06)', swatch: '#28503C', locked: true },
  { id: 'mist', name: 'Morning Mist', bg: 'rgba(230,230,240,0.06)', swatch: '#E6E6F0', locked: true }
];
const ALL_THEMES = [...FREE_THEMES, ...PREMIUM_THEMES];

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  
  const queryParams = new URLSearchParams(location.search);
  const initialType = queryParams.get('type') || 'video';
  const vibe = queryParams.get('vibe') || 'Space';
  const channel = queryParams.get('channel') || '';
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 1 Hour
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(initialType !== 'video');
  const [activeTheme, setActiveTheme] = useState(FREE_THEMES[0]);
  const [waitlistOpts, setWaitlistOpts] = useState(null);
  const [reportOpts, setReportOpts] = useState(null);
  const [participants, setParticipants] = useState([{ uid: user.uid, name: userProfile?.displayName || 'You', isLocal: true }]);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    socket.emit('join_room', roomId);
    initPeerConnection();

    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('user_left', () => {
      // In a real app we'd identify who left. For now, simple UX.
      setParticipants(prev => prev.filter(p => p.isLocal));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    });

    socket.on('webrtc_signal', async (data) => {
      if (data.type === 'offer') {
        await handleOffer(data.offer);
        // Assuming someone else is here now
        if (participants.length === 1) {
          setParticipants(prev => [...prev, { uid: 'remote', name: 'Remote User', isLocal: false }]);
        }
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
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, [roomId, initialType]);


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
    if (peerConnection.current) return;
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_signal', { roomId, type: 'candidate', candidate: event.candidate });
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      if (participants.length === 1) {
        setParticipants(prev => [...prev, { uid: 'remote', name: 'Remote User', isLocal: false }]);
      }
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
    const msg = { roomId, text: inputMessage, senderName: userProfile?.displayName, uid: user.uid };
    setMessages(prev => [...prev, { ...msg, id: Date.now(), isOwn: true }]);
    socket.emit('send_message', msg);
    setInputMessage('');
  };

  // Recording Stub
  const [isRecording, setIsRecording] = useState(false);
  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setWaitlistOpts({ title: 'Memory Preservation', subtitle: 'Save full recordings of your most meaningful sessions. Features rolling out soon.' });
    } else {
      setIsRecording(true);
    }
  };

  return (
    <div className="room-container">
      <div className="room-ambient" style={{ background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${activeTheme.bg} 0%, transparent 70%)` }} />

      <header className="room-header">
        <div className="room-origin-banner">
          This conversation began in {vibe} {channel ? `· ${channel}` : ''}
        </div>
        <div className="room-header-main">
          <button className="room-back-btn" onClick={() => navigate('/vibe')}>← Back to Spaces</button>
          
          <div className="room-title">
            Together in {vibe}
            <span>{formatTime(timeLeft)} remaining</span>
          </div>

          <div className="room-status">
            {participants.length > 1 ? (
              <><div className="room-status-dot"></div> Connected</>
            ) : 'Waiting...'}
          </div>

          <button className="room-leave-btn" onClick={() => navigate('/vibe')}>End Session</button>
        </div>

        <div className="theme-picker">
          <span className="theme-picker-label">Environment:</span>
          {ALL_THEMES.map(t => (
            <button 
              key={t.id}
              className={`theme-swatch ${activeTheme.id === t.id ? 'active' : ''} ${t.locked ? 'locked' : ''}`}
              style={{ background: t.swatch }}
              onClick={() => t.locked ? setWaitlistOpts({ title: 'Premium Themes', subtitle: `The ${t.name} environment is a premium feature. Join the waitlist.` }) : setActiveTheme(t)}
              title={t.name}
            />
          ))}
        </div>
      </header>

      <main className="room-main">
        {/* Left Sidebar */}
        <aside className="room-sidebar">
          <h3>In this space</h3>
          {participants.map(p => (
            <div key={p.uid} className={`participant-card ${p.isLocal ? 'local' : ''}`}>
              <div className="participant-avatar">{p.name.charAt(0)}</div>
              <div className="participant-info">
                <div className="participant-name">{p.name}</div>
                {p.isLocal && <div className="participant-local-label">(You)</div>}
              </div>
            </div>
          ))}
        </aside>

        {/* Video Area */}
        <section className="video-area">
          <div className="video-grid">
            <div className="video-tile remote">
              <video ref={remoteVideoRef} autoPlay playsInline></video>
              <div className="video-tile-label">Remote</div>
            </div>
            <div className="video-tile local">
              <video ref={localVideoRef} autoPlay playsInline muted></video>
              <div className="video-tile-label">You</div>
            </div>
          </div>
          
          <div className="room-controls">
            <button className={`ctrl-btn ${isMuted ? 'danger' : 'active'}`} onClick={() => {
              if (localStream.current) localStream.current.getAudioTracks()[0].enabled = isMuted;
              setIsMuted(!isMuted);
            }} title="Toggle Microphone">🎤</button>
            <button className={`ctrl-btn ${isCameraOff ? 'danger' : 'active'}`} onClick={() => {
              if (localStream.current && localStream.current.getVideoTracks()[0]) {
                localStream.current.getVideoTracks()[0].enabled = isCameraOff;
                setIsCameraOff(!isCameraOff);
              }
            }} title="Toggle Camera">📹</button>
            <button className={`ctrl-btn ${isRecording ? 'danger' : ''}`} onClick={handleRecord} title="Record Session">
              {isRecording ? '⏹' : '🔴'}
            </button>
          </div>
        </section>

        {/* Chat Area */}
        <aside className="chat-area">
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.isOwn ? 'own' : ''}`}>
                {!m.isOwn && <div className="chat-avatar">{m.senderName?.charAt(0) || '?'}</div>}
                <div>
                  <div className="chat-bubble">
                    {m.text}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="chat-bubble-meta">{m.senderName}</span>
                    {!m.isOwn && (
                      <button className="chat-report-btn" onClick={() => setReportOpts({ targetUid: m.uid, contentSnapshot: m.text })}>🚩 Report</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form className="chat-input-bar" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder="Message..." 
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
            />
            <button type="submit" className="chat-send-btn" disabled={!inputMessage.trim()}>Send</button>
          </form>
        </aside>
      </main>

      {waitlistOpts && <WaitlistModal title={waitlistOpts.title} subtitle={waitlistOpts.subtitle} onClose={() => setWaitlistOpts(null)} />}
      {reportOpts && <ReportModal 
        reportedUid={reportOpts.targetUid} 
        contentSnapshot={reportOpts.contentSnapshot}
        reporterUid={user?.uid}
        vibe={vibe}
        channel={channel}
        onClose={() => setReportOpts(null)}
      />}
    </div>
  );
}
