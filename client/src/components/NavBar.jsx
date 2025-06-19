// src/components/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import { Bell, Search, MessageCircle, User as UserIcon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

const Navbar = ({ onUserSelect }) => {
  const { accessToken } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
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
        .get(`/users/search?query=${encodeURIComponent(searchTerm)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        .then((res) => {
          if (res.data.success) setResults(res.data.users || []);
          else setResults([]);
        })
        .catch((err) => {
          console.error("Search failed:", err);
          setResults([]);
        });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, showSearch, accessToken]);

  const handleSelect = (user) => {
    setSearchTerm("");
    setResults([]);
    setShowSearch(false);
    if (onUserSelect) {
      onUserSelect({
        userId: user._id,
        name: user.name,
        avatar: user.avatar,
        about: user.about,
      });
    }
  };

  return (
    <div className="relative flex justify-between items-center p-4 bg-white border-b shadow-sm">
      <div className="text-2xl font-bold text-green-600">LogiTalk</div>
      <div className="flex gap-4 items-center text-gray-600 relative">
        <div className="relative" ref={dropdownRef}>
          <Search className="cursor-pointer" onClick={toggleSearch} />
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
                  {results.map((user) => (
                    <li
                      key={user._id}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                      onClick={() => handleSelect(user)}
                    >
                      <img
                        src={user.avatar || "/default-avatars/avatar1.png"}
                        alt="avatar"
                        className="w-8 h-8 rounded-full mr-2"
                      />
                      <span>{user.name}</span>
                    </li>
                  ))}
                </ul>
              ) : searchTerm.trim().length >= 1 ? (
                <div className="p-2 text-gray-500 text-sm">No users found</div>
              ) : null}
            </div>
          )}
        </div>
        <MessageCircle className="cursor-pointer" />
        <Bell className="cursor-pointer" />
        <UserIcon className="cursor-pointer" />
      </div>
    </div>
  );
};

export default Navbar;
