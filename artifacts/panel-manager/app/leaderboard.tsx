import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

type LeaderTab = "earned" | "referral" | "games";

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const uid = user?.id ?? 0;
  const [leaderTab, setLeaderTab] = useState<LeaderTab>("earned");

  const { data: leaderData, isLoading } = useQuery({
    queryKey: ["leaderboard", leaderTab, uid],
    queryFn: () =>
      fetch(`${getApiUrl()}api/leaderboard/${leaderTab}`, { headers: { "x-user-id": String(uid) } }).then(r => r.json()),
    enabled: !!uid,
  });

  const medals = ["🥇", "🥈", "🥉"];
  const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  const getValue = (entry: Record<string, string | number>) => {
    if (leaderTab === "earned") return `${parseFloat(entry.total_earned as string).toFixed(2)} TK`;
    if (leaderTab === "referral") return `${entry.count} refs`;
    return `${parseFloat(entry.game_earned as string).toFixed(2)} TK`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient
        colors={[Colors.warning, "#b45309"]}
        style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSub}>Top earners in our community</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.tabs}>
          {(["earned", "referral", "games"] as LeaderTab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, leaderTab === tab && styles.tabActive]}
              onPress={() => setLeaderTab(tab)}
            >
              <Ionicons
                name={tab === "earned" ? "cash" : tab === "referral" ? "people" : "game-controller"}
                size={14}
                color={leaderTab === tab ? "#fff" : Colors.textMuted}
              />
              <Text style={[styles.tabText, leaderTab === tab && styles.tabTextActive]}>
                {tab === "earned" ? "Top Earner" : tab === "referral" ? "Top Referrer" : "Top Gamer"}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : !leaderData?.leaderboard?.length ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No data yet</Text>
            </View>
          ) : (
            <>
              {/* Top 3 podium */}
              {leaderData.leaderboard.length >= 3 && (
                <View style={styles.podium}>
                  {/* 2nd place */}
                  <View style={[styles.podiumItem, styles.podiumSecond]}>
                    <Text style={styles.podiumMedal}>🥈</Text>
                    <View style={[styles.podiumAvatar, { backgroundColor: "#C0C0C0" + "30" }]}>
                      <Text style={styles.podiumAvatarText}>{(leaderData.leaderboard[1].full_name as string).charAt(0)}</Text>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{(leaderData.leaderboard[1].full_name as string).split(" ")[0]}</Text>
                    <Text style={[styles.podiumVal, { color: "#C0C0C0" }]}>{getValue(leaderData.leaderboard[1])}</Text>
                    <View style={[styles.podiumBar, { height: 70, backgroundColor: "#C0C0C0" }]} />
                  </View>
                  {/* 1st place */}
                  <View style={[styles.podiumItem, styles.podiumFirst]}>
                    <Text style={styles.podiumMedal}>🥇</Text>
                    <View style={[styles.podiumAvatar, { backgroundColor: "#FFD700" + "30", width: 64, height: 64, borderRadius: 32 }]}>
                      <Text style={[styles.podiumAvatarText, { fontSize: 24 }]}>{(leaderData.leaderboard[0].full_name as string).charAt(0)}</Text>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{(leaderData.leaderboard[0].full_name as string).split(" ")[0]}</Text>
                    <Text style={[styles.podiumVal, { color: "#FFD700" }]}>{getValue(leaderData.leaderboard[0])}</Text>
                    <View style={[styles.podiumBar, { height: 90, backgroundColor: "#FFD700" }]} />
                  </View>
                  {/* 3rd place */}
                  <View style={[styles.podiumItem, styles.podiumThird]}>
                    <Text style={styles.podiumMedal}>🥉</Text>
                    <View style={[styles.podiumAvatar, { backgroundColor: "#CD7F32" + "30" }]}>
                      <Text style={styles.podiumAvatarText}>{(leaderData.leaderboard[2].full_name as string).charAt(0)}</Text>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{(leaderData.leaderboard[2].full_name as string).split(" ")[0]}</Text>
                    <Text style={[styles.podiumVal, { color: "#CD7F32" }]}>{getValue(leaderData.leaderboard[2])}</Text>
                    <View style={[styles.podiumBar, { height: 50, backgroundColor: "#CD7F32" }]} />
                  </View>
                </View>
              )}

              {/* Rest of list */}
              {leaderData.leaderboard.slice(3).map((entry: Record<string, string | number>, idx: number) => {
                const rank = idx + 4;
                const isMe = entry.id === user?.id;
                return (
                  <View key={idx} style={[styles.listCard, isMe && styles.listCardMe]}>
                    <View style={styles.rankNum}>
                      <Text style={styles.rankNumText}>{rank}</Text>
                    </View>
                    <View style={styles.listAvatar}>
                      <Text style={styles.listAvatarText}>{(entry.full_name as string).charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listName}>
                        {entry.full_name as string}{isMe ? " (You)" : ""}
                      </Text>
                      <Text style={styles.listEmail}>{(entry.email as string).split("@")[0]}</Text>
                    </View>
                    <Text style={styles.listVal}>{getValue(entry)}</Text>
                  </View>
                );
              })}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 30, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center" },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  tabs: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, gap: 4 },
  tabActive: { backgroundColor: Colors.warning },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted },
  tabTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  podium: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 8, marginBottom: 20, paddingHorizontal: 8 },
  podiumItem: { flex: 1, alignItems: "center", gap: 6 },
  podiumFirst: {},
  podiumSecond: {},
  podiumThird: {},
  podiumMedal: { fontSize: 24 },
  podiumAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary + "20", alignItems: "center", justifyContent: "center",
  },
  podiumAvatarText: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.primary },
  podiumName: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text, maxWidth: 80 },
  podiumVal: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.warning },
  podiumBar: { width: "100%", borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  listCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  listCardMe: { borderWidth: 2, borderColor: Colors.warning + "60", backgroundColor: Colors.warning + "08" },
  rankNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.border, alignItems: "center", justifyContent: "center",
  },
  rankNumText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textMuted },
  listAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + "20", alignItems: "center", justifyContent: "center",
  },
  listAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.primary },
  listName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  listEmail: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  listVal: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.warning },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
});
