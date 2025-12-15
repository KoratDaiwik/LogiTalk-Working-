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

// --- Helpers ---
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

  // --- Refs for State Access inside Event Listeners ---
  const socketRef = useRef(null);
  const activeChatIdRef = useRef(null); // Tracks which chat is currently open
  const processedMessageIds = useRef(new Set()); // Deduping buffer

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

  // 3. Socket Logic
  useEffect(() => {
    if (!accessToken || !currentUser?.userId) return;

    const socket = connectSocket(accessToken);
    socketRef.current = socket;

    // --- A. Handle Incoming Messages ---
    const handleNewMessage = (msg) => {
      // 1. Deduping: If we processed this ID already, ignore
      if (msg._id && processedMessageIds.current.has(msg._id)) return;
      if (msg._id) processedMessageIds.current.add(msg._id);

      const currentUserId = String(currentUser.userId);
      const isMe = String(msg.sender) === currentUserId;
      
      // If I sent it, the "other" person is the receiver. If they sent it, it's the sender.
      const otherUserId = isMe ? String(msg.receiver) : String(msg.sender);
      
      // Is the chat window currently open for this person?
      const isChatOpen = activeChatIdRef.current === otherUserId;

      // --- Update Chat Window ---
      if (isChatOpen) {
        setSelectedChat((prev) => {
          if (!prev || String(prev.userId) !== otherUserId) return prev;

          const msgs = [...prev.messages];
          
          // FIX #1: DUPLICATES
          // If "isMe", we only want to REPLACE the temporary message, NEVER append a new one.
          if (isMe) {
            const tmpIndex = msgs.findIndex((m) => 
                m._id === msg.tmpId || 
                (String(m._id).startsWith('tmp-') && m.text === msg.text) // Fallback match by text
            );

            if (tmpIndex !== -1) {
              // Found the temp message -> Update it with real data from server
              msgs[tmpIndex] = {
                ...msgs[tmpIndex],
                _id: msg._id,
                timestamp: msg.timestamp,
                delivered: true,
                read: msg.read || false,
              };
            } 
            // If we didn't find the temp message, we assume it's already there or loaded via fetch.
            // We strictly DO NOT push() here if isMe is true.
          } 
          else {
            // It is from THEM. Always append.
            msgs.push({
              _id: msg._id || `rcv-${Date.now()}`,
              text: msg.text,
              timestamp: msg.timestamp,
              sender: "them",
              delivered: true,
              // If chat is open, we mark it read locally immediately
              read: true, 
            });
          }

          return { ...prev, messages: msgs };
        });

        // If I received it (not me) and chat is open, tell server I read it
        if (!isMe) {
          markMessagesRead(otherUserId);
        }
      }

      // --- Update Sidebar ---
      setChatList((prevList) => {
        const copy = [...prevList];
        const idx = copy.findIndex((c) => String(c.userId) === otherUserId);
        
        let chatEntry;

        if (idx > -1) {
          chatEntry = { ...copy[idx] };
          copy.splice(idx, 1); // Remove from current position
        } else {
          chatEntry = {
            userId: otherUserId,
            name: msg.senderName || "Unknown",
            avatar: msg.senderAvatar || "",
            unreadCount: 0,
            isOnline: false,
          };
        }

        // Update preview
        chatEntry.lastMessage = msg.text;
        chatEntry.timestamp = msg.timestamp;

        // Unread Count Logic
        if (isMe) {
          chatEntry.unreadCount = 0; 
        } else if (isChatOpen) {
          chatEntry.unreadCount = 0; 
        } else {
          chatEntry.unreadCount = (chatEntry.unreadCount || 0) + 1; 
        }

        copy.unshift(chatEntry); // Move to top
        return copy;
      });
    };

    // --- B. FIX #2: Handle Read Receipts (Blue Ticks) ---
    const handleMessagesRead = ({ userId, receiverId }) => {
      // 'userId' here is likely the person who READ the messages (Them)
      // OR the socket might send 'receiverId' depending on your backend implementation.
      // We check if the person currently open is the one involved in the read event.

      // If the event implies "User X read your messages":
      const interactionPartnerId = String(userId); 

      if (activeChatIdRef.current === interactionPartnerId) {
        setSelectedChat((prev) => {
          if (!prev) return prev;
          
          // Force update all "me" messages to read: true
          const updatedMessages = prev.messages.map((msg) => {
            if (msg.sender === "me" && !msg.read) {
              return { ...msg, read: true };
            }
            return msg;
          });

          return { ...prev, messages: updatedMessages };
        });
      }
    };

    // --- C. Online Status Handlers ---
    const handleOnlineUsers = (users) => setOnlineUsers(new Set(users.map(String)));
    const handleUserOnline = (uid) => setOnlineUsers((prev) => new Set(prev).add(String(uid)));
    const handleUserOffline = (uid) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(String(uid));
        return newSet;
      });
    };

    // Bind Listeners
    socket.on("newMessage", handleNewMessage);
    socket.on("messagesRead", handleMessagesRead); // Ensure backend emits exactly "messagesRead"
    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);
    
    socket.emit("getOnlineUsers");

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
      disconnectSocket();
    };
  }, [accessToken, currentUser?.userId]);

  // 4. Handle Chat Selection
  const handleSidebarSelect = useCallback(async (chat) => {
    if (!currentUser?.userId) return;

    const targetId = String(chat.userId);
    activeChatIdRef.current = targetId; // Sync Ref

    // 1. Set Loading/Placeholder State
    setSelectedChat({
      userId: chat.userId,
      name: chat.name || "Unknown",
      avatar: chat.avatar,
      messages: [],
      isOnline: onlineUsers.has(targetId),
      about: ""
    });

    try {
      // 2. Fetch Messages
      const res = await svc.fetchMessages(chat.userId);
      if (res.data?.success) {
        const msgs = (res.data.messages || []).map((m) => ({
          _id: m._id,
          text: m.text,
          timestamp: m.timestamp,
          delivered: true,
          read: m.read || false,
          sender: String(m.sender) === String(currentUser.userId) ? "me" : "them",
        }));

        // 3. Fetch full profile (for updated avatar/about)
        let aboutInfo = "";
        let fullAvatar = chat.avatar;
        try {
            const userRes = await api.get(`/users/${chat.userId}`);
            if(userRes.data?.success?.user) {
                aboutInfo = userRes.data.user.about;
                fullAvatar = userRes.data.user.avatar || chat.avatar;
            }
        } catch(e) { console.warn("Profile fetch error", e); }

        // 4. Update State (ONLY if user hasn't switched chats while loading)
        if (activeChatIdRef.current === targetId) {
          setSelectedChat(prev => ({
             ...prev,
             avatar: fullAvatar,
             messages: msgs,
             about: aboutInfo
          }));
        }

        // 5. Mark Read locally & on Server
        await svc.markAsRead(chat.userId);
        markMessagesRead(chat.userId); // Socket event

        // 6. Clear Sidebar Unread Count
        setChatList(prev => prev.map(c => 
          String(c.userId) === targetId ? { ...c, unreadCount: 0 } : c
        ));
      }
    } catch (err) {
      console.error("Error opening chat:", err);
    }
  }, [currentUser?.userId, onlineUsers]);

  // 5. Handle Send Message
  const handleSendMessage = useCallback((text) => {
    if (!selectedChat || !text.trim()) return;

    const tmpId = `tmp-${Date.now()}`;
    const now = new Date().toISOString();

    // Optimistic Update (Window)
    setSelectedChat((prev) => ({
      ...prev,
      messages: [
        ...(prev.messages || []),
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

    // Optimistic Update (Sidebar)
    setChatList((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex(c => String(c.userId) === String(selectedChat.userId));
      if (idx > -1) {
        const item = { ...copy[idx], lastMessage: text, timestamp: now };
        copy.splice(idx, 1);
        copy.unshift(item);
      }
      return copy;
    });

    // Send to Server
    // IMPORTANT: Pass tmpId so server can echo it back for replacement
    svc.sendMessageWS(selectedChat.userId, text, tmpId);

  }, [selectedChat]);

  // Memoized Chat List
  const enhancedChatList = useMemo(() => {
    return chatList.map((c) => ({
      ...c,
      isOnline: onlineUsers.has(String(c.userId)),
      avatarUrl: getAvatarUrl(c.avatar),
    }));
  }, [chatList, onlineUsers]);

  if (!currentUser) return <div className="flex h-screen items-center justify-center">Loading...</div>;

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