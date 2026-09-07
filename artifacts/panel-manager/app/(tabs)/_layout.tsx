import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="earn">
        <NativeTabs.Trigger.Icon
          sf={{ default: "play.rectangle", selected: "play.rectangle.fill" }}
        />
        <NativeTabs.Trigger.Label>Earn</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="games">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gamecontroller", selected: "gamecontroller.fill" }}
        />
        <NativeTabs.Trigger.Label>Games</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet">
        <NativeTabs.Trigger.Icon
          sf={{ default: "wallet.pass", selected: "wallet.pass.fill" }}
        />
        <NativeTabs.Trigger.Label>Wallet</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
        />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#fff",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#fff" }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="house.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="home" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="earn"
        options={{
          title: "Earn",
          tabBarIcon: ({ color, size }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="play.rectangle.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="play-circle" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: "Games",
          tabBarIcon: ({ color, size }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="gamecontroller.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="game-controller" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, size }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="creditcard.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="wallet" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="person.fill" tintColor={color} size={size} />
            ) : (
              <Ionicons name="person" size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
