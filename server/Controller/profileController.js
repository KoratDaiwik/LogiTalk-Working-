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


// profileController.js
exports.setAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { avatarId } = req.body;
    
    // Validate avatar exists
    const avatarPath = path.join(AVATAR_DIR, `${avatarId}.jpg`);
    if (!fs.existsSync(avatarPath)) {
      return res.status(404).json({ message: "Avatar not found" });
    }

    const avatarUrl = `${URL_PREFIX}${avatarId}.jpg`;
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    );

    res.json({ success: true, avatarUrl });
  } catch (err) {
    console.error("setAvatar error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

