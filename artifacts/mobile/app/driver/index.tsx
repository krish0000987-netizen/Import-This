import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  LogBox,
} from "react-native";
import Constants from "expo-constants";

import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { DriverData } from "@/constants/data";
import {
  connectSocket,
  disconnectSocket,
  emitDriverOnline,
  emitDriverOffline,
  emitAcceptRide,
  emitRejectRide,
  emitRegisterPushToken,
} from "@/services/socketService";

LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "`expo-notifications` functionality is not fully supported",
  "expo-notifications: Push notifications",
  "expo-notifications: Notification",
]);

// expo-notifications was removed from Expo Go in SDK 53+.
// Detect Expo Go via executionEnvironment (SDK 53+) or appOwnership (legacy).
const isExpoGo =
  (Constants as any).executionEnvironment === "storeClient" ||
  Constants.appOwnership === "expo";

let Notifications: typeof import("expo-notifications") | null = null;
if (Platform.OS !== "web" && !isExpoGo) {
  try {
    Notifications = require("expo-notifications");
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    Notifications = null;
  }
}

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

interface DashboardStats {
  todayEarnings: number;
  todayGross: number;
  todayTrips: number;
  weekEarnings: number;
  weekGross: number;
  weekTrips: number;
  totalEarnings: number;
  completedTrips: number;
  cancelledTrips: number;
  commissionRate: number;
  activeRide: { rideId: string; pickup: string; drop: string; status: string } | null;
  recentTrips: {
    rideId: string;
    pickup: string;
    drop: string;
    fare: number;
    netFare: number;
    distanceKm: number;
    completedAt?: number;
  }[];
}

interface RideRequest {
  rideId: string;
  pickup: string;
  drop: string;
  distanceKm: number;
  durationMin: number;
  fare: number;
  vehicleType: string;
  riderName?: string;
  createdAt: number;
}

