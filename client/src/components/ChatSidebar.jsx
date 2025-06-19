import React, { useState } from "react";

const ChatSidebar = ({ chatList = [], onSelectChat }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChats = chatList.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-[22%] border-r p-4 bg-white overflow-y-auto">
      <div className="text-lg font-semibold mb-4 text-gray-800">Chats</div>
      
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search chats"
          className="w-full p-2 pl-8 rounded-md border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <svg
          className="absolute left-2 top-2.5 h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <div className="space-y-1">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <div
              key={chat.userId}
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors duration-200"
              onClick={() => onSelectChat(chat)}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    src={chat.avatar || "/default-avatar.png"}
                    alt={chat.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {chat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{chat.name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage || "No messages yet"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(chat.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {chat.unreadCount > 0 && (
                  <span className={`inline-flex items-center justify-center rounded-full h-5 w-5 text-xs font-medium ${
                    chat.unreadCount > 9 ? 'px-1' : 'px-2'
                  } bg-green-500 text-white`}>
                    {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">No chats found</p>
            {searchTerm && (
              <button 
                className="mt-2 text-sm text-green-600 hover:text-green-700"
                onClick={() => setSearchTerm('')}
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;