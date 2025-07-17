require("dotenv").config();
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");

const connectDB = require("./models/db");

const userRoutes = require("./routes/users");
const chatRoutes = require("./routes/chatRoutes");
const profileRoutes = require("./routes/profileRoutes");
const Message = require("./models/message");
const User = require("./models/userModel");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

connectDB();

app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/profile", profileRoutes);

app.use(
  "/assets/avatars",
  express.static(path.join(__dirname, "assets", "avatars"))
);

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const onlineUsers = new Map();

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

  socket.join(socket.userId);
  onlineUsers.set(socket.userId, socket.id);
  io.emit("userOnline", socket.userId);

  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("sendMessage", async ({ to, text }) => {
    const from = socket.userId;
    if (!to || !text?.trim()) return;

    try {
      const message = new Message({
        sender: from,
        receiver: to,
        text: text.trim(),
      });
      await message.save();

      // Get sender info
      const sender = await User.findById(from).select("name avatar");

      const payload = {
        ...message.toObject(),
        senderName: sender.name,
        senderAvatar: sender.avatar,
      };

      // Emit to sender and receiver with sender info
      io.to(from).emit("newMessage", payload);
      io.to(to).emit("newMessage", payload);
      
      // Update chat lists
      io.to(from).emit("updateChatList", {
        userId: to,
        lastMessage: text,
        timestamp: message.timestamp,
      });
      
      io.to(to).emit("updateChatList", {
        userId: from,
        lastMessage: text,
        timestamp: message.timestamp,
        unreadCount: onlineUsers.has(to) ? 0 : 1
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("markAsRead", async (otherId) => {
    try {
      await Message.updateMany(
        { sender: otherId, receiver: socket.userId, read: false },
        { $set: { read: true } }
      );
      
      // Notify sender that messages were read
      io.to(otherId).emit("messagesRead", {
        readerId: socket.userId,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.userId);
    onlineUsers.delete(socket.userId);
    io.emit("userOffline", socket.userId);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});