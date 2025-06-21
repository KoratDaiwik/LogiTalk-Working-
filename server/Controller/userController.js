const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const sendOtp = require("../utils/sendOtp");
const { createTokens } = require("../utils/tokenUtils");

global.tempUsers = global.tempUsers || {};

/**
 * POST /api/users/register
 *  - collects name, email, password, about
 *  - generates & emails OTP
 */
exports.register = async (req, res) => {
  let { name, email, password, about = "" } = req.body;

  try {
    // 1) email unique & format check
    if (await User.exists({ email })) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    // 2) generate OTP
    const existing = global.tempUsers[email];
    const otp = Math.floor(100000 + Math.random() * 900000);
    const createdAt = Date.now();

    if (existing) {
      // re-send: update OTP + timestamp + about
      global.tempUsers[email] = {
        ...existing,
        otp,
        createdAt,
        about
      };
    } else {
      if (!name || !password) {
        return res
          .status(400)
          .json({ success: false, message: "Name and password are required" });
      }
      // first request: store all fields
      global.tempUsers[email] = {
        name,
        password,
        about,
        otp,
        createdAt
      };
    }

    // 3) send OTP mail
    await sendOtp(email, otp);
    return res.status(200).json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("Register error:", err);
    delete global.tempUsers[email];
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/users/verify-otp
 *  - verifies OTP & creates real user with `about`
 */
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const entry = global.tempUsers[email];

  if (!entry) {
    return res
      .status(400)
      .json({ success: false, message: "No OTP requested" });
  }

  // OTP expired?
  if (Date.now() - entry.createdAt > 5 * 60 * 1000) {
    delete global.tempUsers[email];
    return res.status(400).json({ success: false, message: "OTP expired" });
  }
  if (parseInt(otp) !== entry.otp) {
    return res.status(400).json({ success: false, message: "Incorrect OTP" });
  }

  try {
    // hash + save
    const hashed = await bcrypt.hash(entry.password, 10);
    const user = new User({
      name:     entry.name,
      email,
      password: hashed,
      about:    entry.about      // <-- include about
    });

    const { accessToken, refreshToken } = createTokens(user);
    user.refreshToken = refreshToken;
    await user.save();
    delete global.tempUsers[email];

    // set cookie + return access token
    res
      .cookie("jid", refreshToken, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({ success: true, accessToken });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/users/login
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password" });

    const { accessToken, refreshToken } = createTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    res
      .cookie("jid", refreshToken, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({ success: true, accessToken });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/users/token
 */
exports.refreshToken = async (req, res) => {
  const token = req.cookies.jid;
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "No refresh token provided" });

  let payload;
  try {
    payload = jwt.verify(token, process.env.REFRESH_SECRET);
  } catch (err) {
    console.error("refreshToken verify error:", err);
    return res
      .status(403)
      .json({ success: false, message: "Invalid or expired refresh token" });
  }

  const user = await User.findById(payload.userId);
  if (!user || user.refreshToken !== token) {
    return res
      .status(403)
      .json({ success: false, message: "Refresh token revoked" });
  }

  const { accessToken, refreshToken } = createTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  res
    .cookie("jid", refreshToken, {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({ success: true, accessToken });
};

/**
 * GET /api/users/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "name email avatar about"
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    return res.json({ success: true, user });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/users/delete
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });

    await User.findByIdAndDelete(req.user.userId);
    return res.json({ success: true, message: "Account deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/users/search?query=...
 */
exports.searchUsers = async (req, res) => {
  const me = req.user.userId;
  const query = req.query.query;

  if (!query?.trim()) {
    return res.json({ success: true, users: [] });
  }

  try {
    const users = await User.find({
      _id: { $ne: me },
      name: { $regex: query, $options: "i" },
    }).select("_id name avatar");

    return res.json({ success: true, users });
  } catch (err) {
    console.error("User search error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateAbout = async (req, res) => {
  try {
    const userId = req.user.userId;
    let { about } = req.body;
    if (typeof about !== "string") {
      return res.status(400).json({ success: false, message: "About must be a string." });
    }
    about = about.trim();
    if (about.length > 200) {
      return res.status(400).json({ success: false, message: "About must be ≤200 characters." });
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { about },
      { new: true, select: "about" }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, about: user.about });
  } catch (err) {
    console.error("updateAbout error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/users/:id
 * Returns basic profile (name, avatar, about) for given user ID.
 */
exports.getUserById = async (req, res) => {
  const otherId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(otherId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }
  try {
    const user = await User.findById(otherId).select("name avatar about");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, user });
  } catch (err) {
    console.error("getUserById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
