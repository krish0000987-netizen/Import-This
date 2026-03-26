import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useData } from "@/contexts/DataContext";
import { WithdrawalRequest } from "@/constants/data";

type FilterStatus = "all" | "pending" | "approved" | "paid" | "rejected";

const STATUS_COLOR: Record<string, string> = {
  pending: "#F39C12",
  approved: "#3498DB",
  paid: "#2ECC71",
  completed: "#2ECC71",
  rejected: "#E74C3C",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  paid: "Paid",
  completed: "Paid",
  rejected: "Rejected",
};

const STATUS_ICON: Record<string, string> = {
  pending: "time-outline",
  approved: "checkmark-circle-outline",
  paid: "checkmark-circle",
  completed: "checkmark-circle",
  rejected: "close-circle-outline",
};

export default function WithdrawalsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { withdrawals, updateWithdrawal } = useData();
  const [filter, setFilter] = useState<FilterStatus>("all");

  const filtered = withdrawals.filter((w) => {
    if (filter === "all") return true;
    if (filter === "paid") return w.status === "paid" || w.status === "completed";
    return w.status === filter;
  });

  const counts = {
    all: withdrawals.length,
    pending: withdrawals.filter((w) => w.status === "pending").length,
    approved: withdrawals.filter((w) => w.status === "approved").length,
    paid: withdrawals.filter((w) => w.status === "paid" || w.status === "completed").length,
    rejected: withdrawals.filter((w) => w.status === "rejected").length,
  };

  const haptic = () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

  const handleApprove = (w: WithdrawalRequest) => {
    haptic();
    Alert.alert(
      "Approve Request",
      `Approve \u20B9${w.amount.toLocaleString()} withdrawal for ${w.driverName || w.driverId}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => {
            updateWithdrawal(w.id, { status: "approved" });
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleReject = (w: WithdrawalRequest) => {
    haptic();
    Alert.alert(
      "Reject Request",
      `Reject \u20B9${w.amount.toLocaleString()} withdrawal for ${w.driverName || w.driverId}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            updateWithdrawal(w.id, { status: "rejected" });
          },
        },
      ]
    );
  };

  const handleMarkPaid = (w: WithdrawalRequest) => {
    haptic();
    Alert.alert(
      "Mark as Paid",
      `Confirm you have manually transferred \u20B9${w.amount.toLocaleString()} to ${w.driverName || w.driverId} via ${w.paymentMethod === "upi" ? `UPI (${w.upiId})` : `bank account`}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Paid",
          onPress: () => {
            updateWithdrawal(w.id, { status: "paid" });
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const filterTabs: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "paid", label: "Paid" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 16 : 8), borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Driver Withdrawals</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{counts.pending} pending · {counts.all} total</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterBar, { borderBottomColor: colors.border }]} contentContainerStyle={styles.filterContent}>
        {filterTabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <Pressable key={tab.key} onPress={() => { haptic(); setFilter(tab.key); }} style={[styles.filterChip, active && { backgroundColor: Colors.gold }]}>
              <Text style={[styles.filterText, { color: active ? "#0A0A0A" : colors.textSecondary }]}>{tab.label}</Text>
              {counts[tab.key] > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: active ? "rgba(0,0,0,0.15)" : colors.border }]}>
                  <Text style={[styles.filterBadgeText, { color: active ? "#0A0A0A" : colors.textSecondary }]}>{counts[tab.key]}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="wallet-outline" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Requests</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>No withdrawal requests match this filter.</Text>
          </View>
        ) : (
          filtered.map((w, i) => {
            const statusColor = STATUS_COLOR[w.status] || "#9E9E9E";
            const statusLabel = STATUS_LABEL[w.status] || w.status;
            const canApprove = w.status === "pending";
            const canReject = w.status === "pending";
            const canMarkPaid = w.status === "approved";

            return (
              <Animated.View key={w.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.driverName, { color: colors.text }]}>{w.driverName || `Driver ${w.driverId}`}</Text>
                      {w.driverPhone && (
                        <Text style={[styles.driverPhone, { color: colors.textSecondary }]}>{w.driverPhone}</Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
                      <Ionicons name={STATUS_ICON[w.status] as any || "help-outline"} size={12} color={statusColor} />
                      <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.amountRow}>
                    <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount</Text>
                    <Text style={[styles.amountValue, { color: colors.text }]}>{"\u20B9"}{w.amount.toLocaleString()}</Text>
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Method</Text>
                      <View style={styles.methodTag}>
                        <Ionicons
                          name={w.paymentMethod === "upi" ? "call-outline" : "business-outline"}
                          size={12} color={colors.textSecondary}
                        />
                        <Text style={[styles.infoValue, { color: colors.text, marginLeft: 4 }]}>
                          {w.paymentMethod === "upi" ? "UPI" : w.paymentMethod === "bank" ? "Bank Transfer" : "—"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{w.date}</Text>
                    </View>
                  </View>

                  {w.paymentMethod === "upi" && w.upiId && (
                    <View style={[styles.detailBox, { backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>UPI ID</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{w.upiId}</Text>
                    </View>
                  )}

                  {w.paymentMethod === "bank" && (
                    <View style={[styles.detailBox, { backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}>
                      {w.bankAccountName && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Name</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{w.bankAccountName}</Text>
                        </View>
                      )}
                      {w.bankAccountNumber && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account No.</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>****{w.bankAccountNumber.slice(-4)}</Text>
                        </View>
                      )}
                      {w.bankIfscCode && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>IFSC</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{w.bankIfscCode}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {w.notes && (
                    <View style={[styles.notesBox, { backgroundColor: Colors.gold + "0E", borderColor: Colors.gold + "30" }]}>
                      <Ionicons name="document-text-outline" size={13} color={Colors.gold} />
                      <Text style={[styles.notesText, { color: colors.textSecondary }]}>{w.notes}</Text>
                    </View>
                  )}

                  {(canApprove || canReject || canMarkPaid) && (
                    <View style={styles.actionRow}>
                      {canReject && (
                        <Pressable onPress={() => handleReject(w)} style={[styles.actionBtn, styles.rejectBtn]}>
                          <Ionicons name="close" size={15} color="#E74C3C" />
                          <Text style={[styles.actionText, { color: "#E74C3C" }]}>Reject</Text>
                        </Pressable>
                      )}
                      {canApprove && (
                        <Pressable onPress={() => handleApprove(w)} style={[styles.actionBtn, styles.approveBtn]}>
                          <Ionicons name="checkmark" size={15} color="#3498DB" />
                          <Text style={[styles.actionText, { color: "#3498DB" }]}>Approve</Text>
                        </Pressable>
                      )}
                      {canMarkPaid && (
                        <Pressable onPress={() => handleMarkPaid(w)} style={[styles.actionBtn, styles.paidBtn]}>
                          <Ionicons name="checkmark-done" size={15} color="#2ECC71" />
                          <Text style={[styles.actionText, { color: "#2ECC71" }]}>Mark as Paid</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 8 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  headerSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 1 },
  filterBar: { borderBottomWidth: 1, maxHeight: 52 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row" },
  filterChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  filterText: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  filterBadge: { marginLeft: 5, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  filterBadgeText: { fontFamily: "Poppins_600SemiBold", fontSize: 10 },
  emptyState: { alignItems: "center", padding: 40, borderRadius: 16, borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, marginTop: 12 },
  emptyDesc: { fontFamily: "Poppins_400Regular", fontSize: 13, textAlign: "center", marginTop: 4 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  driverName: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  driverPhone: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: "Poppins_600SemiBold", fontSize: 11, marginLeft: 4 },
  divider: { height: 1, marginBottom: 12 },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  amountLabel: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  amountValue: { fontFamily: "Poppins_700Bold", fontSize: 22 },
  infoGrid: { flexDirection: "row", marginBottom: 10 },
  infoItem: { flex: 1 },
  infoLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, marginBottom: 3 },
  infoValue: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  methodTag: { flexDirection: "row", alignItems: "center" },
  detailBox: { borderRadius: 10, padding: 12, marginBottom: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  detailLabel: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  detailValue: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  notesBox: { flexDirection: "row", alignItems: "flex-start", borderRadius: 8, padding: 10, borderWidth: 1, marginBottom: 10 },
  notesText: { fontFamily: "Poppins_400Regular", fontSize: 12, flex: 1, marginLeft: 6 },
  actionRow: { flexDirection: "row", marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginRight: 8 },
  actionText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, marginLeft: 5 },
  rejectBtn: { borderColor: "#E74C3C30", backgroundColor: "#E74C3C0A" },
  approveBtn: { borderColor: "#3498DB30", backgroundColor: "#3498DB0A" },
  paidBtn: { flex: 2, borderColor: "#2ECC7130", backgroundColor: "#2ECC710A", marginRight: 0 },
});
