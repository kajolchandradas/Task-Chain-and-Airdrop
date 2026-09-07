import React, { useEffect, useRef, useState } from "react";
import {
  Modal, View, Text, StyleSheet, Pressable, Animated,
  ActivityIndicator, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

const NATIVE_DRIVER = Platform.OS !== "web";

export type AdTrigger = "click" | "claim" | "game" | "watch" | "manual" | "checkin" | "event";

interface AdModalProps {
  visible: boolean;
  onClose: () => void;
  trigger: AdTrigger;
  zoneId?: string;
  adDuration?: number;
  adNetwork?: string;
  onAdComplete?: () => void;
}

const AD_LABELS: Record<AdTrigger, string> = {
  click: "Sponsored Ad",
  claim: "Claim Reward Ad",
  game: "Game Sponsor",
  watch: "Rewarded Video",
  manual: "Advertisement",
  checkin: "Daily Bonus Ad",
  event: "Event Bonus Ad",
};

const FAKE_BRANDS = [
  { name: "bKash", color: "#E2136E", icon: "wallet" as const, tagline: "Send money instantly!" },
  { name: "Nagad", color: "#F7941E", icon: "cash" as const, tagline: "Bangladesh's fastest wallet" },
  { name: "ShajGoj", color: "#00A651", icon: "home" as const, tagline: "Find your dream home" },
  { name: "Chaldal", color: "#2ECC71", icon: "cart" as const, tagline: "Groceries in 1 hour" },
  { name: "Pathao", color: "#EA1C2D", icon: "bicycle" as const, tagline: "Ride & Deliver" },
];

export default function AdModal({
  visible, onClose, trigger, zoneId, adDuration = 5, adNetwork = "monetag", onAdComplete,
}: AdModalProps) {
  const [countdown, setCountdown] = useState(adDuration);
  const [adPhase, setAdPhase] = useState<"loading" | "showing" | "complete">("loading");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const [brand] = useState(() => FAKE_BRANDS[Math.floor(Math.random() * FAKE_BRANDS.length)]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setCountdown(adDuration);
      setAdPhase("loading");
      progressWidth.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: NATIVE_DRIVER }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 7, useNativeDriver: NATIVE_DRIVER }),
      ]).start();

      timerRef.current = setTimeout(() => {
        setAdPhase("showing");
        Animated.timing(progressWidth, {
          toValue: 1,
          duration: adDuration * 1000,
          useNativeDriver: false,
        }).start();

        let remaining = adDuration;
        tickRef.current = setInterval(() => {
          remaining -= 1;
          setCountdown(remaining);
          if (remaining <= 0) {
            if (tickRef.current) clearInterval(tickRef.current);
            setAdPhase("complete");
            onAdComplete?.();
          }
        }, 1000);
      }, 1200);
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      setAdPhase("loading");
      if (tickRef.current) clearInterval(tickRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, adDuration]);

  function handleClose() {
    if (tickRef.current) clearInterval(tickRef.current);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 180, useNativeDriver: NATIVE_DRIVER }),
    ]).start(onClose);
  }

  if (!visible) return null;

  const progressStyle = {
    width: progressWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.adContainer, { transform: [{ scale: scaleAnim }] }]}>

          <View style={styles.adHeader}>
            <View style={styles.adLabelRow}>
              <View style={styles.adSponsored}>
                <Ionicons name="megaphone" size={11} color={Colors.textMuted} />
                <Text style={styles.adSponsoredText}>ADVERTISEMENT</Text>
              </View>
              <Text style={styles.adNetworkLabel}>via {(adNetwork || "monetag").toUpperCase()}</Text>
            </View>
            {adPhase === "complete" ? (
              <Pressable style={styles.closeBtn} onPress={handleClose}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </Pressable>
            ) : (
              <View style={[styles.countdownBadge, adPhase === "loading" && styles.countdownLoading]}>
                <Text style={styles.countdownText}>{adPhase === "loading" ? "·" : String(countdown)}</Text>
              </View>
            )}
          </View>

          {adPhase === "loading" ? (
            <View style={styles.adLoadingBody}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.adLoadingText}>Loading advertisement...</Text>
              {!!zoneId && <Text style={styles.adZoneId}>Zone: {zoneId}</Text>}
            </View>
          ) : (
            <LinearGradient colors={[brand.color, brand.color + "AA"]} style={styles.adBody}>
              <View style={styles.adBodyInner}>
                <View style={styles.brandIconWrap}>
                  <Ionicons name={brand.icon} size={44} color="#fff" />
                </View>
                <Text style={styles.brandName}>{brand.name}</Text>
                <Text style={styles.brandTagline}>{brand.tagline}</Text>
                <View style={styles.adActionRow}>
                  <View style={styles.adActionBtn}>
                    <Text style={styles.adActionText}>Learn More</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </View>
                </View>
              </View>
              {!!zoneId && (
                <View style={styles.adWatermark}>
                  <Text style={styles.adZoneWatermark}>Zone: {zoneId}</Text>
                </View>
              )}
            </LinearGradient>
          )}

          <View style={styles.adProgressBar}>
            <Animated.View style={[styles.adProgressFill, progressStyle]} />
          </View>

          <View style={styles.adFooter}>
            <Text style={styles.adFooterLeft}>{AD_LABELS[trigger]}</Text>
            <Text style={[
              styles.adFooterRight,
              adPhase === "complete" && { color: Colors.success },
            ]}>
              {adPhase === "loading"
                ? "Please wait..."
                : adPhase === "complete"
                ? "Ad complete!"
                : countdown > 0
                ? `Skip in ${countdown}s`
                : "You can close this"}
            </Text>
          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  adContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  adHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  adLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  adSponsored: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  adSponsoredText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  adNetworkLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownLoading: { opacity: 0.4 },
  countdownText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
  adLoadingBody: {
    height: 230,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#F8F8F8",
  },
  adLoadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  adZoneId: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  adBody: { height: 230 },
  adBodyInner: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 20 },
  brandIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  brandName: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  brandTagline: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.9)" },
  adActionRow: { marginTop: 8 },
  adActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  adActionText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  adWatermark: { position: "absolute", bottom: 8, right: 10 },
  adZoneWatermark: { fontFamily: "Inter_400Regular", fontSize: 9, color: "rgba(255,255,255,0.5)" },
  adProgressBar: { height: 4, backgroundColor: "#F0F0F0", overflow: "hidden" },
  adProgressFill: { height: "100%", backgroundColor: Colors.primary },
  adFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  adFooterLeft: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.text },
  adFooterRight: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
});
