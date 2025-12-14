// src/components/UserProfile.jsx
import React from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const getAvatarUrl = (avatar) => {
  if (avatar === null || avatar === undefined || avatar === "") return "/default-avatars/avatar1.png";
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
  return "/default-avatars/avatar1.png";
};

const UserProfile = ({ selectedChat }) => {
  if (!selectedChat) {
    return (
      <div className="w-[20%] border-l p-4 bg-white text-gray-400 text-center">
        No user selected
      </div>
    );
  }

  const avatarSrc = getAvatarUrl(selectedChat.avatar);

  return (
    <div className="w-[20%] border-l p-4 bg-white overflow-y-auto">
      <div className="flex flex-col items-center">
        <img
          src={avatarSrc}
          alt="profile"
          className="w-16 h-16 rounded-full mb-2"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            console.warn("UserProfile avatar failed:", avatarSrc);
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/default-avatars/avatar1.png";
          }}
        />
        <div className="font-semibold text-lg">{selectedChat.name}</div>
        <div className={`text-sm ${selectedChat.isOnline ? "text-green-500" : "text-gray-500"}`}>{selectedChat.isOnline ? "Online" : "Offline"}</div>
      </div>

      <div className="mt-4">
        <div className="font-semibold text-gray-600">About</div>
        <div className="text-sm text-gray-500">{selectedChat.about || "No info available"}</div>
      </div>

      <div className="mt-4">
        <div className="font-semibold text-gray-600">Media, Links and Docs</div>
        <div className="flex gap-2 mt-2">
          {(selectedChat.media || []).length > 0 ? (
            selectedChat.media.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="media"
                className="w-16 h-16 rounded object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  console.warn("User media failed:", img);
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/default-avatar.png";
                }}
              />
            ))
          ) : (
            <div className="text-gray-400 text-sm">No media</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
