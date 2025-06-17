// src/components/ChatPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { connectSocket } from "../utils/socket";
import * as svc from "../services/chatService";

import Navbar from "../components/Navbar";
import ChatSidebar from "../components/ChatSidebar";
import ChatWindow from "../components/ChatWindow";
import UserProfile from "../components/UserProfile";

const ChatPage = () => {
  const { currentUser, token } = useAuth();
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  // Initialize Socket.io once we have a token
  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);

    const handleNewMessage = (msg) => {
      // Update sidebar list (add new chat if doesn't exist)
      setChatList((prev) => {
        const otherId =
          msg.sender === currentUser.userId ? msg.receiver : msg.sender;
        const exists = prev.find((c) => c.userId === otherId);
        const updated = prev.map((chat) =>
          chat.userId === otherId
            ? {
                ...chat,
                lastMessage: msg.text,
                timestamp: msg.timestamp,
                unreadCount:
                  (chat.unreadCount || 0) +
                  (msg.sender === otherId && selectedChat?.userId !== otherId
                    ? 1
                    : 0),
              }
            : chat
        );
        if (!exists) {
          const newChat = {
            userId: otherId,
            name: msg.senderName || otherId,
            avatar: msg.senderAvatar || null,
            lastMessage: msg.text,
            timestamp: msg.timestamp,
            unreadCount: 1,
          };
          return [newChat, ...updated];
        }
        return updated;
      });

      // If this chat is open, append the message
      if (
        selectedChat &&
        (msg.sender === selectedChat.userId ||
          msg.receiver === selectedChat.userId)
      ) {
        setSelectedChat((prev) => ({
          ...prev,
          messages: [
            ...(prev.messages || []),
            {
              ...msg,
              sender: msg.sender === currentUser.userId ? "me" : msg.sender,
            },
          ],
        }));
        if (msg.sender === selectedChat.userId) {
          svc.markAsRead(selectedChat.userId);
        }
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [token, currentUser, selectedChat]);

  // Load your existing chats
  const loadChats = useCallback(async () => {
    try {
      const res = await svc.fetchChatList();
      if (res.data.success) setChatList(res.data.chats);
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Sidebar click
  const handleSidebarSelect = useCallback(
    async (chat) => {
      console.log("🔹 handleSidebarSelect called for:", chat);
      try {
        const msgsRes = await svc.fetchMessages(chat.userId);
        console.log("🟢 fetchMessages returned:", msgsRes.data);
        if (!msgsRes.data.success) return;

        const messages = msgsRes.data.messages.map((msg) => ({
          ...msg,
          sender: msg.sender === currentUser.userId ? "me" : msg.sender,
        }));

        setSelectedChat({ ...chat, messages });
        svc.markAsRead(chat.userId);
      } catch (err) {
        console.error("Error opening chat:", err);
      }
    },
    [currentUser]
  );

  // New chat from Navbar
  const handleUserSelect = useCallback(
    async (user) => {
      try {
        let chat = chatList.find((c) => c.userId === user.userId);
        if (!chat) {
          const res = await svc.startChat(user.userId);
          if (!res.data.success) return;
          chat = { ...res.data.chat, unreadCount: 0 };
          setChatList((prev) => [chat, ...prev]);
        }
        await handleSidebarSelect(chat);
      } catch (err) {
        // Log the server’s response body so you can inspect the error message
        console.error("Error starting/fetching chat:", {
          status: err.response?.status,
          data: err.response?.data,
        });
      }
    },
    [chatList, handleSidebarSelect]
  );

  const handleSendMessage = (text) => {
    if (!selectedChat) return;
    svc.sendMessageWS(selectedChat.userId, text);
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar onUserSelect={handleUserSelect} />
      <div className="flex flex-1">
        <ChatSidebar
          chatList={chatList.map((c) => ({
            ...c,
            time: new Date(c.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }))}
          onSelectChat={handleSidebarSelect}
        />
        <ChatWindow
          selectedChat={selectedChat}
          onSendMessage={handleSendMessage}
        />
        <UserProfile selectedChat={selectedChat} />
      </div>
    </div>
  );
};

export default ChatPage;
