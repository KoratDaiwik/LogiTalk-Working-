// src/components/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  Search,
  MessageCircle,
  User as UserIcon,
  LogOut,
  X as CloseIcon,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const getAvatarUrl = (avatar) => {
  if (avatar === null || avatar === undefined || avatar === "") return "/default-avatar.png";
  if (typeof avatar === "number" || /^\d+$/.test(String(avatar))) {
    const id = Number(avatar);
    return `${BACKEND_URL.replace(/\/$/, "")}/assets/avatars/${id}.jpg`;
  }
  if (typeof avatar === "string" && /^https?:\/\//i.test(avatar)) return avatar;
  if (typeof avatar === "string" && avatar.startsWith("/assets")) {
    return `${BACKEND_URL.replace(/\/$/, "")}${avatar}`;
  }
  if (typeof avatar === "string") {
    return avatar.startsWith("/") ? `${BACKEND_URL.replace(/\/$/, "")}${avatar}` : `${BACKEND_URL.replace(/\/$/, "")}/${avatar}`;
  }
  return "/default-avatar.png";
};

const Navbar = ({ onUserSelect }) => {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState({ avatar: "", about: "" });
  const [origProfile, setOrigProfile] = useState({ avatar: "", about: "" });
  const [avatarOptions, setAvatarOptions] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [aboutText, setAboutText] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const toggleSearch = () => {
    setShowSearch((prev) => !prev);
    setSearchTerm("");
    setResults([]);
  };
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchTerm.trim().length < 1) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      api
        .get(`/users/search?query=${encodeURIComponent(searchTerm)}`)
        .then((res) => {
          setResults(res.data.success ? res.data.users || [] : []);
        })
        .catch((err) => {
          console.error("Search failed:", err);
          setResults([]);
        });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, showSearch]);

  const handleSelect = (user) => {
    setSearchTerm("");
    setResults([]);
    setShowSearch(false);

    const payload = {
      userId: user._id,
      name: user.name,
      avatar: user.avatar || "",
      about: user.about || "",
    };

    onUserSelect?.(payload);
  };

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login");
  };
  const cancelLogout = () => setShowLogoutConfirm(false);

  const openProfileModal = async () => {
    setShowProfileModal(true);
    try {
      const res = await api.get("/users/profile");
      if (res.data.success && res.data.user) {
        const { avatar, about } = res.data.user;
        setProfile({ avatar, about });
        setOrigProfile({ avatar, about });
        setAboutText(about || "");
        if (avatar) {
          const m = (avatar || "").match(/\/assets\/avatars\/(\d+)\.jpg$/);
          if (m) setSelectedAvatar(parseInt(m[1], 10));
        }
      }
      const av = await api.get("/profile/avatars");
      if (av.data?.avatars) setAvatarOptions(av.data.avatars);
    } catch (err) {
      console.error("Failed to load profile or avatars:", err);
    }
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedAvatar(null);
    setAboutText("");
    setProfile({ avatar: "", about: "" });
    setOrigProfile({ avatar: "", about: "" });
    setAvatarOptions([]);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      if (selectedAvatar !== null) {
        let origId = null;
        if (origProfile.avatar) {
          const m = origProfile.avatar.match(/\/assets\/avatars\/(\d+)\.jpg$/);
          if (m) origId = parseInt(m[1], 10);
        }
        if (selectedAvatar !== origId) {
          await api.put("/profile/avatar", { avatarId: selectedAvatar });
        }
      }
      const trimmed = aboutText.trim();
      if (trimmed !== origProfile.about) {
        await api.put("/users/about", { about: trimmed });
      }
      closeProfileModal();
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert(err.response?.data?.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <>
      <div className="relative flex justify-between items-center p-4 bg-white border-b shadow-sm">
        <div className="text-2xl font-bold text-green-600">LogiTalk</div>
        <div className="flex gap-4 items-center text-gray-600">
          <div className="relative" ref={dropdownRef}>
            <Search className="w-6 h-6 cursor-pointer" onClick={toggleSearch} />
            {showSearch && (
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded shadow z-50">
                <input
                  type="text"
                  className="w-full p-2 border-b"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                {results.length > 0 ? (
                  <ul className="max-h-48 overflow-y-auto">
                    {results.map((u) => {
                      const src = getAvatarUrl(u.avatar);
                      return (
                        <li key={u._id} className="p-2 hover:bg-gray-100 cursor-pointer flex items-center" onClick={() => handleSelect(u)}>
                          <img
                            src={src}
                            alt="avatar"
                            className="w-8 h-8 rounded-full mr-2 object-cover"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              console.warn("Search avatar failed:", src);
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/default-avatar.png";
                            }}
                          />
                          <span>{u.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : searchTerm.trim() && <div className="p-2 text-gray-500 text-sm">No users found</div>}
              </div>
            )}
          </div>

          <MessageCircle className="w-6 h-6 cursor-pointer" />
          <Bell className="w-6 h-6 cursor-pointer" />

          <UserIcon className="w-6 h-6 cursor-pointer" onClick={openProfileModal} title="Edit Profile" />
          <LogOut className="w-6 h-6 cursor-pointer" onClick={handleLogoutClick} title="Log out" />
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Logout</h3>
            <p className="mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={cancelLogout} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
              <button onClick={confirmLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Log Out</button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Profile</h3>
              <button onClick={closeProfileModal}><CloseIcon className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-col items-center mb-4">
              <div className="text-sm text-gray-600 mb-2">Current Avatar</div>
              <img
                src={selectedAvatar !== null ? getAvatarUrl(selectedAvatar) : profile.avatar && profile.avatar.startsWith("http") ? profile.avatar : getAvatarUrl(profile.avatar)}
                alt="Current Avatar"
                className="w-20 h-20 rounded-full mb-2 object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  console.warn("Profile current avatar failed:", e.currentTarget.src);
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/default-avatar.png";
                }}
              />
              <div className="text-sm text-gray-600">Click below to choose a different avatar</div>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {avatarOptions.map((id) => {
                const url = getAvatarUrl(id);
                return (
                  <img
                    key={String(id)}
                    src={url}
                    alt={`Avatar ${id}`}
                    className={`w-12 h-12 rounded-full cursor-pointer border-2 transition ${selectedAvatar === id ? "border-green-500" : "border-transparent"}`}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      console.warn("Profile avatar option failed:", url);
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/default-avatar.png";
                    }}
                    onClick={() => setSelectedAvatar(id)}
                  />
                );
              })}
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-1">About</label>
              <textarea value={aboutText} onChange={(e) => setAboutText(e.target.value)} placeholder="Write a short bio (max 200 chars)" maxLength={200} rows={4} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <div className="text-right text-sm text-gray-500">{aboutText.length}/200</div>
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={closeProfileModal} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" disabled={savingProfile}>Cancel</button>
              <button onClick={handleSaveProfile} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
