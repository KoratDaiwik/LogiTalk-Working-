// ⚙️ api.js
import axios from "axios";

const api = axios.create({
  baseURL: "/api/users",
  withCredentials: true, // ← ensure cookies (refresh token) are sent
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // unified key “token”
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
