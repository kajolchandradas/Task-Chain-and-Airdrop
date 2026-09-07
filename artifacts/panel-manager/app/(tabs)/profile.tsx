import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, Platform, TextInput, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { Share } from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

function authHeader(userId: number) {
  return { "x-user-id": String(userId) };
}

export default function ProfileScreen() {
  const { user, logout, updateProfile, updateProfilePhoto } = useAuth();
  const insets = useSafeAreaInsets();
  const uid = user?.id ?? 0;
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(user?.full_name ?? "");
  const [photoLoading, setPhotoLoading] = useState(false);

  const { data: referralData } = useQuery({
    queryKey: ["referrals", uid],
    queryFn: () =>
      fetch(`${getApiUrl()}api/referrals`, { headers: authHeader(uid) }).then(r => r.json()),
    enabled: !!uid,
  });

  const { data: txData } = useQuery({
    queryKey: ["transactions", uid],
    queryFn: () =>
      fetch(`${getApiUrl()}api/transactions`, { headers: authHeader(uid) }).then(r => r.json()),
    enabled: !!uid,
  });

  function incomeBySource(source: string): number {
    if (!txData?.transactions) return 0;
    return txData.transactions
      .filter((t: { source: string; amount: string }) => t.source === source && parseFloat(t.amount) > 0)
      .reduce((sum: number, t: { amount: string }) => sum + parseFloat(t.amount), 0);
  }

  async function copyReferral() {
    if (user?.referral_code) {
      await Share.share({ message: user.referral_code });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert("Referral code", "Your referral code is ready to share.");
    }
  }

  async function shareReferralLink() {
    if (!user?.referral_code) return;
    const base = Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.origin
      : getApiUrl().replace(/\/$/, "");
    const link = `${base}/register?ref=${encodeURIComponent(user.referral_code)}`;
    await Share.share({
      message: `Join Earn Wallet and start earning: ${link}`,
      url: link,
    });
  }

  async function handleUpdateName() {
    if (!newName.trim()) return;
    try {
      await updateProfile(newName.trim());
      setEditName(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    }
  }

  async function handlePickPhoto() {
    Alert.alert(
      "Profile Photo",
      "Choose how to set your profile photo",
      [
        {
          text: "Camera", onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") return Alert.alert("Permission required");
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: "images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
              base64: true,
            });
            if (!result.canceled && result.assets[0]) {
              await uploadPhoto(result.assets[0]);
            }
          }
        },
        {
          text: "Gallery", onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") return Alert.alert("Permission required");
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: "images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
              base64: true,
            });
            if (!result.canceled && result.assets[0]) {
              await uploadPhoto(result.assets[0]);
            }
          }
        },
        { text: "Remove Photo", style: "destructive", onPress: () => savePhoto("") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  async function uploadPhoto(asset: ImagePicker.ImagePickerAsset) {
    if (!asset.base64) return Alert.alert("Error", "Could not read image");
    const photoUrl = `data:image/jpeg;base64,${asset.base64}`;
    await savePhoto(photoUrl);
  }

  async function savePhoto(photoUrl: string) {
    setPhotoLoading(true);
    try {
      await updateProfilePhoto(photoUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (photoUrl) Alert.alert("Success!", "Profile photo updated!");
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await logout(); } },
    ]);
  }

  const level1 = referralData?.referrals?.filter((r: { level: number }) => r.level === 1) ?? [];
  const level2 = referralData?.referrals?.filter((r: { level: number }) => r.level === 2) ?? [];
  const level3 = referralData?.referrals?.filter((r: { level: number }) => r.level === 3) ?? [];
  const totalRefEarned = referralData?.referrals?.reduce(
    (sum: number, r: { total_earned: string }) => sum + parseFloat(r.total_earned ?? "0"), 0
  ) ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <LinearGradient
          colors={["#0ea5e9", "#1d4ed8"]}
          style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}
        >
          {/* Profile Photo */}
          <Pressable onPress={handlePickPhoto} style={styles.photoWrap} disabled={photoLoading}>
            {user?.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.photoImg} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {(user?.full_name ?? "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.photoEditBadge}>
              <Ionicons name={photoLoading ? "hourglass-outline" : "camera"} size={14} color="#fff" />
            </View>
          </Pressable>

          {/* Name */}
          {editName ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.editNameInput}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <Pressable onPress={handleUpdateName} style={styles.editNameSave}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </Pressable>
              <Pressable onPress={() => { setEditName(false); setNewName(user?.full_name ?? ""); }}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.nameRow} onPress={() => setEditName(true)}>
              <Text style={styles.userName}>{user?.full_name ?? "User"}</Text>
              <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.photoHint}>Tap photo to change · Tap name to edit</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.statsRow}>
            <StatCard label="Balance" value={`${parseFloat(user?.balance ?? "0").toFixed(2)} TK`} icon="wallet" color={Colors.success} />
            <StatCard label="Total Earned" value={`${parseFloat(user?.total_earned ?? "0").toFixed(2)} TK`} icon="trending-up" color={Colors.primary} />
          </View>

          <View style={styles.referralCard}>
            <View style={styles.referralTop}>
              <View>
                <Text style={styles.referralTitle}>Your Referral Code</Text>
                <Text style={styles.referralSub}>Share with friends to earn commissions</Text>
              </View>
              <View style={styles.referralButtons}>
                <Pressable style={styles.copyBtn} onPress={copyReferral}>
                  <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                  <Text style={styles.copyBtnText}>Code</Text>
                </Pressable>
                <Pressable style={styles.shareBtn} onPress={shareReferralLink}>
                  <Ionicons name="share-social-outline" size={17} color="#fff" />
                  <Text style={styles.shareBtnText}>Share Link</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.referralCodeBox}>
              <Text style={styles.referralCode}>{user?.referral_code}</Text>
            </View>

            <View style={styles.commissionRow}>
              <CommissionBadge level="L1" rate="10%" count={level1.length} color={Colors.primary} />
              <CommissionBadge level="L2" rate="5%" count={level2.length} color="#8b5cf6" />
              <CommissionBadge level="L3" rate="2.5%" count={level3.length} color="#0ea5e9" />
            </View>
            <Text style={styles.refEarned}>Referral Income: {totalRefEarned.toFixed(2)} TK</Text>
          </View>

          {level1.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>My Team ({level1.length + level2.length + level3.length} members)</Text>
              {referralData?.referrals?.slice(0, 10).map((ref: {
                id: number; level: number; full_name: string; email: string; total_earned: string; commission_rate: string;
              }) => (
                <View key={ref.id} style={styles.memberCard}>
                  <View style={[styles.memberAvatar, {
                    backgroundColor: ref.level === 1 ? Colors.primary + "20" :
                      ref.level === 2 ? "#8b5cf6" + "20" : "#0ea5e9" + "20"
                  }]}>
                    <Text style={[styles.memberAvatarText, {
                      color: ref.level === 1 ? Colors.primary :
                        ref.level === 2 ? "#8b5cf6" : "#0ea5e9"
                    }]}>
                      {ref.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{ref.full_name}</Text>
                    <Text style={styles.memberLevel}>Level {ref.level} • {ref.commission_rate}% commission</Text>
                  </View>
                  <Text style={styles.memberEarned}>+{parseFloat(ref.total_earned).toFixed(2)} TK</Text>
                </View>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Income Breakdown</Text>
          <View style={styles.incomeCard}>
            {[
              { label: "Ads Income", source: "Ads", icon: "play-circle" as const, color: Colors.primary },
              { label: "Referral Income", source: "Referral", icon: "people" as const, color: "#8b5cf6" },
              { label: "Game Income", source: "Games", icon: "game-controller" as const, color: "#f59e0b" },
              { label: "Task Income", source: "Daily Task", icon: "checkmark-circle" as const, color: "#0ea5e9" },
              { label: "Event Bonuses", source: "Event Bonus", icon: "gift" as const, color: Colors.danger },
            ].map((item) => {
              const earned = incomeBySource(item.source);
              return (
                <View key={item.label} style={styles.incomeRow}>
                  <View style={[styles.incomeIcon, { backgroundColor: item.color + "15" }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.incomeLabel}>{item.label}</Text>
                  <Text style={[styles.incomeAmount, { color: earned > 0 ? Colors.success : Colors.textMuted }]}>
                    {earned > 0 ? `+${earned.toFixed(2)} TK` : "0.00 TK"}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.actionsCard}>
            {user?.email === "kajolchandradas3@gmail.com" && (
              <>
                <Pressable style={styles.actionRow} onPress={() => router.push("/admin/panel" as never)}>
                  <Ionicons name="shield-outline" size={20} color={Colors.primary} />
                  <Text style={styles.actionText}>Admin Panel</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </Pressable>
                <View style={styles.actionDivider} />
              </>
            )}
            <Pressable style={styles.actionRow} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
              <Text style={[styles.actionText, { color: Colors.danger }]}>Logout</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string;
}) {
  return (
    <View style={[styles.statCard, { flex: 1 }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CommissionBadge({ level, rate, count, color }: {
  level: string; rate: string; count: number; color: string;
}) {
  return (
    <View style={[styles.commBadge, { backgroundColor: color + "15", borderColor: color + "30" }]}>
      <Text style={[styles.commLevel, { color }]}>{level}</Text>
      <Text style={[styles.commRate, { color }]}>{rate}</Text>
      <Text style={styles.commCount}>{count} members</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 50, paddingHorizontal: 20, alignItems: "center" },
  photoWrap: { position: "relative", marginBottom: 12 },
  photoImg: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: "rgba(255,255,255,0.8)",
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.5)",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 34, color: "#fff" },
  photoEditBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  photoHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  userName: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  userEmail: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  editNameRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  editNameInput: {
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, color: "#fff",
    fontFamily: "Inter_500Medium", fontSize: 16, minWidth: 150,
  },
  editNameSave: {
    backgroundColor: Colors.success, width: 32, height: 32,
    borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  content: { marginTop: -20, paddingHorizontal: 16 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 2 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  referralCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  referralTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  referralButtons: { flexDirection: "row", gap: 6, alignItems: "center" },
  referralTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
  referralSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50,
  },
  copyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 50,
  },
  shareBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  referralCodeBox: {
    backgroundColor: Colors.primaryLight, borderRadius: 12, paddingVertical: 12,
    alignItems: "center", marginBottom: 14,
    borderWidth: 1.5, borderColor: Colors.primary + "30", borderStyle: "dashed",
  },
  referralCode: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.primary, letterSpacing: 2 },
  commissionRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  commBadge: { flex: 1, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1 },
  commLevel: { fontFamily: "Inter_700Bold", fontSize: 14 },
  commRate: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  commCount: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  refEarned: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.success, textAlign: "center" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text, marginBottom: 14 },
  memberCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 12,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontFamily: "Inter_700Bold", fontSize: 18 },
  memberName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  memberLevel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  memberEarned: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.success },
  incomeCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  incomeRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5F5F5",
  },
  incomeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  incomeLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text, flex: 1 },
  incomeAmount: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  actionsCard: {
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16 },
  actionText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.text, flex: 1 },
  actionDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
});
