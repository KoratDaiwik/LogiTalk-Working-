import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../utils/api";
import { pageVariants, pageTransition, moonLogoVariants } from "./newOne";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/register", form);
      if (res.data.success) {
        navigate("/verify-otp", {
          state: { name: form.name, email: form.email },
        });
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Signup failed");
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
          <p className="text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-purple-600 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </motion.div>
  );
}
