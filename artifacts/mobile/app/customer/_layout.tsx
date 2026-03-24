import React from "react";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Book</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rides">
        <Icon sf={{ default: "car.side", selected: "car.side.fill" }} />
        <Label>My Rides</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="destinations">
        <Icon sf={{ default: "mappin.and.ellipse", selected: "mappin.and.ellipse" }} />
        <Label>Tours</Label>
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
        name="index"
        options={{
          title: "Book",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="menu-book" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: "My Rides",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="directions-car" size={24} color={color} />
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
      <Tabs.Screen
        name="destinations"
        options={{
          title: "Tours",
          tabBarIcon: ({ color }) => (
            <Ionicons name="map-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
    </Tabs>
  );
}

export default function CustomerLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
