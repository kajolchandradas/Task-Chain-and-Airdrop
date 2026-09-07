import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AdProvider, useAd } from "@/context/AdContext";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const { showAd, settings } = useAd();
  const touchCount = useRef(0);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/(auth)/login");
      }
    }
  }, [user, isLoading]);

  function handleGlobalTouch() {
    if (!user) return;
    if (settings.ads_on_click && settings.ads_enabled) {
      touchCount.current += 1;
      showAd("click");
    }
  }

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponder={() => {
        if (settings.ads_on_click && settings.ads_enabled) {
          handleGlobalTouch();
        }
        return false;
      }}
    >
      <Stack initialRouteName="(auth)" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="admin/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/panel" options={{ headerShown: false }} />
        <Stack.Screen name="game/[type]" options={{ headerShown: false }} />
        <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
        <Stack.Screen name="support" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AdProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AdProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
