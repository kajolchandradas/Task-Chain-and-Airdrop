import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator, Switch, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { useAd } from "@/context/AdContext";

type AdminTab = "dashboard" | "notifications" | "withdrawals" | "users" | "settings" | "ads" | "tasks" | "support" | "security";

function adminHeaders(token: string) {
  return { "x-admin-token": token, "Content-Type": "application/json" };
}

const AD_NETWORKS = [
  { id: "monetag", label: "Monetag", color: "#FF6B35" },
  { id: "adsense", label: "Google AdSense", color: "#4285F4" },
  { id: "unity", label: "Unity Ads", color: "#222" },
  { id: "ironsource", label: "IronSource", color: "#0075FF" },
  { id: "applovin", label: "AppLovin", color: "#FF6900" },
  { id: "facebook", label: "Meta Audience", color: "#1877F2" },
];

const NOTIF_TYPES = [
  { id: "info", label: "Info", color: Colors.primary },
  { id: "warning", label: "Warning", color: Colors.warning },
  { id: "success", label: "Success", color: Colors.success },
  { id: "error", label: "Alert", color: Colors.danger },
];

const TASK_CATEGORIES = [
  { id: "youtube", label: "YouTube", icon: "logo-youtube" as const, color: "#FF0000" },
  { id: "facebook", label: "Facebook", icon: "logo-facebook" as const, color: "#1877F2" },
  { id: "tiktok", label: "TikTok", icon: "musical-notes" as const, color: "#111827" },
  { id: "instagram", label: "Instagram", icon: "logo-instagram" as const, color: "#E1306C" },
  { id: "telegram", label: "Telegram", icon: "paper-plane" as const, color: "#229ED9" },
  { id: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp" as const, color: "#25D366" },
  { id: "twitter", label: "X / Twitter", icon: "logo-twitter" as const, color: "#1DA1F2" },
  { id: "other", label: "Other", icon: "globe-outline" as const, color: Colors.primary },
];

export default function AdminPanelScreen() {
  const insets = useSafeAreaInsets();
  const { refreshSettings: refreshAdSettings } = useAd();
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState({ totalUsers: 0, pendingPay: 0, activeTasks: 0, paidTotal: 0, pendingSupport: 0 });
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<Record<string, string>[]>([]);
  const [withdrawals, setWithdrawals] = useState<Record<string, string>[]>([]);
  const [users, setUsers] = useState<Record<string, string>[]>([]);
  const [selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null);
  const [notifications, setNotifications] = useState<Record<string, string>[]>([]);
  const [supportMessages, setSupportMessages] = useState<Record<string, string>[]>([]);
  const [passwordResets, setPasswordResets] = useState<Record<string, string>[]>([]);
  const [supportQueue, setSupportQueue] = useState({ waiting: 0, active: 0 });
  const [wdTab, setWdTab] = useState("pending");
  const [newTask, setNewTask] = useState({ title: "", url: "", category: "youtube", reward: "" });
  const [newNotif, setNewNotif] = useState({ title: "", message: "", type: "info" });
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [supportReply, setSupportReply] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<Record<string, string> | null>(null);

  useEffect(() => { loadToken(); }, []);

  async function loadToken() {
    const t = await AsyncStorage.getItem("admin_token");
    if (!t) { router.replace("/admin"); return; }
    setToken(t);
    await loadAll(t);
    setLoading(false);
  }

  async function loadAll(t: string) {
    try {
      const [statsRes, settingsRes, tasksRes] = await Promise.all([
        fetch(`${getApiUrl()}api/admin/stats`, { headers: adminHeaders(t) }),
        fetch(`${getApiUrl()}api/admin/settings`, { headers: adminHeaders(t) }),
        fetch(`${getApiUrl()}api/admin/tasks`, { headers: adminHeaders(t) }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (tasksRes.ok) { const d = await tasksRes.json(); setTasks(d.tasks); }
    } catch {}
  }

  async function loadWithdrawals(t: string, status: string) {
    const res = await fetch(`${getApiUrl()}api/admin/withdrawals?status=${status}`, { headers: adminHeaders(t) });
    if (res.ok) { const d = await res.json(); setWithdrawals(d.withdrawals); }
  }

  async function loadUsers(t: string) {
    const res = await fetch(`${getApiUrl()}api/admin/users`, { headers: adminHeaders(t) });
    if (res.ok) { const d = await res.json(); setUsers(d.users); }
  }

  async function loadUserDetails(t: string, id: string) {
    const res = await fetch(`${getApiUrl()}api/admin/users/${id}`, { headers: adminHeaders(t) });
    if (res.ok) { const d = await res.json(); setSelectedUser(d); }
  }

  async function loadNotifications(t: string) {
    const res = await fetch(`${getApiUrl()}api/admin/notifications`, { headers: adminHeaders(t) });
    if (res.ok) { const d = await res.json(); setNotifications(d.notifications); }
  }

  async function loadSupport(t: string) {
    const res = await fetch(`${getApiUrl()}api/admin/support`, { headers: adminHeaders(t) });
    if (res.ok) { const d = await res.json(); setSupportMessages(d.messages); setSupportQueue(d.queue ?? { waiting: 0, active: 0 }); }
  }

  async function loadPasswordResets(t: string) {
    const res = await fetch(`${getApiUrl()}api/admin/password-resets`, { headers: adminHeaders(t) });
    if (res.ok) { const d = await res.json(); setPasswordResets(d.resets); }
  }

  useEffect(() => {
    if (!token) return;
    if (tab === "withdrawals") loadWithdrawals(token, wdTab);
    if (tab === "users") loadUsers(token);
    if (tab === "notifications") loadNotifications(token);
    if (tab === "support") { loadSupport(token); loadPasswordResets(token); }
  }, [tab, wdTab, token]);

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch(`${getApiUrl()}api/admin/settings`, {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        await refreshAdSettings();
        Alert.alert("Saved!", "Settings updated and applied live");
      }
    } catch {
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function saveSetting(key: string, value: string) {
    try {
      await fetch(`${getApiUrl()}api/admin/settings`, {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({ [key]: value }),
      });
      setSettings(prev => ({ ...prev, [key]: value }));
      await refreshAdSettings();
    } catch {}
  }

  function setBool(key: string, val: boolean) {
    setSettings(prev => ({ ...prev, [key]: val ? "true" : "false" }));
  }

  function setVal(key: string, val: string) {
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  async function addTask() {
    if (!newTask.title || !newTask.reward) return Alert.alert("Error", "Fill in all fields");
    try {
      const res = await fetch(`${getApiUrl()}api/admin/tasks`, {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify(newTask),
      });
      if (res.ok) {
        Alert.alert("Success", "Task added");
        setNewTask({ title: "", url: "", category: "youtube", reward: "" });
        loadAll(token);
      }
    } catch {}
  }

  async function saveTaskEdit() {
    if (!editingTask?.title.trim() || !editingTask.reward.trim()) {
      return Alert.alert("Error", "Task title and reward are required");
    }
    const res = await fetch(`${getApiUrl()}api/admin/tasks/${editingTask.id}`, {
      method: "PATCH",
      headers: adminHeaders(token),
      body: JSON.stringify({
        title: editingTask.title.trim(),
        url: editingTask.url.trim(),
        category: editingTask.category,
        reward: editingTask.reward,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return Alert.alert("Error", data.error ?? "Could not update task");
    }
    setEditingTask(null);
    loadAll(token);
  }

  async function deleteTask(id: string) {
    Alert.alert("Delete", "Delete this task?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await fetch(`${getApiUrl()}api/admin/tasks/${id}`, { method: "DELETE", headers: adminHeaders(token) });
        loadAll(token);
      }},
    ]);
  }

  async function approveWithdrawal(id: string) {
    await fetch(`${getApiUrl()}api/admin/withdrawals/${id}/approve`, { method: "POST", headers: adminHeaders(token) });
    loadWithdrawals(token, wdTab);
    loadAll(token);
    Alert.alert("Approved", "Withdrawal approved");
  }

  async function rejectWithdrawal(id: string) {
    Alert.alert("Reject & Refund", "Reject and refund user?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reject", style: "destructive", onPress: async () => {
        await fetch(`${getApiUrl()}api/admin/withdrawals/${id}/reject`, { method: "POST", headers: adminHeaders(token) });
        loadWithdrawals(token, wdTab);
      }},
    ]);
  }

  async function banUser(id: string, banned: boolean) {
    await fetch(`${getApiUrl()}api/admin/users/${id}/ban`, {
      method: "POST",
      headers: adminHeaders(token),
      body: JSON.stringify({ banned }),
    });
    loadUsers(token);
  }

  async function sendNotification() {
    if (!newNotif.title || !newNotif.message) return Alert.alert("Error", "Title and message required");
    try {
      const res = await fetch(`${getApiUrl()}api/admin/notifications`, {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify(newNotif),
      });
      if (res.ok) {
        Alert.alert("Sent!", "Notification sent to all users");
        setNewNotif({ title: "", message: "", type: "info" });
        loadNotifications(token);
        loadAll(token);
      }
    } catch {}
  }

  async function deleteNotification(id: string) {
    Alert.alert("Delete", "Delete this notification?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await fetch(`${getApiUrl()}api/admin/notifications/${id}`, { method: "DELETE", headers: adminHeaders(token) });
        loadNotifications(token);
      }},
    ]);
  }

  async function sendSupportReply(msgId: string) {
    const reply = supportReply[msgId];
    if (!reply?.trim()) return;
    await fetch(`${getApiUrl()}api/admin/support/${msgId}/reply`, {
      method: "POST",
      headers: adminHeaders(token),
      body: JSON.stringify({ reply }),
    });
    setSupportReply(prev => ({ ...prev, [msgId]: "" }));
    loadSupport(token);
  }

  async function claimSupport(msgId: string) {
    const res = await fetch(`${getApiUrl()}api/admin/support/${msgId}/claim`, {
      method: "POST",
      headers: adminHeaders(token),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return Alert.alert("Queue update", data.error ?? "This request is already assigned.");
    }
    loadSupport(token);
  }

  async function approvePasswordReset(id: string) {
    const res = await fetch(`${getApiUrl()}api/admin/password-resets/${id}/approve`, {
      method: "POST",
      headers: adminHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return Alert.alert("Reset request", data.error ?? "Could not approve request.");
    Alert.alert("Code Generated", `Give this code to the user:\n\n${data.reset.token}\n\nIt is valid for 24 hours and works once.`);
    loadPasswordResets(token);
  }

  async function changePin() {
    if (!currentPin || !newPin || !confirmPin) return Alert.alert("Error", "Fill in all PIN fields");
    if (newPin.length < 4) return Alert.alert("Error", "New PIN must be at least 4 digits");
    if (!/^\d+$/.test(newPin)) return Alert.alert("Error", "PIN must contain digits only");
    if (newPin !== confirmPin) return Alert.alert("Error", "PINs do not match");
    setSaving(true);
    try {
      const res = await fetch(`${getApiUrl()}api/admin/change-pin`, {
        method: "POST",
        headers: adminHeaders(token),
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      Alert.alert("PIN Changed", "Admin PIN updated successfully.");
      setCurrentPin(""); setNewPin(""); setConfirmPin("");
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await AsyncStorage.removeItem("admin_token");
    router.replace("/admin");
  }

  const s = settings;
  const bool = (key: string) => s[key] === "true";

  const WITHDRAW_METHOD_DEFS = [
    { id: "binance", label: "Binance Pay UID", color: "#F0B90B" },
    { id: "bkash", label: "bKash", color: "#E2136E" },
    { id: "nagad", label: "Nagad", color: "#F7941E" },
    { id: "recharge", label: "Mobile Recharge", color: "#10b981" },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  // User detail view
  if (selectedUser) {
    const u = selectedUser.user as Record<string, unknown>;
    const games = selectedUser.games as Record<string, unknown>[];
    const transactions = selectedUser.transactions as Record<string, unknown>[];
    const withdrawals2 = selectedUser.withdrawals as Record<string, unknown>[];
    const referrals = selectedUser.referrals as Record<string, unknown>[];
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => setSelectedUser(null)} style={styles.logoutBtn}>
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>User Profile</Text>
              <Text style={styles.headerSub}>{u?.full_name as string}</Text>
            </View>
          </View>
          <View style={[styles.statusDot, { backgroundColor: (u?.is_banned as boolean) ? Colors.danger : Colors.success }]} />
        </View>
        <ScrollView style={styles.content}>
          <DarkCard title="User Info" accent={Colors.primary}>
            <InfoRow label="Name" value={u?.full_name as string} />
            <InfoRow label="Email" value={u?.email as string} />
            <InfoRow label="Balance" value={`${parseFloat(String(u?.balance ?? "0")).toFixed(2)} TK`} />
            <InfoRow label="Total Earned" value={`${parseFloat(String(u?.total_earned ?? "0")).toFixed(2)} TK`} />
            <InfoRow label="Referral Code" value={u?.referral_code as string} />
            <InfoRow label="Joined" value={new Date(u?.created_at as string).toLocaleDateString()} />
            <InfoRow label="Last Login" value={u?.last_login ? new Date(u.last_login as string).toLocaleDateString() : "Never"} />
            <InfoRow label="Total Referrals" value={String(referrals?.length ?? 0)} />
            <InfoRow label="Total Games" value={String(games?.length ?? 0)} />
            <InfoRow label="Total Withdrawals" value={String(withdrawals2?.length ?? 0)} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Pressable
                style={[styles.banBtn2, (u?.is_banned as boolean) && styles.unbanBtn2]}
                onPress={() => { banUser(String(u?.id), !(u?.is_banned as boolean)); setSelectedUser(null); }}
              >
                <Text style={styles.banBtnText2}>{(u?.is_banned as boolean) ? "Unban User" : "Ban User"}</Text>
              </Pressable>
            </View>
          </DarkCard>

          <Text style={styles.sectionTitle}>Recent Games ({games?.length ?? 0})</Text>
          {(games ?? []).slice(0, 10).map((g: Record<string, unknown>, i: number) => (
            <View key={i} style={styles.listCard}>
              <Ionicons name="game-controller" size={18} color="#8b5cf6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{g.game_type as string}</Text>
                <Text style={styles.listSub}>{new Date(g.played_at as string).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.listTitle, { color: Colors.success }]}>+{parseFloat(String(g.reward)).toFixed(2)} TK</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Recent Transactions ({transactions?.length ?? 0})</Text>
          {(transactions ?? []).slice(0, 10).map((tx: Record<string, unknown>, i: number) => (
            <View key={i} style={styles.listCard}>
              <Ionicons name={parseFloat(String(tx.amount)) > 0 ? "arrow-down" : "arrow-up"} size={18} color={parseFloat(String(tx.amount)) > 0 ? Colors.success : Colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle} numberOfLines={1}>{tx.description as string}</Text>
                <Text style={styles.listSub}>{new Date(tx.created_at as string).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.listTitle, { color: parseFloat(String(tx.amount)) > 0 ? Colors.success : Colors.danger }]}>
                {parseFloat(String(tx.amount)) > 0 ? "+" : ""}{parseFloat(String(tx.amount)).toFixed(2)} TK
              </Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Withdrawals</Text>
          {(withdrawals2 ?? []).map((w: Record<string, unknown>, i: number) => (
            <View key={i} style={styles.listCard}>
              <View style={[styles.listIconWrap, { backgroundColor: w.status === "approved" ? Colors.success + "15" : w.status === "rejected" ? Colors.danger + "15" : Colors.warning + "15" }]}>
                <Ionicons name={w.status === "approved" ? "checkmark-circle" : w.status === "rejected" ? "close-circle" : "time"} size={18} color={w.status === "approved" ? Colors.success : w.status === "rejected" ? Colors.danger : Colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{(w.withdraw_method || w.sim_provider) as string} — {(w.account_number || w.phone_number) as string}</Text>
                <Text style={styles.listSub}>{new Date(w.created_at as string).toLocaleDateString()} · {w.status as string}</Text>
              </View>
              <Text style={styles.listTitle}>{parseFloat(String(w.amount)).toFixed(2)} TK</Text>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  const TABS: { id: AdminTab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { id: "dashboard", icon: "home", label: "Dashboard" },
    { id: "notifications", icon: "notifications", label: "Notifications" },
    { id: "withdrawals", icon: "wallet", label: "Payments" },
    { id: "users", icon: "people", label: "Users" },
    { id: "settings", icon: "settings", label: "Settings" },
    { id: "ads", icon: "megaphone", label: "Ads" },
    { id: "tasks", icon: "list", label: "Tasks" },
    { id: "support", icon: "headset", label: "Support" },
    { id: "security", icon: "shield", label: "Security" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Ionicons name="flash" size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSub}>Earn Wallet Control</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {saving && <ActivityIndicator color={Colors.primary} size="small" style={{ marginRight: 8 }} />}
          <Pressable onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="power" size={20} color={Colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {TABS.map(t => (
          <Pressable
            key={t.id}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Ionicons name={t.icon} size={14} color={tab === t.id ? "#fff" : Colors.dark.textMuted} />
            <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>{t.label}</Text>
            {t.id === "withdrawals" && stats.pendingPay > 0 && (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{stats.pendingPay}</Text></View>
            )}
            {t.id === "notifications" && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>+</Text></View>}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {tab === "dashboard" && (
          <View>
            <View style={styles.statsGrid}>
              {[
                { label: "Total Users", val: String(stats.totalUsers), icon: "people", color: "#3b82f6" },
                { label: "Pending Pay", val: String(stats.pendingPay), icon: "time", color: Colors.warning },
                { label: "Active Tasks", val: String(stats.activeTasks), icon: "list", color: Colors.success },
                { label: "Total Paid", val: `${Number(stats.paidTotal ?? 0).toFixed(0)} TK`, icon: "checkmark-circle", color: Colors.primary },
              ].map(st => (
                <View key={st.label} style={styles.statCard}>
                  <Ionicons name={st.icon as keyof typeof Ionicons.glyphMap} size={22} color={st.color} />
                  <Text style={styles.statVal}>{st.val}</Text>
                  <Text style={styles.statLabel}>{st.label}</Text>
                </View>
              ))}
            </View>

            <DarkCard title="Master Ad Switch" accent={Colors.primary}>
              <View style={styles.masterSwitch}>
                <View style={[styles.masterDot, { backgroundColor: bool("ads_enabled") ? Colors.success : Colors.danger }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.masterLabel}>All Ads {bool("ads_enabled") ? "ENABLED" : "DISABLED"}</Text>
                  <Text style={styles.masterSub}>Toggle all monetization globally</Text>
                </View>
                <Switch value={bool("ads_enabled")} onValueChange={v => { setBool("ads_enabled", v); saveSetting("ads_enabled", v ? "true" : "false"); }} trackColor={{ true: Colors.success, false: Colors.danger }} thumbColor="#fff" />
              </View>
            </DarkCard>

            <DarkCard title="Quick Config" accent={Colors.success}>
              <InlineField label="Ad Reward (TK)" value={s.ad_reward ?? "0.5"} onChange={v => setVal("ad_reward", v)} keyboardType="numeric" />
              <InlineField label="Max Ads/Day" value={s.max_ads_per_day ?? "10"} onChange={v => setVal("max_ads_per_day", v)} keyboardType="numeric" />
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>
          </View>
        )}

        {tab === "notifications" && (
          <View>
            <DarkCard title="Send Notification to All Users" accent={Colors.primary}>
              <DarkInput label="Title" value={newNotif.title} onChange={v => setNewNotif(p => ({ ...p, title: v }))} placeholder="e.g. আজকে পেমেন্ট বন্ধ আছে" />
              <DarkInput label="Message" value={newNotif.message} onChange={v => setNewNotif(p => ({ ...p, message: v }))} placeholder="বিস্তারিত লিখুন..." />
              <View style={styles.darkInputGroup}>
                <Text style={styles.darkInputLabel}>Type</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {NOTIF_TYPES.map(nt => (
                    <Pressable
                      key={nt.id}
                      style={[styles.notifTypeBtn, newNotif.type === nt.id && { backgroundColor: nt.color }]}
                      onPress={() => setNewNotif(p => ({ ...p, type: nt.id }))}
                    >
                      <Text style={[styles.notifTypeBtnText, newNotif.type === nt.id && { color: "#fff" }]}>{nt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <SaveBtn label="Send Notification" onPress={sendNotification} saving={false} />
            </DarkCard>

            <Text style={styles.sectionTitle}>Sent Notifications ({notifications.length})</Text>
            {notifications.length === 0 && <EmptyState icon="notifications-off-outline" text="No notifications sent yet" />}
            {notifications.map(n => {
              const typeColor = NOTIF_TYPES.find(t => t.id === n.type)?.color ?? Colors.primary;
              return (
                <View key={n.id} style={[styles.listCard, { borderLeftWidth: 3, borderLeftColor: typeColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{n.title}</Text>
                    <Text style={styles.listSub}>{n.message}</Text>
                    <Text style={styles.listDate}>{new Date(n.created_at).toLocaleString()}</Text>
                  </View>
                  <Pressable style={styles.deleteBtn} onPress={() => deleteNotification(n.id)}>
                    <Ionicons name="trash" size={16} color={Colors.danger} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {tab === "withdrawals" && (
          <View>
            <View style={styles.wdTabs}>
              {["pending", "approved", "rejected"].map(wt => (
                <Pressable key={wt} style={[styles.wdTab, wdTab === wt && styles.wdTabActive]} onPress={() => setWdTab(wt)}>
                  <Text style={[styles.wdTabText, wdTab === wt && styles.wdTabTextActive]}>{wt.charAt(0).toUpperCase() + wt.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            {withdrawals.length === 0 ? (
              <EmptyState icon="wallet-outline" text={`No ${wdTab} withdrawals`} />
            ) : (
              withdrawals.map(w => {
                const method = w.withdraw_method || w.sim_provider;
                const account = w.account_number || w.phone_number;
                return (
                  <View key={w.id} style={styles.listCard}>
                    <View style={[styles.listIconWrap, {
                      backgroundColor: w.status === "approved" ? Colors.success + "15" :
                        w.status === "rejected" ? Colors.danger + "15" : Colors.warning + "15"
                    }]}>
                      <Ionicons
                        name={w.status === "approved" ? "checkmark-circle" : w.status === "rejected" ? "close-circle" : "time"}
                        size={20}
                        color={w.status === "approved" ? Colors.success : w.status === "rejected" ? Colors.danger : Colors.warning}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>{w.full_name}</Text>
                      <Text style={styles.listSub}>{method?.toUpperCase()} · {account}</Text>
                      <Text style={[styles.listSub, { color: Colors.primary }]}>
                        {parseFloat(w.amount).toFixed(2)} TK → {parseFloat(w.net_amount).toFixed(4)} {method === "binance" ? "USD" : "TK"}
                      </Text>
                      <Text style={styles.listDate}>{new Date(w.created_at).toLocaleDateString()}</Text>
                    </View>
                    {w.status === "pending" && (
                      <View style={styles.actionBtns}>
                        <Pressable style={styles.approveBtn} onPress={() => approveWithdrawal(w.id)}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </Pressable>
                        <Pressable style={styles.rejectBtn} onPress={() => rejectWithdrawal(w.id)}>
                          <Ionicons name="close" size={16} color="#fff" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {tab === "users" && (
          <View>
            {/* Reset inactive balances */}
            <Pressable
              style={[styles.saveBtn, { marginBottom: 12, backgroundColor: Colors.danger }]}
              onPress={() => Alert.alert(
                "Reset Inactive Balances",
                "7 দিনের বেশি inactive users এর balance 0 করবো?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset", style: "destructive", onPress: async () => {
                      const res = await fetch(`${getApiUrl()}api/admin/reset-inactive-balances`, {
                        method: "POST", headers: adminHeaders(token),
                      });
                      const d = await res.json();
                      Alert.alert("Done", `${d.resetCount} users এর balance reset হয়েছে`);
                      loadUsers(token);
                    }
                  }
                ]
              )}
            >
              <Text style={styles.saveBtnText}>🔄 Reset 7-Day Inactive Balances</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>All Users ({users.length})</Text>
            {users.map(u => (
              <Pressable key={u.id} style={styles.listCard} onPress={() => loadUserDetails(token, u.id)}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{(u.full_name ?? "U").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{u.full_name}</Text>
                  {/* Gmail */}
                  <Text style={[styles.listSub, { color: "#60a5fa" }]}>📧 {u.email}</Text>
                  {/* Password visible */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Ionicons name="lock-closed" size={10} color={Colors.warning} />
                    <Text style={[styles.listSub, { color: Colors.warning, fontFamily: "Inter_600SemiBold" }]}>
                      {u.password ?? "—"}
                    </Text>
                  </View>
                  <Text style={[styles.listSub, { color: Colors.success, marginTop: 2 }]}>
                    {parseFloat(u.balance || "0").toFixed(2)} TK | Earned: {parseFloat(u.total_earned || "0").toFixed(2)} TK
                  </Text>
                </View>
                <View style={styles.userActions}>
                  <Text style={[styles.userStatus, { color: !!u.is_banned ? Colors.danger : Colors.success }]}>
                    {!!u.is_banned ? "Banned" : "Active"}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                    <Pressable
                      style={[styles.banBtn, !!u.is_banned && styles.unbanBtn]}
                      onPress={(e) => { e.stopPropagation(); banUser(u.id, !u.is_banned); }}
                    >
                      <Text style={styles.banBtnText}>{!!u.is_banned ? "Unban" : "Ban"}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.banBtn, { backgroundColor: "#6b7280" }]}
                      onPress={async (e) => {
                        e.stopPropagation();
                        const res = await fetch(`${getApiUrl()}api/admin/generate-reset-code`, {
                          method: "POST", headers: adminHeaders(token),
                          body: JSON.stringify({ email: u.email }),
                        });
                        const d = await res.json();
                        Alert.alert("Reset Code", `User: ${u.email}\nCode: ${d.code}\n\nএই code user কে দিন password reset করতে।`);
                      }}
                    >
                      <Text style={styles.banBtnText}>Code</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))}
            {users.length === 0 && <EmptyState icon="people-outline" text="No users yet" />}
          </View>
        )}

        {tab === "settings" && (
          <View>
            <DarkCard title="Reward Configuration" accent={Colors.success}>
              <InlineField label="Ad Reward (TK)" value={s.ad_reward ?? "0.5"} onChange={v => setVal("ad_reward", v)} keyboardType="numeric" hint="Per ad watched" />
              <InlineField label="Max Ads Per Day" value={s.max_ads_per_day ?? "10"} onChange={v => setVal("max_ads_per_day", v)} keyboardType="numeric" />
              <InlineField label="Check-in Reward (TK)" value={s.checkin_reward ?? "0.2"} onChange={v => setVal("checkin_reward", v)} keyboardType="numeric" />
              <InlineField label="Free Plays Per Day" value={s.free_plays_per_day ?? "1"} onChange={v => setVal("free_plays_per_day", v)} keyboardType="numeric" />
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>

            <DarkCard title="Withdrawal Methods" accent="#10b981">
              <InlineField label="Charge Rate (%)" value={s.withdraw_charge ?? "10"} onChange={v => setVal("withdraw_charge", v)} keyboardType="numeric" hint="Applied to all methods" />
              <InlineField label="Binance USD Rate (1 USD = ? TK)" value={s.binance_usd_rate ?? "110"} onChange={v => setVal("binance_usd_rate", v)} keyboardType="numeric" hint="Rate for Binance Pay USD conversion" />
              {WITHDRAW_METHOD_DEFS.map(m => (
                <View key={m.id}>
                  <Text style={[styles.darkInputLabel, { color: m.color, marginTop: 10, fontFamily: "Inter_600SemiBold" }]}>
                    {m.label}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={styles.darkInputLabel}>Enabled</Text>
                    <Switch
                      value={s[`withdraw_${m.id}_enabled`] !== "false"}
                      onValueChange={v => setVal(`withdraw_${m.id}_enabled`, v ? "true" : "false")}
                      trackColor={{ true: m.color, false: Colors.dark.border }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.darkInputLabel}>Min TK</Text>
                      <TextInput style={styles.darkInput} value={s[`withdraw_${m.id}_min`] ?? "50"} onChangeText={v => setVal(`withdraw_${m.id}_min`, v)} keyboardType="numeric" placeholderTextColor={Colors.dark.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.darkInputLabel}>Max TK</Text>
                      <TextInput style={styles.darkInput} value={s[`withdraw_${m.id}_max`] ?? "5000"} onChangeText={v => setVal(`withdraw_${m.id}_max`, v)} keyboardType="numeric" placeholderTextColor={Colors.dark.textMuted} />
                    </View>
                  </View>
                </View>
              ))}
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>

            <DarkCard title="🎡 Spin Wheel Prize Config" accent="#E2136E">
              <GamePrizesEditor label="Spin Wheel Prizes" value={s.spin_wheel_prizes ?? ""} onChange={v => setVal("spin_wheel_prizes", v)} />
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>

            <DarkCard title="⚽ Spin & Split Prize Config" accent="#f59e0b">
              <GamePrizesEditor label="Spin & Split Prizes" value={s.spin_split_prizes ?? ""} onChange={v => setVal("spin_split_prizes", v)} />
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>

            <DarkCard title="🎴 Scratch Card Prize Config" accent="#8b5cf6">
              <GamePrizesEditor label="Scratch Card Prizes" value={s.scratch_prizes ?? ""} onChange={v => setVal("scratch_prizes", v)} />
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>

            <DarkCard title="🎰 Lucky Spin 3X Config" accent="#10b981">
              <InlineField label="Match % (3 same chance)" value={s.lucky_spin_match_pct ?? "30"} onChange={v => setVal("lucky_spin_match_pct", v)} keyboardType="numeric" hint="Probability of getting 3 matching symbols" />
              <InlineField label="Match Reward (TK)" value={s.lucky_spin_match_reward ?? "3"} onChange={v => setVal("lucky_spin_match_reward", v)} keyboardType="numeric" hint="Reward when 3 symbols match (big win)" />
              <InlineField label="No-Match Min (TK)" value={s.lucky_spin_nomatch_min ?? "0.1"} onChange={v => setVal("lucky_spin_nomatch_min", v)} keyboardType="numeric" hint="Min reward when symbols differ (small win)" />
              <InlineField label="No-Match Max (TK)" value={s.lucky_spin_nomatch_max ?? "0.5"} onChange={v => setVal("lucky_spin_nomatch_max", v)} keyboardType="numeric" hint="Max reward when symbols differ" />
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>

            <DarkCard title="Referral Commissions" accent="#8b5cf6">
              <InlineField label="Level 1 Bonus (%)" value={s.ref_bonus_l1 ?? "10"} onChange={v => setVal("ref_bonus_l1", v)} keyboardType="numeric" />
              <InlineField label="Level 2 Bonus (%)" value={s.ref_bonus_l2 ?? "5"} onChange={v => setVal("ref_bonus_l2", v)} keyboardType="numeric" />
              <InlineField label="Level 3 Bonus (%)" value={s.ref_bonus_l3 ?? "2.5"} onChange={v => setVal("ref_bonus_l3", v)} keyboardType="numeric" />
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>

            <DarkCard title="Telegram Support Link" accent="#2196F3">
              <DarkInput label="Telegram Link" value={s.telegram_support_link ?? ""} onChange={v => setVal("telegram_support_link", v)} placeholder="https://t.me/your_username" />
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>
          </View>
        )}

        {tab === "ads" && (
          <View>
            <DarkCard title="Ad Network" accent="#FF6B35">
              <View style={styles.networkGrid}>
                {AD_NETWORKS.map(net => (
                  <Pressable key={net.id} style={[styles.networkCard, s.ad_network === net.id && { borderColor: net.color, borderWidth: 2, backgroundColor: net.color + "15" }]} onPress={() => setVal("ad_network", net.id)}>
                    <View style={[styles.networkDot, { backgroundColor: net.color }]} />
                    <Text style={[styles.networkLabel, s.ad_network === net.id && { color: net.color }]}>{net.label}</Text>
                    {s.ad_network === net.id && <Ionicons name="checkmark-circle" size={16} color={net.color} />}
                  </Pressable>
                ))}
              </View>
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>

            <DarkCard title="Ad Zone IDs" accent="#3b82f6">
              <DarkInput label="Default Zone ID" value={s.ad_zone_id ?? ""} onChange={v => setVal("ad_zone_id", v)} placeholder="e.g. 7654321" />
              <DarkInput label="Interstitial Zone ID" value={s.ad_zone_interstitial ?? ""} onChange={v => setVal("ad_zone_interstitial", v)} placeholder="e.g. 7654322" />
              <DarkInput label="Rewarded Video Zone ID" value={s.ad_zone_rewarded ?? ""} onChange={v => setVal("ad_zone_rewarded", v)} placeholder="e.g. 7654323" />
              <DarkInput label="Game Ad Zone ID" value={s.ad_zone_game ?? ""} onChange={v => setVal("ad_zone_game", v)} placeholder="e.g. 7654324" />
              <DarkInput label="Claim Ad Zone ID" value={s.ad_zone_claim ?? ""} onChange={v => setVal("ad_zone_claim", v)} placeholder="e.g. 7654325" />
              <SaveBtn onPress={saveSettings} saving={saving} />
            </DarkCard>

            <DarkCard title="Ad Triggers" accent="#f59e0b">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.dark.border }}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>On Any Click</Text>
                  <Text style={styles.toggleSub}>Permanently disabled — taps never open ads</Text>
                </View>
                <Text style={{ color: Colors.success, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>OFF</Text>
              </View>
              <Toggle label="On Task Claim" sub="Ad before task reward" value={bool("ads_on_claim")} onChange={v => saveSetting("ads_on_claim", v ? "true" : "false")} color={Colors.primary} />
              <Toggle label="On Game Open" sub="Ad when opening game" value={bool("ads_on_game")} onChange={v => saveSetting("ads_on_game", v ? "true" : "false")} color="#8b5cf6" />
              <Toggle label="On Watch Ads Earn" sub="Rewarded video" value={bool("ads_on_watch")} onChange={v => saveSetting("ads_on_watch", v ? "true" : "false")} color={Colors.success} />
              <Toggle label="On Check-in" sub="Ad on daily check-in" value={bool("ads_on_checkin")} onChange={v => saveSetting("ads_on_checkin", v ? "true" : "false")} color="#0ea5e9" />
              <Toggle label="On Event Claim" sub="Ad on event bonus" value={bool("ads_on_event")} onChange={v => saveSetting("ads_on_event", v ? "true" : "false")} color={Colors.danger} />
            </DarkCard>
          </View>
        )}

        {tab === "tasks" && (
          <View>
            <DarkCard title="Add New Task" accent={Colors.success}>
              <DarkInput label="Task Title" value={newTask.title} onChange={v => setNewTask(p => ({ ...p, title: v }))} placeholder="e.g. Subscribe to our YouTube" />
              <DarkInput label="Task URL (optional)" value={newTask.url} onChange={v => setNewTask(p => ({ ...p, url: v }))} placeholder="https://..." />
              <Text style={styles.darkInputLabel}>Platform / Category</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {TASK_CATEGORIES.map(category => (
                  <Pressable
                    key={category.id}
                    onPress={() => setNewTask(p => ({ ...p, category: category.id }))}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 4,
                      borderRadius: 16, paddingHorizontal: 9, paddingVertical: 6,
                      backgroundColor: newTask.category === category.id ? category.color + "25" : Colors.dark.bg,
                      borderWidth: 1, borderColor: newTask.category === category.id ? category.color : Colors.dark.border,
                    }}
                  >
                    <Ionicons name={category.icon} size={13} color={newTask.category === category.id ? category.color : Colors.dark.textMuted} />
                    <Text style={{ color: newTask.category === category.id ? category.color : Colors.dark.textMuted, fontSize: 11, fontFamily: "Inter_500Medium" }}>{category.label}</Text>
                  </Pressable>
                ))}
              </View>
              <DarkInput label="Reward (TK)" value={newTask.reward} onChange={v => setNewTask(p => ({ ...p, reward: v }))} keyboardType="numeric" placeholder="e.g. 1.5" />
              <SaveBtn label="Add Task" onPress={addTask} saving={false} />
            </DarkCard>

            <Text style={styles.sectionTitle}>Tasks ({tasks.length})</Text>
            {tasks.map(task => (
              <View key={task.id} style={styles.listCard}>
                <View style={[styles.listIconWrap, { backgroundColor: Colors.success + "15" }]}>
                  <Ionicons name={(TASK_CATEGORIES.find(c => c.id === task.category)?.icon ?? "globe-outline") as keyof typeof Ionicons.glyphMap} size={20} color={TASK_CATEGORIES.find(c => c.id === task.category)?.color ?? Colors.primary} />
                </View>
                {editingTask?.id === String(task.id) ? (
                  <View style={{ flex: 1, gap: 7 }}>
                    <TextInput
                      style={styles.darkInput}
                      value={editingTask.title}
                      onChangeText={v => setEditingTask(p => p ? ({ ...p, title: v }) : p)}
                      placeholder="Task title"
                      placeholderTextColor={Colors.dark.textMuted}
                    />
                    <TextInput
                      style={styles.darkInput}
                      value={editingTask.url}
                      onChangeText={v => setEditingTask(p => p ? ({ ...p, url: v }) : p)}
                      placeholder="Task URL"
                      placeholderTextColor={Colors.dark.textMuted}
                    />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                      {TASK_CATEGORIES.map(category => (
                        <Pressable
                          key={category.id}
                          onPress={() => setEditingTask(p => p ? ({ ...p, category: category.id }) : p)}
                          style={{
                            borderRadius: 12, paddingHorizontal: 7, paddingVertical: 4,
                            backgroundColor: editingTask.category === category.id ? category.color + "25" : Colors.dark.bg,
                            borderWidth: 1, borderColor: editingTask.category === category.id ? category.color : Colors.dark.border,
                          }}
                        >
                          <Text style={{ color: editingTask.category === category.id ? category.color : Colors.dark.textMuted, fontSize: 10 }}>{category.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      style={styles.darkInput}
                      value={editingTask.reward}
                      onChangeText={v => setEditingTask(p => p ? ({ ...p, reward: v }) : p)}
                      placeholder="Reward"
                      placeholderTextColor={Colors.dark.textMuted}
                      keyboardType="numeric"
                    />
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <Pressable style={[styles.approveBtn, styles.approveBtnWide]} onPress={saveTaskEdit}>
                        <Text style={styles.approveBtnText}>Save</Text>
                      </Pressable>
                      <Pressable style={[styles.banBtn, { backgroundColor: Colors.dark.border }]} onPress={() => setEditingTask(null)}>
                        <Text style={styles.banBtnText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>{task.title}</Text>
                      <Text style={styles.listSub}>{task.category} • {task.reward} TK • {task.view_count ?? 0} viewed • {task.completion_count ?? 0} completed</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <View style={{ flexDirection: "row", gap: 5 }}>
                        <Pressable
                          style={[styles.banBtn, { backgroundColor: String(task.is_active) === "false" ? Colors.success : Colors.warning }]}
                          onPress={async () => {
                            await fetch(`${getApiUrl()}api/admin/tasks/${task.id}`, {
                              method: "PATCH", headers: adminHeaders(token),
                              body: JSON.stringify({ isActive: String(task.is_active) === "false" }),
                            });
                            loadAll(token);
                          }}
                        >
                          <Text style={styles.banBtnText}>{String(task.is_active) === "false" ? "Activate" : "Pause"}</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.banBtn, { backgroundColor: Colors.primary }]}
                          onPress={() => setEditingTask({
                            id: String(task.id),
                            title: task.title ?? "",
                            url: task.url ?? "",
                            category: task.category ?? "other",
                            reward: String(task.reward ?? ""),
                          })}
                        >
                          <Text style={styles.banBtnText}>Edit</Text>
                        </Pressable>
                      </View>
                      <Pressable style={styles.deleteBtn} onPress={() => deleteTask(task.id)}>
                        <Ionicons name="trash" size={16} color={Colors.danger} />
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            ))}
            {tasks.length === 0 && <EmptyState icon="list-outline" text="No tasks yet" />}
          </View>
        )}

        {tab === "support" && (
          <View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <View style={[styles.statPill, { backgroundColor: Colors.warning + "20" }]}>
                <Text style={[styles.statPillText, { color: Colors.warning }]}>Waiting: {supportQueue.waiting}</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: Colors.primary + "20" }]}>
                <Text style={[styles.statPillText, { color: Colors.primary }]}>Active: {supportQueue.active}</Text>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Support Queue ({supportMessages.length})</Text>
            {supportMessages.length === 0 && <EmptyState icon="headset-outline" text="No support messages" />}
            {supportMessages.map(msg => (
              <View key={msg.id} style={[styles.listCard, { flexDirection: "column", alignItems: "stretch" }]}>
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{(msg.full_name ?? "U").charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{msg.full_name}</Text>
                    <Text style={styles.listSub}>{msg.email}</Text>
                  </View>
                   <Text style={[styles.listDate, { color: msg.status === "waiting" ? Colors.warning : msg.status === "active" ? Colors.primary : Colors.dark.textMuted }]}>
                     {msg.status === "waiting" ? "WAITING" : msg.status === "active" ? "ACTIVE" : msg.status === "resolved" ? "CLOSED" : "AI ANSWERED"}
                   </Text>
                </View>
                <View style={{ backgroundColor: Colors.dark.bg, borderRadius: 8, padding: 10, marginBottom: 6 }}>
                  <Text style={[styles.listSub, { color: Colors.dark.text }]}>❓ {msg.message}</Text>
                </View>
                {msg.reply && (
                  <View style={{ backgroundColor: Colors.primary + "20", borderRadius: 8, padding: 10, marginBottom: 6 }}>
                    <Text style={[styles.listSub, { color: Colors.dark.text }]}>{msg.is_ai === "true" ? "🤖" : "👤"} {msg.reply}</Text>
                  </View>
                )}
                 {(msg.status === "waiting" || msg.status === "active") && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                     {msg.status === "waiting" && (
                       <Pressable style={[styles.approveBtn, styles.approveBtnWide, { backgroundColor: Colors.warning }]} onPress={() => claimSupport(msg.id)}>
                         <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Take</Text>
                       </Pressable>
                     )}
                    <TextInput
                      style={[styles.darkInput, { flex: 1 }]}
                       placeholder={msg.status === "waiting" ? "Take request, then reply..." : "Admin reply..."}
                      placeholderTextColor={Colors.dark.textMuted}
                      value={supportReply[msg.id] ?? ""}
                      onChangeText={v => setSupportReply(p => ({ ...p, [msg.id]: v }))}
                    />
                    <Pressable style={styles.approveBtn} onPress={() => sendSupportReply(msg.id)}>
                      <Ionicons name="send" size={16} color="#fff" />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}

             <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Password Reset Requests ({passwordResets.length})</Text>
             {passwordResets.length === 0 && <EmptyState icon="key-outline" text="No reset requests" />}
            {passwordResets.map(r => (
              <View key={r.id} style={styles.listCard}>
                <View style={[styles.listIconWrap, { backgroundColor: Colors.warning + "20" }]}>
                  <Ionicons name="key" size={18} color={Colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{r.email}</Text>
                   <Text style={[styles.listSub, { color: r.display_status === "pending" ? Colors.warning : r.display_status === "approved" ? Colors.success : Colors.dark.textMuted }]}>
                     Status: {r.display_status === "approved" ? "Approved / Code Sent" : r.display_status?.charAt(0).toUpperCase() + r.display_status?.slice(1)}
                   </Text>
                   {r.display_status === "approved" && (
                     <Text style={styles.listSub}>Code: <Text style={{ color: Colors.primary, fontFamily: "Inter_700Bold" }}>{r.token}</Text> (24h)</Text>
                   )}
                  <Text style={styles.listDate}>{new Date(r.created_at).toLocaleString()}</Text>
                </View>
                 {r.display_status === "pending" && (
                   <Pressable style={[styles.approveBtn, styles.approveBtnWide]} onPress={() => approvePasswordReset(r.id)}>
                     <Text style={styles.approveBtnText}>Approve & Code</Text>
                   </Pressable>
                 )}
              </View>
            ))}
          </View>
        )}

        {tab === "security" && (
          <View>
            <DarkCard title="Admin PIN" accent={Colors.primary}>
              <DarkInput label="Current PIN" value={currentPin} onChange={setCurrentPin} secureTextEntry keyboardType="numeric" placeholder="Current PIN" />
              <DarkInput label="New PIN (min 4 digits)" value={newPin} onChange={setNewPin} secureTextEntry keyboardType="numeric" placeholder="New PIN" />
              <DarkInput label="Confirm New PIN" value={confirmPin} onChange={setConfirmPin} secureTextEntry keyboardType="numeric" placeholder="Confirm PIN" />
              {newPin.length > 0 && confirmPin.length > 0 && (
                <View style={[styles.pinMatchRow, { backgroundColor: newPin === confirmPin ? Colors.success + "18" : Colors.danger + "18" }]}>
                  <Ionicons name={newPin === confirmPin ? "checkmark-circle" : "close-circle"} size={14} color={newPin === confirmPin ? Colors.success : Colors.danger} />
                  <Text style={[styles.pinMatchText, { color: newPin === confirmPin ? Colors.success : Colors.danger }]}>
                    {newPin === confirmPin ? "PINs match" : "PINs do not match"}
                  </Text>
                </View>
              )}
              <SaveBtn label="Change PIN" onPress={changePin} saving={saving} />
            </DarkCard>

            <DarkCard title="Security Controls" accent={Colors.danger}>
              <Toggle label="One Account Per Device" sub="Block multiple accounts per phone" value={bool("one_account_per_phone")} onChange={v => saveSetting("one_account_per_phone", v ? "true" : "false")} color={Colors.primary} />
              <Toggle label="Device ID Tracking" sub="Track device fingerprint" value={bool("device_id_tracking")} onChange={v => saveSetting("device_id_tracking", v ? "true" : "false")} color={Colors.success} />
            </DarkCard>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.dark.border }}>
      <Text style={[styles.darkInputLabel, { marginBottom: 0 }]}>{label}</Text>
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.text, maxWidth: "60%", textAlign: "right" }}>{value}</Text>
    </View>
  );
}

function Toggle({ label, sub, value, onChange, color }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIcon, { backgroundColor: color + "20" }]}>
        <View style={[styles.toggleDot, { backgroundColor: color }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color, false: Colors.dark.border }} thumbColor="#fff" />
    </View>
  );
}

function DarkCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <View style={[styles.darkCard, accent && { borderLeftWidth: 3, borderLeftColor: accent }]}>
      <Text style={styles.darkCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function GamePrizesEditor({ label: _label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  let parsed: {amount: number; pct: number}[] = [];
  try { parsed = JSON.parse(value || "[]"); } catch {}

  function updateSegment(i: number, field: "amount" | "pct", val: string) {
    const next = [...parsed];
    next[i] = { ...next[i], [field]: parseFloat(val) || 0 };
    onChange(JSON.stringify(next));
  }
  function addSegment() { onChange(JSON.stringify([...parsed, { amount: 0.1, pct: 10 }])); }
  function removeSegment(i: number) { onChange(JSON.stringify(parsed.filter((_, idx) => idx !== i))); }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", paddingHorizontal: 4, marginBottom: 4 }}>
        <Text style={[styles.pinNoteText, { flex: 1, textAlign: "center" }]}>Amount (TK)</Text>
        <Text style={[styles.pinNoteText, { flex: 1, textAlign: "center" }]}>Chance (%)</Text>
        <View style={{ width: 32 }} />
      </View>
      {parsed.map((seg, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput style={[styles.inlineInput, { flex: 1 }]} value={String(seg.amount)} onChangeText={v => updateSegment(i, "amount", v)} keyboardType="numeric" placeholderTextColor={Colors.dark.textMuted} />
          <TextInput style={[styles.inlineInput, { flex: 1 }]} value={String(seg.pct)} onChangeText={v => updateSegment(i, "pct", v)} keyboardType="numeric" placeholderTextColor={Colors.dark.textMuted} />
          <Pressable onPress={() => removeSegment(i)} style={{ padding: 6 }}>
            <Ionicons name="close-circle" size={20} color={Colors.danger} />
          </Pressable>
        </View>
      ))}
      <Pressable onPress={addSegment} style={styles.addSegmentBtn}>
        <Ionicons name="add-circle-outline" size={16} color={Colors.success} />
        <Text style={{ color: Colors.success, fontFamily: "Inter_500Medium", fontSize: 13 }}>Add Prize Segment</Text>
      </Pressable>
      <Text style={[styles.pinNoteText, { textAlign: "center" }]}>Total: {parsed.reduce((s, p) => s + (p.pct || 0), 0)}% (should = 100%)</Text>
    </View>
  );
}

function DarkInput({ label, value, onChange, keyboardType, secureTextEntry, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboardType?: "numeric" | "default"; secureTextEntry?: boolean; placeholder?: string;
}) {
  return (
    <View style={styles.darkInputGroup}>
      <Text style={styles.darkInputLabel}>{label}</Text>
      <TextInput style={styles.darkInput} value={value} onChangeText={onChange} keyboardType={keyboardType ?? "default"} secureTextEntry={secureTextEntry} placeholder={placeholder ?? ""} placeholderTextColor={Colors.dark.textMuted} />
    </View>
  );
}

function InlineField({ label, value, onChange, keyboardType, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboardType?: "numeric" | "default"; hint?: string;
}) {
  return (
    <View style={styles.inlineField}>
      <View style={{ flex: 1 }}>
        <Text style={styles.inlineLabel}>{label}</Text>
        {hint ? <Text style={styles.inlineHint}>{hint}</Text> : null}
      </View>
      <TextInput style={styles.inlineInput} value={value} onChangeText={onChange} keyboardType={keyboardType ?? "default"} placeholderTextColor={Colors.dark.textMuted} />
    </View>
  );
}

function SaveBtn({ label = "Save Settings", onPress, saving }: { label?: string; onPress: () => void; saving: boolean }) {
  return (
    <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onPress} disabled={saving}>
      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{label}</Text>}
    </Pressable>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 30, gap: 10 }}>
      <Ionicons name={icon} size={40} color={Colors.dark.textMuted} />
      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textMuted }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: Colors.dark.card,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary + "20", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.dark.text },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.dark.textMuted },
  headerRight: { flexDirection: "row", alignItems: "center" },
  logoutBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  tabScroll: { maxHeight: 52, backgroundColor: Colors.dark.card, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  tabScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: "center" },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.dark.bg },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.dark.textMuted },
  tabBtnTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  tabBadge: { backgroundColor: Colors.danger, borderRadius: 8, width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#fff" },
  content: { flex: 1, padding: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: Colors.dark.card, borderRadius: 14, padding: 14, alignItems: "flex-start", gap: 6, borderWidth: 1, borderColor: Colors.dark.border },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.dark.text },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.dark.textMuted },
  masterSwitch: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  masterDot: { width: 14, height: 14, borderRadius: 7 },
  masterLabel: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.dark.text },
  masterSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textMuted },
  darkCard: { backgroundColor: Colors.dark.card, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.border },
  darkCardTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.dark.text, marginBottom: 14 },
  networkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  networkCard: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.dark.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: Colors.dark.border, minWidth: "45%", flex: 1 },
  networkDot: { width: 8, height: 8, borderRadius: 4 },
  networkLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.dark.textMuted, flex: 1 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  toggleIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  toggleDot: { width: 10, height: 10, borderRadius: 5 },
  toggleLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.text },
  toggleSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.dark.textMuted, marginTop: 1 },
  darkInputGroup: { marginBottom: 12 },
  darkInputLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textMuted, marginBottom: 6 },
  darkInput: { backgroundColor: Colors.dark.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: Colors.dark.text, fontFamily: "Inter_400Regular", fontSize: 14, borderWidth: 1, borderColor: Colors.dark.border },
  inlineField: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  inlineLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.text },
  inlineHint: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.dark.textMuted },
  inlineInput: { backgroundColor: Colors.dark.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: Colors.dark.text, fontFamily: "Inter_600SemiBold", fontSize: 14, borderWidth: 1, borderColor: Colors.dark.border, minWidth: 80, textAlign: "right" },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 14 },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.dark.text, marginBottom: 12 },
  listCard: { backgroundColor: Colors.dark.card, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.dark.border },
  listIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.dark.text },
  listSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.dark.textMuted },
  listDate: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.dark.textMuted, marginTop: 2 },
  deleteBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.danger + "20", alignItems: "center", justifyContent: "center" },
  wdTabs: { flexDirection: "row", gap: 8, marginBottom: 16 },
  wdTab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8, backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.border },
  wdTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  wdTabText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.dark.textMuted },
  wdTabTextActive: { color: "#fff" },
  actionBtns: { flexDirection: "row", gap: 8 },
  approveBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.success, alignItems: "center", justifyContent: "center" },
  approveBtnWide: { width: "auto", minWidth: 72, paddingHorizontal: 10 },
  approveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  statPill: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  statPillText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  rejectBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.danger, alignItems: "center", justifyContent: "center" },
  userAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary + "20", alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.primary },
  userActions: { alignItems: "flex-end", gap: 4 },
  userStatus: { fontFamily: "Inter_500Medium", fontSize: 11 },
  banBtn: { backgroundColor: Colors.danger, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  unbanBtn: { backgroundColor: Colors.success },
  banBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  banBtn2: { flex: 1, backgroundColor: Colors.danger, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  unbanBtn2: { backgroundColor: Colors.success },
  banBtnText2: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  notifTypeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.dark.bg, borderWidth: 1, borderColor: Colors.dark.border },
  notifTypeBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.dark.textMuted },
  pinNoteText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.text, flex: 1, lineHeight: 18 },
  pinMatchRow: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4 },
  pinMatchText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  addSegmentBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.success + "15", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.success + "40", justifyContent: "center" },
});
