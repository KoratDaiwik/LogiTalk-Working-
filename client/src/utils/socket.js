// src/utils/socket.js
import { io } from "socket.io-client";

let socket = null;

/**
 * Call once after login (pass your JWT accessToken).
 * Returns a connected socket instance.
 */
export const connectSocket = (token) => {
  if (socket) return socket;
  socket = io("http://localhost:5000", {
    auth: { token },
    transports: ["websocket"],
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
  });

  return socket;
};

/** Get the singleton socket (throws if not connected) */
export const getSocket = () => {
  if (!socket) throw new Error("Socket not initialized");
  return socket;
};
