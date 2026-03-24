import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

const faqs = [
  {
    q: "How do I cancel a booking?",
    a: "Go to My Rides, tap on the active booking, and select 'Cancel Booking'. Free cancellation is available up to 2 hours before the trip.",
  },
  {
    q: "What is the refund policy?",
    a: "Refunds for eligible cancellations are processed within 3–5 business days to your original payment method or Safar Go wallet.",
  },
  {
    q: "How are fares calculated?",
    a: "Fares are based on distance from Lucknow at a fixed per-km rate. Sedan fares start at \u20B910/km and SUV at \u20B914/km.",
  },
  {
    q: "Can I schedule a ride in advance?",
    a: "Yes! When booking, tap 'Schedule' to pick a future date and time for your ride.",
  },
  {
    q: "How do I contact my driver?",
    a: "Once a driver is assigned, their phone number appears on the booking screen. You can call them directly.",
  },
  {
    q: "Is my payment secure?",
    a: "All payments are processed through secure, PCI-DSS compliant gateways. We never store your card details.",
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Missing Info", "Please fill in both subject and message.");
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Ticket Raised", "Your support request has been submitted. We'll respond within 24 hours.", [
      { text: "OK", onPress: () => { setSubject(""); setMessage(""); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={[styles.quickRow]}>
          {[
            { icon: "call-outline", label: "Call Us", color: "#4CAF50", bg: "#E8F5E9" },
            { icon: "chatbubble-outline", label: "Live Chat", color: "#1976D2", bg: "#E3F2FD" },
            { icon: "mail-outline", label: "Email", color: Colors.gold, bg: Colors.gold + "15" },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => Alert.alert(item.label, `Connect via ${item.label} — feature coming soon.`)}
              style={[styles.quickCard, { backgroundColor: colors.surface }]}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={[styles.quickLabel, { color: colors.text }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
        {faqs.map((faq, i) => (
          <Pressable
            key={i}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpandedFaq(expandedFaq === i ? null : i);
            }}
            style={[styles.faqItem, { backgroundColor: colors.surface }]}
          >
            <View style={styles.faqHeader}>
              <Text style={[styles.faqQ, { color: colors.text, flex: 1, marginRight: 8 }]}>{faq.q}</Text>
              <Ionicons
                name={expandedFaq === i ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textTertiary}
              />
            </View>
            {expandedFaq === i && (
              <Text style={[styles.faqA, { color: colors.textSecondary }]}>{faq.a}</Text>
            )}
          </Pressable>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Support</Text>
        <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Subject</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            placeholder="What's your issue about?"
            placeholderTextColor={colors.textTertiary}
            value={subject}
            onChangeText={setSubject}
          />
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Message</Text>
          <TextInput
            style={[styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            placeholder="Describe your issue in detail..."
            placeholderTextColor={colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Pressable onPress={handleSubmit} style={styles.submitBtn}>
            <Ionicons name="send" size={16} color="#0A0A0A" />
            <Text style={styles.submitText}>Submit Ticket</Text>
          </Pressable>
        </View>
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
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickCard: { flex: 1, alignItems: "center", padding: 16, borderRadius: 14, gap: 8 },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  sectionTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, marginBottom: 12 },
  faqItem: { borderRadius: 14, padding: 16, marginBottom: 8 },
  faqHeader: { flexDirection: "row", alignItems: "center" },
  faqQ: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  faqA: { fontFamily: "Poppins_400Regular", fontSize: 13, marginTop: 10, lineHeight: 20 },
  contactCard: { borderRadius: 16, padding: 16 },
  fieldLabel: { fontFamily: "Poppins_500Medium", fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Poppins_400Regular", fontSize: 14, marginBottom: 12 },
  textArea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Poppins_400Regular", fontSize: 14, marginBottom: 16, minHeight: 100 },
  submitBtn: {
    backgroundColor: Colors.gold, borderRadius: 12, paddingVertical: 13,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  submitText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0A0A0A" },
});
