const fs = require("fs");
const path = require("path");
const User = require("../models/userModel");

const AVATAR_DIR = path.join(__dirname, "..", "assets", "avatars");
// The public URL prefix for serving avatars:
const URL_PREFIX = "/assets/avatars/";

exports.getAvatars = async (req, res) => {
  try {
    console.log("GET /api/profile/avatars called");
    const files = await fs.promises.readdir(AVATAR_DIR);
    console.log("Avatar files in folder:", files);
    const ids = files
      .map(f => parseInt(f, 10))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
    console.log("Parsed avatar IDs:", ids);
    res.json({ avatars: ids });
  } catch (err) {
    console.error("getAvatars error:", err);
    res.status(500).json({ message: "Unable to load avatars." });
  }
};


exports.setAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { avatarId } = req.body;

    if (typeof avatarId !== "number") {
      return res.status(400).json({ message: "avatarId (number) is required" });
    }

    // Build the filename and URL:
    const filename = `${avatarId}`; // e.g. "3"
    // You can store just the ID or the URL. Here we store the ID.
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarId },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Respond with the full URL so frontend can show it immediately:
    const avatarUrl = `${req.protocol}://${req.get("host")}${URL_PREFIX}${filename}`;
    return res.json({ success: true, avatarUrl });
  } catch (err) {
    console.error("setAvatar:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.setAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { avatarId } = req.body;
    if (typeof avatarId !== "number") {
      return res.status(400).json({ message: "avatarId (number) is required" });
    }

    // Build the full URL, e.g. http://localhost:5000/assets/avatars/3.jpg
    const filename = `${avatarId}.jpg`;           // adjust ext if needed
    const fullUrl = `${req.protocol}://${req.get("host")}${URL_PREFIX}${filename}`;

    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: fullUrl },                        // save the URL
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ success: true, avatarUrl: fullUrl });
  } catch (err) {
    console.error("setAvatar error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

