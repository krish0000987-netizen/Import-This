import React, { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DriverData } from "@/constants/data";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import LogoutModal from "@/components/LogoutModal";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePricing } from "@/contexts/PricingContext";
import { useData } from "@/contexts/DataContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5001";

export default function ManageScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { config: pricingConfig } = usePricing();
  const {
    getStats, coupons, addCoupon, updateCoupon, deleteCoupon,
    tickets, updateTicket, withdrawals,
    commissionRate, setCommissionRate,
  } = useData();
  const stats = getStats();

  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDiscountType, setNewDiscountType] = useState<"flat" | "percentage">("percentage");
  const [newDiscountValue, setNewDiscountValue] = useState("");
  const [newMinOrder, setNewMinOrder] = useState("1000");
  const [newMaxDiscount, setNewMaxDiscount] = useState("500");
  const [newExpiry, setNewExpiry] = useState("2026-12-31");
  const [newDescription, setNewDescription] = useState("");
  const [showTicketResponse, setShowTicketResponse] = useState<string | null>(null);
  const [ticketResponseText, setTicketResponseText] = useState("");

  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  const [pendingDrivers, setPendingDrivers] = useState<DriverData[]>([]);
  const [driverActionLoading, setDriverActionLoading] = useState<string | null>(null);

  const loadPendingDrivers = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("@safargo_pending_drivers");
      if (stored) {
        const all: DriverData[] = JSON.parse(stored);
        setPendingDrivers(all.filter((d) => d.kycStatus === "submitted"));
      }
    } catch (e) {
      console.error("Failed to load pending drivers", e);
    }
  }, []);

  useEffect(() => {
    loadPendingDrivers();
  }, [loadPendingDrivers]);

  const handleDriverDecision = async (driver: DriverData, decision: "approved" | "rejected") => {
    if (Platform.OS !== "web") {
      decision === "approved"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setDriverActionLoading(driver.id);
    try {
      const updated: DriverData = { ...driver, kycStatus: decision };
      await AsyncStorage.setItem("@safargo_registered_" + driver.email, JSON.stringify(updated));
      const stored = await AsyncStorage.getItem("@safargo_pending_drivers");
      if (stored) {
        const all: DriverData[] = JSON.parse(stored);
        const updatedAll = all.map((d) => d.id === driver.id ? updated : d);
        await AsyncStorage.setItem("@safargo_pending_drivers", JSON.stringify(updatedAll));
      }
      setPendingDrivers((prev) => prev.filter((d) => d.id !== driver.id));
    } catch (e) {
      Alert.alert("Error", "Failed to update driver status.");
    } finally {
      setDriverActionLoading(null);
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

  const handleAddCoupon = () => {
    if (!newCode.trim() || !newDiscountValue) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    addCoupon({
      code: newCode.toUpperCase(),
      discountType: newDiscountType,
      discountValue: parseInt(newDiscountValue),
      minOrderAmount: parseInt(newMinOrder) || 0,
      maxDiscount: parseInt(newMaxDiscount) || 500,
      usageLimit: 100,
      usedCount: 0,
      expiryDate: newExpiry,
      isActive: true,
      description: newDescription || `${newDiscountType === "percentage" ? newDiscountValue + "%" : "\u20B9" + newDiscountValue} off`,
    });
    setShowAddCoupon(false);
    setNewCode(""); setNewDiscountValue(""); setNewDescription("");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRespondTicket = () => {
    if (!showTicketResponse || !ticketResponseText.trim()) return;
    updateTicket(showTicketResponse, { response: ticketResponseText, status: "resolved" });
    setShowTicketResponse(null);
    setTicketResponseText("");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleBroadcast = async () => {
    const msg = broadcastMsg.trim();
    if (!msg) { Alert.alert("Empty Message", "Please type a message before sending."); return; }
    setBroadcasting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastMsg("");
        Alert.alert("Broadcast Sent", `Message delivered to ${data.recipients ?? "all"} connected users.`);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Error", data.error || "Failed to send broadcast.");
      }
    } catch {
      Alert.alert("Error", "Could not reach server. Is the backend running?");
    } finally {
      setBroadcasting(false);
    }
  };

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const approvedWithdrawals = withdrawals.filter((w) => w.status === "approved");
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Manage</Text>

        <Animated.View entering={FadeInDown.delay(50).duration(500)}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Driver Applications</Text>
            {pendingDrivers.length > 0 && (
              <View style={styles.badgeRed}>
                <Text style={styles.badgeText}>{pendingDrivers.length}</Text>
              </View>
            )}
          </View>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {pendingDrivers.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="checkmark-circle-outline" size={28} color="#2ECC71" />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending applications</Text>
              </View>
            ) : (
              pendingDrivers.map((driver, idx) => (
                <View key={driver.id}>
                  {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={styles.driverAppCard}>
                    <View style={styles.driverAppHeader}>
                      <View style={[styles.driverAvatar, { backgroundColor: Colors.gold + "20" }]}>
                        <Text style={[styles.driverInitial, { color: Colors.gold }]}>
                          {driver.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.driverName, { color: colors.text }]}>{driver.name}</Text>
                        <Text style={[styles.driverEmail, { color: colors.textSecondary }]}>{driver.email}</Text>
                      </View>
                      <View style={[styles.submittedBadge, { backgroundColor: Colors.gold + "20" }]}>
                        <Text style={[styles.submittedText, { color: Colors.gold }]}>Submitted</Text>
                      </View>
                    </View>

                    <View style={[styles.driverInfoGrid, { backgroundColor: isDark ? "#0A0A0A" : "#F8F6F0" }]}>
                      <View style={styles.driverInfoItem}>
                        <Text style={[styles.driverInfoLabel, { color: colors.textSecondary }]}>Phone</Text>
                        <Text style={[styles.driverInfoValue, { color: colors.text }]}>{driver.phone}</Text>
                      </View>
                      <View style={styles.driverInfoItem}>
                        <Text style={[styles.driverInfoLabel, { color: colors.textSecondary }]}>Vehicle</Text>
                        <Text style={[styles.driverInfoValue, { color: colors.text }]}>{driver.vehicle || "—"}</Text>
                      </View>
                      <View style={styles.driverInfoItem}>
                        <Text style={[styles.driverInfoLabel, { color: colors.textSecondary }]}>Reg. No.</Text>
                        <Text style={[styles.driverInfoValue, { color: colors.text }]}>{driver.vehicleNumber || "—"}</Text>
                      </View>
                      <View style={styles.driverInfoItem}>
                        <Text style={[styles.driverInfoLabel, { color: colors.textSecondary }]}>Docs</Text>
                        <Text style={[styles.driverInfoValue, { color: colors.text }]}>
                          {driver.documents?.filter((d) => d.status === "pending" || d.status === "verified").length ?? 0} uploaded
                        </Text>
                      </View>
                    </View>

                    {driver.documents && driver.documents.length > 0 && (
                      <View style={styles.docsList}>
                        {driver.documents.map((doc) => (
                          <View key={doc.type} style={[styles.docChip, { backgroundColor: isDark ? "#1A1A1A" : "#F0EDE6" }]}>
                            <Ionicons name="document-text-outline" size={12} color={Colors.gold} />
                            <Text style={[styles.docChipText, { color: colors.textSecondary }]}>{doc.label}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.driverActionRow}>
                      <Pressable
                        onPress={() => handleDriverDecision(driver, "rejected")}
                        disabled={driverActionLoading === driver.id}
                        style={[styles.rejectDriverBtn, { borderColor: "#E74C3C40", backgroundColor: "#E74C3C12" }]}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="#E74C3C" />
                        <Text style={[styles.rejectDriverText]}>Reject</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDriverDecision(driver, "approved")}
                        disabled={driverActionLoading === driver.id}
                        style={[styles.approveDriverBtn]}
                      >
                        <LinearGradient
                          colors={["#2ECC71", "#27AE60"]}
                          style={styles.approveGradient}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                          {driverActionLoading === driver.id ? (
                            <Text style={styles.approveDriverText}>Processing…</Text>
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                              <Text style={styles.approveDriverText}>Approve</Text>
                            </>
                          )}
                        </LinearGradient>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Pricing Settings</Text>
          <Pressable
            onPress={() => router.push("/admin/pricing")}
            style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0 }]}
          >
            <View style={styles.pricingRow}>
              <View style={[styles.pricingIcon, { backgroundColor: Colors.gold + "18" }]}>
                <Ionicons name="pricetag-outline" size={22} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pricingTitle, { color: colors.text }]}>Fare Rate Management</Text>
                <Text style={[styles.pricingSub, { color: colors.textSecondary }]}>
                  Sedan ₹{pricingConfig.sedanRateUpto10km}/₹{pricingConfig.sedanRateAfter10km} · SUV ₹{pricingConfig.suvRateUpto10km}/₹{pricingConfig.suvRateAfter10km} per km
                </Text>
                <View style={styles.pricingBadges}>
                  <View style={[styles.pricingBadge, { backgroundColor: "#3498DB15" }]}>
                    <Text style={[styles.pricingBadgeText, { color: "#3498DB" }]}>Slab: {pricingConfig.thresholdKm} km</Text>
                  </View>
                  {pricingConfig.dynamicPricingEnabled && (
                    <View style={[styles.pricingBadge, { backgroundColor: "#E74C3C15" }]}>
                      <Ionicons name="trending-up" size={10} color="#E74C3C" />
                      <Text style={[styles.pricingBadgeText, { color: "#E74C3C" }]}>Surge {pricingConfig.surgeMultiplier.toFixed(1)}×</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Commission Settings</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.commissionRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.commissionLabel, { color: colors.text }]}>Platform Commission</Text>
                <Text style={[styles.commissionSub, { color: colors.textSecondary }]}>Applied to all driver earnings</Text>
              </View>
              <View style={styles.commissionBtns}>
                <Pressable onPress={() => { if (commissionRate > 5) setCommissionRate(commissionRate - 1); }} style={[styles.commBtn, { borderColor: colors.border }]}>
                  <Ionicons name="remove" size={16} color={colors.text} />
                </Pressable>
                <Text style={[styles.commValue, { color: Colors.gold }]}>{commissionRate}%</Text>
                <Pressable onPress={() => { if (commissionRate < 30) setCommissionRate(commissionRate + 1); }} style={[styles.commBtn, { borderColor: colors.border }]}>
                  <Ionicons name="add" size={16} color={colors.text} />
                </Pressable>
              </View>
            </View>
            <View style={[styles.commInfoRow, { borderTopColor: colors.border }]}>
              <View style={styles.commInfoItem}>
                <Text style={[styles.commInfoValue, { color: colors.text }]}>{"\u20B9"}{stats.totalRevenue.toLocaleString()}</Text>
                <Text style={[styles.commInfoLabel, { color: colors.textSecondary }]}>Revenue</Text>
              </View>
              <View style={styles.commInfoItem}>
                <Text style={[styles.commInfoValue, { color: Colors.gold }]}>{"\u20B9"}{stats.totalCommission.toLocaleString()}</Text>
                <Text style={[styles.commInfoLabel, { color: colors.textSecondary }]}>Commission</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(500)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Broadcast Notification</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.broadcastHeader}>
              <Ionicons name="megaphone-outline" size={20} color={Colors.gold} />
              <Text style={[styles.broadcastTitle, { color: colors.text }]}>Send to All Users</Text>
            </View>
            <Text style={[styles.broadcastSub, { color: colors.textSecondary }]}>
              Message will be delivered to all connected drivers and customers via Socket.IO.
            </Text>
            <TextInput
              style={[styles.broadcastInput, { backgroundColor: isDark ? "#111" : "#F5F3EE", color: colors.text, borderColor: colors.border }]}
              placeholder="Type your broadcast message…"
              placeholderTextColor={colors.textSecondary}
              value={broadcastMsg}
              onChangeText={setBroadcastMsg}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>{broadcastMsg.length}/300</Text>
            <Pressable
              onPress={handleBroadcast}
              disabled={broadcasting}
              style={{ borderRadius: 12, overflow: "hidden", marginTop: 8 }}
            >
              <LinearGradient
                colors={broadcasting ? ["#888", "#666"] : [Colors.gold, "#B8860B"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.broadcastBtn}
              >
                <Ionicons name={broadcasting ? "time-outline" : "send"} size={16} color="#0A0A0A" />
                <Text style={styles.broadcastBtnText}>
                  {broadcasting ? "Sending…" : "Send Broadcast"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(170).duration(500)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Coupons ({coupons.length})</Text>
            <Pressable onPress={() => setShowAddCoupon(true)} style={[styles.addBtn, { backgroundColor: Colors.gold + "18" }]}>
              <Ionicons name="add" size={16} color={Colors.gold} />
              <Text style={[styles.addBtnText, { color: Colors.gold }]}>Add</Text>
            </Pressable>
          </View>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {coupons.map((coupon, i) => (
              <View key={coupon.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={styles.couponRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={[styles.couponCode, { color: colors.text }]}>{coupon.code}</Text>
                      <View style={[styles.couponTypeBadge, { backgroundColor: coupon.isActive ? "#2ECC7118" : "#E74C3C18" }]}>
                        <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 10, color: coupon.isActive ? "#2ECC71" : "#E74C3C" }}>
                          {coupon.isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.couponDesc, { color: colors.textSecondary }]}>{coupon.description}</Text>
                    <Text style={[styles.couponMeta, { color: colors.textTertiary }]}>
                      Used: {coupon.usedCount}/{coupon.usageLimit} · Expires: {coupon.expiryDate}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Pressable
                      onPress={() => {
                        updateCoupon(coupon.id, { isActive: !coupon.isActive });
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[styles.couponAction, { backgroundColor: coupon.isActive ? "#F39C1218" : "#2ECC7118" }]}
                    >
                      <Ionicons name={coupon.isActive ? "pause" : "play"} size={14} color={coupon.isActive ? "#F39C12" : "#2ECC71"} />
                    </Pressable>
                    <Pressable
                      onPress={() => Alert.alert("Delete Coupon", `Delete ${coupon.code}?`, [
                        { text: "Cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteCoupon(coupon.id) },
                      ])}
                      style={[styles.couponAction, { backgroundColor: "#E74C3C18" }]}
                    >
                      <Ionicons name="trash-outline" size={14} color="#E74C3C" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {openTickets.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Support Tickets ({openTickets.length})</Text>
            {openTickets.map((ticket) => {
              const priorityColor = ticket.priority === "high" ? "#E74C3C" : ticket.priority === "medium" ? "#F39C12" : "#3498DB";
              return (
                <View key={ticket.id} style={[styles.ticketCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.ticketHeader}>
                    <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                    <Text style={[styles.ticketSubject, { color: colors.text }]}>{ticket.subject}</Text>
                    <View style={[styles.ticketRoleBadge, { backgroundColor: ticket.userRole === "driver" ? "#9B59B618" : "#3498DB18" }]}>
                      <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 10, color: ticket.userRole === "driver" ? "#9B59B6" : "#3498DB" }}>
                        {ticket.userRole}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.ticketMessage, { color: colors.textSecondary }]}>{ticket.message}</Text>
                  <View style={styles.ticketFooter}>
                    <Text style={[styles.ticketDate, { color: colors.textTertiary }]}>{ticket.userName} · {ticket.date}</Text>
                    <Pressable
                      onPress={() => { setShowTicketResponse(ticket.id); setTicketResponseText(ticket.response || ""); }}
                      style={[styles.respondBtn, { backgroundColor: Colors.gold + "18" }]}
                    >
                      <Text style={styles.respondBtnText}>Respond</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Driver Withdrawals</Text>
          <Pressable
            onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/admin/withdrawals"); }}
            style={[styles.navCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.navCardIcon, { backgroundColor: "#F39C1218" }]}>
              <Ionicons name="wallet-outline" size={22} color="#F39C12" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.navCardTitle, { color: colors.text }]}>Withdrawal Requests</Text>
              <Text style={[styles.navCardSub, { color: colors.textSecondary }]}>
                {pendingWithdrawals.length > 0
                  ? `${pendingWithdrawals.length} pending · ${approvedWithdrawals.length} awaiting payment`
                  : approvedWithdrawals.length > 0
                  ? `${approvedWithdrawals.length} approved, awaiting payment`
                  : `${withdrawals.length} total requests`}
              </Text>
            </View>
            <View style={styles.navCardRight}>
              {(pendingWithdrawals.length > 0 || approvedWithdrawals.length > 0) && (
                <View style={[styles.navCardBadge, { backgroundColor: pendingWithdrawals.length > 0 ? "#F39C12" : "#3498DB" }]}>
                  <Text style={styles.navCardBadgeText}>{pendingWithdrawals.length + approvedWithdrawals.length}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Settings</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }}
                trackColor={{ false: "#D4D4D4", true: Colors.gold + "60" }}
                thumbColor={isDark ? Colors.gold : "#FFF"}
              />
            </View>
          </View>
        </Animated.View>

        <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>

      <LogoutModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />

      <Modal visible={showAddCoupon} animationType="slide" transparent onRequestClose={() => setShowAddCoupon(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
            <View style={modalStyles.handle} />
            <Text style={[modalStyles.title, { color: colors.text }]}>Create Coupon</Text>

            <Text style={[modalStyles.label, { color: colors.textSecondary }]}>Coupon Code</Text>
            <TextInput
              style={[modalStyles.input, { color: colors.text, backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}
              value={newCode} onChangeText={(t) => setNewCode(t.toUpperCase())}
              placeholder="e.g. SUMMER20" placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
            />

            <Text style={[modalStyles.label, { color: colors.textSecondary }]}>Discount Type</Text>
            <View style={modalStyles.typeRow}>
              {(["percentage", "flat"] as const).map((t) => (
                <Pressable key={t} onPress={() => setNewDiscountType(t)}
                  style={[modalStyles.typeBtn, newDiscountType === t && { backgroundColor: Colors.gold + "20", borderColor: Colors.gold }, { borderColor: colors.border }]}
                >
                  <Text style={[modalStyles.typeText, { color: newDiscountType === t ? Colors.gold : colors.textSecondary }]}>
                    {t === "percentage" ? "Percentage %" : "Flat \u20B9"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={modalStyles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[modalStyles.label, { color: colors.textSecondary }]}>Value</Text>
                <TextInput style={[modalStyles.input, { color: colors.text, backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}
                  value={newDiscountValue} onChangeText={setNewDiscountValue}
                  placeholder="e.g. 20" placeholderTextColor={colors.textTertiary} keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[modalStyles.label, { color: colors.textSecondary }]}>Max Discount</Text>
                <TextInput style={[modalStyles.input, { color: colors.text, backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}
                  value={newMaxDiscount} onChangeText={setNewMaxDiscount}
                  placeholder="\u20B9500" placeholderTextColor={colors.textTertiary} keyboardType="numeric"
                />
              </View>
            </View>

            <View style={modalStyles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[modalStyles.label, { color: colors.textSecondary }]}>Min Order</Text>
                <TextInput style={[modalStyles.input, { color: colors.text, backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}
                  value={newMinOrder} onChangeText={setNewMinOrder}
                  placeholder="\u20B91000" placeholderTextColor={colors.textTertiary} keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[modalStyles.label, { color: colors.textSecondary }]}>Expiry Date</Text>
                <TextInput style={[modalStyles.input, { color: colors.text, backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}
                  value={newExpiry} onChangeText={setNewExpiry}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <Text style={[modalStyles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput style={[modalStyles.input, { color: colors.text, backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}
              value={newDescription} onChangeText={setNewDescription}
              placeholder="Short description" placeholderTextColor={colors.textTertiary}
            />

            <View style={modalStyles.btnRow}>
              <Pressable onPress={() => setShowAddCoupon(false)} style={[modalStyles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[modalStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAddCoupon} style={modalStyles.submitBtn}>
                <Text style={modalStyles.submitText}>Create Coupon</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!showTicketResponse} animationType="slide" transparent onRequestClose={() => setShowTicketResponse(null)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
            <View style={modalStyles.handle} />
            <Text style={[modalStyles.title, { color: colors.text }]}>Respond to Ticket</Text>
            <TextInput
              style={[modalStyles.textarea, { color: colors.text, backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}
              value={ticketResponseText} onChangeText={setTicketResponseText}
              placeholder="Type your response..." placeholderTextColor={colors.textTertiary}
              multiline numberOfLines={4} textAlignVertical="top"
            />
            <View style={modalStyles.btnRow}>
              <Pressable onPress={() => setShowTicketResponse(null)} style={[modalStyles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[modalStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleRespondTicket} style={modalStyles.submitBtn}>
                <Text style={modalStyles.submitText}>Send & Resolve</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D0D0D0", alignSelf: "center", marginBottom: 20 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center", marginBottom: 20 },
  label: { fontFamily: "Poppins_500Medium", fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: { fontFamily: "Poppins_400Regular", fontSize: 14, padding: 12, borderRadius: 10 },
  textarea: { fontFamily: "Poppins_400Regular", fontSize: 14, padding: 14, borderRadius: 12, minHeight: 100 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  typeText: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  row: { flexDirection: "row", gap: 12 },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontFamily: "Poppins_500Medium", fontSize: 15 },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.gold, alignItems: "center" },
  submitText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0A0A0A" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, marginBottom: 24 },
  sectionLabel: { fontFamily: "Poppins_500Medium", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 10 },
  addBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 24, padding: 16 },
  divider: { height: 1, marginVertical: 8 },
  pricingRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  pricingIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
  pricingTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, marginBottom: 2 },
  pricingSub: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  pricingBadges: { flexDirection: "row", marginTop: 6, flexWrap: "wrap" },
  pricingBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 6, marginBottom: 4 },
  pricingBadgeText: { fontFamily: "Poppins_500Medium", fontSize: 11, marginLeft: 4 },
  commissionRow: { flexDirection: "row", alignItems: "center" },
  commissionLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  commissionSub: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  commissionBtns: { flexDirection: "row", alignItems: "center", gap: 12 },
  commBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  commValue: { fontFamily: "Poppins_700Bold", fontSize: 20, minWidth: 50, textAlign: "center" },
  commInfoRow: { flexDirection: "row", marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  commInfoItem: { flex: 1, alignItems: "center" },
  commInfoValue: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  commInfoLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 2 },
  couponRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  couponCode: { fontFamily: "Poppins_700Bold", fontSize: 15 },
  couponTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  couponDesc: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  couponMeta: { fontFamily: "Poppins_400Regular", fontSize: 10, marginTop: 2 },
  couponAction: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  ticketCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  ticketHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  ticketSubject: { fontFamily: "Poppins_600SemiBold", fontSize: 14, flex: 1 },
  ticketRoleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  ticketMessage: { fontFamily: "Poppins_400Regular", fontSize: 13, marginBottom: 8 },
  ticketFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ticketDate: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  respondBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  respondBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 12, color: Colors.gold },
  withdrawCard: { flexDirection: "row", alignItems: "center", backgroundColor: "transparent", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  withdrawAmount: { fontFamily: "Poppins_700Bold", fontSize: 16 },
  withdrawMeta: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  approveBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  navCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  navCardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 12 },
  navCardTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  navCardSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  navCardRight: { flexDirection: "row", alignItems: "center" },
  navCardBadge: { borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, marginRight: 6 },
  navCardBadgeText: { fontFamily: "Poppins_700Bold", fontSize: 11, color: "#fff" },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingLabel: { fontFamily: "Poppins_500Medium", fontSize: 15 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: "rgba(231,76,60,0.08)", marginTop: 8 },
  logoutText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#E74C3C" },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  badgeRed: { backgroundColor: "#E74C3C", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { fontFamily: "Poppins_700Bold", fontSize: 11, color: "#fff" },
  emptyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 8 },
  emptyText: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  driverAppCard: { paddingVertical: 8, gap: 12 },
  driverAppHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  driverInitial: { fontFamily: "Poppins_700Bold", fontSize: 18 },
  driverName: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  driverEmail: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  submittedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  submittedText: { fontFamily: "Poppins_500Medium", fontSize: 11 },
  driverInfoGrid: { flexDirection: "row", flexWrap: "wrap", borderRadius: 10, padding: 10, gap: 2 },
  driverInfoItem: { width: "50%", paddingVertical: 4, paddingHorizontal: 6 },
  driverInfoLabel: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  driverInfoValue: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  docsList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  docChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  docChipText: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  driverActionRow: { flexDirection: "row", gap: 10 },
  rejectDriverBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  rejectDriverText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#E74C3C" },
  approveDriverBtn: { flex: 1.5, borderRadius: 12, overflow: "hidden" },
  approveGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  approveDriverText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#fff" },
  broadcastHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  broadcastTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  broadcastSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginBottom: 12, lineHeight: 18 },
  broadcastInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontFamily: "Poppins_400Regular", fontSize: 14, minHeight: 90, textAlignVertical: "top" },
  charCount: { fontFamily: "Poppins_400Regular", fontSize: 11, textAlign: "right", marginTop: 4 },
  broadcastBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  broadcastBtnText: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#0A0A0A" },
});
