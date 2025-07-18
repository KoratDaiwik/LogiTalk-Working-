import React, { createContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../utils/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState(() => 
    localStorage.getItem("accessToken")
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshQueue, setRefreshQueue] = useState([]);

  // Decode token and set user
  const decodeAndSetUser = useCallback((token) => {
    try {
      const decoded = jwtDecode(token);
      const { exp, userId, email } = decoded;
      
      if (Date.now() >= exp * 1000) {
        return false;
      }
      
      setCurrentUser({ userId, email });
      return true;
    } catch (error) {
      console.error("Token decode error:", error);
      return false;
    }
  }, []);

  // Login function
  const login = useCallback(
    (token) => {
      localStorage.setItem("accessToken", token);
      setAccessToken(token);
      if (!decodeAndSetUser(token)) {
        logout();
      }
    },
    [decodeAndSetUser]
  );

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    setAccessToken(null);
    setCurrentUser(null);
    navigate("/login");
  }, [navigate]);

  // Check token validity on mount
  useEffect(() => {
    if (accessToken) {
      const isValid = decodeAndSetUser(accessToken);
      if (!isValid) {
        logout();
      }
    } else {
      setCurrentUser(null);
    }
  }, [accessToken, decodeAndSetUser, logout]);

  // Axios response interceptor
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (accessToken && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // If already refreshing, add to queue
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              refreshQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }
          
          setIsRefreshing(true);
          try {
            const response = await api.post("/users/token");
            const newToken = response.data.accessToken;
            
            if (newToken) {
              login(newToken);
              
              // Process queued requests
              refreshQueue.forEach(({ resolve }) => resolve(newToken));
              setRefreshQueue([]);
              
              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return api(originalRequest);
            } else {
              throw new Error("No access token in refresh response");
            }
          } catch (refreshError) {
            // Process queued requests with error
            refreshQueue.forEach(({ reject }) => reject(refreshError));
            setRefreshQueue([]);
            
            logout();
            return Promise.reject(refreshError);
          } finally {
            setIsRefreshing(false);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [accessToken, isRefreshing, refreshQueue, login, logout]);

  return (
    <AuthContext.Provider
      value={{ 
        accessToken, 
        currentUser, 
        login, 
        logout,
        isAuthenticated: !!currentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);