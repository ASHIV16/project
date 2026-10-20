import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axiosInstance";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("gramin_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token, user: userData } = res.data.data;
    localStorage.setItem("gramin_token", token);
    localStorage.setItem("gramin_user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Token may already be invalid; proceed anyway
    } finally {
      localStorage.removeItem("gramin_token");
      localStorage.removeItem("gramin_user");
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export default AuthContext;
