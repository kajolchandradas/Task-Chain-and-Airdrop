import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { useLocalSearchParams } from "expo-router";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof ref === "string" && ref.trim()) {
      setReferralCode(ref.trim());
    }
  }, [ref]);

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        referralCode: referralCode.trim() || undefined,
      });
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const error = err as Error;
      if ((error as Error & { code?: string }).code === "ACCOUNT_NOT_ACTIVE") {
        router.replace({ pathname: "/(auth)/activation", params: { email: email.trim().toLowerCase() } });
        return;
      }
      Alert.alert("Registration Failed", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.welcome}>Join & Start Earning</Text>
          <Text style={styles.welcomeSub}>Create your free account today</Text>
        </View>

        <View style={styles.formCard}>
          <InputField
            icon="person-outline"
            placeholder="Full Name *"
            value={fullName}
            onChangeText={setFullName}
          />
          <InputField
            icon="mail-outline"
            placeholder="Gmail Address *"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password * (min 6 chars)"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <InputField
            icon="gift-outline"
            placeholder="Referral Code (optional)"
            value={referralCode}
            onChangeText={setReferralCode}
            autoCapitalize="none"
          />

          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.noteText}>
              Optional: leave blank and Admin's referral code will be added automatically
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.registerBtn, pressed && { opacity: 0.85 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InputField({
  icon, placeholder, value, onChangeText, keyboardType, autoCapitalize,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "email-address" | "default";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={20} color={Colors.textMuted} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "words"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: "#fff" },
  form: { flex: 1 },
  topSection: { alignItems: "center", paddingVertical: 20 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  welcome: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff", marginBottom: 4 },
  welcomeSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  formCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 28,
    paddingTop: 32,
    flex: 1,
    minHeight: 500,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    height: 52,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  eyeBtn: { padding: 4 },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  noteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  registerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  registerBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  footerLink: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
});
