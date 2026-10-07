import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl, getUserAuthHeaders, setSessionToken } from "@/lib/query-client";

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
  activate: (email: string, code: string) => Promise<void>;
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

  async function storeAuthSession(nextUser: User, token: string) {
    setSessionToken(token);
    setUser(nextUser);
    await AsyncStorage.multiSet([
      ["user", JSON.stringify(nextUser)],
      ["user_session_token", token],
    ]);
  }

  async function loadUser() {
    try {
      const [stored, token] = await AsyncStorage.multiGet(["user", "user_session_token"]).then((items) => [
        items[0][1],
        items[1][1],
      ]);
      if (stored && token) {
        setSessionToken(token);
        const parsed = JSON.parse(stored);
        setUser(parsed);
        await refreshUserWithToken(token);
      } else {
        setSessionToken(null);
        setUser(null);
        await AsyncStorage.multiRemove(["user", "user_session_token"]);
      }
    } catch {
      setSessionToken(null);
      setUser(null);
      await AsyncStorage.multiRemove(["user", "user_session_token"]);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshUserWithToken(token: string) {
    try {
      const res = await fetch(`${getApiUrl()}api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
      } else if (res.status === 404 || res.status === 401) {
        setSessionToken(null);
        setUser(null);
        await AsyncStorage.multiRemove(["user", "user_session_token"]);
      }
    } catch {
      // Keep the session cached when the API is temporarily unavailable.
    }
  }

  async function refreshUser() {
    if (!user || !getUserAuthHeaders().Authorization) return;
    const res = await fetch(`${getApiUrl()}api/auth/me`, { headers: getUserAuthHeaders() });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not refresh account");
    const data = await res.json();
    setUser(data.user);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }

  async function login(email: string, password: string, deviceId?: string) {
    const res = await apiRequest("POST", "/api/auth/login", { email, password, deviceId });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || "Login failed") as Error & { code?: string; email?: string };
      error.code = data.code;
      error.email = data.email;
      throw error;
    }
    if (!data.token) throw new Error("Login did not create a session. Please try again.");
    await storeAuthSession(data.user, data.token);
  }

  async function register(data: RegisterData) {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Registration failed");
    if (result.requiresActivation) {
      const error = new Error("Account activation is required") as Error & { code?: string };
      error.code = "ACCOUNT_NOT_ACTIVE";
      throw error;
    }
    if (!result.token) throw new Error("Registration did not create a session. Please try again.");
    await storeAuthSession(result.user, result.token);
  }

  async function activate(email: string, code: string) {
    const res = await apiRequest("POST", "/api/auth/activation/verify", { email, code });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Activation failed");
    if (!data.token) throw new Error("Activation did not create a session. Please try again.");
    await storeAuthSession(data.user, data.token);
  }

  async function logout() {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {
      // Clear local credentials even if the API is unavailable.
    }
    setSessionToken(null);
    setUser(null);
    await AsyncStorage.multiRemove(["user", "user_session_token"]);
  }

  async function updateProfile(fullName: string) {
    if (!user) return;
    const res = await fetch(`${getApiUrl()}api/auth/profile`, {
      method: "PUT",
      headers: { ...getUserAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ fullName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not update profile");
    setUser(data.user);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }

  async function updateProfilePhoto(photoUrl: string) {
    if (!user) return;
    const res = await fetch(`${getApiUrl()}api/auth/profile-photo`, {
      method: "PUT",
      headers: { ...getUserAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not update profile photo");
    setUser(data.user);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }

  const value = useMemo(() => ({
    user,
    isLoading,
    login,
    register,
    activate,
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
