import React, { useState, useEffect, useRef } from "react";

const ChatWindow = ({ selectedChat, onSendMessage }) => {
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages]);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a chat
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b p-4 bg-white flex items-center space-x-3">
        <img
          src={selectedChat.avatar || "/default-avatar.png"}
          alt=""
          className="w-10 h-10 rounded-full"
        />
        <div>
          <div className="font-medium">{selectedChat.name}</div>
          <div
            className={`text-xs ${
              selectedChat.isOnline ? "text-green-500" : "text-gray-500"
            }`}
          >
            {selectedChat.isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedChat.messages.map(msg => (
          <div
            key={msg._id}
            className={`flex my-1 ${
              msg.sender === "me" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-xl max-w-[75%] ${
                msg.sender === "me"
                  ? "bg-green-100 rounded-tr-none"
                  : "bg-white rounded-tl-none border"
              }`}
            >
              <div className="flex items-end">
                <span className="text-gray-800">{msg.text}</span>
                {msg.sender === "me" && (
                  <span
                    className={`ml-2 text-xs whitespace-nowrap ${
                      !msg.delivered
                        ? "text-gray-400" // ✓
                        : msg.read
                        ? "text-blue-500" // ✓✓ blue
                        : "text-gray-500" // ✓✓ gray
                    }`}
                  >
                    {msg.delivered ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 bg-white flex space-x-2">
        <textarea
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) {
                onSendMessage(text);
                setText("");
              }
            }
          }}
          placeholder="Type a message…"
          className="flex-1 p-2 border rounded-lg focus:border-green-500"
        />
        <button
          onClick={() => {
            if (text.trim()) {
              onSendMessage(text);
              setText("");
            }
          }}
          disabled={!text.trim()}
          className={`px-4 py-2 rounded-lg text-white ${
            text.trim()
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
