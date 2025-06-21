// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import api from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // Load accessToken from localStorage if present
  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem("accessToken")
  );
  const [currentUser, setCurrentUser] = useState(null);

  // Decode & validate token
  const decodeAndSetUser = useCallback((t) => {
    try {
      const { exp, userId, email } = jwtDecode(t);
      if (Date.now() >= exp * 1000) return false;
      setCurrentUser({ userId, email });
      return true;
    } catch {
      return false;
    }
  }, []);

  // login(accessToken): store + set state + decode
  const login = useCallback(
    (newAccessToken) => {
      localStorage.setItem("accessToken", newAccessToken);
      setAccessToken(newAccessToken);
      if (!decodeAndSetUser(newAccessToken)) {
        logout();
      }
    },
    [decodeAndSetUser]
  );

  // logout
  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    setAccessToken(null);
    setCurrentUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  // Keep user in sync on load or token change
  useEffect(() => {
    if (accessToken) {
      if (!decodeAndSetUser(accessToken)) {
        logout();
      }
    } else {
      setCurrentUser(null);
    }
  }, [accessToken, decodeAndSetUser, logout]);

  // Refresh-on-401 logic
  useEffect(() => {
    let isRefreshing = false;
    let queue = [];

    const processQueue = (err, newToken = null) => {
      queue.forEach(({ resolve, reject }) => {
        if (err) reject(err);
        else resolve(newToken);
      });
      queue = [];
    };

    const reqI = api.interceptors.request.use(
      (cfg) => {
        if (accessToken) {
          cfg.headers.Authorization = `Bearer ${accessToken}`;
        }
        return cfg;
      },
      (err) => Promise.reject(err)
    );

    const resI = api.interceptors.response.use(
      (res) => res,
      async (err) => {
        const orig = err.config;
        if (err.response?.status === 401 && !orig._retry) {
          orig._retry = true;
          if (isRefreshing) {
            return new Promise((res, rej) =>
              queue.push({ resolve: res, reject: rej })
            ).then((t) => {
              orig.headers.Authorization = `Bearer ${t}`;
              return api(orig);
            });
          }
          isRefreshing = true;
          try {
            const r = await api.post("/users/token"); // ↔ correct endpoint
            if (r.data.accessToken) {
              login(r.data.accessToken);
              processQueue(null, r.data.accessToken);
              orig.headers.Authorization = `Bearer ${r.data.accessToken}`;
              return api(orig);
            }
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            logout();
            return Promise.reject(refreshErr);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(err);
      }
    );

    return () => {
      api.interceptors.request.eject(reqI);
      api.interceptors.response.eject(resI);
    };
  }, [accessToken, login, logout]);

  return (
    <AuthContext.Provider
      value={{ currentUser, accessToken, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
