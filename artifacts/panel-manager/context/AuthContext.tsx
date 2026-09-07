import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl } from "@/lib/query-client";

interface User {
  id: number;
  full_name: string;
  email: string;
  referral_code: string;
  referred_by?: string;
  balance: string;
  total_earned: string;
  is_active: boolean;
  is_banned: boolean;
  created_at: string;
  isAdmin?: boolean;
  profile_photo?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, deviceId?: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<void>;
  updateProfilePhoto: (photoUrl: string) => Promise<void>;
}

interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  referralCode?: string;
  deviceId?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const stored = await AsyncStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        await refreshUserWithId(parsed.id);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshUserWithId(userId: number) {
    try {
      const res = await fetch(`${getApiUrl()}api/auth/me`, {
        headers: { "x-user-id": String(userId) },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
      } else if (res.status === 404 || res.status === 401) {
        // The account may have been deleted or invalidated remotely.
        // Do not keep showing a stale locally cached session.
        setUser(null);
        await AsyncStorage.removeItem("user");
      }
    } catch {
      // ignore
    }
  }

  async function refreshUser() {
    if (!user) return;
    await refreshUserWithId(user.id);
  }

  async function login(email: string, password: string, deviceId?: string) {
    const res = await apiRequest("POST", "/api/auth/login", { email, password, deviceId });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data.user);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }

  async function register(data: RegisterData) {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Registration failed");
    setUser(result.user);
    await AsyncStorage.setItem("user", JSON.stringify(result.user));
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.removeItem("user");
  }

  async function updateProfile(fullName: string) {
    if (!user) return;
    const res = await fetch(`${getApiUrl()}api/auth/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-id": String(user.id) },
      body: JSON.stringify({ fullName }),
    });
    const data = await res.json();
    setUser(data.user);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }

  async function updateProfilePhoto(photoUrl: string) {
    if (!user) return;
    const res = await fetch(`${getApiUrl()}api/auth/profile-photo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-id": String(user.id) },
      body: JSON.stringify({ photoUrl }),
    });
    const data = await res.json();
    setUser(data.user);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }

  const value = useMemo(() => ({
    user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    updateProfilePhoto,
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
