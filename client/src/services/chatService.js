import api from "../utils/api";
import { sendOrQueue } from "../utils/socket";

export const fetchChatList = () => api.get("/chats");
export const startChat = (userId) => api.post("/chats/start", { userId });
export const fetchMessages = (userId) => api.get(`/chats/${userId}`);
export const markAsRead = (userId) => api.post(`/chats/${userId}/read`);

/**
 * Enhanced WebSocket message sending with temporary ID tracking
 */
export const sendMessageWS = (toUserId, text, tmpId) => {
  sendOrQueue({ 
    to: toUserId, 
    text,
    tmpId // Pass temporary ID for optimistic UI
  });
};