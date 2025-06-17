import React, { useEffect, useState } from "react";

const ChatSidebar = ({ chatList = [], onSelectChat }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChats = chatList.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-[22%] border-r p-4 bg-white overflow-y-auto">
      <div className="text-lg font-semibold mb-4">Active Users</div>
      <div className="flex space-x-3 mb-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="w-10 h-10 bg-gray-200 rounded-full" />
        ))}
      </div>

      <input
        type="text"
        placeholder="Search or start new chat"
        className="w-full p-2 rounded-md border mb-4 text-sm"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="space-y-3">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center cursor-pointer hover:bg-gray-100 p-2 rounded"
              onClick={() => onSelectChat(chat)}
            >
              <div>
                <div className="font-semibold">{chat.name}</div>
                <div className="text-sm text-gray-500 truncate">
                  {chat.lastMessage}
                </div>
              </div>
              <span className="text-xs text-gray-400">{chat.time}</span>
            </div>
          ))
        ) : (
          <div className="text-gray-400 text-sm">No chats yet</div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
