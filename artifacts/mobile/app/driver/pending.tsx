import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Animated as RNAnimated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { DriverData } from "@/constants/data";
import LogoutModal from "@/components/LogoutModal";
import { useState } from "react";

export default function DriverPendingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuth();
  const driver = user as DriverData;

  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const rotateAnim = useRef(new RNAnimated.Value(0)).current;

  const isRejected = driver?.kycStatus === "rejected";
  const isSubmitted = driver?.kycStatus === "submitted";
  const isPending = driver?.kycStatus === "pending";

  useEffect(() => {
    if (!isRejected) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();

      RNAnimated.loop(
        RNAnimated.timing(rotateAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
      ).start();
    }
  }, []);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const steps = [
    { icon: "create-outline", label: "Registration Submitted", done: true },
    {
      icon: "document-text-outline",
      label: "Documents Uploaded",
      done: isSubmitted || isRejected,
      pending: isPending,
    },
    {
      icon: "shield-checkmark-outline",
      label: "Admin Review",
      done: isRejected,
      pending: isSubmitted,
      rejected: isRejected,
    },
    { icon: "car-outline", label: "Start Accepting Rides", done: false, pending: isSubmitted },
  ];

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setShowLogout(false);
    router.replace("/");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 24,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <RNAnimated.View style={[styles.iconOuter, { transform: [{ scale: pulseAnim }], backgroundColor: isRejected ? "#E74C3C18" : Colors.gold + "18" }]}>
            {isRejected ? (
              <Ionicons name="close-circle" size={56} color="#E74C3C" />
            ) : (
              <RNAnimated.View style={{ transform: [{ rotate: isSubmitted ? spin : "0deg" }] }}>
                <Ionicons name={isSubmitted ? "time" : "hourglass-outline"} size={56} color={Colors.gold} />
              </RNAnimated.View>
            )}
          </RNAnimated.View>

          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {isRejected ? "Application Rejected" : isSubmitted ? "Under Review" : "Complete Your Profile"}
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            {isRejected
              ? "Your application was not approved. Please re-apply with correct documents."
              : isSubmitted
              ? "Your application is being reviewed. We'll notify you within 24–48 hours."
              : "Upload your documents to complete the verification process."}
          </Text>
        </View>

        {isPending && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/driver-register");
            }}
            style={styles.primaryBtnWrapper}
          >
            <LinearGradient
              colors={[Colors.gold, Colors.goldDark]}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="document-text-outline" size={18} color="#0A0A0A" />
              <Text style={styles.primaryBtnText}>Complete Registration</Text>
            </LinearGradient>
          </Pressable>
        )}

        {isRejected && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/driver-register");
            }}
            style={styles.primaryBtnWrapper}
          >
            <LinearGradient
              colors={["#E74C3C", "#C0392B"]}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="refresh-outline" size={18} color="#fff" />
              <Text style={[styles.primaryBtnText, { color: "#fff" }]}>Re-apply Now</Text>
            </LinearGradient>
          </Pressable>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Application Progress</Text>
          {steps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View style={[
                  styles.stepIcon,
                  {
                    backgroundColor: s.rejected ? "#E74C3C20" : s.done ? "#2ECC7120" : s.pending ? Colors.gold + "20" : (isDark ? "#1A1A1A" : "#F0F0F0"),
                    borderColor: s.rejected ? "#E74C3C" : s.done ? "#2ECC71" : s.pending ? Colors.gold : colors.border,
                  },
                ]}>
                  <Ionicons
                    name={s.icon as any}
                    size={16}
                    color={s.rejected ? "#E74C3C" : s.done ? "#2ECC71" : s.pending ? Colors.gold : colors.textTertiary}
                  />
                </View>
                {i < steps.length - 1 && (
                  <View style={[styles.stepLine, { backgroundColor: s.done ? "#2ECC7140" : colors.border }]} />
                )}
              </View>
              <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 24 : 0 }}>
                <Text style={[styles.stepLabel, { color: s.done || s.pending ? colors.text : colors.textSecondary }]}>
                  {s.label}
                </Text>
                {s.rejected && (
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: "#E74C3C", marginTop: 2 }}>
                    Not approved
                  </Text>
                )}
                {s.pending && !s.rejected && (
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: Colors.gold, marginTop: 2 }}>
                    In progress
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {isSubmitted && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>What Happens Next</Text>
            {[
              { icon: "search-outline", text: "Our team reviews your submitted documents" },
              { icon: "call-outline", text: "We may contact you for additional info" },
              { icon: "notifications-outline", text: "You'll get a notification when approved" },
              { icon: "car-outline", text: "Start accepting rides and earning immediately" },
            ].map((item, i) => (
              <View key={i} style={styles.nextRow}>
                <View style={[styles.nextIcon, { backgroundColor: Colors.gold + "18" }]}>
                  <Ionicons name={item.icon as any} size={14} color={Colors.gold} />
                </View>
                <Text style={[styles.nextText, { color: colors.textSecondary }]}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Account Info</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Name</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{driver?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{driver?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{driver?.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: isRejected ? "#E74C3C20" : isSubmitted ? Colors.gold + "20" : "#2ECC7120" }]}>
              <Text style={[styles.statusText, { color: isRejected ? "#E74C3C" : isSubmitted ? Colors.gold : "#2ECC71" }]}>
                {driver?.kycStatus?.charAt(0).toUpperCase() + driver?.kycStatus?.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => setShowLogout(true)}
          style={[styles.logoutBtn, { backgroundColor: "#E74C3C10" }]}
        >
          <Ionicons name="log-out-outline" size={18} color="#E74C3C" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

      <LogoutModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { alignItems: "center", paddingVertical: 16, gap: 12, marginBottom: 24 },
  iconOuter: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, textAlign: "center" },
  heroSub: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 320 },
  primaryBtnWrapper: { borderRadius: 16, overflow: "hidden", marginBottom: 20 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 17 },
  primaryBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#0A0A0A" },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 14, gap: 14 },
  cardTitle: { fontFamily: "Poppins_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  stepRow: { flexDirection: "row", gap: 14 },
  stepLeft: { alignItems: "center", width: 32 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  stepLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 4 },
  stepLabel: { fontFamily: "Poppins_500Medium", fontSize: 14, paddingTop: 6 },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  nextIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  nextText: { fontFamily: "Poppins_400Regular", fontSize: 13, flex: 1 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  infoValue: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 4 },
  logoutText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#E74C3C" },
});
