// src/pages/SelectAvatarPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const buildAvatarSrc = (item) => {
  // item could be a number (id), or a string (full URL or path like /assets/avatars/12.jpg)
  if (item === null || item === undefined) return "/default-avatar.png";

  // numeric id (or numeric string)
  if (typeof item === "number" || /^\d+$/.test(String(item))) {
    const id = Number(item);
    return `${BACKEND_URL.replace(/\/$/, "")}/assets/avatars/${id}.jpg`;
  }

  // if item already starts with http(s) -> use as-is
  if (typeof item === "string" && /^https?:\/\//i.test(item)) {
    return item;
  }

  // if item is a path starting with /assets -> prepend backend origin
  if (typeof item === "string" && item.startsWith("/assets")) {
    return `${BACKEND_URL.replace(/\/$/, "")}${item}`;
  }

  // last resort: append to backend assets
  return `${BACKEND_URL.replace(/\/$/, "")}/assets/avatars/${item}`;
};

export default function SelectAvatarPage() {
  const [avatars, setAvatars] = useState([]);
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("avatar");
  const [about, setAbout] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser, accessToken } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(false);

  useEffect(() => {
    if (!accessToken && !currentUser) {
      navigate("/login");
      return;
    }
    if (accessToken && !currentUser) {
      setCheckingAuth(true);
      return;
    }
    setCheckingAuth(false);
  }, [accessToken, currentUser, navigate]);

  useEffect(() => {
    let mounted = true;
    const fetchAvatars = async () => {
      try {
        const res = await api.get("/profile/avatars");
        if (!mounted) return;

        // Normalize backend response:
        // - If server returned numeric ids -> keep them as numbers
        // - If server returned full URLs -> keep them
        // - If response missing -> fallback to default set [1..8]
        const raw = res.data?.avatars;
        if (!raw || !Array.isArray(raw) || raw.length === 0) {
          setAvatars([1, 2, 3, 4, 5, 6, 7, 8]);
          return;
        }

        const normalized = raw.map((a) => {
          // numeric or numeric string -> number
          if (typeof a === "number" || /^\d+$/.test(String(a))) return Number(a);
          // string URL or path -> keep as string
          if (typeof a === "string") return a;
          // otherwise stringify
          return String(a);
        });

        setAvatars(normalized);
      } catch (err) {
        console.error("Failed to load avatars:", err);
        setAvatars([1, 2, 3, 4, 5, 6, 7, 8]);
        toast.error("Failed to load avatars. Showing default set.");
      }
    };

    fetchAvatars();
    return () => (mounted = false);
  }, []);

  const handleAvatarConfirm = async () => {
    if (selected === null) {
      toast.error("Please select an avatar");
      return;
    }
    setLoading(true);
    try {
      // If selected is a full URL or path, extract an ID when possible.
      // Our backend expects avatarId (number) for /profile/avatar.
      let payloadId = null;
      if (typeof selected === "number") {
        payloadId = selected;
      } else if (typeof selected === "string") {
        // try to extract /assets/avatars/<id>.jpg
        const m = selected.match(/\/assets\/avatars\/(\d+)\.(?:jpg|jpeg|png|gif)$/i);
        if (m) payloadId = Number(m[1]);
      }

      if (payloadId === null) {
        // If we couldn't extract an ID, try calling backend users/profile-pic with full URL
        // (backend route /users/profile-pic expects profilePicUrl)
        // This keeps compatibility if your backend supports updating via direct URL.
        await api.put("/users/profile-pic", { profilePicUrl: buildAvatarSrc(selected) });
      } else {
        await api.put("/profile/avatar", { avatarId: payloadId });
      }

      toast.success("Avatar saved. Please fill About next.");
      setStep("about");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleAboutSubmit = async () => {
    if (about.trim().length > 200) {
      toast.error("About must be 200 characters or fewer");
      return;
    }
    setLoading(true);
    try {
      await api.put("/users/about", { about: about.trim() });
      toast.success("Profile saved — redirecting to chat...");
      setTimeout(() => navigate("/chat"), 900);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save about info");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-3">Checking session…</div>
          <div className="animate-spin border-4 border-gray-200 border-t-green-500 rounded-full w-10 h-10 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} newestOnTop />
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="p-1 bg-gradient-to-r from-pink-500 to-purple-600"></div>
          <div className="p-6">
            {step === "avatar" ? (
              <>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                  Choose Your Avatar
                </h2>
                <p className="text-gray-600 text-center mb-6">
                  Select an avatar that represents you
                </p>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {avatars.map((item, idx) => {
                    const src = buildAvatarSrc(item);
                    const isSelected = selected === item;
                    return (
                      <div
                        key={String(item) + "_" + idx}
                        className={`cursor-pointer rounded-full p-1 flex items-center justify-center transform transition-transform duration-150 ${
                          isSelected ? "scale-105 border-2 border-indigo-500" : "border-2 border-transparent hover:scale-102"
                        }`}
                        onClick={() => setSelected(item)}
                      >
                        <img
                          src={src}
                          alt={`avatar-${String(item)}`}
                          loading="lazy"
                          className="w-16 h-16 rounded-full object-cover"
                          onError={(e) => {
                            // prevent infinite loop by clearing onerror before setting fallback
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/default-avatar.png";
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={handleAvatarConfirm}
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70 transition"
                >
                  {loading ? "Saving..." : "Continue"}
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                  Tell Us About Yourself
                </h2>
                <p className="text-gray-600 text-center mb-6">
                  Help others get to know you better
                </p>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Write a short bio (max 200 characters)..."
                  maxLength={200}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
                />
                <div className="text-right text-sm text-gray-500 mb-4">
                  {about.length}/200 characters
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("avatar")}
                    disabled={loading}
                    className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleAboutSubmit}
                    disabled={loading}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70 transition"
                  >
                    {loading ? "Saving..." : "Finish Setup"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
