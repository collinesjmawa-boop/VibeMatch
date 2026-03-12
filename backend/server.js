const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://vibematch-ten.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

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

  // When a user successfully navigates to the Room route
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} fully joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user_joined_room', { id: socket.id });
  });

  // Handle chat messages
  socket.on('send_message', (data) => {
    const { roomId, text, senderId, senderName } = data;
    // Broadcast to everyone else in the room
    socket.to(roomId).emit('receive_message', {
      id: uuidv4(),
      text,
      senderId,
      senderName,
      timestamp: Date.now()
    });
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user_left', { id: socket.id });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove from any queues if they were waiting
    for (const vibe in queues) {
      queues[vibe] = queues[vibe].filter(s => s.id !== socket.id);
    }
    
    // Handle leaving active rooms could go here
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
