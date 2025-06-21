import api from "../utils/api";
import { sendOrQueue } from "../utils/socket";

export const fetchChatList = () => api.get("/chats");
export const startChat       = (userId) => api.post("/chats/start", { userId });
export const fetchMessages   = (userId) => api.get(`/chats/${userId}`);
export const markAsRead      = (userId) => api.post(`/chats/${userId}/read`);

/**
 * Sends over WebSocket (queued until first connect, then emits immediately).
 */
export const sendMessageWS = (toUserId, text) => {
  sendOrQueue({ to: toUserId, text });
};
