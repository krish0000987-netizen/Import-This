import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

const sections = [
  {
    title: "1. Independent Contractor Status",
    body: "Drivers are independent contractors, not employees of the company. Drivers are responsible for their own taxes, insurance, and expenses.",
  },
  {
    title: "2. Driver Eligibility",
    body: "Drivers must be 18+ years old, hold a valid driving license, vehicle registration, insurance, and any permits required by law.",
  },
  {
    title: "3. Vehicle Requirements",
    body: "Vehicles must be clean, roadworthy, and meet safety standards. The company may suspend drivers with unsafe vehicles.",
  },
  {
    title: "4. Driver Responsibilities",
    body: "Drivers must follow traffic laws, treat riders respectfully, avoid discrimination, and maintain professional behavior.\n\nNo drugs or alcohol drinks are allowed inside the car during rides.",
  },
  {
    title: "5. Earnings & Payments",
    body: "Drivers will receive payments after company commission deduction. Safar Go charges a fixed commission of 15% on every completed ride. This commission is automatically deducted from the ride fare before the remaining amount is credited to the driver's wallet.\n\nFor example, if the ride fare is ₹1,000, Safar Go retains ₹150 (15%) and the driver receives ₹850.\n\nPayments will be transferred weekly or as per app policy.",
  },
  {
    title: "6. Cancellation Rules",
    body: "Drivers must not cancel rides without valid reason. Repeated cancellations may result in suspension.",
  },
  {
    title: "7. Safety & Compliance",
    body: "Drivers must ensure passenger safety and follow all government regulations. Illegal activities are strictly prohibited.\n\nCarrying or consuming drugs or alcohol inside the car is strictly prohibited.",
  },
  {
    title: "8. Ratings & Complaints",
    body: "Drivers are subject to rider ratings. Low ratings or complaints may result in suspension or termination.",
  },
  {
    title: "9. Account Suspension",
    body: "The company may suspend accounts for fraud, misconduct, fake rides, or policy violations.",
  },
  {
    title: "10. Liability",
    body: "Drivers are responsible for accidents, damages, or legal issues during rides. Company is not liable unless required by law.",
  },
  {
    title: "11. Termination",
    body: "Either party may terminate agreement anytime with notice through the app or email.",
  },
  {
    title: "12. Governing Law",
    body: "This agreement is governed by the laws of India.",
  },
  {
    title: "13. Contact Information",
    body: "Company Name: SAFAR GO",
  },
];

export default function DriverAgreementScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Driver Agreement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.brandCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.brandIcon, { backgroundColor: Colors.gold + "15" }]}>
            <Ionicons name="car-sport" size={28} color={Colors.gold} />
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>SAFAR GO</Text>
          <Text style={[styles.brandSub, { color: colors.textSecondary }]}>
            Driver Partner Agreement
          </Text>
          <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>
            Last Updated: 1 March 2026
          </Text>
        </View>

        {sections.map((section, i) => (
          <View key={i} style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
  },
  brandCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  brandTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    marginBottom: 4,
  },
  brandSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
  lastUpdated: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
  },
  section: {
    padding: 18,
    borderRadius: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    marginBottom: 8,
  },
  sectionBody: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
});
