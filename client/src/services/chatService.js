// src/services/chatService.js
import api from "../utils/api";
import { getSocket } from "../utils/socket";

export const fetchChatList = () => api.get("/chats");
export const startChat = (userId) => api.post("/chats/start", { userId });
export const fetchMessages = (userId) => api.get(`/chats/${userId}`);
export const markAsRead = (userId) => api.post(`/chats/${userId}/read`);
export const sendMessageWS = (toUserId, text) =>
  getSocket().emit("sendMessage", { to: toUserId, text });
