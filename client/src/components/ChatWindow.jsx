// src/components/ChatWindow.jsx
import React, { useState } from "react";

const ChatWindow = ({ selectedChat, onSendMessage }) => {
  const [text, setText] = useState("");
  const messages = selectedChat?.messages || [];

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage?.(text);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50 p-4 overflow-y-auto">
      <div className="text-sm text-gray-600 mb-2">
        Chat with {selectedChat.name}
      </div>
      <div className="flex flex-col space-y-2 mb-4">
        {messages.map((msg, idx) => {
          const isMine = msg.sender === "me";
          return (
            <div
              key={idx}
              className={`${
                isMine ? "self-end bg-green-200" : "self-start bg-white"
              } p-3 rounded-xl shadow text-sm w-fit max-w-[60%]`}
            >
              <div className="flex items-end">
                <span>{msg.text}</span>
                {isMine && (
                  <span className="ml-2 text-xs text-gray-500">
                    {msg.read ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t pt-2">
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          className="flex-1 p-2 rounded-lg border resize-none"
        />
        <button
          onClick={handleSend}
          className="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
