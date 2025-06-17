require("dotenv").config();

if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
  console.error("❌ Missing JWT_SECRET or REFRESH_SECRET in .env");
  process.exit(1);
}

const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const connectDB = require("./models/db");
const userRoutes = require("./routes/users");
const chatRoutes = require("./routes/chatRoutes");
const User = require("./models/userModel");
const Message = require("./models/message");

const app = express();

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

// Routes
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/users/chats", chatRoutes); // optional double mount

// Create HTTP server and Socket.io instance
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.io JWT Authentication
io.use(async (socket, next) => {
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

      const payload = {
        _id: message._id,
        sender: message.sender,
        receiver: message.receiver,
        text: message.text,
        timestamp: message.timestamp,
      };

      io.to(from).emit("newMessage", payload);
      io.to(to).emit("newMessage", payload);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.userId);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