function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function RideRequestModal({
  visible,
  ride,
  onAccept,
  onReject,
  accepting,
}: {
  visible: boolean;
  ride: RideRequest | null;
  onAccept: () => void;
  onReject: () => void;
  accepting: boolean;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  if (!ride) return null;

  const driverEarning = Math.round(ride.fare * 0.85);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onReject}>
      <View style={reqStyles.overlay}>
        <Animated.View
          entering={FadeInUp.duration(350)}
          style={[reqStyles.sheet, { backgroundColor: isDark ? "#141414" : "#fff", paddingBottom: insets.bottom + 20 }]}
        >
          <View style={reqStyles.handle} />

          {/* Pulsing ring */}
          <View style={reqStyles.pulseWrap}>
            <View style={[reqStyles.pulseRing, { backgroundColor: Colors.gold + "18" }]} />
            <View style={[reqStyles.pulseCircle, { backgroundColor: Colors.gold }]}>
              <Ionicons name="car-sport" size={26} color="#0A0A0A" />
            </View>
          </View>

          <Text style={[reqStyles.title, { color: colors.text }]}>New Ride Request!</Text>
          <Text style={[reqStyles.riderName, { color: colors.textSecondary }]}>
            {ride.riderName || "Passenger"} is requesting a ride
          </Text>

          {/* Route */}
          <View style={[reqStyles.routeCard, { backgroundColor: isDark ? "#1a1a1a" : "#f5f3ee" }]}>
            <View style={reqStyles.routeRow}>
              <View style={[reqStyles.routeDot, { backgroundColor: "#4CAF50" }]} />
              <Text style={[reqStyles.routeText, { color: colors.text }]} numberOfLines={2}>{ride.pickup}</Text>
            </View>
            <View style={[reqStyles.routeLine, { borderLeftColor: colors.border }]} />
            <View style={reqStyles.routeRow}>
              <View style={[reqStyles.routeDot, { backgroundColor: "#E74C3C", borderRadius: 3 }]} />
              <Text style={[reqStyles.routeText, { color: colors.text }]} numberOfLines={2}>{ride.drop}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={reqStyles.statsRow}>
            <View style={reqStyles.statItem}>
              <Text style={[reqStyles.statValue, { color: colors.text }]}>₹{driverEarning.toLocaleString()}</Text>
              <Text style={[reqStyles.statLabel, { color: colors.textSecondary }]}>Your Earning</Text>
            </View>
            <View style={[reqStyles.statDivider, { backgroundColor: colors.border }]} />
            <View style={reqStyles.statItem}>
              <Text style={[reqStyles.statValue, { color: colors.text }]}>{ride.distanceKm} km</Text>
              <Text style={[reqStyles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
            </View>
            <View style={[reqStyles.statDivider, { backgroundColor: colors.border }]} />
            <View style={reqStyles.statItem}>
              <Text style={[reqStyles.statValue, { color: colors.text }]}>{formatDuration(ride.durationMin)}</Text>
              <Text style={[reqStyles.statLabel, { color: colors.textSecondary }]}>Est. Time</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={reqStyles.btnRow}>
            <Pressable onPress={onReject} disabled={accepting} style={reqStyles.rejectBtn}>
              <Ionicons name="close" size={22} color="#E74C3C" />
              <Text style={reqStyles.rejectText}>Decline</Text>
            </Pressable>
            <Pressable onPress={onAccept} disabled={accepting} style={reqStyles.acceptBtn}>
              {accepting
                ? <ActivityIndicator color="#0A0A0A" />
                : <>
                    <Ionicons name="checkmark" size={22} color="#0A0A0A" />
                    <Text style={reqStyles.acceptText}>Accept Ride</Text>
                  </>
              }
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function DriverDashboard() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const driver = user as DriverData | null;

  const [isOnline, setIsOnline] = useState(driver?.isAvailable ?? false);
  const [pendingRide, setPendingRide] = useState<RideRequest | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const pendingRideRef = useRef<RideRequest | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const bg = isDark ? "#0A0A0A" : "#FAFAF8";

  /* ── Fetch real dashboard stats from backend ───────────────── */
  const fetchStats = async () => {
    const driverId = driver?.id || "driver-1";
    try {
      const res = await fetch(`${API_BASE}/api/driver/${driverId}/dashboard`);
      if (res.ok) {
        const data: DashboardStats = await res.json();
        setStats(data);
      }
    } catch {}
    setStatsLoading(false);
  };

  useEffect(() => {
    fetchStats();
    const refresh = setInterval(fetchStats, 30000);
    return () => clearInterval(refresh);
  }, []);

  /* ── Register push token ──────────────────────────────────── */
  useEffect(() => {
    const registerPush = async () => {
      if (Platform.OS === "web" || !Notifications) return;
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        emitRegisterPushToken(driver?.id || "driver-1", token);
      } catch {
        // Push tokens not available in Expo Go SDK 53+ — ok to ignore
      }
    };
    registerPush();
  }, []);

  /* ── Socket: go online / offline ──────────────────────────── */
  useEffect(() => {
    if (isOnline) {
      const socket = connectSocket();

      emitDriverOnline({
        driverId: driver?.id || "driver-1",
        driverName: driver?.name || "Driver",
        vehicle: driver?.vehicle || "Sedan",
        vehicleNumber: driver?.vehicleNumber || "",
        rating: driver?.rating || 4.5,
      });

      const handleNewRide = (ride: RideRequest) => {
        if (pendingRideRef.current) return; // already showing a request
        pendingRideRef.current = ride;
        setPendingRide(ride);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      };

      const handleRideUnavailable = (data: { rideId: string; reason: string }) => {
        const current = pendingRideRef.current;
        if (current && current.rideId === data.rideId) {
          pendingRideRef.current = null;
          setPendingRide(null);
          if (Platform.OS !== "web" && data.reason === "taken") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }
      };

      socket.on("newRideRequest", handleNewRide);
      socket.on("rideUnavailable", handleRideUnavailable);

      return () => {
        socket.off("newRideRequest", handleNewRide);
        socket.off("rideUnavailable", handleRideUnavailable);
        emitDriverOffline(driver?.id || "driver-1");
      };
    } else {
      emitDriverOffline(driver?.id || "driver-1");
    }
  }, [isOnline]);

  /* ── Redirect non-approved drivers ───────────────────────── */
  useEffect(() => {
    if (driver && driver.kycStatus !== "approved") {
      router.replace("/driver/pending" as any);
    }
  }, [driver?.kycStatus]);

  /* ── Accept ride ──────────────────────────────────────────── */
  const handleAccept = async () => {
    if (!pendingRide) return;
    setAccepting(true);
    const driverId = driver?.id || "driver-1";
    try {
      // Emit socket accept → notifies customer in real-time
      emitAcceptRide(pendingRide.rideId, driverId);

      // Also update REST backend state
      await fetch(`${API_BASE}/api/rides/${pendingRide.rideId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, driverName: driver?.name }),
      }).catch(() => {});

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pendingRideRef.current = null;
      setPendingRide(null);
      setTimeout(fetchStats, 3000); // refresh stats after navigation
      router.push(`/driver/trip?rideId=${pendingRide.rideId}` as any);
    } catch {
      Alert.alert("Error", "Could not accept ride. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  /* ── Reject ride ──────────────────────────────────────────── */
  const handleReject = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (pendingRide) {
      emitRejectRide(pendingRide.rideId, driver?.id || "driver-1");
    }
    pendingRideRef.current = null;
    setPendingRide(null);
  };

  /* ── Dev: Simulate a ride request ────────────────────────── */
  const handleSimulateRide = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`${API_BASE}/api/dev/simulate-ride`, { method: "POST" });
      if (res.ok) {
        // Backend now emits newRideRequest via socket to this driver automatically
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      Alert.alert("Error", "Could not simulate ride.");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: bg }]}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {isOnline ? "🟢 You're Online" : "⚫ You're Offline"}
            </Text>
            <Text style={[styles.name, { color: colors.text }]}>{driver?.name || "Driver"}</Text>
          </View>
          <View style={[styles.toggleWrap, { backgroundColor: isDark ? "#1a1a1a" : "#f0ede6" }]}>
            <Switch
              value={isOnline}
              onValueChange={(val) => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsOnline(val);
              }}
              trackColor={{ false: "#555", true: "#2ECC71" }}
              thumbColor="#FFF"
              ios_backgroundColor="#555"
            />
            <Text style={[styles.toggleLabel, { color: isOnline ? "#2ECC71" : colors.textTertiary }]}>
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </Animated.View>

        {/* ── Blocked banner ───────────────────── */}
        {driver?.isBlocked && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <View style={styles.blockedBanner}>
              <Ionicons name="warning" size={18} color="#FFF" />
              <Text style={styles.blockedText}>Your account has been blocked. Contact support.</Text>
            </View>
          </Animated.View>
        )}

        {/* ── Earnings Card ────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
          <LinearGradient
            colors={isDark ? ["#1A1A1A", "#222218"] : [Colors.gold + "18", Colors.gold + "08"]}
            style={[styles.earningsCard, { borderColor: Colors.gold + "30" }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.earningsRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.earningsLabel, { color: colors.textSecondary }]}>Today's Earnings</Text>
                {statsLoading ? (
                  <View style={styles.skeletonBar} />
                ) : (
                  <Text style={styles.earningsValue}>
                    ₹{(stats?.todayEarnings ?? 0).toLocaleString()}
                  </Text>
                )}
                <Text style={[styles.earningsSubLabel, { color: colors.textSecondary }]}>
                  {stats?.todayTrips ?? 0} {stats?.todayTrips === 1 ? "trip" : "trips"} · {Math.round((stats?.commissionRate ?? 0.15) * 100)}% commission deducted
                </Text>
              </View>
              <View style={[styles.earningsIcon, { backgroundColor: Colors.gold + "20" }]}>
                <Ionicons name="trending-up" size={24} color={Colors.gold} />
              </View>
            </View>
            <View style={[styles.earningsStats, { borderTopColor: Colors.gold + "20" }]}>
              <View style={styles.statItem}>
                {statsLoading
                  ? <View style={[styles.skeletonBar, { width: 32, height: 18, marginBottom: 2 }]} />
                  : <Text style={[styles.statNum, { color: colors.text }]}>{stats?.completedTrips ?? 0}</Text>
                }
                <Text style={[styles.statDesc, { color: colors.textSecondary }]}>Trips</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: Colors.gold + "30" }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.text }]}>{driver?.rating?.toFixed(1) || "—"}</Text>
                <Text style={[styles.statDesc, { color: colors.textSecondary }]}>Rating</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: Colors.gold + "30" }]} />
              <View style={styles.statItem}>
                {statsLoading
                  ? <View style={[styles.skeletonBar, { width: 50, height: 18, marginBottom: 2 }]} />
                  : <Text style={[styles.statNum, { color: colors.text }]}>₹{(stats?.weekEarnings ?? 0).toLocaleString()}</Text>
                }
                <Text style={[styles.statDesc, { color: colors.textSecondary }]}>This Week</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Status Panel ─────────────────────── */}
        <Animated.View entering={FadeInDown.delay(140).duration(400)}>
          <View style={[styles.statusPanel, {
            backgroundColor: isOnline ? "#2ECC7110" : (isDark ? "#1a1a1a" : "#f0ede6"),
            borderColor: isOnline ? "#2ECC7130" : colors.border,
          }]}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? "#2ECC71" : "#888" }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusText, { color: colors.text }]}>
                {isOnline ? "Listening for ride requests" : "Go online to receive rides"}
              </Text>
              <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
                {isOnline ? "Requests will appear automatically" : "Toggle the switch above to go online"}
              </Text>
            </View>
            {isOnline && (
              <View style={styles.pulsingDot}>
                <View style={[styles.pulseInner, { backgroundColor: "#2ECC71" }]} />
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Dev: Simulate Ride ───────────────── */}
        {isOnline && (
          <Animated.View entering={FadeInDown.delay(180).duration(400)}>
            <View style={[styles.devCard, { backgroundColor: isDark ? "#111100" : "#FFFBEC", borderColor: Colors.gold + "30" }]}>
              <View style={styles.devCardHeader}>
                <Ionicons name="code-slash-outline" size={13} color={Colors.gold} />
                <Text style={[styles.devCardTitle, { color: Colors.gold }]}>Dev Tools</Text>
              </View>
              <Text style={[styles.devCardSub, { color: colors.textSecondary }]}>
                Simulate an incoming ride request to test the driver flow
              </Text>
              <Pressable
                onPress={handleSimulateRide}
                disabled={simulating}
                style={({ pressed }) => [
                  styles.simulateBtn,
                  { borderColor: Colors.gold + "50", opacity: pressed || simulating ? 0.7 : 1 },
                ]}
              >
                {simulating
                  ? <ActivityIndicator size="small" color={Colors.gold} />
                  : <Ionicons name="flash-outline" size={16} color={Colors.gold} />
                }
                <Text style={styles.simulateBtnText}>
                  {simulating ? "Sending Request…" : "Simulate Ride Request"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* ── Vehicle & KYC ────────────────────── */}
        <Animated.View entering={FadeInDown.delay(220).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Vehicle & KYC</Text>
          <View style={[styles.vehicleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.vehicleRow}>
              <View style={[styles.vehicleIconWrap, { backgroundColor: Colors.gold + "18" }]}>
                <Ionicons name="car-sport" size={22} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.vehicleName, { color: colors.text }]}>{driver?.vehicle || "N/A"}</Text>
                <Text style={[styles.vehicleNum, { color: colors.textSecondary }]}>{driver?.vehicleNumber || ""}</Text>
              </View>
              <View style={[styles.kycBadge, { backgroundColor: driver?.kycStatus === "approved" ? "#2ECC7118" : "#F39C1218" }]}>
                <Ionicons
                  name={driver?.kycStatus === "approved" ? "checkmark-circle" : "time"}
                  size={14}
                  color={driver?.kycStatus === "approved" ? "#2ECC71" : "#F39C12"}
                />
                <Text style={[styles.kycText, { color: driver?.kycStatus === "approved" ? "#2ECC71" : "#F39C12" }]}>
                  KYC {driver?.kycStatus || "Pending"}
                </Text>
              </View>
            </View>

            {driver?.documents && (
              <View style={[styles.docsPreview, { borderTopColor: colors.border }]}>
                <Text style={[styles.docsLabel, { color: colors.textSecondary }]}>Document status</Text>
                <View style={styles.docsRow}>
                  {driver.documents.map((doc) => (
                    <View key={doc.type} style={styles.docChip}>
                      <View style={[styles.docChipDot, {
                        backgroundColor:
                          doc.status === "verified" ? "#2ECC71"
                          : doc.status === "uploaded" ? "#F39C12"
                          : doc.status === "rejected" ? "#E74C3C" : "#888",
                      }]} />
                      <Text style={[styles.docChipText, { color: colors.textTertiary }]}>{doc.type.replace("_", " ")}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Quick Links ──────────────────────── */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.quickRow}>
            <Pressable
              onPress={() => router.push("/driver/earnings" as any)}
              style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.quickIcon, { backgroundColor: Colors.gold + "18" }]}>
                <Ionicons name="wallet-outline" size={22} color={Colors.gold} />
              </View>
              <Text style={[styles.quickLabel, { color: colors.text }]}>Earnings</Text>
              <Text style={[styles.quickSub, { color: colors.textSecondary }]}>
                ₹{(stats?.totalEarnings ?? 0).toLocaleString()} total
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/driver/profile" as any)}
              style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.quickIcon, { backgroundColor: "#3498DB18" }]}>
                <Ionicons name="person-outline" size={22} color="#3498DB" />
              </View>
              <Text style={[styles.quickLabel, { color: colors.text }]}>Profile</Text>
              <Text style={[styles.quickSub, { color: colors.textSecondary }]}>View & edit</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Recent Trips ──────────────────────── */}
        <Animated.View entering={FadeInDown.delay(320).duration(400)}>
          <View style={styles.recentHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Recent Trips</Text>
            <Pressable onPress={fetchStats}>
              <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {statsLoading ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading trips…</Text>
            </View>
          ) : !stats || stats.recentTrips.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="car-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No trips completed yet</Text>
              <Text style={[styles.emptySubText, { color: colors.textTertiary }]}>Accept a ride to see your trip history here</Text>
            </View>
          ) : (
            <View style={styles.tripsContainer}>
              {stats.recentTrips.map((trip, idx) => (
                <View
                  key={trip.rideId}
                  style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.tripLeft}>
                    <View style={[styles.tripIndex, { backgroundColor: Colors.gold + "20" }]}>
                      <Text style={[styles.tripIndexText, { color: Colors.gold }]}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tripRoute, { color: colors.text }]} numberOfLines={1}>
                        {trip.pickup}
                      </Text>
                      <View style={styles.tripArrow}>
                        <View style={[styles.tripArrowLine, { backgroundColor: colors.border }]} />
                        <Ionicons name="arrow-down" size={10} color={colors.textSecondary} />
                      </View>
                      <Text style={[styles.tripRoute, { color: colors.text }]} numberOfLines={1}>
                        {trip.drop}
                      </Text>
                      <Text style={[styles.tripMeta, { color: colors.textSecondary }]}>
                        {trip.distanceKm} km
                        {trip.completedAt ? ` · ${new Date(trip.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tripRight}>
                    <Text style={[styles.tripNetFare, { color: colors.text }]}>₹{trip.netFare.toLocaleString()}</Text>
                    <Text style={[styles.tripGrossFare, { color: colors.textSecondary }]}>₹{trip.fare.toLocaleString()} gross</Text>
                    <View style={[styles.tripDone, { backgroundColor: "#2ECC7118" }]}>
                      <Text style={styles.tripDoneText}>Done</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Ride Request Modal ────────────────── */}
      <RideRequestModal
        visible={!!pendingRide}
        ride={pendingRide}
        onAccept={handleAccept}
        onReject={handleReject}
        accepting={accepting}
      />
    </>
  );
}

const reqStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D0D0D0", alignSelf: "center", marginBottom: 20 },
  pulseWrap: { alignItems: "center", justifyContent: "center", marginBottom: 16, height: 80 },
  pulseRing: { position: "absolute", width: 80, height: 80, borderRadius: 40 },
  pulseCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, textAlign: "center", marginBottom: 4 },
  riderName: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center", marginBottom: 16 },
  routeCard: { borderRadius: 14, padding: 16, marginBottom: 16 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeDot: { width: 11, height: 11, borderRadius: 5.5, marginTop: 3 },
  routeLine: { height: 14, borderLeftWidth: 2, borderLeftColor: "#D0D0D0", marginLeft: 5, marginVertical: 4 },
  routeText: { fontFamily: "Poppins_500Medium", fontSize: 14, flex: 1, lineHeight: 20 },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.04)" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Poppins_700Bold", fontSize: 17 },
  statLabel: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  statDivider: { width: 1, height: 32 },
  btnRow: { flexDirection: "row", gap: 12 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: "#E74C3C18" },
  rejectText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#E74C3C" },
  acceptBtn: { flex: 2.2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: Colors.gold },
  acceptText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0A0A0A" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  greeting: { fontFamily: "Poppins_400Regular", fontSize: 13, marginBottom: 2 },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26 },
  toggleWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  toggleLabel: { fontFamily: "Poppins_500Medium", fontSize: 13 },

  blockedBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#E74C3C", padding: 14, borderRadius: 12, marginBottom: 16 },
  blockedText: { fontFamily: "Poppins_500Medium", fontSize: 13, color: "#FFF", flex: 1 },

  earningsCard: { borderRadius: 18, padding: 20, borderWidth: 1, marginBottom: 16 },
  earningsRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  earningsLabel: { fontFamily: "Poppins_400Regular", fontSize: 13, marginBottom: 4 },
  earningsValue: { fontFamily: "Poppins_700Bold", fontSize: 36, color: Colors.gold },
  earningsIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  earningsStats: { flexDirection: "row", marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  statDesc: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: "100%" },

  statusPanel: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  statusSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  pulsingDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#2ECC7130", alignItems: "center", justifyContent: "center" },
  pulseInner: { width: 8, height: 8, borderRadius: 4 },

  devCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20, gap: 8 },
  devCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  devCardTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  devCardSub: { fontFamily: "Poppins_400Regular", fontSize: 12, lineHeight: 18 },
  simulateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  simulateBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: Colors.gold },

  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 12 },

  vehicleCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 24 },
  vehicleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  vehicleIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  vehicleName: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  vehicleNum: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  kycBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  kycText: { fontFamily: "Poppins_500Medium", fontSize: 11, textTransform: "capitalize" },
  docsPreview: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  docsLabel: { fontFamily: "Poppins_400Regular", fontSize: 12, marginBottom: 8 },
  docsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  docChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.04)" },
  docChipDot: { width: 8, height: 8, borderRadius: 4 },
  docChipText: { fontFamily: "Poppins_400Regular", fontSize: 10, textTransform: "capitalize" },

  quickRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  quickCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  quickSub: { fontFamily: "Poppins_400Regular", fontSize: 12 },

  skeletonBar: {
    width: 90,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 4,
  },
  earningsSubLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    marginTop: 3,
  },

  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  emptyText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    textAlign: "center",
  },
  emptySubText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  tripsContainer: { gap: 10, marginBottom: 24 },
  tripCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tripLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tripIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  tripIndexText: { fontFamily: "Poppins_700Bold", fontSize: 12 },
  tripRoute: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  tripArrow: { flexDirection: "row", alignItems: "center", paddingLeft: 2, gap: 0, marginVertical: 1 },
  tripArrowLine: { width: 1, height: 10, marginRight: 2 },
  tripMeta: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 3 },
  tripRight: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  tripNetFare: { fontFamily: "Poppins_700Bold", fontSize: 15 },
  tripGrossFare: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  tripDone: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tripDoneText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#2ECC71",
  },
});
