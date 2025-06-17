const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const sendOtp = require("../utils/sendOtp");
const { createTokens } = require("../utils/tokenUtils");

global.tempUsers = global.tempUsers || {};

exports.register = async (req, res) => {
  let { name, email, password } = req.body;
  try {
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

    const existing = global.tempUsers[email];
    const otp = Math.floor(100000 + Math.random() * 900000);
    const createdAt = Date.now();

    if (existing) {
      global.tempUsers[email] = { ...existing, otp, createdAt };
    } else {
      if (!name || !password) {
        return res
          .status(400)
          .json({ success: false, message: "Name and password are required" });
      }
      global.tempUsers[email] = { name, password, otp, createdAt };
    }

    await sendOtp(email, otp);
    return res.status(200).json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("Register error:", err);
    delete global.tempUsers[email];
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const entry = global.tempUsers[email];
  if (!entry) {
    return res
      .status(400)
      .json({ success: false, message: "No OTP requested" });
  }

  if (Date.now() - entry.createdAt > 5 * 60 * 1000) {
    delete global.tempUsers[email];
    return res.status(400).json({ success: false, message: "OTP expired" });
  }
  if (parseInt(otp) !== entry.otp) {
    return res.status(400).json({ success: false, message: "Incorrect OTP" });
  }

  try {
    const hashed = await bcrypt.hash(entry.password, 10);
    const user = new User({ name: entry.name, email, password: hashed });
    const { accessToken, refreshToken } = createTokens(user);
    user.refreshToken = refreshToken;
    await user.save();
    delete global.tempUsers[email];

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

exports.searchUsers = async (req, res) => {
  const { query } = req.query;
  if (!query?.trim())
    return res.status(400).json({ success: false, message: "Invalid query" });

  try {
    const users = await User.find({
      name: { $regex: query, $options: "i" },
    }).select("_id name email avatar about");
    return res.json({ success: true, users });
  } catch (err) {
    console.error("searchUsers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
