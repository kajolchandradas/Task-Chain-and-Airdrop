import React, { useCallback, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  RefreshControl, Platform, Alert, Modal, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAd } from "@/context/AdContext";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import * as Haptics from "expo-haptics";

function authHeader(userId: number) {
  return { "x-user-id": String(userId) };
}

function apiGet(userId: number, path: string) {
  return fetch(`${getApiUrl()}${path}`, { headers: authHeader(userId) }).then(r => r.json());
}

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const { showAd } = useAd();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const uid = user?.id ?? 0;

  const { data: checkinData } = useQuery({
    queryKey: ["checkin", uid],
    queryFn: () => apiGet(uid, "api/checkin/status"),
    enabled: !!uid,
  });

  const { data: adData } = useQuery({
    queryKey: ["ads", uid],
    queryFn: () => apiGet(uid, "api/ads/status"),
    enabled: !!uid,
  });

  const { data: eventsData } = useQuery({
    queryKey: ["events", uid],
    queryFn: () => apiGet(uid, "api/events"),
    enabled: !!uid,
  });

  const { data: notifData, refetch: refetchNotifs } = useQuery({
    queryKey: ["notifications", uid],
    queryFn: () => apiGet(uid, "api/notifications"),
    enabled: !!uid,
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount ?? 0;
  const notifications = notifData?.notifications ?? [];

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${getApiUrl()}api/checkin`, {
        method: "POST",
        headers: authHeader(uid),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Check-in", `You earned ${data.reward} TK!`);
      qc.invalidateQueries({ queryKey: ["checkin", uid] });
      refreshUser();
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const claimEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await fetch(`${getApiUrl()}api/events/${eventId}/claim`, {
        method: "POST",
        headers: authHeader(uid),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Bonus Claimed!", `You earned ${data.reward} TK!`);
      qc.invalidateQueries({ queryKey: ["events", uid] });
      refreshUser();
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    await qc.invalidateQueries();
    setRefreshing(false);
  }, []);

  function openNotifications() {
    setShowNotifications(true);
    if (unreadCount > 0 && notifications.length > 0) {
      fetch(`${getApiUrl()}api/notifications/read`, {
        method: "POST",
        headers: { ...authHeader(uid), "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: notifications.map((n: { id: number }) => n.id) }),
      }).then(() => refetchNotifs());
    }
  }

  const balance = parseFloat(user?.balance ?? "0").toFixed(2);
  const totalEarned = parseFloat(user?.total_earned ?? "0").toFixed(2);

  const menuItems = [
    { icon: "play-circle" as const, label: "Watch Ads", color: "#E2136E", onPress: () => router.push("/(tabs)/earn") },
    { icon: "game-controller" as const, label: "Games", color: "#8b5cf6", onPress: () => router.push("/(tabs)/games") },
    { icon: "people" as const, label: "Refer & Earn", color: "#0ea5e9", onPress: () => router.push("/(tabs)/profile") },
    { icon: "wallet" as const, label: "Withdraw", color: Colors.success, onPress: () => router.push("/(tabs)/wallet") },
    { icon: "trophy" as const, label: "Leaderboard", color: Colors.warning, onPress: () => router.push("/leaderboard") },
    { icon: "headset" as const, label: "Support", color: "#6b7280", onPress: () => router.push("/support") },
  ];

  const notifTypeColor = (type: string) => {
    if (type === "warning") return Colors.warning;
    if (type === "error") return Colors.danger;
    if (type === "success") return Colors.success;
    return Colors.primary;
  };

  const notifTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type === "warning") return "warning";
    if (type === "error") return "close-circle";
    if (type === "success") return "checkmark-circle";
    return "notifications";
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentInsetAdjustmentBehavior="automatic"
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}
        >
          <View style={styles.topBar}>
            <View>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.username} numberOfLines={1}>{user?.full_name ?? "User"}</Text>
            </View>
            <Pressable style={styles.notifBtn} onPress={openNotifications}>
              <Ionicons name="notifications" size={22} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.balanceCard}>
            <View>
              <Text style={styles.balLabel}>Total Balance</Text>
              <Text style={styles.balAmt}>{balance} TK</Text>
              <Text style={styles.balSub}>Total Earned: {totalEarned} TK</Text>
            </View>
            <Pressable style={styles.withdrawBtn} onPress={() => router.push("/(tabs)/wallet")}>
              <Ionicons name="arrow-up" size={16} color={Colors.primary} />
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.statsRow}>
            <StatCard icon="eye" label="Ads Today" value={`${adData?.watched ?? 0}/${adData?.maxAds ?? 10}`} color="#E2136E" />
            <StatCard icon="people" label="Referrals" value={user?.referral_code ?? "-"} color="#0ea5e9" small />
          </View>

          {user?.isAdmin && (
            <Pressable style={styles.adminBanner} onPress={() => router.push("/admin/panel")}>
              <Ionicons name="shield-checkmark" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.adminBannerTitle}>Admin Panel</Text>
                <Text style={styles.adminBannerSub}>Tap to manage your app</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Pressable>
          )}

          <Pressable
            style={[styles.checkinBtn, checkinData?.checkedIn && styles.checkinBtnDone]}
            onPress={() => !checkinData?.checkedIn && showAd("checkin", () => checkinMutation.mutate())}
            disabled={checkinData?.checkedIn || checkinMutation.isPending}
          >
            <Ionicons
              name={checkinData?.checkedIn ? "checkmark-circle" : "calendar"}
              size={24}
              color={checkinData?.checkedIn ? Colors.success : Colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.checkinTitle}>
                {checkinData?.checkedIn ? "Checked In Today" : "Daily Check-In"}
              </Text>
              <Text style={styles.checkinSub}>
                {checkinData?.checkedIn ? "Come back tomorrow!" : `Earn ${checkinData?.reward ?? 0.5} TK`}
              </Text>
            </View>
            {!checkinData?.checkedIn && (
              <View style={styles.checkinBadge}>
                <Text style={styles.checkinBadgeText}>+{checkinData?.reward ?? 0.5} TK</Text>
              </View>
            )}
          </Pressable>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [styles.menuCard, pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }]}
                onPress={item.onPress}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + "15" }]}>
                  <Ionicons name={item.icon} size={26} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          {eventsData?.events && eventsData.events.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Special Bonuses</Text>
              {eventsData.events.map((event: { id: number; title: string; type: string; reward: string }) => {
                const isClaimed = eventsData.claimed?.includes(event.id);
                return (
                  <Pressable
                    key={event.id}
                    style={[styles.eventCard, isClaimed && { opacity: 0.6 }]}
                    onPress={() => !isClaimed && showAd("event", () => claimEventMutation.mutate(event.id))}
                    disabled={isClaimed}
                  >
                    <LinearGradient colors={["#E2136E", "#9b0a48"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.eventGradient}>
                      <View style={styles.eventLeft}>
                        <Ionicons name="gift" size={28} color="#fff" />
                        <View>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          <Text style={styles.eventSub}>Special Bonus</Text>
                        </View>
                      </View>
                      <View style={styles.eventRight}>
                        {isClaimed ? (
                          <View style={styles.claimedBadge}>
                            <Ionicons name="checkmark" size={14} color={Colors.success} />
                            <Text style={styles.claimedText}>Claimed</Text>
                          </View>
                        ) : (
                          <View style={styles.claimBtn}>
                            <Text style={styles.claimBtnText}>+{event.reward} TK</Text>
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal visible={showNotifications} animationType="slide" transparent onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <Pressable onPress={() => setShowNotifications(false)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotif}>
                  <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyNotifText}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map((notif: { id: number; title: string; message: string; type: string; created_at: string }) => (
                  <View key={notif.id} style={[styles.notifCard, { borderLeftColor: notifTypeColor(notif.type) }]}>
                    <View style={[styles.notifIcon, { backgroundColor: notifTypeColor(notif.type) + "20" }]}>
                      <Ionicons name={notifTypeIcon(notif.type)} size={20} color={notifTypeColor(notif.type)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifTitle}>{notif.title}</Text>
                      <Text style={styles.notifMsg}>{notif.message}</Text>
                      <Text style={styles.notifDate}>{new Date(notif.created_at).toLocaleString()}</Text>
                    </View>
                  </View>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ icon, label, value, color, small }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <View style={[styles.statCard, { flex: 1 }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, small && { fontSize: 14 }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 70, paddingHorizontal: 20 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  username: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff", maxWidth: 240 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  notifBadge: {
    position: "absolute", top: -2, right: -2,
    backgroundColor: Colors.danger, borderRadius: 8, minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  notifBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#fff" },
  balanceCard: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  balLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  balAmt: { fontFamily: "Inter_700Bold", fontSize: 32, color: "#fff" },
  balSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  withdrawBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50,
  },
  withdrawBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary },
  content: { marginTop: -40, paddingHorizontal: 16 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "flex-start",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, marginBottom: 2 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  adminBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.primary, borderRadius: 14, padding: 14, marginBottom: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  adminBannerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  adminBannerSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.8)" },
  checkinBtn: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20,
    borderWidth: 1.5, borderColor: Colors.primary + "40",
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  checkinBtnDone: { borderColor: Colors.success + "40" },
  checkinTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  checkinSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  checkinBadge: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50 },
  checkinBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text, marginBottom: 14 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  menuCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center",
    width: "30%", flexGrow: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  menuIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  menuLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.text, textAlign: "center" },
  eventCard: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  eventGradient: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  eventLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  eventTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  eventSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)" },
  eventRight: {},
  claimedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 50,
  },
  claimedText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.success },
  claimBtn: { backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50 },
  claimBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.primary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 20, maxHeight: "80%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  modalClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  emptyNotif: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyNotifText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  notifCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#F8F8F8", borderRadius: 14, padding: 14, marginBottom: 10,
    borderLeftWidth: 4,
  },
  notifIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notifTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 4 },
  notifMsg: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  notifDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 6 },
});
