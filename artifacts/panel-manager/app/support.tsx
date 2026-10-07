import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  TextInput, Alert, ActivityIndicator, Linking, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { getApiUrl, getUserAuthHeaders } from "@/lib/query-client";

const QUICK_QUESTIONS = [
  "Withdraw কিভাবে করবো?",
  "Balance কোথায় দেখবো?",
  "Referral code কোথায়?",
  "Game কিভাবে খেলবো?",
  "Account ban হলে কি করবো?",
  "Daily check-in কি?",
  "Live support চাই",
];

export default function SupportScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const uid = user?.id ?? 0;
  const [message, setMessage] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const [telegramLink, setTelegramLink] = useState("");

  const { data: messagesData, refetch } = useQuery({
    queryKey: ["support", uid],
    queryFn: () =>
      fetch(`${getApiUrl()}api/support/messages`, { headers: getUserAuthHeaders() }).then(r => r.json()),
    enabled: !!uid,
  });

  const { data: pubSettings } = useQuery({
    queryKey: ["settings_public"],
    queryFn: () => fetch(`${getApiUrl()}api/settings/public`).then(r => r.json()),
  });

  useEffect(() => {
    if (pubSettings?.telegram_support_link) {
      setTelegramLink(pubSettings.telegram_support_link);
    }
  }, [pubSettings]);

  useEffect(() => {
    if (!uid) return;
    const timer = setInterval(() => refetch(), 8000);
    return () => clearInterval(timer);
  }, [uid, refetch]);

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await fetch(`${getApiUrl()}api/support/send`, {
        method: "POST",
        headers: { ...getUserAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setMessage("");
      refetch();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  function sendMessage(msg?: string) {
    const text = (msg || message).trim();
    if (!text) return;
    sendMutation.mutate(text);
  }

  const messages = messagesData?.messages ?? [];
  const conversation = messagesData?.conversation;

  async function endConversation() {
    if (!conversation?.id) return;
    try {
      const res = await fetch(`${getApiUrl()}api/support/end`, {
        method: "POST",
        headers: { ...getUserAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refetch();
    } catch (error) {
      Alert.alert("Could not end chat", (error as Error).message);
    }
  }

  async function reopenConversation() {
    try {
      const res = await fetch(`${getApiUrl()}api/support/reopen`, {
        method: "POST",
        headers: { ...getUserAuthHeaders(), "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await refetch();
    } catch (error) {
      Alert.alert("Could not reopen chat", (error as Error).message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#6b7280", "#374151"]}
        style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.aiAvatar}>
              <Ionicons name="logo-android" size={22} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI + Live Support</Text>
              <View style={styles.onlineDot}>
                <View style={styles.dot} />
                <Text style={styles.onlineText}>Always Online</Text>
              </View>
            </View>
          </View>
          {conversation?.status === "open" ? (
            <Pressable onPress={endConversation} style={styles.endBtn}>
              <Ionicons name="stop-circle-outline" size={18} color="#fff" />
              <Text style={styles.endBtnText}>End</Text>
            </Pressable>
          ) : telegramLink ? (
            <Pressable onPress={() => Linking.openURL(telegramLink)} style={styles.telegramBtn}>
              <Ionicons name="paper-plane" size={18} color="#fff" />
            </Pressable>
          ) : <View style={{ width: 40 }} />}
        </View>
      </LinearGradient>

      {/* Telegram Banner */}
      {telegramLink ? (
        <Pressable style={styles.telegramBanner} onPress={() => Linking.openURL(telegramLink)}>
          <Ionicons name="paper-plane" size={18} color="#2196F3" />
          <Text style={styles.telegramBannerText}>Admin এর সাথে সরাসরি কথা বলতে Telegram এ যান</Text>
          <Ionicons name="chevron-forward" size={16} color="#2196F3" />
        </Pressable>
      ) : null}

      {conversation?.status === "open" && messages.length > 0 ? (
        <View style={styles.queueBanner}>
          <Ionicons name="time-outline" size={17} color={Colors.warning} />
          <Text style={styles.queueBannerText}>
            আপনার live support request queue-তে আছে। Waiting: {messagesData?.messages?.[0]?.waiting_count ?? 0}
          </Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Welcome message */}
        <View style={styles.aiMessage}>
          <View style={styles.aiIconSmall}>
            <Ionicons name="logo-android" size={16} color={Colors.primary} />
          </View>
          <View style={styles.aiBubble}>
            <Text style={styles.aiBubbleText}>
              আমি AI Support Assistant! আপনার যেকোনো প্রশ্নের উত্তর দিতে পারবো। নিচের quick questions থেকে select করুন অথবা নিজে লিখুন।
            </Text>
            <Text style={styles.bubbleTime}>AI Assistant</Text>
          </View>
        </View>

        {/* Quick questions */}
        <View style={styles.quickQs}>
          {QUICK_QUESTIONS.map((q) => (
            <Pressable key={q} style={styles.quickQ} onPress={() => sendMessage(q)}>
              <Text style={styles.quickQText}>{q}</Text>
            </Pressable>
          ))}
        </View>

        {/* Chat messages */}
        {messages.map((msg: { id: number; sender: "user" | "admin" | "ai"; message: string; created_at: string }) => (
          msg.sender === "user" ? (
            <View key={msg.id} style={styles.userMessage}>
              <View style={styles.userBubble}>
                <Text style={styles.userBubbleText}>{msg.message}</Text>
                <Text style={[styles.bubbleTime, { color: "rgba(255,255,255,0.7)" }]}>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
              <View style={styles.userIcon}><Text style={styles.userIconText}>{(user?.full_name ?? "U").charAt(0)}</Text></View>
            </View>
          ) : (
            <View key={msg.id} style={styles.aiMessage}>
              <View style={styles.aiIconSmall}><Ionicons name={msg.sender === "ai" ? "logo-android" : "person"} size={16} color={msg.sender === "ai" ? Colors.primary : Colors.warning} /></View>
              <View style={styles.aiBubble}>
                <Text style={styles.aiBubbleText}>{msg.message}</Text>
                <Text style={styles.bubbleTime}>{msg.sender === "ai" ? "AI Assistant" : "Admin"}</Text>
              </View>
            </View>
          )
        ))}

        {sendMutation.isPending && (
          <View style={styles.aiMessage}>
            <View style={styles.aiIconSmall}>
              <Ionicons name="logo-android" size={16} color={Colors.primary} />
            </View>
            <View style={styles.aiBubble}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputArea, { paddingBottom: Platform.OS === "ios" ? insets.bottom + 8 : 16 }]}>
        {conversation?.status === "closed" ? (
          <Pressable style={styles.reopenBtn} onPress={reopenConversation}>
            <Ionicons name="refresh-circle" size={20} color="#fff" />
            <Text style={styles.reopenText}>Start a new support chat</Text>
          </Pressable>
        ) : telegramLink ? (
          <Pressable style={styles.telegramIconBtn} onPress={() => Linking.openURL(telegramLink)}>
            <Ionicons name="paper-plane" size={20} color="#2196F3" />
          </Pressable>
        ) : null}
        {conversation?.status !== "closed" && <TextInput
          style={styles.input}
          placeholder="আপনার প্রশ্ন লিখুন..."
          placeholderTextColor={Colors.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />}
        {conversation?.status !== "closed" && <Pressable
          style={[styles.sendBtn, !message.trim() && { opacity: 0.5 }]}
          onPress={() => sendMessage()}
          disabled={!message.trim() || sendMutation.isPending}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
  onlineDot: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  onlineText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.8)" },
  telegramBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  endBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)" },
  endBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  telegramBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#E3F2FD", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#BBDEFB",
  },
  telegramBannerText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "#1565C0", flex: 1 },
  queueBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF7ED", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#FED7AA" },
  queueBannerText: { fontFamily: "Inter_500Medium", fontSize: 11, color: "#9A3412", flex: 1 },
  chatArea: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  quickQs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  quickQ: {
    backgroundColor: Colors.primary + "12", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.primary + "30",
  },
  quickQText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.primary },
  aiMessage: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "flex-end" },
  aiIconSmall: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary + "20", alignItems: "center", justifyContent: "center",
  },
  aiBubble: {
    flex: 1, backgroundColor: "#fff", borderRadius: 18, borderBottomLeftRadius: 4,
    padding: 14, maxWidth: "80%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  aiBubbleText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text, lineHeight: 20 },
  userMessage: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "flex-end", justifyContent: "flex-end" },
  userBubble: {
    backgroundColor: Colors.primary, borderRadius: 18, borderBottomRightRadius: 4,
    padding: 14, maxWidth: "80%",
  },
  userBubbleText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#fff", lineHeight: 20 },
  bubbleTime: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  userIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary + "20", alignItems: "center", justifyContent: "center",
  },
  userIconText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.primary },
  inputArea: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: Colors.border,
  },
  telegramIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#E3F2FD", alignItems: "center", justifyContent: "center",
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: "#F8F8F8", borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  reopenBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  reopenText: { fontFamily: "Inter_600SemiBold", color: "#fff", fontSize: 13 },
});
