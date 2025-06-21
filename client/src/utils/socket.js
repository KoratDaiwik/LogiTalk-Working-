import { io } from "socket.io-client";

let socket = null;
let messageQueue = [];

/**
 * Call once after login (pass your JWT accessToken).
 * Initializes or returns the socket instance.
 */
export const connectSocket = (accessToken) => {
  if (socket) return socket;

  socket = io("http://localhost:5000", {
    auth: { token: accessToken },
    transports: ["websocket"],
  });

  // On first successful connection, flush any queued messages exactly once
  socket.once("connect", () => {
    const queued = messageQueue.slice();  // copy
    messageQueue = [];                    // clear before sending
    queued.forEach(({ to, text }) => {
      socket.emit("sendMessage", { to, text });
    });
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
  });

  return socket;
};

/**
 * Queue or immediately send a message.
 * Messages sent after `connect` use `emit` only.
 */
export const sendOrQueue = ({ to, text }) => {
  if (socket && socket.connected) {
    socket.emit("sendMessage", { to, text });
  } else {
    messageQueue.push({ to, text });
  }
};

/**
 * Get socket (throws if never init’d)
 */
export const getSocket = () => {
  if (!socket) throw new Error("Socket not initialized");
  return socket;
};
