import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  nickname: string | null;
  role: string;
  needsPasswordSetup: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { fullName: string; email: string; nickname?: string; username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setUser(data);
  };

  const register = async (data: { fullName: string; email: string; nickname?: string; username: string; password: string }) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const userData = await res.json();
    setUser(userData);
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshSession: checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
