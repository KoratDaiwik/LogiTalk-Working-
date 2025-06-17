import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // Load token from localStorage if present
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState(null);

  // Decode & validate
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

  // login(token): store + set state + decode
  const login = useCallback(
    (newToken) => {
      localStorage.setItem("token", newToken);
      setToken(newToken);
      if (!decodeAndSetUser(newToken)) {
        logout();
      }
    },
    [decodeAndSetUser]
  );

  // logout
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setCurrentUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  // keep user in sync
  useEffect(() => {
    if (token) {
      if (!decodeAndSetUser(token)) {
        logout();
      }
    } else {
      setCurrentUser(null);
    }
  }, [token, decodeAndSetUser, logout]);

  // Refresh‐on‐401 logic
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
        if (token) {
          cfg.headers.Authorization = `Bearer ${token}`;
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
            const r = await api.post("/token"); // withCredentials:true will send refresh cookie
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
  }, [token, login, logout]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
