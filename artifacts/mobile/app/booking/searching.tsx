import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated as RNAnimated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import {
  connectSocket,
  emitFindDriver,
  emitCancelRide,
} from "@/services/socketService";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

const SEARCH_DURATION_MS = 20000;

export default function SearchingDriver() {
  const params = useLocalSearchParams<{
    pickup?: string;
    destination?: string;
    distanceKm?: string;
    durationMin?: string;
    vehicleType?: string;
    vehicleLabel?: string;
    fare?: string;
    originalFare?: string;
    couponCode?: string;
    couponDiscount?: string;
    bookingId?: string;
    otp?: string;
  }>();

  const insets = useSafeAreaInsets();
  const [elapsed, setElapsed] = useState(0);
  const [dotStr, setDotStr] = useState("...");
  const [noDrivers, setNoDrivers] = useState(false);

  const ring1 = useRef(new RNAnimated.Value(0)).current;
  const ring2 = useRef(new RNAnimated.Value(0)).current;
  const ring3 = useRef(new RNAnimated.Value(0)).current;
  const carBounce = useRef(new RNAnimated.Value(0)).current;

  const resolvedRef = useRef(false);

  const handleNoDrivers = () => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setNoDrivers(true);
  };

  useEffect(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const animRing = (anim: RNAnimated.Value, delay: number) => {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          RNAnimated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    };
    animRing(ring1, 0);
    animRing(ring2, 600);
    animRing(ring3, 1200);

    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(carBounce, { toValue: -10, duration: 420, useNativeDriver: true }),
        RNAnimated.timing(carBounce, { toValue: 0, duration: 420, useNativeDriver: true }),
      ])
    ).start();

    const dotsTimer = setInterval(() => {
      setDotStr((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);

    const navigateToAssigned = (driverInfo: {
      driverName?: string;
      vehicle?: string;
      vehicleNumber?: string;
      rating?: number;
      distToPickup?: number;
      etaMin?: number;
    }) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      clearInterval(dotsTimer);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace({
        pathname: "/booking/driver-assigned",
        params: {
          ...params,
          ...(driverInfo.driverName ? { driverName: driverInfo.driverName } : {}),
          ...(driverInfo.vehicle ? { driverVehicle: driverInfo.vehicle } : {}),
          ...(driverInfo.vehicleNumber ? { driverVehicleNumber: driverInfo.vehicleNumber } : {}),
          ...(driverInfo.rating ? { driverRating: String(driverInfo.rating) } : {}),
          ...(driverInfo.distToPickup ? { driverDistKm: String(driverInfo.distToPickup) } : {}),
          ...(driverInfo.etaMin ? { driverEtaMin: String(driverInfo.etaMin) } : {}),
        },
      });
    };

    const socket = connectSocket();

    socket.on("driverFound", (data) => {
      navigateToAssigned(data);
    });

    socket.on("noDriverAvailable", () => {
      clearInterval(dotsTimer);
      handleNoDrivers();
    });

    const rideId = params.bookingId || `SG${Date.now().toString().slice(-6)}`;
    emitFindDriver({
      rideId,
      pickup: params.pickup || "Pickup",
      drop: params.destination || "Destination",
      distanceKm: parseFloat(params.distanceKm || "0"),
      durationMin: parseFloat(params.durationMin || "0"),
      fare: parseFloat(params.fare || "0"),
      vehicleType: params.vehicleType || "sedan",
    });

    // ── Progress timer + 20-second client-side timeout ─────────
    const startMs = Date.now();
    const searchTimer = setInterval(() => {
      const e = Date.now() - startMs;
      setElapsed(e);
      if (e >= SEARCH_DURATION_MS) {
        clearInterval(searchTimer);
        clearInterval(dotsTimer);
        handleNoDrivers();
      }
    }, 100);

    // ── REST poll every 5 s as socket-miss safety net ──────────
    const pollTimer = setInterval(async () => {
      if (resolvedRef.current) { clearInterval(pollTimer); return; }
      try {
        const res = await fetch(`${API_BASE}/api/rides/${rideId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "no_driver" || data.status === "cancelled") {
          clearInterval(pollTimer);
          clearInterval(dotsTimer);
          handleNoDrivers();
        } else if (data.status === "assigned") {
          clearInterval(pollTimer);
          navigateToAssigned({ driverName: data.driverName });
        }
      } catch { /* network error — keep polling */ }
    }, 5000);

    return () => {
      clearInterval(searchTimer);
      clearInterval(dotsTimer);
      clearInterval(pollTimer);
      socket.off("driverFound");
      socket.off("noDriverAvailable");
      if (!resolvedRef.current && params.bookingId) {
        emitCancelRide(params.bookingId);
      }
    };
  }, []);

  const progress = Math.min(elapsed / SEARCH_DURATION_MS, 1);
  const secondsLeft = Math.max(0, Math.ceil((SEARCH_DURATION_MS - elapsed) / 1000));

  const ringStyle = (anim: RNAnimated.Value, size: number) => ({
    position: "absolute" as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: noDrivers ? "rgba(255,255,255,0.15)" : Colors.gold,
    opacity: anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.55, 0.2, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0A0A0A", "#111108", "#0A0A0A"]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20 }]}>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.headerTitle}>
          {noDrivers ? "No drivers nearby" : `Finding your ride${dotStr}`}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.headerSub}>
          {noDrivers
            ? "All drivers are busy right now. Please try again in a moment."
            : "Searching for drivers near your pickup"}
        </Animated.Text>
      </View>

      {/* Pulse rings + icon */}
      <View style={styles.pulseArea}>
        {!noDrivers && (
          <>
            <RNAnimated.View style={ringStyle(ring3, 220)} />
            <RNAnimated.View style={ringStyle(ring2, 160)} />
            <RNAnimated.View style={ringStyle(ring1, 100)} />
          </>
        )}
        <RNAnimated.View style={noDrivers ? undefined : { transform: [{ translateY: carBounce }] }}>
          <LinearGradient
            colors={noDrivers ? ["#2a2a2a", "#1a1a1a"] : [Colors.gold, Colors.goldDark]}
            style={styles.carCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.carEmoji}>{noDrivers ? "😔" : "🚗"}</Text>
          </LinearGradient>
        </RNAnimated.View>
      </View>

      {/* Progress bar (hidden when no drivers) */}
      {!noDrivers && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{secondsLeft}s</Text>
        </View>
      )}

      {/* Bottom sheet */}
      <Animated.View
        entering={FadeInUp.delay(300).duration(600)}
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20 },
        ]}
      >
        {/* Route */}
        <View style={styles.routeBlock}>
          <View style={styles.routePointRow}>
            <View style={styles.dotGreen} />
            <Text style={styles.routePointText} numberOfLines={1}>
              {params.pickup || "Pickup"}
            </Text>
          </View>
          <View style={styles.routeConnector}>
            <View style={styles.routeConnectorLine} />
          </View>
          <View style={styles.routePointRow}>
            <View style={styles.dotGold} />
            <Text style={styles.routePointText} numberOfLines={1}>
              {params.destination || "Destination"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Trip stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={15} color={Colors.gold} />
            <Text style={styles.statVal}>{params.distanceKm || "—"} km</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={15} color={Colors.gold} />
            <Text style={styles.statVal}>{params.durationMin || "—"} min</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="wallet-outline" size={15} color={Colors.gold} />
            <Text style={styles.statVal}>₹{params.fare || "—"}</Text>
          </View>
        </View>

        {/* Status badge */}
        {noDrivers ? (
          <View style={[styles.etaBadge, { borderColor: "rgba(255,255,255,0.1)" }]}>
            <Ionicons name="alert-circle-outline" size={16} color="rgba(255,255,255,0.4)" />
            <Text style={[styles.etaText, { color: "rgba(255,255,255,0.4)" }]}>
              No drivers available in your area right now
            </Text>
          </View>
        ) : (
          <View style={[styles.etaBadge, { borderColor: Colors.gold + "40" }]}>
            <View style={styles.etaPulse} />
            <Text style={styles.etaText}>
              Searching for nearby drivers · ETA 2–5 min
            </Text>
          </View>
        )}

        {/* Action buttons */}
        {noDrivers ? (
          <View style={styles.btnRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.6 : 1, flex: 1 }]}
            >
              <Text style={styles.cancelText}>Go Back</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                resolvedRef.current = false;
                setNoDrivers(false);
                setElapsed(0);
                const rideId = params.bookingId || `SG${Date.now().toString().slice(-6)}`;
                emitFindDriver({
                  rideId,
                  pickup: params.pickup || "Pickup",
                  drop: params.destination || "Destination",
                  distanceKm: parseFloat(params.distanceKm || "0"),
                  durationMin: parseFloat(params.durationMin || "0"),
                  fare: parseFloat(params.fare || "0"),
                  vehicleType: params.vehicleType || "sedan",
                });
              }}
              style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.85 : 1, flex: 1 }]}
            >
              <Ionicons name="refresh" size={16} color="#0A0A0A" style={{ marginRight: 6 }} />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.back();
            }}
            style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.cancelText}>Cancel Ride</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: { alignItems: "center", paddingHorizontal: 24 },
  headerTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    color: "#fff",
    textAlign: "center",
  },
  headerSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.35)",
    marginTop: 8,
    textAlign: "center",
  },
  pulseArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  carCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  carEmoji: { fontSize: 38 },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 36,
    gap: 12,
    marginBottom: 24,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.gold,
    width: 28,
    textAlign: "right",
  },
  sheet: {
    backgroundColor: "#141410",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 18,
  },
  routeBlock: { gap: 6 },
  routePointRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2ECC71" },
  dotGold: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold },
  routeConnector: { paddingLeft: 4, paddingVertical: 2 },
  routeConnectorLine: {
    width: 2,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginLeft: 4,
    borderRadius: 1,
  },
  routePointText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "#fff",
    flex: 1,
  },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)" },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 6 },
  statVal: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#fff" },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: Colors.gold + "08",
  },
  etaPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  etaText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    flex: 1,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cancelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "rgba(255,255,255,0.45)",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: Colors.gold,
  },
  retryText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#0A0A0A",
  },
});
