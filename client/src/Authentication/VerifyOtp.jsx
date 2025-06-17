import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../utils/api";
import { pageVariants, pageTransition } from "./newOne";

export default function VerifyOtp() {
  const loc = useLocation();
  const navigate = useNavigate();
  const email = loc.state?.email;
  const name = loc.state?.name; // might be undefined if user navigated directly
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If no email, redirect back to signup
  useEffect(() => {
    if (!email) navigate("/signup");
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/verify-otp", { email, otp });
      if (res.data.success) {
        localStorage.setItem("accessToken", res.data.accessToken);
        navigate("/chat");
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      // include name if available; backend may ignore extra fields
      await api.post("/register", { name, email });
      alert("OTP resent to your email");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Could not resend OTP");
    }
  };

  return (
    <motion.div
      className="h-screen flex items-center justify-center p-8"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      <form className="w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
        <h2 className="text-2xl font-semibold">Verify OTP</h2>
        <p className="text-sm">
          Enter the 6-digit code sent to <strong>{email}</strong>
        </p>
        {error && <p className="text-red-500">{error}</p>}
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          type="text"
          placeholder="OTP"
          required
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:opacity-90 transition"
        >
          {loading ? "Verifying…" : "Verify OTP"}
        </button>
        <p className="text-sm">
          Didn’t get the code?{" "}
          <button
            type="button"
            onClick={handleResend}
            className="text-purple-600 hover:underline"
          >
            Resend OTP
          </button>
        </p>
        <p className="text-sm mt-2">
          <Link to="/login" className="text-purple-600 hover:underline">
            Back to Login
          </Link>
        </p>
      </form>
    </motion.div>
  );
}
