import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const socketRef = useRef();
  const openChatRef = useRef(null);

  // 1️⃣ Load chat heads
  useEffect(() => {
    svc.fetchChatList()
      .then(r => r.data.success && setChatList(r.data.chats))
      .catch(console.error);
  }, []);

  // 2️⃣ Initialize socket & handlers
  useEffect(() => {
    if (!accessToken) return;
    
    const socket = connectSocket(accessToken);
    socketRef.current = socket;

    // On any message (incoming or echo)
    const handleNewMessage = (msg) => {
      const isMe = String(msg.sender) === String(currentUser.userId);
      const otherId = isMe ? msg.receiver : msg.sender;
      const isOpen = openChatRef.current === otherId;

      // Update chat list
      setChatList(prev => {
        const existingChat = prev.find(c => c.userId === otherId);
        if (existingChat) {
          return prev.map(c => 
            c.userId === otherId 
              ? { 
                  ...c, 
                  lastMessage: msg.text,
                  timestamp: msg.timestamp,
                  unreadCount: isOpen ? 0 : (isMe ? 0 : (c.unreadCount || 0) + 1)
                } 
              : c
          );
        }
        
        // New chat - need to fetch user info
        return prev;
      });

      // If this chat is open, append to window
      if (isOpen) {
        setSelectedChat(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              _id: msg._id,
              text: msg.text,
              timestamp: msg.timestamp,
              delivered: true,
              read: msg.read || false,
              sender: isMe ? "me" : "them",
            },
          ],
        }));
        
        // Mark as read if from them
        if (!isMe) svc.markAsRead(otherId).catch(console.error);
      }
    };

    socket.on("newMessage", handleNewMessage);

    // Presence
    socket.on("onlineUsers", list => setOnlineUsers(new Set(list)));
    socket.on("userOnline", u => setOnlineUsers(prev => new Set(prev).add(u)));
    socket.on("userOffline", u =>
      setOnlineUsers(prev => {
        const nxt = new Set(prev);
        nxt.delete(u);
        return nxt;
      })
    );

    socket.emit("getOnlineUsers");
    
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.disconnect();
    };
  }, [accessToken, currentUser.userId]);

  // 3️⃣ Open a chat & load history
  const handleSidebarSelect = useCallback(
    async chat => {
      openChatRef.current = chat.userId;
      try {
        const r = await svc.fetchMessages(chat.userId);
        if (!r.data.success) throw new Error();
        
        // Map history
        const msgs = r.data.messages.map(m => ({
          _id: m._id,
          text: m.text,
          timestamp: m.timestamp,
          delivered: true,
          read: m.read || false,
          sender: String(m.sender) === String(currentUser.userId) ? "me" : "them",
        }));
        
        // Get about info
        const p = await api.get(`/users/${chat.userId}`);
        const about = p.data.success ? p.data.user.about : "";

        setSelectedChat({ 
          ...chat, 
          messages: msgs, 
          about,
          isOnline: onlineUsers.has(chat.userId)
        });
        
        // Clear unread badge
        svc.markAsRead(chat.userId).catch(console.error);
        setChatList(prev =>
          prev.map(c =>
            c.userId === chat.userId ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch (e) {
        console.error(e);
      }
    },
    [currentUser.userId, onlineUsers]
  );

  // 4️⃣ Send message with optimistic UI update
  const handleSendMessage = useCallback(
    text => {
      if (!selectedChat || !text.trim()) return;
      
      const tmpId = `tmp-${Date.now()}`;
      const now = new Date().toISOString();
      
      // Optimistic UI update
      setSelectedChat(prev => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            _id: tmpId,
            text,
            sender: "me",
            timestamp: now,
            delivered: false,
            read: false,
          }
        ]
      }));
      
      // Emit via socket
      socketRef.current.emit("sendMessage", {
        to: selectedChat.userId,
        text,
        tmpId  // Send temporary ID to match on echo
      });
    },
    [selectedChat]
  );

  const enhanced = chatList.map(c => ({
    ...c,
    isOnline: onlineUsers.has(c.userId),
  }));

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar onUserSelect={handleSidebarSelect} />
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          chatList={enhanced}
          onSelectChat={handleSidebarSelect}
        />
        <ChatWindow
          selectedChat={selectedChat}
          onSendMessage={handleSendMessage}
        />
        <UserProfile
          selectedChat={
            selectedChat && {
              ...selectedChat,
              isOnline: onlineUsers.has(selectedChat.userId),
            }
          }
        />
      </div>
    </div>
  );
};

export default ChatPage;