const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all during debug
    methods: ["GET", "POST", "OPTIONS"]
  }
});

// 📡 Request Logger for Debugging
app.use((req, res, next) => {
  console.log(`📡 [INCOMING] ${req.method} ${req.url} from ${req.headers.origin || 'No Origin'}`);
  next();
});

// 🛡️ Robust CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());

// ── Root & Health Check (Moved to Top) ──────────────────
app.get('/', (req, res) => {
  res.send('✦ VibeMatch API is online. Please use /api/health for status.');
});

app.get('/api/health', (req, res) => {
  res.json({ status: "ok", message: "VibeMatch Backend is breathing.", time: new Date().toISOString() });
});

// ── Global Error Handlers ──────────────────────────────
process.on('uncaughtException', (err) => {
  console.error("FATAL: Uncaught Exception:", err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("FATAL: Unhandled Rejection at:", promise, "reason:", reason);
});

const CHANNEL_PROMPTS = {
  "Grief & Loss": "You are a gentle listening presence in a grief space. You reflect, you ask soft questions, you never advise or diagnose.",
  "Entrepreneurship": "You are a calm sounding board for founders. You ask clarifying questions, surface assumptions, never prescribe.",
  "Late Night Chat": "You are a quiet, comforting presence. You listen and offer short, kind reflections.",
  "default": "You are a gentle, listening presence. You hold space honestly and simply."
};

app.get('/', (req, res) => {
  res.send('✦ VibeMatch API is online. Please use /api/health for status.');
});

app.get('/api/health', (req, res) => {
  res.json({ status: "ok", message: "VibeMatch Backend is breathing.", time: new Date().toISOString() });
});

// Explicitly handle browser OPTIONS checks for pre-flight
app.options('*', cors());

app.get('/api/ai-companion', (req, res) => {
  console.log("✦ AI Diagnostic: GET Request received.");
  res.json({ status: "ready", info: "The AI endpoint is reachable via GET. Browser connections should work." });
});

app.post('/api/ai-companion', async (req, res) => {
  try {
    const { vibe, channel, history } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      console.warn("AI Companion Error: GEMINI_API_KEY is missing from Render environment.");
      return res.status(503).json({ error: "companion_unavailable" });
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Gemini history MUST start with a 'user' message. 
    // We filter the history to start from the first 'user' message.
    const userFirstHistory = history.slice(0, -1).reduce((acc, msg) => {
      if (acc.length === 0 && msg.role !== 'user') return acc;
      acc.push(msg);
      return acc;
    }, []);

    const geminiHistory = userFirstHistory.map(msg => ({
      role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));
    
    const latestUserMsg = history[history.length - 1].text;
    const systemInstruction = CHANNEL_PROMPTS[channel] || CHANNEL_PROMPTS[vibe] || CHANNEL_PROMPTS.default;
    
    const chat = model.startChat({
      history: geminiHistory,
      systemInstruction: { parts: [{ text: systemInstruction }] }
    });
    
    const result = await chat.sendMessage(latestUserMsg);
    res.json({ reply: result.response.text() });
  } catch (error) {
    console.error("AI Error:", error.message || error);
    res.status(500).json({ error: error.message || "Failed to get AI response" });
  }
});

// Matchmaking queues: { "chill": [socket1, socket2], "ugandan politics": [socket3] }
const queues = {};
// Store active rooms and their participants
const activeRooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user wants to find a match
  socket.on('find_match', (data) => {
    const { vibe, profileName } = data;
    console.log(`User ${profileName} (${socket.id}) looking for vibe: ${vibe}`);

    // Initialize queue for this vibe if it doesn't exist
    if (!queues[vibe]) {
      queues[vibe] = [];
    }

    // Check if there is someone waiting
    if (queues[vibe].length > 0) {
      // It's a match!
      const partnerSocket = queues[vibe].shift(); // Dequeue partner
      
      // Make sure partner is still connected
      if (partnerSocket.connected) {
        const roomId = uuidv4();
        
        // Save room state
        activeRooms[roomId] = {
          vibe,
          users: [
            { id: partnerSocket.id, profileName: partnerSocket.profileName },
            { id: socket.id, profileName }
          ],
          createdAt: Date.now()
        };

        // Notify both users
        partnerSocket.emit('match_found', { roomId, partnerName: profileName });
        socket.emit('match_found', { roomId, partnerName: partnerSocket.profileName });
        
        console.log(`Match found! Room: ${roomId} for vibe: ${vibe}`);
      } else {
        // Partner disconnected, add current user to queue instead
        socket.profileName = profileName;
        queues[vibe].push(socket);
      }
    } else {
      // Nobody waiting, add to queue
      socket.profileName = profileName;
      queues[vibe].push(socket);
    }
  });

  // WebRTC Signaling
  socket.on('webrtc_signal', (data) => {
    const { roomId, type } = data;
    // Relay the signal to the other participant in the same room
    socket.to(roomId).emit('webrtc_signal', data);
  });

  // Simple call invitation (Phase 2 lobby)
  socket.on('send_call_invite', (data) => {
    const { toUid, fromName, roomId, type, vibe } = data;
    // In a full production app, you'd map UID to socket IDs.
    // For this trial, we'll broadcast to the vibe room, and only the target UID will show the popup.
    io.emit('receive_call_invite', { toUid, fromName, roomId, type, vibe });
  });

  socket.on('send_connection_request', (data) => {
    socket.broadcast.emit('connection_request', data);
  });
  
  socket.on('accept_connection_request', (data) => {
    socket.broadcast.emit('connection_accepted', data);
  });

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_message', (data) => {
    const { roomId, text, senderName } = data;
    socket.to(roomId).emit('receive_message', {
      id: uuidv4(),
      text,
      senderName,
      senderId: socket.id,
      timestamp: Date.now()
    });
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user_left');
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
