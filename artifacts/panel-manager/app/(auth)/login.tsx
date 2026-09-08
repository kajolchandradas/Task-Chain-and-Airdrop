import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  Alert, ActivityIndicator, Platform, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

type ForgotStep = "email" | "code";

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const error = err as Error & { code?: string; email?: string };
      if (error.code === "ACCOUNT_NOT_ACTIVE") {
        router.push({ pathname: "/(auth)/activation", params: { email: error.email ?? email.trim().toLowerCase() } });
      } else {
        Alert.alert("Login Failed", error.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotStep1() {
    if (!forgotEmail.trim()) return Alert.alert("Error", "Enter your Gmail address");
    setForgotLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      Alert.alert(
        "Request Submitted! ✅",
        "আপনার reset request admin কে পাঠানো হয়েছে। Admin আপনাকে একটি secret code দেবেন। সেই code দিয়ে আপনার password পরিবর্তন করুন।",
        [{ text: "Enter Code", onPress: () => setForgotStep("code") }]
      );
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleForgotStep2() {
    if (!forgotEmail.trim() || !resetCode.trim() || !newPassword.trim()) {
      return Alert.alert("Error", "সব field পূরণ করুন");
    }
    if (newPassword.length < 6) {
      return Alert.alert("Error", "Password কমপক্ষে ৬ অক্ষর হতে হবে");
    }
    setForgotLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code: resetCode.trim().toUpperCase(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      Alert.alert("সফল! ✅", "Password সফলভাবে পরিবর্তন হয়েছে। এখন নতুন password দিয়ে login করুন।", [
        {
          text: "Login", onPress: () => {
            setForgotMode(false);
            setForgotStep("email");
            setEmail(forgotEmail);
            setForgotEmail("");
            setResetCode("");
            setNewPassword("");
          }
        }
      ]);
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setForgotLoading(false);
    }
  }

  // ─── Forgot Password Screen ───
  if (forgotMode) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={forgotStep === "email" ? ["#6b7280", "#374151"] : [Colors.primary, Colors.primaryDark]}
          style={[styles.hero, { paddingTop: Platform.OS === "web" ? 80 : insets.top + 40 }]}
        >
          <View style={styles.logoCircle}>
            <Ionicons name={forgotStep === "email" ? "mail" : "key"} size={40} color={forgotStep === "email" ? "#6b7280" : Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{forgotStep === "email" ? "Forgot Password" : "Reset Password"}</Text>
          <Text style={styles.heroSub}>
            {forgotStep === "email"
              ? "Submit your Gmail to admin"
              : "Enter admin-provided code"}
          </Text>
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.card}>
          {forgotStep === "email" ? (
            <>
              <Text style={styles.cardTitle}>Password Reset</Text>
              <Text style={styles.cardSub}>আপনার Gmail দিন। Admin একটি secret code পাঠাবেন।</Text>

              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="আপনার Gmail"
                  placeholderTextColor={Colors.textMuted}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Pressable
                style={[styles.loginBtn, forgotLoading && { opacity: 0.7 }]}
                onPress={handleForgotStep1}
                disabled={forgotLoading}
              >
                {forgotLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.loginBtnText}>Request Submit করুন</Text>}
              </Pressable>

              <Pressable
                style={styles.secondaryBtn}
                onPress={() => setForgotStep("code")}
              >
                <Text style={styles.secondaryBtnText}>আমার কাছে code আছে →</Text>
              </Pressable>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={18} color="#6b7280" />
                <Text style={styles.infoText}>
                  Admin আপনাকে Telegram বা direct message এ secret code দেবেন। সেই code দিয়ে password reset করুন।
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>New Password Set করুন</Text>
              <Text style={styles.cardSub}>Admin-এর দেওয়া code এবং নতুন password দিন</Text>

              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="আপনার Gmail"
                  placeholderTextColor={Colors.textMuted}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="key-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Admin-এর দেওয়া Secret Code"
                  placeholderTextColor={Colors.textMuted}
                  value={resetCode}
                  onChangeText={setResetCode}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="নতুন Password (min 6 chars)"
                  placeholderTextColor={Colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPass}
                />
                <Pressable onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn}>
                  <Ionicons name={showNewPass ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
                </Pressable>
              </View>

              <Pressable
                style={[styles.loginBtn, forgotLoading && { opacity: 0.7 }]}
                onPress={handleForgotStep2}
                disabled={forgotLoading}
              >
                {forgotLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.loginBtnText}>Password Reset করুন</Text>}
              </Pressable>

              <Pressable style={styles.secondaryBtn} onPress={() => setForgotStep("email")}>
                <Text style={styles.secondaryBtnText}>← Back</Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={() => { setForgotMode(false); setForgotStep("email"); }} style={styles.backLink}>
            <Text style={styles.footerLink}>← Login এ ফিরে যান</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ─── Normal Login Screen ───
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={[styles.hero, { paddingTop: Platform.OS === "web" ? 80 : insets.top + 40 }]}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="wallet" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.heroTitle}>Earn Wallet</Text>
        <Text style={styles.heroSub}>Watch, Play & Earn Money</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome Back</Text>
        <Text style={styles.cardSub}>Sign in to your account</Text>

        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Gmail address"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
          />
          <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
            <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
          </Pressable>
        </View>

        <Pressable onPress={() => setForgotMode(true)} style={styles.forgotLink}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.85 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Sign In</Text>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text style={styles.footerLink}>Register</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  hero: { alignItems: "center", paddingBottom: 60, paddingHorizontal: 20 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff", marginBottom: 4 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.85)" },
  card: {
    backgroundColor: "#fff", flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    marginTop: -30, padding: 28, paddingTop: 32,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text, marginBottom: 4 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, marginBottom: 28 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F8F8F8",
    borderRadius: 14, paddingHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 52, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text },
  eyeBtn: { padding: 4 },
  forgotLink: { alignSelf: "flex-end", marginBottom: 12, marginTop: -8 },
  forgotText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.primary },
  loginBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, height: 54,
    alignItems: "center", justifyContent: "center", marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  loginBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff", letterSpacing: 0.5 },
  secondaryBtn: {
    alignItems: "center", paddingVertical: 14, marginTop: 8,
  },
  secondaryBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.primary },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
  backLink: { alignItems: "center", marginTop: 20 },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#374151", flex: 1, lineHeight: 18 },
});
