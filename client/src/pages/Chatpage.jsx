import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { connectSocket, getSocket, disconnectSocket } from "../utils/socket";
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
  const tmpMessageMap = useRef(new Map()); // Track temporary messages

  // Load chat list
  useEffect(() => {
    const loadChats = async () => {
      try {
        const res = await svc.fetchChatList();
        if (res.data.success) {
          setChatList(res.data.chats);
        }
      } catch (error) {
        console.error("Failed to load chat list:", error);
      }
    };
    
    loadChats();
  }, []);

  // Initialize socket
  useEffect(() => {
    if (!accessToken) return;
    
    const socket = connectSocket(accessToken);
    socketRef.current = socket;

    // Handle new messages
    const handleNewMessage = (msg) => {
      const isMe = msg.sender.toString() === currentUser.userId;
      const otherId = isMe ? msg.receiver : msg.sender;
      const isOpen = openChatRef.current === otherId.toString();

      // Skip duplicate for sender (optimistic update already shown)
      if (isMe && msg.tmpId && tmpMessageMap.current.has(msg.tmpId)) {
        // Update temporary message with real ID and delivery status
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
        
        // Remove from temporary map
        tmpMessageMap.current.delete(msg.tmpId);
        return;
      }

      // Update chat list
      setChatList(prev => {
        const newList = [...prev];
        const chatIndex = newList.findIndex(c => c.userId.toString() === otherId.toString());
        
        if (chatIndex !== -1) {
          newList[chatIndex] = {
            ...newList[chatIndex],
            lastMessage: msg.text,
            timestamp: msg.timestamp,
            unreadCount: isOpen ? 0 : (isMe ? 0 : (newList[chatIndex].unreadCount || 0) + 1)
          };
          
          // Move to top
          const [updatedChat] = newList.splice(chatIndex, 1);
          newList.unshift(updatedChat);
        } else {
          // Create new chat entry
          newList.unshift({
            userId: otherId,
            name: msg.senderName || "Unknown",
            avatar: msg.senderAvatar || "",
            lastMessage: msg.text,
            timestamp: msg.timestamp,
            unreadCount: isMe ? 0 : 1,
            isOnline: onlineUsers.has(otherId.toString())
          });
        }
        
        return newList;
      });

      // Update chat window if open
      if (isOpen) {
        setSelectedChat(prev => {
          if (!prev || prev.userId.toString() !== otherId.toString()) return prev;
          
          // Check if message already exists
          const exists = prev.messages.some(m => m._id === msg._id || m._id === msg.tmpId);
          if (exists) return prev;
          
          return {
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
              }
            ]
          };
        });

        // Mark as read if from them
        if (!isMe) {
          svc.markAsRead(otherId).catch(console.error);
        }
      }
    };

    // Handle message delivery confirmation
    const handleMessageDelivered = (messageId) => {
      setSelectedChat(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(msg => 
            msg._id === messageId ? { ...msg, delivered: true } : msg
          )
        };
      });
    };

    // Handle message read confirmation
    const handleMessagesRead = ({ readerId }) => {
      if (readerId === openChatRef.current) {
        setSelectedChat(prev => ({
          ...prev,
          messages: prev.messages.map(msg => ({
            ...msg,
            read: true
          }))
        }));
      }
    };

    // Handle online status changes
    const handleOnlineUsers = (users) => {
      setOnlineUsers(new Set(users));
    };

    const handleUserOnline = (userId) => {
      setOnlineUsers(prev => new Set(prev).add(userId));
      updateChatOnlineStatus(userId, true);
    };

    const handleUserOffline = (userId) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      updateChatOnlineStatus(userId, false);
    };

    // Update online status in chat list
    const updateChatOnlineStatus = (userId, isOnline) => {
      setChatList(prev => 
        prev.map(chat => 
          chat.userId.toString() === userId.toString()
            ? { ...chat, isOnline }
            : chat
        )
      );
      
      if (selectedChat && selectedChat.userId.toString() === userId.toString()) {
        setSelectedChat(prev => ({ ...prev, isOnline }));
      }
    };

    // Register event listeners
    socket.on("newMessage", handleNewMessage);
    socket.on("messageDelivered", handleMessageDelivered);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);

    // Get initial online users
    socket.emit("getOnlineUsers");

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageDelivered", handleMessageDelivered);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
      disconnectSocket();
    };
  }, [accessToken, currentUser.userId, selectedChat]);

  // Open a chat
  const handleSidebarSelect = useCallback(
    async chat => {
      openChatRef.current = chat.userId.toString();
      try {
        const res = await svc.fetchMessages(chat.userId);
        if (!res.data.success) throw new Error("Failed to fetch messages");
        
        // Map messages
        const msgs = res.data.messages.map(m => ({
          _id: m._id,
          text: m.text,
          timestamp: m.timestamp,
          delivered: true,
          read: m.read || false,
          sender: m.sender.toString() === currentUser.userId ? "me" : "them",
        }));
        
        // Get user info
        const profileRes = await api.get(`/users/${chat.userId}`);
        const about = profileRes.data.success ? profileRes.data.user.about : "";
        
        setSelectedChat({ 
          ...chat, 
          messages: msgs, 
          about,
          isOnline: onlineUsers.has(chat.userId.toString())
        });
        
        // Mark as read
        await svc.markAsRead(chat.userId);
        
        // Reset unread count
        setChatList(prev => 
          prev.map(c => 
            c.userId.toString() === chat.userId.toString() 
              ? { ...c, unreadCount: 0 } 
              : c
          )
        );
      } catch (error) {
        console.error("Error opening chat:", error);
      }
    },
    [currentUser.userId, onlineUsers]
  );

  // Send message
  const handleSendMessage = useCallback(
    text => {
      if (!selectedChat || !text.trim()) return;
      
      const tmpId = `tmp-${Date.now()}`;
      const now = new Date().toISOString();
      
      // Track temporary message
      tmpMessageMap.current.set(tmpId, {
        text,
        timestamp: now
      });
      
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
      svc.sendMessageWS(
        selectedChat.userId, 
        text, 
        tmpId // Pass temporary ID
      );
      
      // Update chat list
      setChatList(prev => {
        const newList = [...prev];
        const chatIndex = newList.findIndex(
          c => c.userId.toString() === selectedChat.userId.toString()
        );
        
        if (chatIndex !== -1) {
          newList[chatIndex] = {
            ...newList[chatIndex],
            lastMessage: text,
            timestamp: now,
            unreadCount: 0
          };
          
          // Move to top
          const [updatedChat] = newList.splice(chatIndex, 1);
          newList.unshift(updatedChat);
        }
        
        return newList;
      });
    },
    [selectedChat]
  );

  const enhancedChatList = chatList.map(c => ({
    ...c,
    isOnline: onlineUsers.has(c.userId.toString()),
  }));

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar onUserSelect={handleSidebarSelect} />
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          chatList={enhancedChatList}
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
              isOnline: onlineUsers.has(selectedChat.userId.toString()),
            }
          }
        />
      </div>
    </div>
  );
};

export default ChatPage;