import { io } from "socket.io-client";

let socket = null;

// The URL here is the API server directly (not the Vite proxy) because
// Socket.IO needs its own upgrade handshake; in production, point this at
// wherever the Node server actually runs.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export function connectSocket(token) {
  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    timeout: 15000,
    transports: ["polling", "websocket"],
    upgrade: true,
    rememberUpgrade: true,
  });

  socket.on("connect_error", () => {
    // Transient backend restarts and short downtimes are expected in dev.
    // Avoid noisy warnings in the console while Socket.IO retries.
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
