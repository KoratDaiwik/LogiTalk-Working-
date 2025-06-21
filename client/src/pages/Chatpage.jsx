import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { connectSocket } from "../utils/socket";
import * as svc from "../services/chatService";
import api from "../utils/api";

import Navbar from "../components/Navbar";
import ChatSidebar from "../components/ChatSidebar";
import ChatWindow from "../components/ChatWindow";
import UserProfile from "../components/UserProfile";

const ChatPage = () => {
  const { currentUser, accessToken } = useAuth();
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // 1. Load chats on mount
  useEffect(() => {
    svc.fetchChatList()
      .then(res => res.data.success && setChatList(res.data.chats))
      .catch(console.error);
  }, []);

  // 2. Socket setup + real‑time handlers
  useEffect(() => {
    if (!accessToken) return;
    const socket = connectSocket(accessToken);

    const handleNew = (msg) => {
      if (msg.sender === currentUser.userId) return;

      const otherId = msg.sender === currentUser.userId ? msg.receiver : msg.sender;
      const isCurrent = selectedChat?.userId === otherId;

      if (!chatList.some(c => c.userId === otherId)) {
        svc.fetchChatList()
          .then(r => r.data.success && setChatList(r.data.chats))
          .catch(console.error);
      } else {
        setChatList(prev =>
          prev.map(c =>
            c.userId === otherId
              ? {
                  ...c,
                  lastMessage: msg.text,
                  timestamp: msg.timestamp,
                  unreadCount: isCurrent ? 0 : (c.unreadCount || 0) + 1,
                }
              : c
          )
        );
      }

      if (isCurrent) {
        setSelectedChat(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            { ...msg, sender: "them" }
          ]
        }));
        svc.markAsRead(otherId);
      }
    };

    socket.on("newMessage", handleNew);
    socket.on("onlineUsers", users => setOnlineUsers(new Set(users)));
    socket.on("userOnline", u => setOnlineUsers(o => new Set(o).add(u)));
    socket.on("userOffline", u => {
      const s = new Set(o);
      s.delete(u);
      return s;
    });

    socket.emit("getOnlineUsers");

    return () => {
      socket.off("newMessage", handleNew);
      socket.off("onlineUsers");
      socket.off("userOnline");
      socket.off("userOffline");
    };
  }, [accessToken, currentUser, selectedChat, chatList]);

  // 3. Sidebar click → load full history
  const handleSidebarSelect = useCallback(async (chat) => {
    try {
      const r = await svc.fetchMessages(chat.userId);
      if (!r.data.success) throw new Error();
      const messages = r.data.messages.map(m => ({
        ...m,
        sender: m.sender === currentUser.userId ? "me" : "them"
      }));

      const p = await api.get(`/users/${chat.userId}`);
      let about = "";
      if (p.data.success && p.data.user) {
        about = p.data.user.about || "";
      }

      setSelectedChat({
        ...chat,
        messages,
        about
      });

      await svc.markAsRead(chat.userId);
      setChatList(prev =>
        prev.map(c =>
          c.userId === chat.userId
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
    } catch (e) {
      console.error("Error opening chat:", e);
    }
  }, [currentUser]);

  // 4. Start new chat from search
  const handleUserSelect = useCallback(async (user) => {
    let chat = chatList.find(c => c.userId === user.userId);
    if (!chat) {
      const r = await svc.startChat(user.userId);
      if (!r.data.success) return;
      chat = {
        ...r.data.chat,
        unreadCount: 0,
        isOnline: onlineUsers.has(user.userId)
      };
      setChatList(prev => [chat, ...prev]);
    }
    handleSidebarSelect(chat);
  }, [chatList, handleSidebarSelect, onlineUsers]);

  // 5. Send message
  const handleSendMessage = useCallback((text) => {
    if (!selectedChat || !text.trim()) return;
    const now = new Date().toISOString();
    const temp = {
      _id: `tmp-${Date.now()}`,
      text,
      sender: "me",
      timestamp: now,
      read: false
    };
    setSelectedChat(prev => ({
      ...prev,
      messages: [...prev.messages, temp]
    }));
    svc.sendMessageWS(selectedChat.userId, text);
  }, [selectedChat]);

  const enhanced = chatList.map(c => ({
    ...c,
    isOnline: onlineUsers.has(c.userId)
  }));

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar onUserSelect={handleUserSelect} />
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar chatList={enhanced} onSelectChat={handleSidebarSelect} />
        <ChatWindow selectedChat={selectedChat} onSendMessage={handleSendMessage} />
        <UserProfile selectedChat={selectedChat} />
      </div>
    </div>
  );
};

export default ChatPage;
