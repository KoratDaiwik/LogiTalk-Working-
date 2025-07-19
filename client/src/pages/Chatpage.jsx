// src/pages/ChatPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { connectSocket, disconnectSocket } from "../utils/socket";
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

  const socketRef = useRef();
  const openChatRef = useRef(null);
  const tmpMessageMap = useRef(new Map());           // tracks optimistic messages
  const messageIdsRef = useRef(new Set());           // tracks displayed final IDs

  // 1) Load chat list
  useEffect(() => {
    (async () => {
      try {
        const res = await svc.fetchChatList();
        if (res.data.success) setChatList(res.data.chats);
      } catch (err) {
        console.error("Failed to load chats:", err);
      }
    })();
  }, []);

  // 2) Socket initialization
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);
    socketRef.current = socket;

    const handleNewMessage = msg => {
      // Dedupe final messages
      if (messageIdsRef.current.has(msg._id)) return;
      messageIdsRef.current.add(msg._id);

      const isMe = String(msg.sender) === String(currentUser.userId);
      const otherId = isMe ? msg.receiver : msg.sender;
      const isOpen = openChatRef.current === otherId.toString();

      // If it's an echo of our optimistic message, replace it
      if (isMe && msg.tmpId && tmpMessageMap.current.has(msg.tmpId)) {
        setSelectedChat(prev => {
          if (!prev || prev.userId.toString() !== otherId.toString()) return prev;
          return {
            ...prev,
            messages: prev.messages.map(m =>
              m._id === msg.tmpId
                ? {
                    ...m,
                    _id: msg._id,
                    delivered: true,
                    read: msg.read || false,
                    timestamp: msg.timestamp
                  }
                : m
            )
          };
        });
        tmpMessageMap.current.delete(msg.tmpId);
      } else {
        // 2a) Update chat list ordering & unread count
        setChatList(prev => {
          const copy = [...prev];
          const idx = copy.findIndex(c => c.userId.toString() === otherId.toString());
          if (idx > -1) {
            const chat = copy[idx];
            chat.lastMessage = msg.text;
            chat.timestamp   = msg.timestamp;
            chat.unreadCount = isOpen ? 0 : (isMe ? 0 : (chat.unreadCount || 0) + 1);
            copy.splice(idx, 1);
            copy.unshift(chat);
          } else {
            copy.unshift({
              userId: otherId,
              name: msg.senderName || "Unknown",
              avatar: msg.senderAvatar || "",
              lastMessage: msg.text,
              timestamp: msg.timestamp,
              unreadCount: isMe ? 0 : 1,
              isOnline: onlineUsers.has(otherId.toString())
            });
          }
          return copy;
        });

        // 2b) If chat window open, append message
        if (isOpen) {
          setSelectedChat(prev => {
            if (!prev || prev.userId.toString() !== otherId.toString()) return prev;
            return {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  _id:        msg._id,
                  text:       msg.text,
                  timestamp:  msg.timestamp,
                  delivered:  true,
                  read:       msg.read || false,
                  sender:     isMe ? "me" : "them"
                }
              ]
            };
          });
          if (!isMe) svc.markAsRead(otherId).catch(console.error);
        }
      }
    };

    const handleOnlineUsers = list    => setOnlineUsers(new Set(list));
    const handleUserOnline  = id      => setOnlineUsers(prev => new Set(prev).add(id));
    const handleUserOffline = id      => setOnlineUsers(prev => {
      const nxt = new Set(prev); nxt.delete(id); return nxt;
    });

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
      disconnectSocket();
    };
  }, [accessToken, currentUser.userId, onlineUsers]);

  // 3) Open chat & fetch history
  const handleSidebarSelect = useCallback(async chat => {
    openChatRef.current = chat.userId.toString();
    try {
      const r = await svc.fetchMessages(chat.userId);
      if (!r.data.success) throw new Error("Fetch failed");

      const msgs = r.data.messages.map(m => ({
        _id:       m._id,
        text:      m.text,
        timestamp: m.timestamp,
        delivered: true,
        read:      m.read || false,
        sender:    String(m.sender) === String(currentUser.userId) ? "me" : "them"
      }));

      const pr = await api.get(`/users/${chat.userId}`);
      const about = pr.data.success ? pr.data.user.about : "";

      setSelectedChat({
        ...chat,
        messages: msgs,
        about,
        isOnline: onlineUsers.has(chat.userId.toString())
      });

      await svc.markAsRead(chat.userId);
      setChatList(prev =>
        prev.map(c =>
          c.userId.toString() === chat.userId.toString()
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
    } catch (err) {
      console.error("Open chat error:", err);
    }
  }, [currentUser.userId, onlineUsers]);

  // 4) Send message
  const handleSendMessage = useCallback(text => {
    if (!selectedChat || !text.trim()) return;

    const tmpId = `tmp-${Date.now()}`;
    const now   = new Date().toISOString();
    tmpMessageMap.current.set(tmpId, true);

    // Optimistic update
    setSelectedChat(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        { _id: tmpId, text, sender: "me", timestamp: now, delivered: false, read: false }
      ]
    }));

    // Emit to server (with tmpId)
    svc.sendMessageWS(selectedChat.userId, text, tmpId);

    // Also bump this chat to top
    setChatList(prev => {
      const copy = [...prev];
      const idx  = copy.findIndex(c => c.userId.toString() === selectedChat.userId.toString());
      if (idx > -1) {
        const c = copy[idx];
        c.lastMessage = text;
        c.timestamp   = now;
        copy.splice(idx, 1);
        copy.unshift(c);
      }
      return copy;
    });
  }, [selectedChat]);

  const enhancedChatList = chatList.map(c => ({
    ...c,
    isOnline: onlineUsers.has(c.userId.toString())
  }));

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar onUserSelect={handleSidebarSelect} />
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar chatList={enhancedChatList} onSelectChat={handleSidebarSelect} />
        <ChatWindow selectedChat={selectedChat} onSendMessage={handleSendMessage} />
        <UserProfile selectedChat={selectedChat && { ...selectedChat }} />
      </div>
    </div>
  );
};

export default ChatPage;
