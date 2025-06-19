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
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Load initial chat list
  useEffect(() => {
    const loadChats = async () => {
      try {
        const res = await svc.fetchChatList();
        if (res.data.success) {
          setChatList(res.data.chats);
        }
      } catch (err) {
        console.error("Failed to load chats:", err);
      }
    };
    loadChats();
  }, []);

  // Socket.io setup
  useEffect(() => {
    if (!token) return;
    
    const socket = connectSocket(token);

    const handleNewMessage = (msg) => {
      const otherId = msg.sender === currentUser.userId ? msg.receiver : msg.sender;
      const isSelected = selectedChat?.userId === otherId;

      setChatList(prev => 
        prev.map(chat => 
          chat.userId === otherId
            ? {
                ...chat,
                lastMessage: msg.text,
                timestamp: msg.timestamp,
                unreadCount: isSelected ? 0 : (chat.unreadCount || 0) + 1
              }
            : chat
        )
      );

      if (isSelected) {
        setSelectedChat(prev => ({
          ...prev,
          messages: [
            ...(prev.messages || []),
            {
              ...msg,
              sender: msg.sender === currentUser.userId ? "me" : msg.sender,
            },
          ],
        }));
        svc.markAsRead(otherId);
      }
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(new Set(users));
    };

    const handleUserOnline = (userId) => {
      setOnlineUsers(prev => new Set(prev).add(userId));
    };

    const handleUserOffline = (userId) => {
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);
    socket.emit("getOnlineUsers");

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
    };
  }, [token, currentUser, selectedChat]);

  // src/components/ChatPage.jsx
const handleSidebarSelect = useCallback(async (chat) => {
  try {
    const msgsRes = await svc.fetchMessages(chat.userId);
    if (!msgsRes.data?.success) {
      throw new Error("Failed to fetch messages");
    }

    const messages = msgsRes.data.messages.map((msg) => ({
      ...msg,
      sender: msg.sender === currentUser.userId ? "me" : msg.sender,
    }));

    setSelectedChat({ ...chat, messages });
    await svc.markAsRead(chat.userId);
    
    // Reset unread count in sidebar
    setChatList(prev => 
      prev.map(c => 
        c.userId === chat.userId ? { ...c, unreadCount: 0 } : c
      )
    );
  } catch (err) {
    console.error("Error opening chat:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
  }
}, [currentUser]);

  const handleUserSelect = useCallback(async (user) => {
    try {
      let chat = chatList.find(c => c.userId === user.userId);
      
      if (!chat) {
        const res = await svc.startChat(user.userId);
        if (!res.data.success) return;
        chat = { 
          ...res.data.chat, 
          unreadCount: 0,
          isOnline: onlineUsers.has(user.userId)
        };
        setChatList(prev => [chat, ...prev]);
      }
      
      await handleSidebarSelect(chat);
    } catch (err) {
      console.error("Error starting chat:", err);
    }
  }, [chatList, handleSidebarSelect, onlineUsers]);

  // inside ChatPage component

const handleSendMessage = useCallback((text) => {
  if (!selectedChat || !text.trim()) return;

  // 1) Optimistically append to UI
  const now = new Date().toISOString();
  const optimisticMsg = {
    _id: `temp-${Date.now()}`, // temporary key
    text,
    sender: "me",
    timestamp: now,
    read: false,
  };
  setSelectedChat((prev) => ({
    ...prev,
    messages: [...(prev.messages || []), optimisticMsg],
  }));

  // 2) Send to server
  svc.sendMessageWS(selectedChat.userId, text);

  // 3) Clear input is already done in ChatWindow
}, [selectedChat]);


  const enhancedChatList = chatList.map(chat => ({
    ...chat,
    isOnline: onlineUsers.has(chat.userId)
  }));

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar onUserSelect={handleUserSelect} />
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar 
          chatList={enhancedChatList} 
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