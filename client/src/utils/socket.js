import { io } from "socket.io-client";

let socket = null;
let messageQueue = [];
const MAX_RETRIES = 3;

export const connectSocket = (accessToken) => {
  if (socket) return socket;

  socket = io("http://localhost:5000", {
    auth: { token: accessToken },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: true,
  });

  socket.on("connect", () => {
    // Process queued messages
    while (messageQueue.length > 0) {
      const { to, text, tmpId, retries = 0 } = messageQueue.shift();
      if (retries < MAX_RETRIES) {
        sendMessageWithRetry({ to, text, tmpId, retries: retries + 1 });
      }
    }
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
  });

  return socket;
};

const sendMessageWithRetry = ({ to, text, tmpId, retries }) => {
  if (socket && socket.connected) {
    socket.emit(
      "sendMessage", 
      { to, text, tmpId }, 
      (response) => {
        if (!response.success) {
          console.error("Message send failed:", response.error);
          // Requeue with increased retry count
          messageQueue.push({ to, text, tmpId, retries });
        }
      }
    );
  } else {
    messageQueue.push({ to, text, tmpId, retries });
  }
};

export const sendOrQueue = ({ to, text, tmpId }) => {
  sendMessageWithRetry({ to, text, tmpId, retries: 0 });
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

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};