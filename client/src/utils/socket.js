import { io } from "socket.io-client";

let socket = null;
let messageQueue = [];

export const connectSocket = (accessToken) => {
  if (socket) return socket;

  socket = io("http://localhost:5000", {
    auth: { token: accessToken },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.once("connect", () => {
    while (messageQueue.length > 0) {
      const { to, text, tmpId } = messageQueue.shift();
      socket.emit("sendMessage", { to, text, tmpId });
    }
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
  });

  return socket;
};

// Add this to your existing socket.js
export const sendOrQueue = ({ to, text, tmpId }) => {
  if (socket && socket.connected) {
    socket.emit("sendMessage", { to, text, tmpId });
  } else {
    messageQueue.push({ to, text, tmpId });
  }
};
export const getSocket = () => {
  if (!socket) throw new Error("Socket not initialized");
  return socket;
};

export const markMessagesRead = (otherId) => {
  if (socket && socket.connected) {
    socket.emit("markAsRead", otherId);
  }
};