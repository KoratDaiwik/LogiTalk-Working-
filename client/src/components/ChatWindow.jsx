import React, { useState, useEffect, useRef } from "react";

const ChatWindow = ({ selectedChat, onSendMessage }) => {
  const [text, setText] = useState("");
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        150
      )}px`;
    }
  }, [text]);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b p-4 bg-white flex items-center space-x-3">
        <img
          src={selectedChat.avatar || "/default-avatar.png"}
          alt={selectedChat.name}
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
      <div className="flex-1 p-4 overflow-y-auto flex flex-col">
        {selectedChat.messages.map(msg => (
          <div
            key={msg._id}
            className={`flex my-2 ${
              msg.sender === "me" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.sender === "me"
                  ? "bg-green-100 rounded-br-none"
                  : "bg-white rounded-bl-none border"
              }`}
            >
              <div className="text-gray-800 break-words">{msg.text}</div>
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {msg.sender === "me" && (
                  <span
                    className={`ml-2 text-xs ${
                      msg.read 
                        ? "text-blue-500" 
                        : msg.delivered 
                          ? "text-gray-500" 
                          : "text-gray-400"
                    }`}
                  >
                    {msg.read ? "✓✓ Read" : msg.delivered ? "✓✓ Delivered" : "✓ Sent"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 bg-white flex items-end space-x-2">
        <textarea
          ref={textareaRef}
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
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded-lg focus:border-green-500 resize-none max-h-32"
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