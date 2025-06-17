import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { moonLogoVariants, pageTransition, pageVariants } from "./newOne";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/login", form);
      if (res.data.success && res.data.accessToken) {
        // PASS THE TOKEN INTO YOUR CONTEXT
        await login(res.data.accessToken);
        navigate("/chat", { replace: true });
      } else {
        setError(res.data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="h-screen flex relative"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {/* Left Panel */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-purple-600 to-pink-500 items-center justify-center text-white relative overflow-hidden">
        <motion.img
          src="/Assets/Moon_Logo.png"
          alt="LogiTalk Logo"
          variants={moonLogoVariants}
          animate="animate"
          className="absolute top-10 left-10 w-[500px] md:w-[700px] opacity-20 z-0"
        />
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
          <p>Log in to continue your LogiTalk journey.</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center p-8 relative">
        <div className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 p-[2px] rounded-xl inline-block">
          <div className="text-4xl md:text-5xl font-extrabold bg-white dark:bg-black text-transparent bg-clip-text px-6 py-2 rounded-xl">
            LogiTalk
          </div>
        </div>

        <form className="w-full max-w-md space-y-4" onSubmit={handleSubmit}>
          <h2 className="text-2xl font-semibold mb-4">Log In</h2>
          {error && <p className="text-red-500">{error}</p>}
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:opacity-90 transition"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
          <p className="text-sm">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-purple-600 hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </motion.div>
  );
}
