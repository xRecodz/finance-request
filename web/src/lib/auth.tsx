"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, getToken, setToken } from "./api";
import type { AuthUser, Portal } from "./types";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (nip: string, password: string, portal: Portal) => Promise<AuthUser>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api<{ user: AuthUser }>("/api/auth/me");
      setUser(res.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (nip: string, password: string, portal: Portal) => {
    const res = await api<{
      token: string;
      user: AuthUser;
      mustChangePassword: boolean;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ nip, password, portal }),
    });
    setToken(res.token);
    setUser({ ...res.user, mustChangePassword: res.mustChangePassword });
    return { ...res.user, mustChangePassword: res.mustChangePassword };
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      const res = await api<{ token: string; user: AuthUser }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setToken(res.token);
      setUser(res.user);
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, changePassword, logout, refresh }),
    [user, loading, login, changePassword, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
