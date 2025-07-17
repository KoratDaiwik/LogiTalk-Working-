// src/components/UserProfile.jsx
import React from "react";

const UserProfile = ({ selectedChat }) => {
  if (!selectedChat) {
    return (
      <div className="w-[20%] border-l p-4 bg-white text-gray-400 text-center">
        No user selected
      </div>
    );
  }

  return (
    <div className="w-[20%] border-l p-4 bg-white overflow-y-auto">
      <div className="flex flex-col items-center">
        <img
          src={selectedChat.avatar || "/default-avatars/avatar1.png"}
          alt="profile"
          className="w-16 h-16 rounded-full mb-2"
        />
        <div className="font-semibold text-lg">{selectedChat.name}</div>
        {/* Display online status dynamically */}
        <div className={`text-sm ${selectedChat.isOnline ? 'text-green-500' : 'text-gray-500'}`}>
          {selectedChat.isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="mt-4">
        <div className="font-semibold text-gray-600">About</div>
        <div className="text-sm text-gray-500">
          {selectedChat.about || "No info available"}
        </div>
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
