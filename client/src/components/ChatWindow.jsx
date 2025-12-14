import React, { useState, useEffect, useRef } from "react";

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

const StableAvatar = ({ avatar, size = 40, alt = "avatar" }) => {
  const [src, setSrc] = useState(() => (avatar ? getAvatarUrl(avatar) : "/default-avatar.png"));

  useEffect(() => {
    const n = avatar ? getAvatarUrl(avatar) : "/default-avatar.png";
    if (n !== src) setSrc(n);
  }, [avatar]);

  return (
    <img
      src={src}
      alt={alt}
      className={`rounded-full object-cover`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/default-avatar.png";
      }}
    />
  );
};

const ChatWindow = ({ selectedChat, onSendMessage }) => {
  const [text, setText] = useState("");
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages, selectedChat?.userId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [text]);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50 border-l border-r">
        <div className="text-center">
            <p className="text-xl font-semibold mb-2">Welcome to LogiTalk</p>
            <p className="text-sm">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 border-r w-[58%]">
      {/* Header */}
      <div className="border-b p-3 bg-white flex items-center space-x-3 shadow-sm z-10">
        <StableAvatar avatar={selectedChat.avatar} size={40} alt={selectedChat.name} />
        <div>
          <div className="font-semibold text-gray-800">{selectedChat.name}</div>
          <div className={`text-xs ${selectedChat.isOnline ? "text-green-500 font-medium" : "text-gray-500"}`}>
            {selectedChat.isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-2 bg-[#efeae2] bg-opacity-30">
        {(selectedChat.messages || []).map((msg) => (
          <div key={msg._id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
            <div 
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm relative group
                ${msg.sender === "me" ? "bg-green-100 text-gray-800 rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-100"}`}
            >
              <div className="break-words whitespace-pre-wrap">{msg.text}</div>
              <div className="flex justify-end items-center mt-1 space-x-1 select-none">
                <span className="text-[10px] text-gray-500">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
                {msg.sender === "me" && (
                  <span className={`text-[10px] ${msg.read ? "text-blue-500" : "text-gray-400"}`}>
                     {msg.read ? "✓✓" : msg.delivered ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white flex items-end space-x-2 border-t">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) {
                onSendMessage(text);
                setText("");
              }
            }
          }}
          placeholder="Type a message..."
          className="flex-1 p-3 bg-gray-100 border-none rounded-2xl focus:ring-0 focus:outline-none resize-none max-h-32 text-sm"
        />
        <button
          onClick={() => {
            if (text.trim()) {
              onSendMessage(text);
              setText("");
            }
          }}
          disabled={!text.trim()}
          className={`p-3 rounded-full flex items-center justify-center transition-colors ${text.trim() ? "bg-green-500 hover:bg-green-600 text-white shadow-md" : "bg-gray-200 text-gray-400 cursor-default"}`}
        >
            <svg viewBox="0 0 24 24" height="20" width="20" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24"><path fill="currentColor" d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path></svg>
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;