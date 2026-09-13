import { io } from "socket.io-client";

let socket = null;

// The URL here is the API server directly (not the Vite proxy) because
// Socket.IO needs its own upgrade handshake; in production, point this at
// wherever the Node server actually runs.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export function connectSocket(token) {
  if (socket) {
    if (token) {
      socket.auth = { token };
    }
    if (socket.connected || socket.connecting || socket.reconnecting) {
      return socket;
    }
    if (socket.disconnected) {
      socket.connect();
      return socket;
    }
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ["websocket", "polling"],
    upgrade: true,
  });

  socket.on("connect_error", (err) => {
    // Helpful log for debugging network/auth connection issues in dev
    console.warn("[socket] connection warning:", err?.message || "retrying...");
  });

  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
      socket.connect();
    }
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
