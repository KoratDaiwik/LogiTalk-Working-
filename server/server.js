// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");

// Correctly import your MongoDB connect function once:
const connectDB = require("./models/db");

const userRoutes    = require("./routes/users");
const chatRoutes    = require("./routes/chatRoutes");
const profileRoutes = require("./routes/profileRoutes");
const Message       = require("./models/message");

const app = express();

// CORS & JSON parsing
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// --- API ROUTES --- //
app.use("/api/users",   userRoutes);
app.use("/api/chats",   chatRoutes);
app.use("/api/profile", profileRoutes);

// Serve avatar images statically
app.use(
  "/assets/avatars",
  express.static(path.join(__dirname, "assets", "avatars"))
);

// --- SOCKET.IO SETUP --- //
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Track online users
const onlineUsers = new Map();

// Socket.io JWT Authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) throw new Error("Missing token");
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.userId);

  // Join user-specific room and broadcast online status
  socket.join(socket.userId);
  onlineUsers.set(socket.userId, socket.id);
  io.emit("userOnline", socket.userId);

  // Provide list of online users
  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  // Handle incoming chat messages
  socket.on("sendMessage", async ({ to, text }) => {
    const from = socket.userId;
    if (!to || !text?.trim()) return;

    try {
      const message = new Message({
        sender:   from,
        receiver: to,
        text:     text.trim(),
      });
      await message.save();

      const payload = {
        _id:       message._id,
        sender:    message.sender,
        receiver:  message.receiver,
        text:      message.text,
        timestamp: message.timestamp,
      };

      // Emit to sender and receiver
      io.to(from).emit("newMessage", payload);
      io.to(to).emit("newMessage", payload);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.userId);
    onlineUsers.delete(socket.userId);
    io.emit("userOffline", socket.userId);
  });
});

// Start HTTP + Socket.IO server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
