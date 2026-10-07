import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  Alert, ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!pin.trim()) return Alert.alert("Error", "Enter PIN");
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await AsyncStorage.setItem("admin_token", data.token);
      router.replace("/admin/panel");
    } catch (err: unknown) {
      const error = err as Error;
      Alert.alert("Access Denied", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.dark.bg, Colors.dark.card]}
        style={[styles.bg, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark.textMuted} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Admin Access</Text>
          <Text style={styles.sub}>Enter your admin PIN or password</Text>

          <View style={styles.pinBox}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <View key={i} style={[styles.pinDot, { backgroundColor: pin.length > i ? Colors.primary : Colors.dark.border }]} />
            ))}
          </View>

          <View style={styles.pinInput}>
            <Ionicons name="lock-closed" size={20} color={Colors.dark.textMuted} />
            <TextInput
              style={styles.pinField}
              placeholder="Enter PIN or password"
              placeholderTextColor={Colors.dark.textMuted}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={128}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.85 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield" size={18} color="#fff" />
                <Text style={styles.loginBtnText}>Unlock Panel</Text>
              </>
            )}
          </Pressable>

          <View style={styles.credCard}>
            <View style={styles.credRow}>
              <Ionicons name="information-circle" size={16} color={Colors.primary} />
              <Text style={styles.credTitle}>Admin Access Info</Text>
            </View>
            <View style={styles.credDivider} />
            <Text style={styles.credNote}>
              Admin access uses a private workspace credential. Keep it confidential and update it in Security after setup.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.dark.card, alignItems: "center", justifyContent: "center",
    marginBottom: 24, borderWidth: 2, borderColor: Colors.primary + "40",
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.dark.text, marginBottom: 8 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textMuted, textAlign: "center", marginBottom: 32 },
  pinBox: { flexDirection: "row", gap: 16, marginBottom: 24 },
  pinDot: { width: 16, height: 16, borderRadius: 8 },
  pinInput: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.card, borderRadius: 16, paddingHorizontal: 20,
    width: "100%", marginBottom: 20, borderWidth: 1, borderColor: Colors.dark.border,
  },
  pinField: { flex: 1, height: 56, color: Colors.dark.text, fontFamily: "Inter_400Regular", fontSize: 16, letterSpacing: 4 },
  loginBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.primary, borderRadius: 16, height: 56, width: "100%", marginBottom: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  loginBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  credCard: {
    width: "100%", backgroundColor: Colors.dark.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.primary + "30", marginTop: 4,
  },
  credRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  credTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary },
  credDivider: { height: 1, backgroundColor: Colors.dark.border, marginBottom: 10 },
  credNote: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textMuted, lineHeight: 18 },
});
