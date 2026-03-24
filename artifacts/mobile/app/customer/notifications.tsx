import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

const notifGroups = [
  {
    title: "Ride Updates",
    items: [
      { key: "booking_confirmed", label: "Booking Confirmed", sub: "When your ride is confirmed" },
      { key: "driver_assigned", label: "Driver Assigned", sub: "When a driver accepts your booking" },
      { key: "driver_arrived", label: "Driver Arrived", sub: "When driver reaches pickup point" },
      { key: "ride_started", label: "Ride Started", sub: "When your ride begins" },
      { key: "ride_completed", label: "Ride Completed", sub: "On successful trip completion" },
    ],
  },
  {
    title: "Payments & Offers",
    items: [
      { key: "payment_success", label: "Payment Successful", sub: "Transaction confirmations" },
      { key: "cashback", label: "Cashback Credited", sub: "When cashback is added to wallet" },
      { key: "offers", label: "Exclusive Offers", sub: "Deals and discounts for you" },
      { key: "wallet_low", label: "Low Wallet Balance", sub: "When balance drops below \u20B9100" },
    ],
  },
  {
    title: "General",
    items: [
      { key: "app_updates", label: "App Updates", sub: "New features and improvements" },
      { key: "support_reply", label: "Support Replies", sub: "Responses to your queries" },
    ],
  },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [settings, setSettings] = useState<Record<string, boolean>>({
    booking_confirmed: true,
    driver_assigned: true,
    driver_arrived: true,
    ride_started: true,
    ride_completed: true,
    payment_success: true,
    cashback: true,
    offers: false,
    wallet_low: true,
    app_updates: false,
    support_reply: true,
  });

  const toggle = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Choose which notifications you want to receive from Safar Go.
        </Text>

        {notifGroups.map((group) => (
          <View key={group.title} style={{ marginBottom: 24 }}>
            <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {group.items.map((item, i) => (
                <View
                  key={item.key}
                  style={[
                    styles.row,
                    i < group.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{item.sub}</Text>
                  </View>
                  <Switch
                    value={settings[item.key] ?? false}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: colors.border, true: Colors.gold + "80" }}
                    thumbColor={settings[item.key] ? Colors.gold : "#f4f3f4"}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  intro: { fontFamily: "Poppins_400Regular", fontSize: 14, marginBottom: 24, lineHeight: 20 },
  groupTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14, marginBottom: 10 },
  card: { borderRadius: 16, overflow: "hidden" },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLabel: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  rowSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
});
