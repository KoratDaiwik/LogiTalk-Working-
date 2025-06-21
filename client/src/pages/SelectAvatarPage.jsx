import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function SelectAvatarPage() {
  const [avatars, setAvatars] = useState([]);
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("avatar");
  const [about, setAbout] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    api
      .get("/profile/avatars")
      .then(res => {
        setAvatars(res.data.avatars || []);
      })
      .catch(err => {
        console.error("Failed to load avatars", err);
      });
  }, []);

  const handleAvatarConfirm = async () => {
    if (selected === null) return alert("Please choose an avatar.");
    setLoading(true);
    try {
      await api.put("/profile/avatar", { avatarId: selected });
      setStep("about");
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Failed to save avatar.");
    } finally {
      setLoading(false);
    }
  };

  const handleAboutSubmit = async () => {
    const text = about.trim();
    if (text.length > 200) return alert("About must be 200 characters or fewer.");
    setLoading(true);
    try {
      await api.put("/users/about", { about: text });
      navigate("/chat");
    } catch (err) {
      console.error(err.response?.data || err);
      alert(err.response?.data?.message || "Failed to save About.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAvatar = () => {
    setStep("avatar");
    setAbout("");
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        {step === "avatar" && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">Choose Your Avatar</h2>
            <div className="grid grid-cols-4 gap-4 mb-6 justify-center">
              {avatars.map(id => {
                const url = `${BACKEND_URL}/assets/avatars/${id}.jpg`;
                return (
                  <img
                    key={id}
                    src={url}
                    alt={`Avatar ${id}`}
                    className={`w-20 h-20 rounded-full cursor-pointer border-4 transition ${
                      selected === id ? "border-green-500" : "border-transparent"
                    }`}
                    onClick={() => setSelected(id)}
                  />
                );
              })}
            </div>
            <button
              onClick={handleAvatarConfirm}
              disabled={loading}
              className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Confirm Avatar"}
            </button>
          </>
        )}

        {step === "about" && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">Tell Us About Yourself</h2>
            <textarea
              value={about}
              onChange={e => setAbout(e.target.value)}
              placeholder="Write a short bio (max 200 characters)"
              maxLength={200}
              rows={5}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400 mb-4"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleBackToAvatar}
                type="button"
                className="flex-1 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleAboutSubmit}
                disabled={loading}
                className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Submit About"}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-right">
              {about.length}/200 characters
            </p>
          </>
        )}
      </div>
    </div>
  );
}
