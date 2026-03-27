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
    origin: (origin, callback) => {
      // Allow any vercel subdomain or localhost
      if (!origin || origin.includes('.vercel.app') || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"]
  }
});

// Configure Express CORS to be equally flexible
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('.vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

const CHANNEL_PROMPTS = {
  "Grief & Loss": "You are a gentle listening presence in a grief space. You reflect, you ask soft questions, you never advise or diagnose.",
  "Entrepreneurship": "You are a calm sounding board for founders. You ask clarifying questions, surface assumptions, never prescribe.",
  "Late Night Chat": "You are a quiet, comforting presence. You listen and offer short, kind reflections.",
  "default": "You are a gentle, listening presence. You hold space honestly and simply."
};

app.post('/api/ai-companion', async (req, res) => {
  try {
    const { vibe, channel, history } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      console.warn("AI Companion Error: GEMINI_API_KEY is missing from Render environment.");
      return res.status(503).json({ error: "companion_unavailable" });
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const geminiHistory = history.slice(0, -1).map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
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
    console.error("AI Error:", error);
    res.status(500).json({ error: "error" });
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
