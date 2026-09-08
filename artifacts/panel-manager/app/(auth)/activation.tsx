import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

export default function ActivationScreen() {
  const { email: initialEmail } = useLocalSearchParams<{ email?: string }>();
  const { activate } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  async function requestCode() {
    if (!email.trim()) return Alert.alert("Error", "Enter the registered email.");
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}api/auth/activation/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequested(true);
      Alert.alert("Request sent", "Admin will approve your request and provide the secret activation code.");
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!email.trim() || !code.trim()) return Alert.alert("Error", "Enter your email and secret code.");
    setLoading(true);
    try {
      await activate(email.trim().toLowerCase(), code.trim());
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Activation failed", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Activate Account</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={42} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Secret Code Required</Text>
        <Text style={styles.subtitle}>
          Your account stays inactive until the first secret code is entered. Request approval, then enter the one-time code given by admin.
        </Text>
        <View style={styles.card}>
          <Text style={styles.label}>Registered email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={Colors.textMuted} />
          <Text style={styles.label}>Secret activation code</Text>
          <TextInput style={[styles.input, styles.codeInput]} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="6-digit code" placeholderTextColor={Colors.textMuted} />
          <Pressable style={styles.primaryButton} onPress={verify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Activate Account</Text>}
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={requestCode} disabled={loading}>
            <Text style={styles.secondaryText}>{requested ? "Request Sent — Request Again" : "Request Secret Code"}</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>Only an approved, unused code can activate this account. Referral rewards remain locked until activation.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 18 },
  back: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  content: { flexGrow: 1, alignItems: "center", padding: 24, paddingTop: 34 },
  iconCircle: { width: 82, height: 82, borderRadius: 41, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center" },
  subtitle: { color: "rgba(255,255,255,0.82)", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8, marginBottom: 22 },
  card: { backgroundColor: "#fff", borderRadius: 22, padding: 22, width: "100%" },
  label: { color: Colors.textMuted, fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: "#F8F8F8", paddingHorizontal: 14, fontFamily: "Inter_400Regular", color: Colors.text },
  codeInput: { letterSpacing: 5, fontFamily: "Inter_700Bold", textAlign: "center" },
  primaryButton: { height: 52, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginTop: 18 },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  secondaryButton: { alignItems: "center", padding: 14 },
  secondaryText: { color: Colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  note: { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 16 },
});