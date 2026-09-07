import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, ActivityIndicator, Platform, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAd } from "@/context/AdContext";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";

function authHeader(userId: number) {
  return { "x-user-id": String(userId) };
}

function apiGet(userId: number, path: string) {
  return fetch(`${getApiUrl()}${path}`, { headers: authHeader(userId) }).then(r => r.json());
}

export default function EarnScreen() {
  const { user, refreshUser } = useAuth();
  const { showAd, settings: adSettings } = useAd();
  const insets = useSafeAreaInsets();
  const uid = user?.id ?? 0;
  const [adLoading, setAdLoading] = useState(false);
  const [taskClaiming, setTaskClaiming] = useState<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const nativeDriver = Platform.OS !== "web";
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: nativeDriver }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: nativeDriver }),
      ])
    ).start();
  }, []);

  const { data: adData, refetch: refetchAds } = useQuery({
    queryKey: ["ads", uid],
    queryFn: () => apiGet(uid, "api/ads/status"),
    enabled: !!uid,
  });

  const { data: tasksData, refetch: refetchTasks } = useQuery({
    queryKey: ["tasks", uid],
    queryFn: () => apiGet(uid, "api/tasks"),
    enabled: !!uid,
  });

  async function submitAdReward() {
    setAdLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}api/ads/watch`, {
        method: "POST",
        headers: authHeader(uid),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Reward Earned!", `You earned ${data.reward} TK!\nAds watched today: ${data.watched}/${data.maxAds}`);
      refetchAds();
      refreshUser();
    } catch (err: unknown) {
      const error = err as Error;
      Alert.alert("Error", error.message);
    } finally {
      setAdLoading(false);
    }
  }

  function watchAd() {
    if (adLoading) return;
    showAd("watch", () => {
      submitAdReward();
    });
  }

  async function claimTask(taskId: number, taskUrl?: string) {
    setTaskClaiming(taskId);
    if (taskUrl) {
      await Linking.openURL(taskUrl).catch(() => null);
      await new Promise(r => setTimeout(r, 2000));
    }

    showAd("claim", async () => {
      try {
        const res = await fetch(`${getApiUrl()}api/tasks/${taskId}/complete`, {
          method: "POST",
          headers: authHeader(uid),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Task Complete!", `You earned ${data.reward} TK!`);
        refetchTasks();
        refreshUser();
      } catch (err: unknown) {
        const error = err as Error;
        Alert.alert("Error", error.message);
      } finally {
        setTaskClaiming(null);
      }
    });
  }

  const watched = adData?.watched ?? 0;
  const maxAds = adData?.maxAds ?? 10;
  const remaining = adData?.remaining ?? maxAds;
  const adReward = adData?.reward ?? 0.5;
  const adsEnabled = adData?.adsEnabled ?? true;
  const progress = watched / maxAds;

  const categoryColors: Record<string, string> = {
    youtube: "#FF0000",
    telegram: "#229ED9",
    facebook: "#1877F2",
    tiktok: "#010101",
    instagram: "#E1306C",
    twitter: "#1DA1F2",
    linkedin: "#0A66C2",
    whatsapp: "#25D366",
    discord: "#5865F2",
    reddit: "#FF4500",
    pinterest: "#E60023",
    snapchat: "#FFFC00",
    default: Colors.primary,
  };

  const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    youtube: "logo-youtube",
    telegram: "paper-plane",
    facebook: "logo-facebook",
    tiktok: "musical-notes",
    instagram: "logo-instagram",
    twitter: "logo-twitter",
    linkedin: "logo-linkedin",
    whatsapp: "logo-whatsapp",
    discord: "chatbubbles",
    reddit: "logo-reddit",
    pinterest: "logo-pinterest",
    snapchat: "logo-snapchat",
    default: "checkmark-circle",
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}
        >
          <Text style={styles.headerTitle}>Watch & Earn</Text>
          <Text style={styles.headerSub}>Earn TK by watching ads & completing tasks</Text>
          {adSettings.ad_zone_id ? (
            <View style={styles.headerBadge}>
              <Ionicons name="flash" size={12} color="#FFD700" />
              <Text style={styles.headerBadgeText}>Monetized via {adSettings.ad_network.toUpperCase()}</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.adCard}>
            <View style={styles.adCardTop}>
              <View style={styles.adBadge}>
                <Ionicons name="play-circle" size={18} color={Colors.primary} />
                <Text style={styles.adBadgeText}>Rewarded Ad</Text>
              </View>
              <View style={styles.adRewardBadge}>
                <Text style={styles.adReward}>+{adReward} TK</Text>
                <Text style={styles.adRewardPer}>per ad</Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` as `${number}%` }]} />
            </View>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressText}>{watched}/{maxAds} ads watched today</Text>
              <Text style={styles.progressEarned}>{(watched * adReward).toFixed(2)} TK earned</Text>
            </View>

            {adsEnabled ? (
              <Pressable
                style={({ pressed }) => [
                  styles.watchBtn,
                  (adLoading || remaining === 0) && styles.watchBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={watchAd}
                disabled={adLoading || remaining === 0}
              >
                <Animated.View style={[styles.watchBtnInner, { transform: [{ scale: remaining > 0 && !adLoading ? pulseAnim : 1 }] }]}>
                  {adLoading ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.watchBtnText}>Processing...</Text>
                    </>
                  ) : remaining === 0 ? (
                    <>
                      <Ionicons name="time" size={22} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.watchBtnText}>Daily Limit Reached</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="play" size={22} color="#fff" />
                      <Text style={styles.watchBtnText}>Watch Ad & Earn {adReward} TK</Text>
                    </>
                  )}
                </Animated.View>
              </Pressable>
            ) : (
              <View style={styles.disabledCard}>
                <Ionicons name="ban" size={20} color={Colors.textMuted} />
                <Text style={styles.disabledText}>Ads temporarily disabled by admin</Text>
              </View>
            )}

            <View style={styles.adStats}>
              <View style={styles.adStatItem}>
                <Text style={styles.adStatVal}>{remaining}</Text>
                <Text style={styles.adStatLabel}>Remaining</Text>
              </View>
              <View style={styles.adStatDivider} />
              <View style={styles.adStatItem}>
                <Text style={styles.adStatVal}>{(watched * adReward).toFixed(2)} TK</Text>
                <Text style={styles.adStatLabel}>Earned Today</Text>
              </View>
              <View style={styles.adStatDivider} />
              <View style={styles.adStatItem}>
                <Text style={styles.adStatVal}>{(maxAds * adReward).toFixed(2)} TK</Text>
                <Text style={styles.adStatLabel}>Max Daily</Text>
              </View>
            </View>
          </View>

          {!!adSettings.ad_zone_id && (
            <View style={styles.monetizationBanner}>
              <Ionicons name="logo-google" size={16} color={Colors.primary} />
              <Text style={styles.monetizationText}>
                Ad Zone: {adSettings.ad_zone_id} · {adSettings.ad_network}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Daily Tasks</Text>

          {!tasksData?.tasks?.length ? (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No tasks available</Text>
            </View>
          ) : (
            tasksData.tasks.map((task: { id: number; title: string; url: string; category: string; reward: string }) => {
              const isDone = tasksData.completed?.includes(task.id);
              const cat = task.category ?? "default";
              const iconColor = categoryColors[cat] ?? categoryColors.default;
              const icon = categoryIcons[cat] ?? categoryIcons.default;
              return (
                <View key={task.id} style={[styles.taskCard, isDone && styles.taskCardDone]}>
                  <View style={[styles.taskIcon, { backgroundColor: iconColor + "15" }]}>
                    <Ionicons name={icon} size={22} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskReward}>Reward: {task.reward} TK</Text>
                  </View>
                  {isDone ? (
                    <View style={styles.taskDoneBadge}>
                      <Ionicons name="checkmark" size={16} color={Colors.success} />
                      <Text style={styles.taskDoneText}>Done</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.taskBtn, taskClaiming === task.id && { opacity: 0.7 }]}
                      onPress={() => claimTask(task.id, task.url)}
                      disabled={taskClaiming !== null}
                    >
                      {taskClaiming === task.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.taskBtnText}>Go</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 60, paddingHorizontal: 20 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#fff", marginBottom: 4 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 8 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    alignSelf: "flex-start",
  },
  headerBadgeText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#FFD700" },
  content: { marginTop: -30, paddingHorizontal: 16 },
  adCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  adCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  adBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  adBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary },
  adRewardBadge: { alignItems: "flex-end" },
  adReward: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.success },
  adRewardPer: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  progressBar: { height: 8, backgroundColor: "#F0F0F0", borderRadius: 4, marginBottom: 6, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: Colors.primary, borderRadius: 4 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  progressText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  progressEarned: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.success },
  watchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  watchBtnDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  watchBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  watchBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  disabledCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  disabledText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textMuted },
  adStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  adStatItem: { alignItems: "center" },
  adStatVal: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
  adStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  adStatDivider: { width: 1, backgroundColor: Colors.border },
  monetizationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  monetizationText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.primary, flex: 1 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text, marginBottom: 14 },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  taskCardDone: { opacity: 0.65 },
  taskIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  taskTitle: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text, marginBottom: 2 },
  taskReward: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  taskDoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.success + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 50,
  },
  taskDoneText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.success },
  taskBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    minWidth: 56,
    alignItems: "center",
  },
  taskBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  emptyState: { alignItems: "center", paddingVertical: 30, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
});
