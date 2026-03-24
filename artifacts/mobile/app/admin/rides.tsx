import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

type RideStatus = "all" | "searching" | "assigned" | "started" | "completed" | "cancelled" | "no_driver";

interface Ride {
  rideId: string;
  pickup: string;
  drop: string;
  distanceKm: number;
  durationMin: number;
  fare: number;
  vehicleType: string;
  status: RideStatus;
  customerId?: string;
  driverId?: string;
  driverName?: string;
  riderName?: string;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  expiredAt?: number;
}

const STATUS_TABS: { key: RideStatus; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#9E9E9E" },
  { key: "searching", label: "Searching", color: "#F39C12" },
  { key: "assigned", label: "Assigned", color: "#3498DB" },
  { key: "started", label: "On Trip", color: "#9B59B6" },
  { key: "completed", label: "Done", color: "#2ECC71" },
  { key: "cancelled", label: "Cancelled", color: "#E74C3C" },
];

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  searching: { color: "#F39C12", icon: "search", label: "Searching" },
  assigned: { color: "#3498DB", icon: "checkmark-circle", label: "Assigned" },
  started: { color: "#9B59B6", icon: "navigate", label: "On Trip" },
  completed: { color: "#2ECC71", icon: "checkmark-done-circle", label: "Completed" },
  cancelled: { color: "#E74C3C", icon: "close-circle", label: "Cancelled" },
  no_driver: { color: "#9E9E9E", icon: "alert-circle", label: "No Driver" },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function RideCard({ ride, index }: { ride: Ride; index: number }) {
  const { colors } = useTheme();
  const cfg = STATUS_CONFIG[ride.status] || { color: "#9E9E9E", icon: "help-circle", label: ride.status };

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(350)}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: cfg.color + "18" }]}>
            <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={[styles.rideId, { color: colors.textSecondary }]}>#{ride.rideId}</Text>
          <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{timeAgo(ride.createdAt)}</Text>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={styles.routeDots}>
            <View style={[styles.dot, { backgroundColor: "#2ECC71" }]} />
            <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
            <View style={[styles.dot, { borderRadius: 3, backgroundColor: Colors.gold }]} />
          </View>
          <View style={styles.routeLabels}>
            <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={1}>{ride.pickup}</Text>
            <Text style={[styles.routeText, { color: colors.text, marginTop: 10 }]} numberOfLines={1}>{ride.drop}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>{ride.distanceKm} km</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="wallet-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: Colors.gold }]}>₹{ride.fare.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]} numberOfLines={1}>
              {ride.riderName || "Passenger"}
            </Text>
          </View>
          {ride.driverName && (
            <View style={styles.statItem}>
              <Ionicons name="car-sport-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]} numberOfLines={1}>{ride.driverName}</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function RidesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [rides, setRides] = useState<Ride[]>([]);
  const [activeTab, setActiveTab] = useState<RideStatus>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRides = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const url = activeTab === "all"
        ? `${API_BASE}/api/admin/rides`
        : `${API_BASE}/api/admin/rides?status=${activeTab}`;
      const res = await fetch(url);
      if (res.ok) {
        setRides(await res.json());
        setLastUpdated(new Date());
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchRides();
    const interval = setInterval(() => fetchRides(), 10000);
    return () => clearInterval(interval);
  }, [fetchRides]);

  const activeCounts: Partial<Record<RideStatus, number>> = {};
  rides.forEach((r) => {
    activeCounts[r.status] = (activeCounts[r.status] || 0) + 1;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Rides Monitor</Text>
        {lastUpdated && (
          <Text style={[styles.liveLabel, { color: "#2ECC71" }]}>
            ● Live · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(t) => t.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}
          renderItem={({ item }) => {
            const isActive = activeTab === item.key;
            return (
              <Pressable
                onPress={() => setActiveTab(item.key)}
                style={[
                  styles.tab,
                  { backgroundColor: isActive ? item.color + "18" : "transparent", borderColor: isActive ? item.color + "60" : colors.border },
                ]}
              >
                <Text style={[styles.tabText, { color: isActive ? item.color : colors.textSecondary }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r.rideId}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchRides(true)} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="car-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No rides found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeTab === "all" ? "No rides have been created yet." : `No ${activeTab} rides right now.`}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => <RideCard ride={item} index={index} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  screenTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, marginBottom: 2 },
  liveLabel: { fontFamily: "Poppins_500Medium", fontSize: 11, marginBottom: 10 },
  tabList: { gap: 8, paddingVertical: 2 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tabText: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18 },
  emptyText: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontFamily: "Poppins_600SemiBold", fontSize: 11 },
  rideId: { fontFamily: "Poppins_400Regular", fontSize: 11, flex: 1 },
  timeAgo: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  routeRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  routeDots: { alignItems: "center", gap: 0, paddingTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 2, height: 18, borderRadius: 1, marginVertical: 2 },
  routeLabels: { flex: 1, gap: 0 },
  routeText: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, borderTopWidth: 1, paddingTop: 10 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontFamily: "Poppins_400Regular", fontSize: 12 },
});
