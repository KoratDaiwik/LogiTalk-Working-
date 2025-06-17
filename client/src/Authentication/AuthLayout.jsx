// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../utils/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // Load token from localStorage if present
  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem("accessToken")
  );
  const [currentUser, setCurrentUser] = useState(null);

  // Decode token to get user info, or clear if invalid/expired
  const decodeAndSetUser = useCallback((token) => {
    try {
      const decoded = jwtDecode(token);
      const { exp, userId, email } = decoded;
      if (Date.now() >= exp * 1000) {
        // expired
        return false;
      }
      setCurrentUser({ userId, email });
      return true;
    } catch {
      return false;
    }
  }, []);

  // login: store token
  const login = useCallback(
    (token) => {
      localStorage.setItem("accessToken", token);
      setAccessToken(token);
      // decode and set user
      if (!decodeAndSetUser(token)) {
        // invalid token
        logout();
      }
    },
    [decodeAndSetUser]
  );

  // logout: clear token and user, redirect
  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    setAccessToken(null);
    setCurrentUser(null);
    navigate("/login");
  }, [navigate]);

  // On mount or when accessToken changes: decode user or logout if invalid
  useEffect(() => {
    if (accessToken) {
      const ok = decodeAndSetUser(accessToken);
      if (!ok) {
        logout();
      }
    } else {
      setCurrentUser(null);
    }
  }, [accessToken, decodeAndSetUser, logout]);

  // Axios interceptors: attach Authorization header & handle 401 refresh
  useEffect(() => {
    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error, token = null) => {
      failedQueue.forEach((prom) => {
        if (error) {
          prom.reject(error);
        } else {
          prom.resolve(token);
        }
      });
      failedQueue = [];
    };

    // Request interceptor: attach token
    const reqInterceptor = api.interceptors.request.use(
      (config) => {
        if (accessToken) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: on 401, try refresh once
    const resInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response &&
          error.response.status === 401 &&
          !originalRequest._retry
        ) {
          // mark retry
          originalRequest._retry = true;

          if (isRefreshing) {
            // queue the request until refresh finished
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                // after refresh, retry originalRequest
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          isRefreshing = true;
          try {
            // Call refresh endpoint: adjust path if needed
            const resp = await api.post("/token");
            if (resp.data && resp.data.accessToken) {
              const newToken = resp.data.accessToken;
              login(newToken);
              processQueue(null, newToken);
              // retry original
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              isRefreshing = false;
              return api(originalRequest);
            } else {
              // No token in response: treat as failure
              throw new Error("No accessToken in refresh response");
            }
          } catch (err) {
            processQueue(err, null);
            isRefreshing = false;
            logout();
            return Promise.reject(err);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, [accessToken, login, logout]);

  return (
    <AuthContext.Provider value={{ accessToken, currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
