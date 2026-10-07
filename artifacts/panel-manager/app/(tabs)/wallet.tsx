import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { getApiUrl, getUserAuthHeaders } from "@/lib/query-client";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

function authHeader(_userId: number) {
  return getUserAuthHeaders();
}

const WITHDRAW_METHODS = [
  { id: "binance", label: "Binance Pay", subtitle: "UID দিয়ে USD পাবেন", icon: "logo-bitcoin", color: "#F0B90B", settingKey: "binance" },
  { id: "bkash", label: "bKash", subtitle: "01XXXXXXXXX", icon: "phone-portrait", color: "#E2136E", settingKey: "bkash" },
  { id: "nagad", label: "Nagad", subtitle: "01XXXXXXXXX", icon: "phone-portrait", color: "#F7941E", settingKey: "nagad" },
  { id: "recharge", label: "Mobile Recharge", subtitle: "যেকোনো নম্বরে রিচার্জ", icon: "phone-portrait", color: "#10b981", settingKey: "recharge" },
];

type Tab = "withdraw" | "history";

export default function WalletScreen() {
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const uid = user?.id ?? 0;
  const [activeTab, setActiveTab] = useState<Tab>("withdraw");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");

  const { data: withdrawalsData } = useQuery({
    queryKey: ["withdrawals", uid],
    queryFn: () =>
      fetch(`${getApiUrl()}api/withdrawals`, { headers: authHeader(uid) }).then(r => r.json()),
    enabled: !!uid && activeTab === "history",
  });

  const { data: txData } = useQuery({
    queryKey: ["transactions", uid],
    queryFn: () =>
      fetch(`${getApiUrl()}api/transactions`, { headers: authHeader(uid) }).then(r => r.json()),
    enabled: !!uid && activeTab === "history",
  });

  const { data: pubSettings } = useQuery({
    queryKey: ["settings_public"],
    queryFn: () => fetch(`${getApiUrl()}api/settings/public`).then(r => r.json()),
  });

  const chargeRate = parseFloat(pubSettings?.withdraw_charge ?? "10");
  const usdRate = parseFloat(pubSettings?.binance_usd_rate ?? "110");

  const getMethodMin = (method: string) => {
    const key = `withdraw_${method}_min`;
    return parseFloat(pubSettings?.[key] ?? "50");
  };
  const getMethodMax = (method: string) => {
    const key = `withdraw_${method}_max`;
    return parseFloat(pubSettings?.[key] ?? "9999");
  };
  const isMethodEnabled = (method: string) => {
    const key = `withdraw_${method}_enabled`;
    return pubSettings?.[key] !== "false";
  };

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${getApiUrl()}api/withdrawals`, {
        method: "POST",
        headers: { ...authHeader(uid), "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          withdrawMethod: selectedMethod,
          accountNumber,
          simProvider: selectedMethod,
          phoneNumber: accountNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const msg = selectedMethod === "binance"
        ? `Withdrawal submitted! You will receive ${data.displayNet} USD via Binance Pay.`
        : `Withdrawal submitted! You will receive ${(parseFloat(amount) * (1 - chargeRate / 100)).toFixed(2)} TK. Processing within 24 hours.`;
      Alert.alert("Success!", msg);
      setAmount("");
      setAccountNumber("");
      setSelectedMethod("");
      refreshUser();
      qc.invalidateQueries({ queryKey: ["withdrawals", uid] });
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  function handleWithdraw() {
    if (!selectedMethod) return Alert.alert("Error", "Withdraw method select করুন");
    if (!accountNumber.trim()) return Alert.alert("Error", selectedMethod === "binance" ? "Binance UID দিন" : "Account number দিন");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return Alert.alert("Error", "সঠিক পরিমাণ দিন");

    const methodMin = getMethodMin(selectedMethod);
    const methodMax = getMethodMax(selectedMethod);
    if (amt < methodMin) return Alert.alert("Error", `Minimum withdraw ${methodMin} TK`);
    if (amt > methodMax) return Alert.alert("Error", `Maximum withdraw ${methodMax} TK`);

    const balance = parseFloat(user?.balance ?? "0");
    if (amt > balance) return Alert.alert("Error", "Balance কম আছে");

    const charge = (amt * chargeRate) / 100;
    const net = amt - charge;
    const receiveText = selectedMethod === "binance"
      ? `আপনি পাবেন: ${(net / usdRate).toFixed(4)} USD (1 USD = ${usdRate} TK)`
      : `আপনি পাবেন: ${net.toFixed(2)} TK`;

    Alert.alert(
      "Confirm Withdrawal",
      `Method: ${WITHDRAW_METHODS.find(m => m.id === selectedMethod)?.label}\nAccount: ${accountNumber}\nAmount: ${amt} TK\nCharge (${chargeRate}%): -${charge.toFixed(2)} TK\n${receiveText}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => withdrawMutation.mutate() },
      ]
    );
  }

  const balance = parseFloat(user?.balance ?? "0").toFixed(2);
  const amt = parseFloat(amount) || 0;
  const charge = (amt * chargeRate) / 100;
  const net = amt - charge;

  const methodInfo = WITHDRAW_METHODS.find(m => m.id === selectedMethod);

  const getAccountLabel = () => {
    if (selectedMethod === "binance") return "Binance Pay UID";
    if (selectedMethod === "recharge") return "Mobile Number";
    return "Account Number";
  };

  const getAccountPlaceholder = () => {
    if (selectedMethod === "binance") return "Enter your Binance Pay UID";
    return "01XXXXXXXXX";
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <LinearGradient
          colors={[Colors.success, "#065f46"]}
          style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}
        >
          <Text style={styles.headerLabel}>Available Balance</Text>
          <Text style={styles.headerBalance}>{balance} TK</Text>
          <Text style={styles.headerSub}>Total Earned: {parseFloat(user?.total_earned ?? "0").toFixed(2)} TK</Text>
          <Pressable style={styles.leaderBtn} onPress={() => router.push("/leaderboard")}>
            <Ionicons name="trophy" size={16} color={Colors.warning} />
            <Text style={styles.leaderBtnText}>Leaderboard</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.tabs}>
            {(["withdraw", "history"] as Tab[]).map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === "withdraw" ? "Withdraw" : "History"}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === "withdraw" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Withdraw Funds</Text>
              <Text style={styles.cardSub}>Charge: {chargeRate}% | 24h processing</Text>

              <Text style={styles.fieldLabel}>Withdraw Method</Text>
              <View style={styles.methodGrid}>
                {WITHDRAW_METHODS.map((method) => {
                  const enabled = isMethodEnabled(method.settingKey);
                  const min = getMethodMin(method.settingKey);
                  const max = getMethodMax(method.settingKey);
                  return (
                    <Pressable
                      key={method.id}
                      style={[
                        styles.methodCard,
                        selectedMethod === method.id && { borderColor: method.color, borderWidth: 2, backgroundColor: method.color + "10" },
                        !enabled && { opacity: 0.4 },
                      ]}
                      onPress={() => enabled && setSelectedMethod(method.id)}
                      disabled={!enabled}
                    >
                      <View style={[styles.methodIcon, { backgroundColor: method.color + "20" }]}>
                        <Ionicons name={method.icon as keyof typeof Ionicons.glyphMap} size={20} color={method.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.methodLabel, selectedMethod === method.id && { color: method.color }]}>{method.label}</Text>
                        <Text style={styles.methodSub}>{enabled ? `${min}–${max} TK` : "Disabled"}</Text>
                      </View>
                      {selectedMethod === method.id && <Ionicons name="checkmark-circle" size={18} color={method.color} />}
                    </Pressable>
                  );
                })}
              </View>

              {selectedMethod === "binance" && (
                <View style={styles.binanceNote}>
                  <Ionicons name="information-circle" size={16} color="#F0B90B" />
                  <Text style={styles.binanceNoteText}>১ USD = {usdRate} TK হিসেবে পাবেন। আপনার Binance Pay UID দিন।</Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>{getAccountLabel()}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name={selectedMethod === "binance" ? "key-outline" : "phone-portrait-outline"} size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder={getAccountPlaceholder()}
                  placeholderTextColor={Colors.textMuted}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType={selectedMethod === "binance" ? "default" : "phone-pad"}
                />
              </View>

              <Text style={styles.fieldLabel}>Amount (TK)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="cash-outline" size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder={selectedMethod ? `Min: ${getMethodMin(selectedMethod)} TK` : "Enter amount"}
                  placeholderTextColor={Colors.textMuted}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>

              {amt > 0 && (
                <View style={styles.calcBox}>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Amount</Text>
                    <Text style={styles.calcVal}>{amt} TK</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Charge ({chargeRate}%)</Text>
                    <Text style={[styles.calcVal, { color: Colors.danger }]}>-{charge.toFixed(2)} TK</Text>
                  </View>
                  <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 8 }]}>
                    <Text style={[styles.calcLabel, { fontFamily: "Inter_600SemiBold", color: Colors.text }]}>আপনি পাবেন</Text>
                    {selectedMethod === "binance" ? (
                      <Text style={[styles.calcVal, { color: "#F0B90B", fontFamily: "Inter_700Bold" }]}>
                        {(net / usdRate).toFixed(4)} USD
                      </Text>
                    ) : (
                      <Text style={[styles.calcVal, { color: Colors.success, fontFamily: "Inter_700Bold" }]}>
                        {net.toFixed(2)} TK
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <Pressable
                style={[styles.withdrawBtn, withdrawMutation.isPending && { opacity: 0.7 }]}
                onPress={handleWithdraw}
                disabled={withdrawMutation.isPending}
              >
                {withdrawMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.withdrawBtnText}>Withdraw Request Submit</Text>
                )}
              </Pressable>
            </View>
          )}

          {activeTab === "history" && (
            <View>
              <Text style={styles.historySubTitle}>Withdrawal Requests</Text>
              {!withdrawalsData?.withdrawals?.length ? (
                <EmptyState icon="time-outline" text="No withdrawals yet" />
              ) : (
                withdrawalsData.withdrawals.map((w: {
                  id: number; withdraw_method: string; sim_provider: string; account_number: string;
                  phone_number: string; amount: string; net_amount: string; status: string; created_at: string;
                }) => {
                  const method = w.withdraw_method || w.sim_provider;
                  const account = w.account_number || w.phone_number;
                  const mInfo = WITHDRAW_METHODS.find(m => m.id === method);
                  return (
                    <View key={w.id} style={styles.histCard}>
                      <View style={styles.histLeft}>
                        <View style={[styles.histBadge, {
                          backgroundColor: w.status === "approved" ? Colors.success + "15" :
                            w.status === "rejected" ? Colors.danger + "15" : Colors.warning + "15"
                        }]}>
                          <Ionicons
                            name={w.status === "approved" ? "checkmark-circle" : w.status === "rejected" ? "close-circle" : "time"}
                            size={20}
                            color={w.status === "approved" ? Colors.success : w.status === "rejected" ? Colors.danger : Colors.warning}
                          />
                        </View>
                        <View>
                          <Text style={styles.histProvider}>{mInfo?.label || method} - {account}</Text>
                          <Text style={styles.histDate}>{new Date(w.created_at).toLocaleDateString()}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.histAmt}>{parseFloat(w.net_amount).toFixed(method === "binance" ? 4 : 2)} {method === "binance" ? "USD" : "TK"}</Text>
                        <Text style={[styles.histStatus, {
                          color: w.status === "approved" ? Colors.success : w.status === "rejected" ? Colors.danger : Colors.warning
                        }]}>{w.status}</Text>
                      </View>
                    </View>
                  );
                })
              )}

              <Text style={[styles.historySubTitle, { marginTop: 20 }]}>Income History</Text>
              {!txData?.transactions?.length ? (
                <EmptyState icon="receipt-outline" text="No transactions yet" />
              ) : (
                txData.transactions.slice(0, 20).map((tx: {
                  id: number; type: string; amount: string; description: string; created_at: string;
                }) => (
                  <View key={tx.id} style={styles.txCard}>
                    <View style={[styles.txIcon, { backgroundColor: parseFloat(tx.amount) > 0 ? Colors.success + "15" : Colors.danger + "15" }]}>
                      <Ionicons
                        name={parseFloat(tx.amount) > 0 ? "arrow-down" : "arrow-up"}
                        size={16}
                        color={parseFloat(tx.amount) > 0 ? Colors.success : Colors.danger}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                      <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={[styles.txAmt, { color: parseFloat(tx.amount) > 0 ? Colors.success : Colors.danger }]}>
                      {parseFloat(tx.amount) > 0 ? "+" : ""}{parseFloat(tx.amount).toFixed(2)} TK
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={36} color={Colors.textMuted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 50, paddingHorizontal: 20, alignItems: "center" },
  headerLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 6 },
  headerBalance: { fontFamily: "Inter_700Bold", fontSize: 40, color: "#fff", marginBottom: 4 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 12 },
  leaderBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50,
  },
  leaderBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#fff" },
  content: { marginTop: -20, paddingHorizontal: 16 },
  tabs: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, padding: 4, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  tabTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, marginBottom: 4 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginBottom: 20 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text, marginBottom: 8 },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  methodCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F8F8F8", borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: Colors.border, width: "47%", flexGrow: 1,
  },
  methodIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  methodSub: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  binanceNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#FFF8E1", borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: "#FFE082",
  },
  binanceNoteText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#7B5C00", flex: 1, lineHeight: 18 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F8F8F8", borderRadius: 12, paddingHorizontal: 14, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, height: 50, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text },
  calcBox: { backgroundColor: "#F8F8F8", borderRadius: 12, padding: 14, marginBottom: 20 },
  calcRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  calcLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  calcVal: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  withdrawBtn: {
    backgroundColor: Colors.success, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  withdrawBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  historySubTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 12 },
  histCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  histLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  histBadge: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  histProvider: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text },
  histDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  histAmt: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.text },
  histStatus: { fontFamily: "Inter_500Medium", fontSize: 12 },
  txCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8,
  },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txDesc: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text },
  txDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  txAmt: { fontFamily: "Inter_700Bold", fontSize: 14 },
  emptyState: { alignItems: "center", paddingVertical: 30, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
});
