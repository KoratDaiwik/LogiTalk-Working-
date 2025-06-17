require("dotenv").config();
const jwt = require("jsonwebtoken");

const ACCESS_EXP = process.env.ACCESS_EXP || "1h";
const REFRESH_EXP = process.env.REFRESH_EXP || "7d";

if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
  console.error(
    "❌ Missing JWT_SECRET or REFRESH_SECRET in environment variables"
  );
  process.exit(1);
}

function createTokens(user) {
  const payload = { userId: user._id, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_EXP,
  });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, {
    expiresIn: REFRESH_EXP,
  });
  return { accessToken, refreshToken };
}

module.exports = { createTokens };
