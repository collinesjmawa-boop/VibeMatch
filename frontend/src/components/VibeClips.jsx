import { useState, useRef, useEffect } from 'react';
import './VibeClips.css';

export default function VibeClips({ onClose, vibe, channel }) {
  const [recording, setRecording] = useState(false);
  const [stream, setStream] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [countdown, setCountdown] = useState(15);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Get Media
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera Error:", err);
      alert("Please allow camera/mic access to record Vibe Clips.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Main Recording Loop
  const startRecording = () => {
    if (!stream || !canvasRef.current) return;
    
    setRecording(true);
    setCountdown(15);
    chunksRef.current = [];

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    // Set canvas dimensions
    canvas.width = 720;
    canvas.height = 1280; // Portrait mode as requested for viral sharing

    const drawFrame = () => {
      if (video) {
        // Draw video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw Watermark
        ctx.font = 'bold 24px var(--font-display)';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'right';
        ctx.fillText('✦ VIBEMATCH.APP', canvas.width - 24, canvas.height - 32);
        
        if (recording) requestAnimationFrame(drawFrame);
      }
    };
    drawFrame();

    const canvasStream = canvas.captureStream(30);
    // Add audio track from original stream
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);

    const mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm;codecs=vp8,opus' });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setVideoUrl(URL.createObjectURL(blob));
      setRecording(false);
    };

    mediaRecorder.start();

    // Timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const downloadClip = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `vibematch_${vibe}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="vibe-clips-overlay">
      <div className="vibe-clips-modal">
        <header className="vibe-clips-header">
          <h2>Share a Moment</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </header>
        
        <p className="vibe-clips-desc">Record a 15-second clip to share on TikTok or WhatsApp.</p>

        <div className="vibe-clips-preview-container">
          {/* Hidden source video */}
          <video ref={videoRef} autoPlay playsInline muted className="hidden-video" />
          
          <canvas ref={canvasRef} className="vibe-clips-canvas" />
          
          {recording && <div className="recording-indicator">REC {countdown}s</div>}
          
          {!videoUrl && !recording && (
            <div className="recording-prompt">
              <button className="record-btn" onClick={startRecording}>
                <div className="record-inner"></div>
              </button>
              <span>Tap to begin 15s clip</span>
            </div>
          )}
        </div>

        {videoUrl && (
          <div className="vibe-clips-actions">
            <button className="btn-ghost" onClick={() => { setVideoUrl(null); startCamera(); }}>Retake</button>
            <button className="btn-primary" onClick={downloadClip}>Download Watermarked Clip</button>
          </div>
        )}

        <div className="watermark-info">
          <span>Official Watermark: ✦ VIBEMATCH.APP</span>
        </div>
      </div>
    </div>
  );
}
