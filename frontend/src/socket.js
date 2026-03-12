import { io } from 'socket.io-client';

// In production, this should point to your deployed backend URL.
// For local development, it points to the Express server.
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
});
