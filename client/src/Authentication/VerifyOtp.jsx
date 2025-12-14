// src/Authentication/VerifyOtp.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import {
  pageVariants,
  pageTransition,
  moonLogoVariants,
} from "./newOne";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function VerifyOtp() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const email = loc.state?.email;
  const name = loc.state?.name;
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) navigate("/signup");
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/users/verify-otp", { email, otp });
      if (res.data.success && res.data.accessToken) {
        // Use AuthContext login so the app state updates immediately
        await login(res.data.accessToken);

        toast.success("Verified — taking you to avatar setup…", { autoClose: 1300 });
        setTimeout(() => {
          navigate("/select-avatar");
        }, 900);
      } else if (res.data.success && !res.data.accessToken) {
        // fallback if backend returns success but no token
        toast.success("Verified — please login to continue");
        navigate("/login");
      } else {
        setError(res.data.message || "Verification failed");
        toast.error(res.data.message || "Verification failed");
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Verification failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      // call your backend resend endpoint; keep path as your backend expects
      await api.post("/users/resend-otp", { name, email });
      toast.success("OTP resent to your email");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Could not resend OTP";
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} newestOnTop />
      <motion.div
        className="h-screen flex relative"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
      >
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-purple-600 to-pink-500 items-center justify-center text-white relative overflow-hidden">
          <motion.img
            src="/Assets/Moon_Logo.png"
            alt="LogiTalk Logo"
            variants={moonLogoVariants}
            animate="animate"
            className="absolute top-10 left-10 w-[500px] md:w-[700px] opacity-20 z-0"
          />
          <div className="relative z-10 text-center px-6">
            <h1 className="text-4xl font-bold mb-4">Verify Your Identity</h1>
            <p>Enter the OTP sent to your email and continue your journey.</p>
          </div>
        </div>

        <div className="flex w-full md:w-1/2 flex-col items-center justify-center p-8">
          <div className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 p-[2px] rounded-xl inline-block">
            <div className="text-4xl md:text-5xl font-extrabold bg-white dark:bg-black text-transparent bg-clip-text px-6 py-2 rounded-xl">
              LogiTalk
            </div>
          </div>

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
        </div>
      </motion.div>
    </>
  );
}
