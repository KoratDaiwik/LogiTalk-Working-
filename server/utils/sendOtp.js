require("dotenv").config();
const nodemailer = require("nodemailer");

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn("⚠️ EMAIL_USER or EMAIL_PASS not set—OTP emails may fail.");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls:
    process.env.NODE_ENV === "production" ? {} : { rejectUnauthorized: false },
});

module.exports = async function sendOtp(email, otp) {
  try {
    await transporter.sendMail({
      from: `"LogiTalk Support by SHREE VALLABH" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });
  } catch (err) {
    console.error("sendOtp error:", err);
    throw err;
  }
};
