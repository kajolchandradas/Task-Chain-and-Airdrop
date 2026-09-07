import React, {
  createContext, useContext, useState, useRef,
  useCallback, useEffect, ReactNode,
} from "react";
import AdModal, { AdTrigger } from "@/components/AdModal";
import { getApiUrl } from "@/lib/query-client";

interface AdSettings {
  ads_enabled: boolean;
  ads_on_click: boolean;
  ads_on_claim: boolean;
  ads_on_game: boolean;
  ads_on_watch: boolean;
  ads_on_checkin: boolean;
  ads_on_event: boolean;
  ad_zone_id: string;
  ad_zone_interstitial: string;
  ad_zone_rewarded: string;
  ad_zone_native: string;
  ad_network: string;
  ad_duration: number;
  ad_click_cooldown: number;
  ad_max_per_session: number;
}

const defaultSettings: AdSettings = {
  ads_enabled: true,
  ads_on_click: false,
  ads_on_claim: true,
  ads_on_game: true,
  ads_on_watch: true,
  ads_on_checkin: true,
  ads_on_event: true,
  ad_zone_id: "",
  ad_zone_interstitial: "",
  ad_zone_rewarded: "",
  ad_zone_native: "",
  ad_network: "monetag",
  ad_duration: 5,
  ad_click_cooldown: 60,
  ad_max_per_session: 20,
};

interface AdContextValue {
  settings: AdSettings;
  showAd: (trigger: AdTrigger, onComplete?: () => void) => void;
  refreshSettings: () => Promise<void>;
  sessionAdCount: number;
}

const AdContext = createContext<AdContextValue | null>(null);

export function AdProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AdSettings>(defaultSettings);
  const [visible, setVisible] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState<AdTrigger>("manual");
  const [onCompleteCallback, setOnCompleteCallback] = useState<(() => void) | undefined>();
  const [sessionAdCount, setSessionAdCount] = useState(0);

  const lastClickAdTime = useRef<number>(0);
  const pendingCallback = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    refreshSettings();
  }, []);

  async function refreshSettings() {
    try {
      const res = await fetch(`${getApiUrl()}api/settings/public`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          ads_enabled: data.ads_enabled !== "false",
          ads_on_click: data.ads_on_click === "true",
          ads_on_claim: data.ads_on_claim !== "false",
          ads_on_game: data.ads_on_game !== "false",
          ads_on_watch: data.ads_on_watch !== "false",
          ads_on_checkin: data.ads_on_checkin !== "false",
          ads_on_event: data.ads_on_event !== "false",
          ad_zone_id: data.ad_zone_id ?? "",
          ad_zone_interstitial: data.ad_zone_interstitial ?? "",
          ad_zone_rewarded: data.ad_zone_rewarded ?? "",
          ad_zone_native: data.ad_zone_native ?? "",
          ad_network: data.ad_network ?? "monetag",
          ad_duration: parseInt(data.ad_duration ?? "5", 10),
          ad_click_cooldown: parseInt(data.ad_click_cooldown ?? "60", 10),
          ad_max_per_session: parseInt(data.ad_max_per_session ?? "20", 10),
        });
      }
    } catch {
      // use defaults
    }
  }

  const showAd = useCallback((trigger: AdTrigger, onComplete?: () => void) => {
    const s = settings;

    // Product policy: never interrupt navigation or any user tap with an ad.
    // Keep the setting in the admin API for backward compatibility, but do
    // not allow it to activate click-triggered interstitials.
    if (trigger === "click") {
      onComplete?.();
      return;
    }

    if (!s.ads_enabled) {
      onComplete?.();
      return;
    }

    if (sessionAdCount >= s.ad_max_per_session) {
      onComplete?.();
      return;
    }

    if (trigger === "claim" && !s.ads_on_claim) { onComplete?.(); return; }
    if (trigger === "game" && !s.ads_on_game) { onComplete?.(); return; }
    if (trigger === "watch" && !s.ads_on_watch) { onComplete?.(); return; }
    if (trigger === "checkin" && !s.ads_on_checkin) { onComplete?.(); return; }
    if (trigger === "event" && !s.ads_on_event) { onComplete?.(); return; }

    pendingCallback.current = onComplete;
    setCurrentTrigger(trigger);
    setSessionAdCount(prev => prev + 1);
    setVisible(true);
  }, [settings, sessionAdCount]);

  function handleAdComplete() {
    pendingCallback.current?.();
    pendingCallback.current = undefined;
  }

  function handleClose() {
    setVisible(false);
    pendingCallback.current?.();
    pendingCallback.current = undefined;
  }

  const zoneId = currentTrigger === "watch"
    ? (settings.ad_zone_rewarded || settings.ad_zone_id)
    : (settings.ad_zone_interstitial || settings.ad_zone_id);

  return (
    <AdContext.Provider value={{ settings, showAd, refreshSettings, sessionAdCount }}>
      {children}
      <AdModal
        visible={visible}
        onClose={handleClose}
        trigger={currentTrigger}
        zoneId={zoneId}
        adDuration={settings.ad_duration}
        adNetwork={settings.ad_network}
        onAdComplete={handleAdComplete}
      />
    </AdContext.Provider>
  );
}

export function useAd() {
  const ctx = useContext(AdContext);
  if (!ctx) throw new Error("useAd must be used within AdProvider");
  return ctx;
}
