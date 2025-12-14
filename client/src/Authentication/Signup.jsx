// src/Authentication/Signup.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../utils/api";
import { pageVariants, pageTransition, moonLogoVariants } from "./newOne";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoRedirectTimer, setAutoRedirectTimer] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/users/register", form);
      if (res.data.success) {
        // show toast and navigate to verify-otp after a short delay
        toast.success("OTP sent to your email — redirecting to verification…", {
          position: "top-right",
          autoClose: 2000,
        });

        // keep state to pass to verify-otp
        const statePayload = { name: form.name, email: form.email };

        // small delay so user sees toast; also provide button (below) to go immediately
        const t = setTimeout(() => {
          navigate("/verify-otp", { state: statePayload });
        }, 1500);
        setAutoRedirectTimer(t);
      } else {
        setError(res.data.message || "Signup failed");
        toast.error(res.data.message || "Signup failed");
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Signup failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // If user clicks the "Go to verification" button (in case they don't want to wait)
  const goToVerifyNow = () => {
    if (autoRedirectTimer) {
      clearTimeout(autoRedirectTimer);
      setAutoRedirectTimer(null);
    }
    navigate("/verify-otp", { state: { name: form.name, email: form.email } });
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
          {/* Animated Moon Logo */}
          <motion.img
            src="/Assets/Moon_Logo.png"
            alt="LogiTalk Logo"
            variants={moonLogoVariants}
            animate="animate"
            className="absolute top-50 left-35 w-[500px] md:w-[700px] opacity-20 z-0"
          />

          {/* Welcome Texts */}
          <div className="relative z-10 text-center px-6">
            <h1 className="text-4xl font-bold mb-4">Welcome!</h1>
            <p>Sign up to start using LogiTalk.</p>
          </div>
        </div>

        {/* Form */}
        <div className="flex w-full md:w-1/2 flex-col items-center justify-center p-8">
          {/* LogiTalk Branding */}
          <div className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 p-[2px] rounded-xl inline-block">
            <div className="text-4xl md:text-5xl font-extrabold bg-white dark:bg-black text-transparent bg-clip-text bg-color white px-6 py-2 rounded-xl">
              LogiTalk
            </div>
          </div>

          <form className="w-full max-w-md space-y-4" onSubmit={handleSubmit}>
            <h2 className="text-2xl font-semibold mb-4">Create Account</h2>
            {error && <p className="text-red-500">{error}</p>}

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              type="text"
              placeholder="Full Name"
              required
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="Email"
              required
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              type="password"
              placeholder="Password"
              required
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:opacity-90 transition"
            >
              {loading ? "Sending OTP…" : "Sign Up"}
            </button>

            <div className="flex items-center justify-between">
              <p className="text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-purple-600 hover:underline">
                  Log in
                </Link>
              </p>

              {/* Show "Go to Verify OTP" button so user can skip waiting for auto redirect */}
              <button
                type="button"
                onClick={goToVerifyNow}
                className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                Go to verification →
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}
