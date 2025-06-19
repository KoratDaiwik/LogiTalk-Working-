// src/Controller/chatController.js
const mongoose = require("mongoose");
const Message = require("../models/message");
const User = require("../models/userModel");

/**
 * GET /api/chats
 * Returns a list of all chats for the logged-in user,
 * each with the other user’s info, last message, timestamp, unread count.
 */
exports.getChatList = async (req, res) => {
  const me = new mongoose.Types.ObjectId(req.user.userId);

  try {
    const chats = await Message.aggregate([
      // Only messages where I'm sender or receiver
      { $match: { $or: [{ sender: me }, { receiver: me }] } },

      // Sort newest first
      { $sort: { timestamp: -1 } },

      // Group by the *other* user
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", me] },
              "$receiver", // if I sent it, group by receiver
              "$sender", // if I received it, group by sender
            ],
          },
          lastMessage: { $first: "$text" },
          timestamp: { $first: "$timestamp" },
          // Count unread where I'm the receiver and read === false
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ["$receiver", me] }, { $eq: ["$read", false] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      // Bring in the user document for the other participant
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // Project into the shape frontend expects
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$user.name",
          avatar: "$user.avatar",
          lastMessage: 1,
          timestamp: 1,
          unreadCount: 1,
        },
      },

      // Finally sort chats by most recent
      { $sort: { timestamp: -1 } },
    ]);

    return res.json({ success: true, chats });
  } catch (err) {
    console.error("getChatList error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/chats/:userId
 * Returns the full message history between me and that user.
 */
exports.getMessagesWithUser = async (req, res) => {
  const me = req.user.userId;
  const otherId = req.params.userId;

  if (!mongoose.Types.ObjectId.isValid(otherId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid userId parameter" });
  }

  try {
    // Ensure the other user exists
    const other = await User.findById(otherId).select("_id name avatar");
    if (!other) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Fetch bidirectional messages
    const rawMsgs = await Message.find({
      $or: [
        { sender: me, receiver: otherId },
        { sender: otherId, receiver: me },
      ],
    })
      .sort({ timestamp: 1 })
      .lean();

    // Map to front‑end shape including `read`
    const messages = rawMsgs.map((msg) => ({
      _id: msg._id,
      text: msg.text,
      sender: msg.sender.toString() === me ? "me" : otherId,
      timestamp: msg.timestamp,
      read: msg.read, // ← include read flag
    }));

    return res.json({ success: true, messages });
  } catch (err) {
    console.error("getMessagesWithUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
/**
 * POST /api/chats/start
 * Returns a chat descriptor for a new chat (no DB record needed).
 */
exports.startChat = async (req, res) => {
  const fromUserId = req.user.userId;
  const { userId: toUserId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(toUserId)) {
    return res.status(400).json({ success: false, message: "Invalid userId" });
  }
  if (fromUserId === toUserId) {
    return res
      .status(400)
      .json({ success: false, message: "Cannot chat with yourself" });
  }

  try {
    const user = await User.findById(toUserId).select("_id name avatar");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      chat: {
        userId: user._id,
        name: user.name,
        avatar: user.avatar,
        lastMessage: "",
        timestamp: Date.now(),
        unreadCount: 0,
      },
    });
  } catch (err) {
    console.error("startChat error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/chats/:userId/message
 * Stores a new message and returns it.
 */
exports.sendMessage = async (req, res) => {
  const from = req.user.userId;
  const to = req.params.userId;
  const { text } = req.body;

  if (!mongoose.Types.ObjectId.isValid(to) || !text?.trim()) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  try {
    const message = new Message({
      sender: from,
      receiver: to,
      text: text.trim(),
    });
    await message.save();

    return res.json({
      success: true,
      message: {
        _id: message._id,
        text: message.text,
        sender: from,
        receiver: to,
        timestamp: message.timestamp,
      },
    });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/chats/:userId/read
 * Marks all messages from that user to me as read.
 */
exports.markAsRead = async (req, res) => {
  const me = req.user.userId;
  const otherId = req.params.userId;

  if (!mongoose.Types.ObjectId.isValid(otherId)) {
    return res.status(400).json({ success: false, message: "Invalid userId" });
  }

  try {
    await Message.updateMany(
      { sender: otherId, receiver: me, read: false },
      { $set: { read: true } }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("markAsRead error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
