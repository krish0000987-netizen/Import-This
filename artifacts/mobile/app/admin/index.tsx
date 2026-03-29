import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useRouter } from "expo-router";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5001";

interface AdminStats {
  totalRides: number;
  activeRides: number;
  searchingRides: number;
  completedToday: number;
  completedTotal: number;
  cancelledTotal: number;
  onlineDrivers: number;
  busyDrivers: number;
  todayRevenue: number;
  totalRevenue: number;
  avgFare: number;
}

interface OnlineDriver {
  driverId: string;
  driverName: string;
  vehicle: string;
  vehicleNumber: string;
  rating: number;
  isOnline: boolean;
  isBusy: boolean;
}

function StatCard({
  icon, label, value, color, bg, subtitle, delay,
}: {
  icon: string; label: string; value: string; color: string; bg: string;
  subtitle?: string; delay: number;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(450)} style={styles.statCardWrapper}>
      <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.statIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        {subtitle ? <Text style={[styles.statSub, { color: color }]}>{subtitle}</Text> : null}
      </View>
    </Animated.View>
  );
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { drivers: allDrivers } = useData();
  const router = useRouter();

  const pendingApplications = allDrivers.filter((d) => d.kycStatus === "submitted").length;

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [drivers, setDrivers] = useState<OnlineDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [statsRes, driversRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`),
        fetch(`${API_BASE}/api/admin/online-drivers`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (driversRes.ok) setDrivers(await driversRes.json());
      setLiveConnected(true);
      setLastUpdated(new Date());
    } catch {
      setLiveConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onlineDriversList = drivers.filter((d) => d.isOnline);
  const availableDrivers = onlineDriversList.filter((d) => !d.isBusy);
  const busyDrivers = onlineDriversList.filter((d) => d.isBusy);

  const completionRate =
    stats && stats.completedTotal + stats.cancelledTotal > 0
      ? Math.round((stats.completedTotal / (stats.completedTotal + stats.cancelledTotal)) * 100)
      : 0;

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
        paddingBottom: 110,
        paddingHorizontal: 20,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={Colors.gold} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Admin Panel</Text>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name || "Admin"}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.liveDot, { backgroundColor: liveConnected ? "#2ECC71" : "#E74C3C" }]} />
          <View style={[styles.adminBadge, { backgroundColor: Colors.gold + "18" }]}>
            <Ionicons name="shield" size={16} color={Colors.gold} />
            <Text style={[styles.adminLabel, { color: Colors.gold }]}>Live</Text>
          </View>
        </View>
      </View>

      {lastUpdated && (
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
          Updated {formatTime(lastUpdated)} · auto-refreshes every 15s
        </Text>
      )}

      {pendingApplications > 0 && (
        <Pressable
          onPress={() => router.push("/admin/drivers" as any)}
          style={[styles.pendingBanner, { backgroundColor: Colors.gold + "15", borderColor: Colors.gold + "40" }]}
        >
          <View style={[styles.pendingIconWrap, { backgroundColor: Colors.gold + "25" }]}>
            <Ionicons name="person-add-outline" size={18} color={Colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pendingTitle, { color: Colors.gold }]}>
              {pendingApplications} Pending Application{pendingApplications !== 1 ? "s" : ""}
            </Text>
            <Text style={[styles.pendingSub, { color: colors.textSecondary }]}>Tap to review driver KYC submissions</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.gold} />
        </Pressable>
      )}

      {loading && !stats ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.gold} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading live data…</Text>
        </View>
      ) : (
        <>
          {/* Stat Grid */}
          <View style={styles.statsGrid}>
            <StatCard icon="car" label="Total Rides" value={String(stats?.totalRides ?? 0)} color="#3498DB" bg="#3498DB18" delay={80} />
            <StatCard icon="radio-button-on" label="Active Rides" value={String(stats?.activeRides ?? 0)} color="#2ECC71" bg="#2ECC7118" subtitle={stats?.searchingRides ? `${stats.searchingRides} searching` : undefined} delay={140} />
            <StatCard icon="checkmark-circle" label="Completed Today" value={String(stats?.completedToday ?? 0)} color={Colors.gold} bg={Colors.gold + "18"} delay={200} />
            <StatCard icon="people" label="Online Drivers" value={`${stats?.onlineDrivers ?? 0}`} color="#9B59B6" bg="#9B59B618" subtitle={stats?.busyDrivers ? `${stats.busyDrivers} busy` : undefined} delay={260} />
            <StatCard icon="wallet" label="Today Revenue" value={`₹${(stats?.todayRevenue ?? 0).toLocaleString()}`} color="#E67E22" bg="#E67E2218" delay={320} />
            <StatCard icon="stats-chart" label="Total Revenue" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`} color="#16A085" bg="#16A08518" delay={380} />
          </View>

          {/* Performance Overview */}
          <Animated.View entering={FadeInDown.delay(440).duration(500)}>
            <LinearGradient
              colors={isDark ? ["#1A1A1A", "#242420"] : [Colors.gold + "08", Colors.gold + "03"]}
              style={[styles.overviewCard, { borderColor: Colors.gold + "20" }]}
            >
              <Text style={[styles.overviewTitle, { color: colors.text }]}>Performance Overview</Text>
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewValue, { color: Colors.gold }]}>{completionRate}%</Text>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Completion</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewValue, { color: Colors.gold }]}>
                    {stats?.completedTotal ?? 0}
                  </Text>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Total Done</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewValue, { color: Colors.gold }]}>
                    ₹{(stats?.avgFare ?? 0).toLocaleString()}
                  </Text>
                  <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Avg Fare</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Live Drivers */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Driver Status</Text>
              <View style={styles.driverCounts}>
                <View style={[styles.countChip, { backgroundColor: "#2ECC7118" }]}>
                  <View style={[styles.miniDot, { backgroundColor: "#2ECC71" }]} />
                  <Text style={[styles.countText, { color: "#2ECC71" }]}>{availableDrivers.length} free</Text>
                </View>
                <View style={[styles.countChip, { backgroundColor: "#E67E2218" }]}>
                  <View style={[styles.miniDot, { backgroundColor: "#E67E22" }]} />
                  <Text style={[styles.countText, { color: "#E67E22" }]}>{busyDrivers.length} busy</Text>
                </View>
              </View>
            </View>

            {onlineDriversList.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="car-outline" size={28} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No drivers online right now</Text>
              </View>
            ) : (
              <View style={[styles.driverList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {onlineDriversList.map((d, i) => (
                  <View key={d.driverId}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                    <View style={styles.driverRow}>
                      <View style={[styles.driverAvatar, { backgroundColor: d.isBusy ? "#E67E2220" : "#2ECC7120" }]}>
                        <Text style={[styles.driverInitial, { color: d.isBusy ? "#E67E22" : "#2ECC71" }]}>
                          {d.driverName[0]}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.driverName, { color: colors.text }]}>{d.driverName}</Text>
                        <Text style={[styles.driverVehicle, { color: colors.textSecondary }]}>{d.vehicle} · {d.vehicleNumber}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: d.isBusy ? "#E67E2218" : "#2ECC7118" }]}>
                        <Text style={[styles.statusBadgeText, { color: d.isBusy ? "#E67E22" : "#2ECC71" }]}>
                          {d.isBusy ? "On Trip" : "Available"}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  greeting: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  adminLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  lastUpdated: { fontFamily: "Poppins_400Regular", fontSize: 11, marginBottom: 12 },
  pendingBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  pendingIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pendingTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  pendingSub: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 1 },
  loadingWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  statCardWrapper: { width: "47%" },
  statCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontFamily: "Poppins_700Bold", fontSize: 22 },
  statLabel: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  statSub: { fontFamily: "Poppins_500Medium", fontSize: 11 },
  overviewCard: { borderRadius: 18, padding: 20, borderWidth: 1, marginBottom: 24 },
  overviewTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, marginBottom: 16 },
  overviewRow: { flexDirection: "row" },
  overviewItem: { flex: 1, alignItems: "center" },
  overviewValue: { fontFamily: "Poppins_700Bold", fontSize: 22 },
  overviewLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },
  driverCounts: { flexDirection: "row", gap: 8 },
  countChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  countText: { fontFamily: "Poppins_500Medium", fontSize: 11 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyText: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  driverList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: 1 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  driverInitial: { fontFamily: "Poppins_700Bold", fontSize: 16 },
  driverName: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  driverVehicle: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontFamily: "Poppins_600SemiBold", fontSize: 11 },
});
