import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { DriverData } from "@/constants/data";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

interface EarningsData {
  driverId: string;
  totalEarnings: number;
  netTotalEarnings: number;
  todayEarnings: number;
  netTodayEarnings: number;
  weekEarnings: number;
  netWeekEarnings: number;
  completedTrips: number;
  todayTrips: number;
  weekTrips: number;
  commissionRate: number;
  rides: {
    rideId: string;
    pickup: string;
    drop: string;
    fare: number;
    distanceKm: number;
    completedAt?: number;
  }[];
}

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { withdrawals, addWithdrawal } = useData();
  const driver = user as DriverData | null;

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("week");
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  const driverId = driver?.id || "driver-1";
  const driverWithdrawals = withdrawals.filter((w) => w.driverId === driverId);

  const fetchEarnings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/driver/${driverId}/earnings`);
      if (res.ok) {
        const data = await res.json();
        setEarnings(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const commissionRate = (earnings?.commissionRate || 0.15) * 100;

  const periodGross = selectedPeriod === "today"
    ? (earnings?.todayEarnings || 0)
    : selectedPeriod === "week"
    ? (earnings?.weekEarnings || 0)
    : (earnings?.totalEarnings || 0);

  const commissionAmount = Math.round(periodGross * (earnings?.commissionRate || 0.15));
  const netEarnings = periodGross - commissionAmount;

  const walletBalance = earnings?.netTotalEarnings || 0;

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    if (amount > walletBalance) {
      Alert.alert("Insufficient Balance", "Withdrawal amount exceeds your wallet balance.");
      return;
    }
    addWithdrawal({
      driverId,
      amount,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      bankDetails: "Bank ****1234",
    });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowWithdraw(false);
    setWithdrawAmount("");
    Alert.alert("Request Submitted", `Your withdrawal request for \u20B9${amount.toLocaleString()} has been submitted.`);
  };

  const txHistory = [
    ...(earnings?.rides || []).map((r) => ({
      id: r.rideId,
      date: r.completedAt ? new Date(r.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
      destination: `${r.drop} Trip`,
      amount: Math.round(r.fare * (1 - (earnings?.commissionRate || 0.15))),
      type: "credit" as const,
    })),
    ...driverWithdrawals.map((w) => ({
      id: w.id,
      date: w.date,
      destination: `Withdrawal (${w.status})`,
      amount: -w.amount,
      type: "debit" as const,
    })),
  ].sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    return dateB - dateA;
  });

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>Earnings</Text>
          <Pressable onPress={fetchEarnings} style={[styles.refreshBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <LinearGradient
            colors={[Colors.gold, Colors.goldDark]}
            style={styles.totalCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#0A0A0A" size="large" style={{ paddingVertical: 24 }} />
            ) : (
              <>
                <Text style={styles.totalLabel}>Total Net Earnings</Text>
                <Text style={styles.totalValue}>{"\u20B9"}{(earnings?.netTotalEarnings || 0).toLocaleString()}</Text>
                <View style={styles.totalRow}>
                  <View style={styles.totalStat}>
                    <Text style={styles.totalStatValue}>{"\u20B9"}{(earnings?.netTodayEarnings || 0).toLocaleString()}</Text>
                    <Text style={styles.totalStatLabel}>Today</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalStat}>
                    <Text style={styles.totalStatValue}>{"\u20B9"}{(earnings?.netWeekEarnings || 0).toLocaleString()}</Text>
                    <Text style={styles.totalStatLabel}>This Week</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalStat}>
                    <Text style={styles.totalStatValue}>{earnings?.completedTrips || 0}</Text>
                    <Text style={styles.totalStatLabel}>Total Trips</Text>
                  </View>
                </View>
              </>
            )}
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <View style={styles.periodRow}>
            {(["today", "week", "month"] as const).map((p) => (
              <Pressable
                key={p}
                onPress={() => setSelectedPeriod(p)}
                style={[styles.periodBtn, selectedPeriod === p && { backgroundColor: Colors.gold + "20" }]}
              >
                <Text style={[styles.periodText, { color: selectedPeriod === p ? Colors.gold : colors.textSecondary }]}>
                  {p === "today" ? "Today" : p === "week" ? "This Week" : "All Time"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Gross Earnings</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>{"\u20B9"}{periodGross.toLocaleString()}</Text>
            </View>
            <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: "#E74C3C" }]}>Commission ({commissionRate}%)</Text>
              <Text style={[styles.breakdownValue, { color: "#E74C3C" }]}>-{"\u20B9"}{commissionAmount.toLocaleString()}</Text>
            </View>
            <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.text, fontFamily: "Poppins_600SemiBold" }]}>Net Earnings</Text>
              <Text style={[styles.breakdownValue, { color: "#2ECC71", fontFamily: "Poppins_700Bold" }]}>{"\u20B9"}{netEarnings.toLocaleString()}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.walletSection}>
          <View style={[styles.walletCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="wallet" size={22} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.walletLabel, { color: colors.textSecondary }]}>Available Balance</Text>
              <Text style={[styles.walletValue, { color: colors.text }]}>
                {"\u20B9"}{walletBalance.toLocaleString()}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowWithdraw(true)}
              style={[styles.withdrawBtn, { backgroundColor: Colors.gold + "15" }]}
            >
              <Text style={[styles.withdrawText, { color: Colors.gold }]}>Withdraw</Text>
            </Pressable>
          </View>
        </Animated.View>

        {driverWithdrawals.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Withdrawal History</Text>
            {driverWithdrawals.slice(0, 5).map((w) => {
              const statusColor = w.status === "completed" ? "#2ECC71" : w.status === "pending" ? "#F39C12" : w.status === "approved" ? "#3498DB" : "#E74C3C";
              return (
                <View key={w.id} style={[styles.withdrawalRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.withdrawalIcon, { backgroundColor: statusColor + "18" }]}>
                    <Ionicons
                      name={w.status === "completed" ? "checkmark" : w.status === "pending" ? "time" : "arrow-up"}
                      size={14} color={statusColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.withdrawalAmount, { color: colors.text }]}>{"\u20B9"}{w.amount.toLocaleString()}</Text>
                    <Text style={[styles.withdrawalDate, { color: colors.textSecondary }]}>{w.date} · {w.bankDetails}</Text>
                  </View>
                  <View style={[styles.withdrawalBadge, { backgroundColor: statusColor + "18" }]}>
                    <Text style={[styles.withdrawalStatus, { color: statusColor }]}>{w.status}</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction History</Text>
        {loading ? (
          <View style={[styles.emptyTx, { backgroundColor: colors.surface }]}>
            <ActivityIndicator color={Colors.gold} />
          </View>
        ) : txHistory.length === 0 ? (
          <View style={[styles.emptyTx, { backgroundColor: colors.surface }]}>
            <Ionicons name="receipt-outline" size={32} color={colors.textTertiary} />
            <Text style={[{ color: colors.textSecondary, fontFamily: "Poppins_400Regular", fontSize: 13 }]}>No transactions yet</Text>
            <Text style={[{ color: colors.textTertiary, fontFamily: "Poppins_400Regular", fontSize: 12, textAlign: "center" }]}>Complete trips to see your earnings here</Text>
          </View>
        ) : (
          txHistory.slice(0, 10).map((item, i) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(300 + i * 40).duration(400)}>
              <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.txIcon, { backgroundColor: item.type === "credit" ? "#2ECC7118" : "#E74C3C18" }]}>
                  <Ionicons
                    name={item.type === "credit" ? "arrow-down" : "arrow-up"}
                    size={16}
                    color={item.type === "credit" ? "#2ECC71" : "#E74C3C"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txName, { color: colors.text }]}>{item.destination}</Text>
                  <Text style={[styles.txDate, { color: colors.textSecondary }]}>{item.date}</Text>
                </View>
                <Text style={[styles.txAmount, { color: item.type === "credit" ? "#2ECC71" : "#E74C3C" }]}>
                  {item.type === "credit" ? "+" : ""}{"\u20B9"}{Math.abs(item.amount).toLocaleString()}
                </Text>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <Modal visible={showWithdraw} animationType="slide" transparent onRequestClose={() => setShowWithdraw(false)}>
        <View style={wStyles.overlay}>
          <View style={[wStyles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
            <View style={wStyles.handle} />
            <Text style={[wStyles.title, { color: colors.text }]}>Withdraw Funds</Text>
            <Text style={[wStyles.balance, { color: colors.textSecondary }]}>
              Available: {"\u20B9"}{walletBalance.toLocaleString()}
            </Text>

            <View style={[wStyles.inputRow, { backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}>
              <Text style={[wStyles.rupee, { color: Colors.gold }]}>{"\u20B9"}</Text>
              <TextInput
                style={[wStyles.input, { color: colors.text }]}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder="Enter amount"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={wStyles.quickAmounts}>
              {[1000, 2000, 5000].map((a) => (
                <Pressable key={a} onPress={() => setWithdrawAmount(a.toString())} style={[wStyles.quickBtn, { borderColor: colors.border }]}>
                  <Text style={[wStyles.quickText, { color: colors.text }]}>{"\u20B9"}{a.toLocaleString()}</Text>
                </Pressable>
              ))}
            </View>

            <View style={wStyles.bankInfo}>
              <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
              <Text style={[wStyles.bankText, { color: colors.textSecondary }]}>Bank Account: ****1234</Text>
            </View>

            <View style={wStyles.btnRow}>
              <Pressable onPress={() => setShowWithdraw(false)} style={[wStyles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[wStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleWithdraw} style={wStyles.submitBtn}>
                <Text style={wStyles.submitText}>Request Withdrawal</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const wStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D0D0D0", alignSelf: "center", marginBottom: 20 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center" },
  balance: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center", marginTop: 4, marginBottom: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, marginBottom: 16 },
  rupee: { fontFamily: "Poppins_700Bold", fontSize: 24 },
  input: { flex: 1, fontFamily: "Poppins_600SemiBold", fontSize: 24, padding: 0 },
  quickAmounts: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  quickText: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  bankInfo: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  bankText: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontFamily: "Poppins_500Medium", fontSize: 15 },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.gold, alignItems: "center" },
  submitText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0A0A0A" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28 },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  totalCard: { borderRadius: 20, padding: 24, marginBottom: 20 },
  totalLabel: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "rgba(10,10,10,0.6)" },
  totalValue: { fontFamily: "Poppins_700Bold", fontSize: 38, color: "#0A0A0A", marginTop: 4 },
  totalRow: { flexDirection: "row", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(10,10,10,0.1)" },
  totalStat: { flex: 1, alignItems: "center" },
  totalStatValue: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#0A0A0A" },
  totalStatLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "rgba(10,10,10,0.5)", marginTop: 2 },
  totalDivider: { width: 1, backgroundColor: "rgba(10,10,10,0.1)" },
  periodRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  periodText: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  breakdownCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  breakdownLabel: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  breakdownValue: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  breakdownDivider: { height: 1 },
  walletSection: { marginBottom: 24 },
  walletCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  walletLabel: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  walletValue: { fontFamily: "Poppins_700Bold", fontSize: 20 },
  withdrawBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  withdrawText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 14 },
  withdrawalRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  withdrawalIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  withdrawalAmount: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  withdrawalDate: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  withdrawalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  withdrawalStatus: { fontFamily: "Poppins_500Medium", fontSize: 11, textTransform: "capitalize" },
  emptyTx: { alignItems: "center", padding: 24, borderRadius: 14, gap: 8 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  txName: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  txDate: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  txAmount: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
});
