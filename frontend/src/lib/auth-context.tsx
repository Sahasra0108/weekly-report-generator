"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isManager: boolean;
  isAdmin: boolean;
}

interface RegisterData {
  email: string;
  full_name: string;
  job_title?: string | null;
  password: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // The token lives in an HTTP-only cookie, so the only way to know whether
  // we're signed in is to ask the server.
  useEffect(() => {
    api
      .get<User>("/auth/me")
      .then(setUser)
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status !== 401) {
          console.error("Failed to restore session", err);
        }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: User }>("/auth/login", { email, password });
    setUser(res.user);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const created = await api.post<User>("/auth/register", data);
    setUser(created);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isManager: user?.role.name === "MANAGER" || user?.role.name === "ADMIN",
      isAdmin: user?.role.name === "ADMIN",
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}