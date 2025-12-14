import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { connectSocket, disconnectSocket, markMessagesRead } from "../utils/socket";
import * as svc from "../services/chatService";
import api from "../utils/api";

import Navbar from "../components/Navbar";
import ChatSidebar from "../components/ChatSidebar";
import ChatWindow from "../components/ChatWindow";
import UserProfile from "../components/UserProfile";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Helper to normalize avatar URLs
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

const ChatPage = () => {
  const { currentUser, accessToken } = useAuth();

  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const socketRef = useRef(null);
  const activeChatIdRef = useRef(null); 
  const processedMessageIds = useRef(new Set());

  // 1. Load initial chat list
  useEffect(() => {
    if (!accessToken || !currentUser?.userId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await svc.fetchChatList();
        if (mounted && res.data?.success) {
          setChatList(res.data.chats || []);
        }
      } catch (err) {
        console.error("Failed to load chats:", err);
      }
    })();
    return () => (mounted = false);
  }, [accessToken, currentUser?.userId]);

  // 2. Sync SelectedChat with Online Status
  useEffect(() => {
    if (selectedChat) {
      const isOnline = onlineUsers.has(String(selectedChat.userId));
      if (selectedChat.isOnline !== isOnline) {
        setSelectedChat((prev) => ({ ...prev, isOnline }));
      }
    }
  }, [onlineUsers, selectedChat?.userId]);

  // 3. Socket Initialization & Event Listeners
  useEffect(() => {
    if (!accessToken || !currentUser?.userId) return;

    const socket = connectSocket(accessToken);
    socketRef.current = socket;

    // --- MAIN FIX IS HERE ---
    const handleNewMessage = (msg) => {
      // Prevent duplicate processing by ID
      if (msg._id && processedMessageIds.current.has(msg._id)) return;
      if (msg._id) processedMessageIds.current.add(msg._id);

      const isMe = String(msg.sender) === String(currentUser.userId);
      const otherId = isMe ? msg.receiver : msg.sender;
      const otherIdStr = String(otherId);
      const isOpen = activeChatIdRef.current === otherIdStr;

      // Handle updating the chat window
      if (isOpen) {
        setSelectedChat((prev) => {
          if (!prev || String(prev.userId) !== otherIdStr) return prev;

          const msgs = [...prev.messages];
          let foundMatch = false;

          // DEDUPLICATION LOGIC:
          // If message is from ME, check if we have a temporary message waiting
          if (isMe) {
            // Find index of a message that has a temporary ID AND matches the text
            // This works even if the backend forgets to send back the 'tmpId'
            const tmpIndex = msgs.findLastIndex(m => 
                (m._id === msg.tmpId) || 
                (String(m._id).startsWith('tmp-') && m.text === msg.text)
            );

            if (tmpIndex !== -1) {
              // It's a match! Update the existing temporary message to the real one
              msgs[tmpIndex] = {
                ...msgs[tmpIndex],
                _id: msg._id,
                delivered: true,
                timestamp: msg.timestamp
              };
              foundMatch = true;
            }
          }

          // If no temporary match was found (or it's from the other person), add as new
          if (!foundMatch) {
            msgs.push({
              _id: msg._id || `rcv-${Date.now()}`,
              text: msg.text,
              timestamp: msg.timestamp,
              delivered: true,
              read: msg.read || false,
              sender: isMe ? "me" : "them",
            });
          }

          return { ...prev, messages: msgs };
        });

        // If I received it and chat is open, mark as read
        if (!isMe) {
          markMessagesRead(otherId);
        }
      }

      // Handle Chat List Sidebar Updates
      setChatList((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((c) => String(c.userId) === otherIdStr);
        
        let chatEntry;
        if (idx > -1) {
          chatEntry = { ...copy[idx] };
          copy.splice(idx, 1); 
        } else {
          chatEntry = {
            userId: otherId,
            name: msg.senderName || "Unknown",
            avatar: msg.senderAvatar || "",
            unreadCount: 0,
            isOnline: false 
          };
        }

        chatEntry.lastMessage = msg.text;
        chatEntry.timestamp = msg.timestamp;
        
        if (isMe) {
            chatEntry.unreadCount = 0;
        } else if (isOpen) {
            chatEntry.unreadCount = 0;
        } else {
            chatEntry.unreadCount = (chatEntry.unreadCount || 0) + 1;
        }

        copy.unshift(chatEntry);
        return copy;
      });
    };

    const handleOnlineUsers = (list) => {
      setOnlineUsers(new Set(list.map(String)));
    };

    const handleUserOnline = (userId) => {
      setOnlineUsers((prev) => new Set(prev).add(String(userId)));
    };

    const handleUserOffline = (userId) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(String(userId));
        return next;
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
      disconnectSocket();
    };
  }, [accessToken, currentUser?.userId]);

  // 4. Handle selecting a chat
  const handleSidebarSelect = useCallback(async (chat) => {
    if (!currentUser?.userId) return;
    
    const targetUserIdStr = String(chat.userId);
    activeChatIdRef.current = targetUserIdStr; 

    setSelectedChat({
      userId: chat.userId,
      name: chat.name || "Unknown",
      avatar: chat.avatar,
      messages: [], 
      about: "",
      isOnline: onlineUsers.has(targetUserIdStr)
    });

    try {
      const r = await svc.fetchMessages(chat.userId);
      if (r.data?.success) {
        const msgs = (r.data.messages || []).map((m) => ({
          _id: m._id,
          text: m.text,
          timestamp: m.timestamp,
          delivered: true,
          read: m.read || false,
          sender: String(m.sender) === String(currentUser.userId) ? "me" : "them",
        }));

        let about = "";
        let avatarRaw = chat.avatar;
        try {
            const pr = await api.get(`/users/${chat.userId}`);
            if(pr.data?.success?.user) {
                about = pr.data.user.about;
                if(!avatarRaw) avatarRaw = pr.data.user.avatar;
            }
        } catch(e) { console.warn("Profile fetch error", e); }

        setSelectedChat(prev => {
            if (activeChatIdRef.current !== targetUserIdStr) return prev;
            return {
                ...prev,
                avatar: avatarRaw, 
                messages: msgs,
                about
            };
        });

        await svc.markAsRead(chat.userId);

        setChatList(prev => prev.map(c => 
            String(c.userId) === targetUserIdStr ? { ...c, unreadCount: 0 } : c
        ));
      }
    } catch (err) {
      console.error("Open chat error:", err);
    }
  }, [currentUser?.userId, onlineUsers]);

  // 5. Handle Sending Message
  const handleSendMessage = useCallback((text) => {
    if (!selectedChat || !text.trim()) return;

    const tmpId = `tmp-${Date.now()}`;
    const now = new Date().toISOString();

    // Optimistically add to Chat Window
    setSelectedChat((prev) => ({
      ...prev,
      messages: [
        ...(prev?.messages || []),
        {
          _id: tmpId,
          text,
          sender: "me",
          timestamp: now,
          delivered: false,
          read: false,
        },
      ],
    }));

    // Send via Socket
    svc.sendMessageWS(selectedChat.userId, text, tmpId);

    // Update Sidebar immediately
    setChatList((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((c) => String(c.userId) === String(selectedChat.userId));
      if (idx > -1) {
        const c = { ...copy[idx] };
        c.lastMessage = text;
        c.timestamp = now;
        c.unreadCount = 0; 
        copy.splice(idx, 1);
        copy.unshift(c);
      }
      return copy;
    });
  }, [selectedChat]);

  // 6. Memoized Chat List
  const enhancedChatList = useMemo(() => {
    return chatList.map((c) => ({
      ...c,
      isOnline: onlineUsers.has(String(c.userId)),
      avatarUrl: getAvatarUrl(c.avatar),
    }));
  }, [chatList, onlineUsers]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Please log in to continue...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar onUserSelect={handleSidebarSelect} />
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar chatList={enhancedChatList} onSelectChat={handleSidebarSelect} />
        <ChatWindow selectedChat={selectedChat} onSendMessage={handleSendMessage} />
        <UserProfile selectedChat={selectedChat} />
      </div>
    </div>
  );
};

export default ChatPage;