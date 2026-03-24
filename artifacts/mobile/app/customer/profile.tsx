import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Alert,
  Animated as RNAnimated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import LogoutModal from "@/components/LogoutModal";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const { bookings } = useData();

  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const avatarScale = useRef(new RNAnimated.Value(1)).current;

  const userBookings = bookings.filter(
    (b) => b.userId === user?.id || b.userId === "guest"
  );
  const completedTrips = userBookings.filter((b) => b.status === "completed").length;
  const confirmedTrips = userBookings.filter((b) => b.status === "confirmed").length;
  const totalUserTrips = userBookings.length;

  const walletBalance = (user as any)?.walletBalance ?? 0;
  const memberSince = (user as any)?.memberSince
    ? new Date((user as any).memberSince).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "2025";

  const totalSpent = userBookings
    .filter((b) => b.status === "completed" || b.status === "confirmed")
    .reduce((s, b) => s + b.fare, 0);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleAvatarPress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    RNAnimated.sequence([
      RNAnimated.timing(avatarScale, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      RNAnimated.timing(avatarScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => setEditModalVisible(true));
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Validation", "Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateUser({ name: editName.trim(), phone: editPhone.trim() });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLogout(true);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setShowLogout(false);
    router.replace("/");
  };

  const handleNav = (route: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const accountItems = [
    {
      icon: "car-outline",
      label: "My Rides",
      sub: `${totalUserTrips} total trips`,
      iconColor: "#1976D2",
      iconBg: isDark ? "#1976D220" : "#E3F2FD",
      route: "/customer/rides",
    },
    {
      icon: "heart-outline",
      label: "Saved Places",
      sub: "Favorites & home/work",
      iconColor: "#E91E63",
      iconBg: isDark ? "#E91E6320" : "#FCE4EC",
      route: "/customer/favorites",
    },
    {
      icon: "wallet-outline",
      label: "Wallet",
      sub: `₹${walletBalance.toLocaleString()} available`,
      iconColor: "#4CAF50",
      iconBg: isDark ? "#4CAF5020" : "#E8F5E9",
      route: "/customer/wallet",
    },
  ];

  const settingsItems = [
    {
      icon: "notifications-outline",
      label: "Notifications",
      sub: "Manage alerts & reminders",
      iconColor: "#9C27B0",
      iconBg: isDark ? "#9C27B020" : "#F3E5F5",
      route: "/customer/notifications",
    },
    {
      icon: "shield-checkmark-outline",
      label: "Privacy & Security",
      sub: "Data & account safety",
      iconColor: "#00897B",
      iconBg: isDark ? "#00897B20" : "#E0F2F1",
      route: "/customer/privacy",
    },
    {
      icon: "help-circle-outline",
      label: "Help & Support",
      sub: "Contact us, FAQs",
      iconColor: "#FF5722",
      iconBg: isDark ? "#FF572220" : "#FBE9E7",
      route: "/customer/support",
    },
    {
      icon: "document-text-outline",
      label: "Terms & Conditions",
      sub: "Legal & policies",
      iconColor: Colors.gold,
      iconBg: Colors.gold + (isDark ? "20" : "15"),
      route: "/terms",
    },
    {
      icon: "information-circle-outline",
      label: "About Safar Go",
      sub: "Version, licenses",
      iconColor: "#607D8B",
      iconBg: isDark ? "#607D8B20" : "#ECEFF1",
      route: "/customer/about",
    },
  ];

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero header */}
        <LinearGradient
          colors={isDark ? ["#1a1a10", "#0A0A0A"] : ["#3a2a00", "#1a1200"]}
          style={[
            styles.hero,
            { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20 },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Header row */}
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>Profile</Text>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleTheme();
              }}
              style={[styles.themeBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={18}
                color="#fff"
              />
            </Pressable>
          </View>

          {/* Avatar */}
          <Animated.View entering={ZoomIn.delay(100).duration(500)} style={styles.avatarSection}>
            <Pressable onPress={handleAvatarPress}>
              <RNAnimated.View style={{ transform: [{ scale: avatarScale }] }}>
                <LinearGradient
                  colors={[Colors.gold, Colors.goldDark]}
                  style={styles.avatarRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.avatarInner}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                </LinearGradient>
                <View style={styles.editBadge}>
                  <Ionicons name="pencil" size={12} color="#0A0A0A" />
                </View>
              </RNAnimated.View>
            </Pressable>

            <Text style={styles.heroName}>{user?.name || "Traveller"}</Text>
            <Text style={styles.heroEmail}>{user?.email || ""}</Text>

            {user?.phone ? (
              <View style={styles.phonePill}>
                <Ionicons name="call-outline" size={13} color={Colors.gold} />
                <Text style={styles.phonePillText}>{user.phone}</Text>
              </View>
            ) : null}

            {/* Premium badge */}
            <Pressable
              onPress={() => handleNav("/customer/wallet")}
              style={styles.premiumBadge}
            >
              <LinearGradient
                colors={[Colors.gold + "40", Colors.gold + "18"]}
                style={styles.premiumGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="diamond-outline" size={14} color={Colors.gold} />
                <Text style={styles.premiumText}>Safar Premium Member</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.gold} />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Stats row */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.statsRow}>
            <StatChip
              icon="car"
              value={String(totalUserTrips)}
              label="Trips"
              colors={colors}
            />
            <View style={styles.statsDivider} />
            <StatChip
              icon="checkmark-circle"
              value={String(completedTrips + confirmedTrips)}
              label="Completed"
              colors={colors}
            />
            <View style={styles.statsDivider} />
            <StatChip
              icon="cash-outline"
              value={`₹${totalSpent > 0 ? (totalSpent / 1000).toFixed(1) + "k" : "0"}`}
              label="Spent"
              colors={colors}
            />
            <View style={styles.statsDivider} />
            <StatChip
              icon="calendar-outline"
              value={memberSince}
              label="Member"
              colors={colors}
            />
          </Animated.View>
        </LinearGradient>

        {/* Quick edit bar */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.quickEditWrap}>
          <Pressable
            onPress={() => setEditModalVisible(true)}
            style={({ pressed }) => [
              styles.quickEditBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="create-outline" size={18} color={Colors.gold} />
            <Text style={[styles.quickEditText, { color: colors.text }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </Animated.View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Account section */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MY ACCOUNT</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {accountItems.map((item, i) => (
                <React.Fragment key={i}>
                  <Pressable
                    onPress={() => handleNav(item.route)}
                    style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon as any} size={19} color={item.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.menuSub, { color: colors.textSecondary }]}>{item.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
                  </Pressable>
                  {i < accountItems.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </Animated.View>

          {/* Settings section */}
          <Animated.View entering={FadeInDown.delay(280).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SETTINGS</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Theme toggle row */}
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }}
                style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: isDark ? "#FF980020" : "#FF9800" + "20" },
                  ]}
                >
                  <Ionicons
                    name={isDark ? "sunny-outline" : "moon-outline"}
                    size={19}
                    color="#FF9800"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, { color: colors.text }]}>
                    {isDark ? "Light Mode" : "Dark Mode"}
                  </Text>
                  <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                    {isDark ? "Switch to light theme" : "Switch to dark theme"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggle,
                    { backgroundColor: isDark ? Colors.gold : colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      { transform: [{ translateX: isDark ? 18 : 0 }] },
                    ]}
                  />
                </View>
              </Pressable>
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

              {settingsItems.map((item, i) => (
                <React.Fragment key={i}>
                  <Pressable
                    onPress={() => handleNav(item.route)}
                    style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon as any} size={19} color={item.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.menuSub, { color: colors.textSecondary }]}>{item.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
                  </Pressable>
                  {i < settingsItems.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </Animated.View>

          {/* App info */}
          <Animated.View entering={FadeInDown.delay(360).duration(500)} style={[styles.appInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.appInfoLeft}>
              <LinearGradient colors={[Colors.gold, Colors.goldDark]} style={styles.appLogo}>
                <Ionicons name="car-sport" size={20} color="#0A0A0A" />
              </LinearGradient>
              <View>
                <Text style={[styles.appName, { color: colors.text }]}>Safar Go</Text>
                <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
                  Version 1.0.0 · Premium
                </Text>
              </View>
            </View>
            <View style={styles.appRatingWrap}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name="star" size={12} color={Colors.gold} />
              ))}
            </View>
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(440).duration(500)}>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutBtn,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setEditModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDark ? "#141410" : colors.surface,
                paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 0) + 16,
              },
            ]}
          >
            {/* Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Edit Profile</Text>
              <Pressable
                onPress={() => setEditModalVisible(false)}
                style={[styles.sheetCloseBtn, { backgroundColor: colors.background }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Avatar preview */}
            <View style={styles.sheetAvatarWrap}>
              <LinearGradient
                colors={[Colors.gold, Colors.goldDark]}
                style={styles.sheetAvatar}
              >
                <Text style={styles.sheetAvatarInitials}>{initials}</Text>
              </LinearGradient>
            </View>

            {/* Form fields */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <View
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? "#1a1a14" : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="person-outline" size={17} color={colors.textSecondary} />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your full name"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Phone Number</Text>
              <View
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? "#1a1a14" : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="call-outline" size={17} color={colors.textSecondary} />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+91 XXXXX XXXXX"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <View
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? "#1a1a14" : colors.background,
                    borderColor: colors.border,
                    opacity: 0.6,
                  },
                ]}
              >
                <Ionicons name="mail-outline" size={17} color={colors.textSecondary} />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  value={user?.email || ""}
                  editable={false}
                  placeholder="Email"
                  placeholderTextColor={colors.textTertiary}
                />
                <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
              </View>
            </View>

            <Pressable
              onPress={handleSaveProfile}
              disabled={saving}
              style={({ pressed }) => [styles.saveBtn, { opacity: pressed || saving ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[Colors.gold, Colors.goldDark]}
                style={styles.saveBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={saving ? "hourglass-outline" : "checkmark"} size={18} color="#0A0A0A" />
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <LogoutModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </>
  );
}

function StatChip({
  icon,
  value,
  label,
  colors,
}: {
  icon: string;
  value: string;
  label: string;
  colors: any;
}) {
  return (
    <View style={statStyles.wrap}>
      <Ionicons name={icon as any} size={14} color={Colors.gold} />
      <Text style={statStyles.val}>{value}</Text>
      <Text style={statStyles.lbl}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", gap: 4 },
  val: { fontFamily: "Poppins_700Bold", fontSize: 15, color: "#fff" },
  lbl: { fontFamily: "Poppins_400Regular", fontSize: 10, color: "rgba(255,255,255,0.5)" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Hero */
  hero: { paddingHorizontal: 20, paddingBottom: 0 },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  heroTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: "#fff",
  },
  themeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Avatar */
  avatarSection: { alignItems: "center", gap: 8, paddingBottom: 24 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1a1200",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    color: Colors.gold,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0A0A0A",
  },
  heroName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    color: "#fff",
    marginTop: 4,
  },
  heroEmail: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
  },
  phonePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  phonePillText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  premiumBadge: { borderRadius: 20, overflow: "hidden", marginTop: 4 },
  premiumGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gold + "40",
  },
  premiumText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.gold,
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 0,
    marginTop: 8,
    marginHorizontal: -20,
  },
  statsDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "stretch",
  },

  /* Quick edit */
  quickEditWrap: { paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
  quickEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickEditText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    flex: 1,
  },

  /* Section */
  sectionTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  menuSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 1 },
  rowDivider: { height: 1, marginLeft: 70 },

  /* Toggle */
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
  },

  /* App info */
  appInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 20,
  },
  appInfoLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  appLogo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  appVersion: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  appRatingWrap: { flexDirection: "row", gap: 2 },

  /* Logout */
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "rgba(231,76,60,0.08)",
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(231,76,60,0.2)",
  },
  logoutText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#E74C3C" },

  /* Edit Modal */
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetAvatarWrap: { alignItems: "center", paddingVertical: 8 },
  sheetAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetAvatarInitials: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    color: "#0A0A0A",
  },
  formGroup: { gap: 8 },
  formLabel: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  formInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputText: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 15, padding: 0 },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  saveBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0A0A0A" },
});
