import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

export default function SelectAvatarPage() {
  const [avatars, setAvatars] = useState([]);
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("avatar");
  const [about, setAbout] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const res = await api.get("/profile/avatars");
        if (res.data?.avatars) {
          setAvatars(res.data.avatars);
        }
      } catch (err) {
        console.error("Failed to load avatars:", err);
        setError("Failed to load avatars. Please try again later.");
      }
    };

    fetchAvatars();
  }, []);

  const handleAvatarConfirm = async () => {
    if (selected === null) {
      setError("Please select an avatar");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      await api.put("/profile/avatar", { avatarId: selected });
      setStep("about");
    } catch (err) {
      console.error("Avatar save error:", err);
      setError(err.response?.data?.message || "Failed to save avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleAboutSubmit = async () => {
    const text = about.trim();
    if (text.length > 200) {
      setError("About must be 200 characters or fewer");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      await api.put("/users/about", { about: text });
      navigate("/chat");
    } catch (err) {
      console.error("About save error:", err);
      setError(err.response?.data?.message || "Failed to save about info");
    } finally {
      setLoading(false);
    }
  };

  return (
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
              
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                {avatars.map(id => (
                  <div 
                    key={id}
                    className={`cursor-pointer rounded-full p-1 border-2 transition-all ${
                      selected === id 
                        ? "border-indigo-500 scale-105" 
                        : "border-transparent hover:border-gray-300"
                    }`}
                    onClick={() => setSelected(id)}
                  >
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleAvatarConfirm}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70 transition flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : "Continue"}
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
              
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              
              <div className="mb-6">
                <textarea
                  value={about}
                  onChange={e => setAbout(e.target.value)}
                  placeholder="Write a short bio (max 200 characters)..."
                  maxLength={200}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {about.length}/200 characters
                </div>
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
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70 transition flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : "Finish Setup"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}