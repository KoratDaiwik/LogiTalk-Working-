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

const Navbar = ({ onUserSelect }) => {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState({ avatar: "", about: "" });
  const [origProfile, setOrigProfile] = useState({ avatar: "", about: "" });
  const [avatarOptions, setAvatarOptions] = useState([]); // array of numeric IDs
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [aboutText, setAboutText] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Backend URL for images
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // Search toggle & outside click
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

  // Search API call debounced
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
    onUserSelect?.({
      userId: user._id,
      name: user.name,
      avatar: user.avatar,
      about: user.about,
    });
  };

  // Logout handlers
  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login");
  };
  const cancelLogout = () => setShowLogoutConfirm(false);

  // Open profile modal: fetch profile + avatar IDs
  const openProfileModal = async () => {
    setShowProfileModal(true);
    try {
      // Fetch current user profile
      const res = await api.get("/users/profile");
      if (res.data.success && res.data.user) {
        const { avatar, about } = res.data.user;
        setProfile({ avatar, about });
        setOrigProfile({ avatar, about });
        setAboutText(about || "");
        // Parse numeric ID from avatar URL if stored as full URL ending in /<id>.jpg
        if (avatar) {
          const m = avatar.match(/\/assets\/avatars\/(\d+)\.jpg$/);
          if (m) setSelectedAvatar(parseInt(m[1], 10));
        }
      }
      // Fetch avatar numeric IDs
      const av = await api.get("/profile/avatars");
      if (av.data.avatars) {
        setAvatarOptions(av.data.avatars);
      }
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
      // Update avatar if changed
      if (selectedAvatar !== null) {
        // derive original ID
        let origId = null;
        if (origProfile.avatar) {
          const m = origProfile.avatar.match(/\/assets\/avatars\/(\d+)\.jpg$/);
          if (m) origId = parseInt(m[1], 10);
        }
        if (selectedAvatar !== origId) {
          await api.put("/profile/avatar", { avatarId: selectedAvatar });
        }
      }
      // Update about if changed
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
          {/* Search */}
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
                    {results.map((u) => (
                      <li
                        key={u._id}
                        className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                        onClick={() => handleSelect(u)}
                      >
                        <img
                          src={u.avatar || "/default-avatars/avatar1.png"}
                          alt="avatar"
                          className="w-8 h-8 rounded-full mr-2"
                        />
                        <span>{u.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : searchTerm.trim() && (
                  <div className="p-2 text-gray-500 text-sm">No users found</div>
                )}
              </div>
            )}
          </div>

          {/* Icons */}
          <MessageCircle className="w-6 h-6 cursor-pointer" />
          <Bell className="w-6 h-6 cursor-pointer" />

          {/* Profile/Edit icon */}
          <UserIcon
            className="w-6 h-6 cursor-pointer"
            onClick={openProfileModal}
            title="Edit Profile"
          />

          <LogOut
            className="w-6 h-6 cursor-pointer"
            onClick={handleLogoutClick}
            title="Log out"
          />
        </div>
      </div>

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Logout</h3>
            <p className="mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Profile</h3>
              <button onClick={closeProfileModal}>
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Current Avatar Preview */}
            <div className="flex flex-col items-center mb-4">
              <div className="text-sm text-gray-600 mb-2">Current Avatar</div>
              <img
                src={
                  selectedAvatar !== null
                    ? `${BACKEND_URL}/assets/avatars/${selectedAvatar}.jpg`
                    : profile.avatar && profile.avatar.startsWith("http")
                      ? profile.avatar
                      : `${BACKEND_URL}${profile.avatar.startsWith("/") ? "" : "/"}${profile.avatar}`
                }
                alt="Current Avatar"
                className="w-20 h-20 rounded-full mb-2"
              />
              <div className="text-sm text-gray-600">
                Click below to choose a different avatar
              </div>
            </div>

            {/* Avatar Options */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {avatarOptions.map((id) => {
                const url = `${BACKEND_URL}/assets/avatars/${id}.jpg`;
                return (
                  <img
                    key={id}
                    src={url}
                    alt={`Avatar ${id}`}
                    className={`w-12 h-12 rounded-full cursor-pointer border-2 transition ${
                      selectedAvatar === id ? "border-green-500" : "border-transparent"
                    }`}
                    onClick={() => setSelectedAvatar(id)}
                  />
                );
              })}
            </div>

            {/* About Field */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">About</label>
              <textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                placeholder="Write a short bio (max 200 chars)"
                maxLength={200}
                rows={4}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <div className="text-right text-sm text-gray-500">
                {aboutText.length}/200
              </div>
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeProfileModal}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                disabled={savingProfile}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={savingProfile}
              >
                {savingProfile ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
