const mongoose = require("mongoose");
const Message = require("../models/message");
const User = require("../models/userModel");

exports.getChatList = async (req, res) => {
  const me = new mongoose.Types.ObjectId(req.user.userId);

  try {
    const chats = await Message.aggregate([
      { $match: { $or: [{ sender: me }, { receiver: me }] } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", me] },
              "$receiver",
              "$sender",
            ],
          },
          lastMessage: { $first: "$text" },
          timestamp: { $first: "$timestamp" },
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
          lastMessageId: { $first: "$_id" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$user.name",
          avatar: "$user.avatar",
          lastMessage: 1,
          timestamp: 1,
          unreadCount: 1,
          lastMessageId: 1,
        },
      },
      { $sort: { timestamp: -1 } },
    ]);

    return res.json({ success: true, chats });
  } catch (err) {
    console.error("getChatList error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMessagesWithUser = async (req, res) => {
  const me = req.user.userId;
  const otherId = req.params.userId;

  if (!mongoose.Types.ObjectId.isValid(otherId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid userId parameter" });
  }

  try {
    const other = await User.findById(otherId).select("_id name avatar");
    if (!other) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const rawMsgs = await Message.find({
      $or: [
        { sender: me, receiver: otherId },
        { sender: otherId, receiver: me },
      ],
    })
      .sort({ timestamp: 1 })
      .lean();

    const messages = rawMsgs.map((msg) => ({
      _id: msg._id,
      text: msg.text,
      sender: msg.sender.toString(),
      receiver: msg.receiver.toString(),
      timestamp: msg.timestamp,
      read: msg.read,
    }));

    return res.json({ success: true, messages });
  } catch (err) {
    console.error("getMessagesWithUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

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

    // Populate sender info for real-time update
    const sender = await User.findById(from).select("name avatar");

    return res.json({
      success: true,
      message: {
        ...message.toObject(),
        senderName: sender.name,
        senderAvatar: sender.avatar,
      },
    });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

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