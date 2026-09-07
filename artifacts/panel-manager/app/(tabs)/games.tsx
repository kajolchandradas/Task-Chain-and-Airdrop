import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Colors from "@/constants/colors";

const GAMES = [
  {
    type: "spin_wheel",
    title: "Spin Wheel",
    desc: "Spin the wheel and win up to 3 TK",
    icon: "refresh-circle" as const,
    gradient: ["#E2136E", "#9b0a48"] as [string, string],
  },
  {
    type: "scratch_card",
    title: "Scratch Card",
    desc: "Scratch and reveal your prize",
    icon: "card" as const,
    gradient: ["#8b5cf6", "#5b21b6"] as [string, string],
  },
  {
    type: "spin_split",
    title: "Spin & Split Coins",
    desc: "Split the coins for extra rewards",
    icon: "disc" as const,
    gradient: ["#f59e0b", "#b45309"] as [string, string],
  },
  {
    type: "lucky_spin",
    title: "Lucky Spin 3X",
    desc: "Triple your chances with 3 spins",
    icon: "star" as const,
    gradient: ["#10b981", "#065f46"] as [string, string],
  },
  {
    type: "fun_quiz",
    title: "Fun Quiz",
    desc: "Answer questions to earn TK",
    icon: "help-circle" as const,
    gradient: ["#3b82f6", "#1d4ed8"] as [string, string],
  },
];

export default function GamesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <LinearGradient
          colors={["#8b5cf6", "#5b21b6"]}
          style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}
        >
          <Text style={styles.headerTitle}>Games</Text>
          <Text style={styles.headerSub}>Play games and earn TK rewards</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoBadge}>
              <Ionicons name="information-circle" size={14} color="#fff" />
              <Text style={styles.infoBadgeText}>1 free play + 1 ad play per game per day</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.rewardBanner}>
            <Ionicons name="trophy" size={28} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardTitle}>Daily Game Rewards</Text>
              <Text style={styles.rewardSub}>Win 0.1 to 3 TK per game</Text>
            </View>
            <View style={styles.rewardRange}>
              <Text style={styles.rewardRangeText}>0.1 - 3 TK</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Choose a Game</Text>

          {GAMES.map((game) => (
            <Pressable
              key={game.type}
              style={({ pressed }) => [styles.gameCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push(`/game/${game.type}` as any)}
            >
              <LinearGradient
                colors={game.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gameGradient}
              >
                <View style={styles.gameIconWrap}>
                  <Ionicons name={game.icon} size={32} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                  <Text style={styles.gameDesc}>{game.desc}</Text>
                </View>
                <View style={styles.gamePlayBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </View>
              </LinearGradient>
            </Pressable>
          ))}

          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>Game Rules</Text>
            {[
              "Each game: 1 free play per day",
              "Watch 1 ad to get 1 extra play per game",
              "Rewards range from 0.1 to 3 TK",
              "Referral commissions apply on game earnings",
            ].map((rule, i) => (
              <View key={i} style={styles.ruleItem}>
                <View style={styles.ruleDot} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 50, paddingHorizontal: 20 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#fff", marginBottom: 4 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 12 },
  infoRow: {},
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    alignSelf: "flex-start",
  },
  infoBadgeText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#fff" },
  content: { marginTop: -20, paddingHorizontal: 16 },
  rewardBanner: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  rewardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  rewardSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  rewardRange: {
    backgroundColor: Colors.warning + "20",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rewardRangeText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.warning },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text, marginBottom: 14 },
  gameCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  gameGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  gameIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  gameTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff", marginBottom: 4 },
  gameDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.85)" },
  gamePlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  rulesCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  rulesTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text, marginBottom: 12 },
  ruleItem: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  ruleText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, flex: 1 },
});
