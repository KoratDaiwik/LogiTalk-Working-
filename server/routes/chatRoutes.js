const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const chatCtrl = require("../Controller/chatController");

// 1. Get chat list
router.get("/", auth, chatCtrl.getChatList);

// 2. Start new chat
router.post("/start", auth, chatCtrl.startChat);

// 3. Get messages with user
router.get("/:userId", auth, chatCtrl.getMessagesWithUser);

// 4. Send a message in chat
router.post("/:userId/message", auth, chatCtrl.sendMessage);

// 5. Mark as read
router.post("/:userId/read", auth, chatCtrl.markAsRead);

module.exports = router;
