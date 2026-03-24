import React from "react";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@/components/icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "speedometer", selected: "speedometer" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="earnings">
        <Icon sf={{ default: "indianrupeesign.circle", selected: "indianrupeesign.circle.fill" }} />
        <Label>Earnings</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { isDark } = useTheme();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: isDark ? "#6B6B6B" : "#9E9E9E",
        tabBarStyle: {
          position: "absolute" as const,
          backgroundColor: isIOS ? "transparent" : isDark ? "#0A0A0A" : "#FAFAF8",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: isDark ? "#2A2A26" : "#E8E4DC",
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#0A0A0A" : "#FAFAF8" }]} />
          ) : null,
        tabBarLabelStyle: { fontFamily: "Poppins_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="pending"
        options={{ href: null, title: "Pending" }}
      />
      <Tabs.Screen
        name="trip"
        options={{ href: null, title: "Active Trip" }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "speedometer" : "speedometer-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function DriverLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
