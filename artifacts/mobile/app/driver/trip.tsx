import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { DriverData } from "@/constants/data";
import {
  connectSocket,
  emitJoinRideRoom,
  emitDriverReachedPickup,
  emitDriverSubmitOtp,
  emitDriverEndTrip,
} from "@/services/socketService";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

type TripStatus = "assigned" | "arrived" | "otp_verify" | "started" | "awaiting_payment" | "completed";

interface RideDetail {
  rideId: string;
  pickup: string;
  drop: string;
  distanceKm: number;
  durationMin: number;
  fare: number;
  vehicleType: string;
  otp: string;
  status: string;
  riderName?: string;
}

export default function DriverTripScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const driver = user as DriverData | null;
  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  const [ride, setRide] = useState<RideDetail | null>(null);
  const [tripStatus, setTripStatus] = useState<TripStatus>("assigned");
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tripStartTime, setTripStartTime] = useState<number | null>(null);

  const shakeValue = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeValue.value }],
  }));

  useEffect(() => {
    if (rideId) fetchRide();

    // Connect socket and join the ride room as driver
    const socket = connectSocket();
    if (rideId) emitJoinRideRoom(rideId, "driver");

    // Server tells driver to show OTP entry modal (after driverReachedPickup)
    socket.on("showOtpEntry", () => {
      setShowOtpModal(true);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });

    // OTP verified by server → start trip
    socket.on("otpVerified", () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowOtpModal(false);
      setOtpInput("");
      setOtpError(false);
      setTripStatus("started");
    });

    // OTP rejected by server → show error
    socket.on("otpRejected", ({ message }: { message: string }) => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
      setOtpError(true);
    });

    // Server confirms driver reached end → awaiting payment
    socket.on("awaitingPayment", () => {
      setTripStatus("awaiting_payment");
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });

    // Customer paid → trip done
    socket.on("paymentConfirmed", ({ fare: paidFare }: { fare: number; paymentId?: string }) => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTripStatus("completed");
      setShowSummary(true);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off("showOtpEntry");
      socket.off("otpVerified");
      socket.off("otpRejected");
      socket.off("awaitingPayment");
      socket.off("paymentConfirmed");
    };
  }, [rideId]);

  useEffect(() => {
    if (tripStatus === "started" && !timerRef.current) {
      setTripStartTime(Date.now());
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    if (tripStatus === "completed" && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [tripStatus]);

  const fetchRide = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/rides/${rideId}`);
      if (res.ok) {
        const data = await res.json();
        setRide(data);
        if (data.status === "assigned") setTripStatus("assigned");
        else if (data.status === "started") setTripStatus("started");
        else if (data.status === "completed") setTripStatus("completed");
      }
    } catch (e) {
      Alert.alert("Error", "Could not load ride details.");
    } finally {
      setLoading(false);
    }
  };

  const handleArrivedAtPickup = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTripStatus("arrived");
    // Notify server → server generates OTP → sends to customer + opens OTP modal here
    if (rideId) emitDriverReachedPickup(rideId);
  };

  const handleVerifyOtp = () => {
    if (otpInput.length !== 4) {
      triggerShake();
      setOtpError(true);
      return;
    }
    // Send OTP to server via socket → server validates and emits otpVerified or otpRejected
    setOtpLoading(true);
    if (rideId) emitDriverSubmitOtp(rideId, otpInput);
    // Result handled by socket.on("otpVerified") and socket.on("otpRejected") in useEffect
    setTimeout(() => setOtpLoading(false), 3000); // safety timeout
  };

  const handleEndTrip = () => {
    Alert.alert("End Trip", "Confirm you've reached the destination?\n\nThe customer will be asked to complete payment online.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Trip & Request Payment",
        onPress: () => {
          const fareNum = ride?.fare ?? 0;
          // Emit to server — server transitions both sides to payment flow
          emitDriverEndTrip(rideId, fareNum);
          // Optimistically update UI; server will confirm via awaitingPayment event
          setTripStatus("awaiting_payment");
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const triggerShake = () => {
    shakeValue.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const formatDuration = (min: number) => {
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}min`;
  };

  const driverEarning = ride ? Math.round(ride.fare * 0.85) : 0;

  const statusInfo: Record<TripStatus, { label: string; color: string; icon: string }> = {
    assigned: { label: "Heading to Pickup", color: "#3498DB", icon: "navigate-outline" },
    arrived: { label: "Arrived at Pickup", color: "#F39C12", icon: "location" },
    otp_verify: { label: "Verify OTP", color: Colors.gold, icon: "keypad-outline" },
    started: { label: "Trip in Progress", color: "#2ECC71", icon: "car-sport" },
    awaiting_payment: { label: "Awaiting Payment", color: Colors.gold, icon: "card-outline" },
    completed: { label: "Trip Completed", color: "#2ECC71", icon: "checkmark-circle" },
  };

  const bg = isDark ? "#0A0A0A" : "#FAFAF8";

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading ride details…</Text>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={[styles.container, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Ride not found</Text>
        <Pressable onPress={() => router.replace("/driver")} style={styles.backHomeBtn}>
          <Text style={styles.backHomeBtnText}>Back to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  const info = statusInfo[tripStatus];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* ── Header ───────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12, backgroundColor: bg, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => {
            if (tripStatus === "completed") {
              router.replace("/driver");
            } else {
              Alert.alert("Leave Trip?", "Are you sure you want to go back? The trip is still active.", [
                { text: "Stay", style: "cancel" },
                { text: "Go Back", onPress: () => router.replace("/driver") },
              ]);
            }
          }}
          style={[styles.backBtn, { backgroundColor: Colors.gold + "18" }]}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.gold} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Active Trip</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>#{ride.rideId}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: info.color + "20" }]}>
          <View style={[styles.statusDot, { backgroundColor: info.color }]} />
          <Text style={[styles.statusPillText, { color: info.color }]}>{info.label}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Simulated Route Map Card ──────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <LinearGradient
            colors={isDark ? ["#141414", "#1A1A16"] : ["#F5F3EE", "#EFECE6"]}
            style={[styles.mapCard, { borderColor: colors.border }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.mapInner}>
              <View style={styles.mapDotsCol}>
                <View style={[styles.mapDot, { backgroundColor: "#4CAF50" }]} />
                <View style={styles.mapDashLine} />
                <View style={[styles.mapDot, { backgroundColor: "#E74C3C", borderRadius: 3 }]} />
              </View>
              <View style={{ flex: 1, gap: 16 }}>
                <View>
                  <Text style={[styles.mapLocLabel, { color: colors.textSecondary }]}>PICKUP</Text>
                  <Text style={[styles.mapLocText, { color: colors.text }]} numberOfLines={2}>{ride.pickup}</Text>
                </View>
                <View>
                  <Text style={[styles.mapLocLabel, { color: colors.textSecondary }]}>DROP-OFF</Text>
                  <Text style={[styles.mapLocText, { color: colors.text }]} numberOfLines={2}>{ride.drop}</Text>
                </View>
              </View>
              <View style={[styles.mapIconWrap, { backgroundColor: Colors.gold + "15" }]}>
                <Ionicons name={info.icon as any} size={28} color={Colors.gold} />
              </View>
            </View>

            <View style={[styles.mapStats, { borderTopColor: colors.border }]}>
              <View style={styles.mapStat}>
                <Ionicons name="swap-horizontal-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.mapStatVal, { color: colors.text }]}>{ride.distanceKm} km</Text>
              </View>
              <View style={[styles.mapStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.mapStat}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.mapStatVal, { color: colors.text }]}>{formatDuration(ride.durationMin)}</Text>
              </View>
              <View style={[styles.mapStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.mapStat}>
                <Ionicons name="car-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.mapStatVal, { color: colors.text }]}>{ride.vehicleType === "suv" ? "SUV" : "Sedan"}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Passenger Card ───────────────────────── */}
        <Animated.View entering={FadeInDown.delay(140).duration(400)}>
          <View style={[styles.passengerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.passengerAvatar, { backgroundColor: Colors.gold + "20" }]}>
              <Ionicons name="person" size={22} color={Colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.passengerName, { color: colors.text }]}>{ride.riderName || "Passenger"}</Text>
              <Text style={[styles.passengerSub, { color: colors.textSecondary }]}>Rider</Text>
            </View>
            <View style={styles.passengerActions}>
              <Pressable
                style={[styles.passengerActionBtn, { backgroundColor: "#3498DB18" }]}
                onPress={() => Alert.alert("Call Rider", `Calling ${ride.riderName || "the rider"}...`)}
              >
                <Ionicons name="call" size={18} color="#3498DB" />
              </Pressable>
              <Pressable
                style={[styles.passengerActionBtn, { backgroundColor: "#2ECC7118" }]}
                onPress={() => Alert.alert("Message Rider", "In-app messaging coming soon.")}
              >
                <Ionicons name="chatbubble" size={18} color="#2ECC71" />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ── Fare Card ────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View style={[styles.fareCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.fareRow}>
              <View>
                <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Total Fare</Text>
                <Text style={[styles.fareValue, { color: colors.text }]}>₹{ride.fare.toLocaleString()}</Text>
              </View>
              <View style={[styles.fareDivider, { backgroundColor: colors.border }]} />
              <View>
                <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Your Earning</Text>
                <Text style={[styles.fareValue, { color: "#2ECC71" }]}>₹{driverEarning.toLocaleString()}</Text>
              </View>
              <View style={[styles.fareDivider, { backgroundColor: colors.border }]} />
              <View>
                <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Commission</Text>
                <Text style={[styles.fareValue, { color: "#E74C3C" }]}>₹{(ride.fare - driverEarning).toLocaleString()}</Text>
              </View>
            </View>
            <View style={[styles.farePaymentRow, { backgroundColor: isDark ? "#1a1a1a" : "#f5f3ee", borderRadius: 10, padding: 10, marginTop: 12 }]}>
              <Ionicons name="cash-outline" size={16} color={Colors.gold} />
              <Text style={[styles.farePaymentText, { color: colors.textSecondary }]}>Cash payment at trip end</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Live Timer (when trip started) ────────── */}
        {tripStatus === "started" && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <LinearGradient
              colors={["#2ECC71", "#27AE60"]}
              style={styles.timerCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="timer-outline" size={22} color="#fff" />
              <Text style={styles.timerLabel}>Trip Duration</Text>
              <Text style={styles.timerValue}>{formatTime(elapsedSeconds)}</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ── Progress Steps ───────────────────────── */}
        <Animated.View entering={FadeInDown.delay(260).duration(400)}>
          <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.progressTitle, { color: colors.textSecondary }]}>TRIP PROGRESS</Text>
            {[
              { key: "assigned", label: "On the way to pickup", icon: "navigate-outline" },
              { key: "arrived", label: "Arrived at pickup location", icon: "location-outline" },
              { key: "started", label: "Trip in progress", icon: "car-sport-outline" },
              { key: "completed", label: "Trip completed", icon: "checkmark-circle-outline" },
            ].map((step, i, arr) => {
              const statusOrder: TripStatus[] = ["assigned", "arrived", "started", "completed"];
              const currentIdx = statusOrder.indexOf(tripStatus === "otp_verify" ? "arrived" : tripStatus);
              const stepIdx = statusOrder.indexOf(step.key as TripStatus);
              const isDone = stepIdx < currentIdx;
              const isCurrent = stepIdx === currentIdx;

              return (
                <View key={step.key} style={styles.progressStep}>
                  <View style={styles.progressStepLeft}>
                    <View style={[
                      styles.progressStepDot,
                      {
                        backgroundColor: isDone ? "#2ECC71" : isCurrent ? Colors.gold : (isDark ? "#2a2a2a" : "#e8e4dc"),
                        borderColor: isDone ? "#2ECC71" : isCurrent ? Colors.gold : "transparent",
                      },
                    ]}>
                      {isDone
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : <Ionicons name={step.icon as any} size={12} color={isCurrent ? "#0a0a0a" : colors.textTertiary} />
                      }
                    </View>
                    {i < arr.length - 1 && (
                      <View style={[styles.progressStepLine, { backgroundColor: isDone ? "#2ECC71" : colors.border }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.progressStepLabel,
                    {
                      color: isDone ? "#2ECC71" : isCurrent ? colors.text : colors.textTertiary,
                      fontFamily: isCurrent ? "Poppins_600SemiBold" : "Poppins_400Regular",
                      paddingBottom: i < arr.length - 1 ? 20 : 0,
                    },
                  ]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Bottom Action Bar ─────────────────────── */}
      {tripStatus !== "completed" && (
        <Animated.View
          entering={FadeInUp.delay(200).duration(400)}
          style={[styles.bottomBar, { backgroundColor: bg, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 }]}
        >
          {tripStatus === "assigned" && (
            <Pressable onPress={handleArrivedAtPickup} style={styles.actionBtnWrapper}>
              <LinearGradient
                colors={["#3498DB", "#2980B9"]}
                style={styles.actionBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="location" size={22} color="#fff" />
                <Text style={styles.actionBtnText}>Arrived at Pickup</Text>
              </LinearGradient>
            </Pressable>
          )}

          {tripStatus === "arrived" && (
            <Pressable onPress={() => setShowOtpModal(true)} style={styles.actionBtnWrapper}>
              <LinearGradient
                colors={[Colors.gold, Colors.goldDark]}
                style={styles.actionBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="keypad-outline" size={22} color="#0A0A0A" />
                <Text style={[styles.actionBtnText, { color: "#0A0A0A" }]}>Verify OTP & Start Trip</Text>
              </LinearGradient>
            </Pressable>
          )}

          {tripStatus === "started" && (
            <Pressable onPress={handleEndTrip} style={styles.actionBtnWrapper}>
              <LinearGradient
                colors={["#2ECC71", "#27AE60"]}
                style={styles.actionBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="flag" size={22} color="#fff" />
                <Text style={styles.actionBtnText}>End Trip</Text>
              </LinearGradient>
            </Pressable>
          )}

          {tripStatus === "awaiting_payment" && (
            <Animated.View entering={FadeInUp.duration(400)} style={[styles.awaitingPaymentCard, { backgroundColor: Colors.gold + "12", borderColor: Colors.gold + "35" }]}>
              <View style={[styles.awaitingPaymentIcon, { backgroundColor: Colors.gold + "25" }]}>
                <Ionicons name="card" size={28} color={Colors.gold} />
              </View>
              <Text style={[styles.awaitingPaymentTitle, { color: colors.text }]}>Awaiting Payment</Text>
              <Text style={[styles.awaitingPaymentSub, { color: colors.textSecondary }]}>
                The customer has been asked to complete online payment. Please wait a moment.
              </Text>
              <View style={styles.awaitingDots}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.awaitingDot, { backgroundColor: Colors.gold, opacity: 0.5 + i * 0.25 }]} />
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* ── OTP Verification Modal ────────────────── */}
      <Modal visible={showOtpModal} animationType="slide" transparent onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.otpOverlay}>
          <Animated.View
            entering={FadeInUp.duration(350)}
            style={[styles.otpSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 24 }]}
          >
            <View style={styles.otpHandle} />
            <View style={[styles.otpIconWrap, { backgroundColor: Colors.gold + "20" }]}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.gold} />
            </View>
            <Text style={[styles.otpTitle, { color: colors.text }]}>Verify OTP</Text>
            <Text style={[styles.otpSub, { color: colors.textSecondary }]}>
              Ask the rider for the 4-digit OTP shown in their app
            </Text>

            <Animated.View style={shakeStyle}>
              <View style={[styles.otpInputRow, { backgroundColor: isDark ? "#1a1a1a" : "#f5f3ee", borderColor: otpError ? "#E74C3C" : Colors.gold + "40" }]}>
                <TextInput
                  style={[styles.otpInput, { color: colors.text }]}
                  value={otpInput}
                  onChangeText={(v) => {
                    setOtpInput(v.replace(/\D/g, "").slice(0, 4));
                    setOtpError(false);
                  }}
                  placeholder="• • • •"
                  placeholderTextColor={isDark ? "#444" : "#ccc"}
                  keyboardType="number-pad"
                  maxLength={4}
                  textAlign="center"
                />
              </View>
              {otpError && (
                <Text style={styles.otpErrorText}>Incorrect OTP. Please try again.</Text>
              )}
            </Animated.View>

            <View style={styles.otpBtnRow}>
              <Pressable onPress={() => { setShowOtpModal(false); setOtpInput(""); setOtpError(false); }} style={[styles.otpCancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.otpCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleVerifyOtp} disabled={otpLoading || otpInput.length < 4} style={[styles.otpSubmitBtn, { opacity: otpInput.length < 4 ? 0.5 : 1 }]}>
                <LinearGradient
                  colors={[Colors.gold, Colors.goldDark]}
                  style={styles.otpSubmitGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  {otpLoading
                    ? <ActivityIndicator color="#0a0a0a" />
                    : <>
                        <Ionicons name="checkmark-circle" size={20} color="#0a0a0a" />
                        <Text style={styles.otpSubmitText}>Verify & Start</Text>
                      </>
                  }
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Trip Summary Modal ────────────────────── */}
      <Modal visible={showSummary} animationType="fade" transparent onRequestClose={() => {}}>
        <View style={styles.summaryOverlay}>
          <Animated.View entering={FadeInDown.duration(400)} style={[styles.summarySheet, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={["#2ECC71", "#27AE60"]}
              style={styles.summaryHero}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="checkmark-circle" size={56} color="#fff" />
              <Text style={styles.summaryHeroTitle}>Trip Completed!</Text>
              <Text style={styles.summaryHeroSub}>Great job, {driver?.name?.split(" ")[0] || "Driver"}</Text>
            </LinearGradient>

            <View style={styles.summaryBody}>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: "#2ECC7118" }]}>
                  <Ionicons name="cash" size={18} color="#2ECC71" />
                </View>
                <View>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Your Earning</Text>
                  <Text style={[styles.summaryValue, { color: "#2ECC71" }]}>₹{driverEarning.toLocaleString()}</Text>
                </View>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: Colors.gold + "18" }]}>
                  <Ionicons name="swap-horizontal" size={18} color={Colors.gold} />
                </View>
                <View>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Distance</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{ride.distanceKm} km</Text>
                </View>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: "#3498DB18" }]}>
                  <Ionicons name="timer" size={18} color="#3498DB" />
                </View>
                <View>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Trip Time</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatTime(elapsedSeconds)}</Text>
                </View>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: "#E74C3C18" }]}>
                  <Ionicons name="remove-circle" size={18} color="#E74C3C" />
                </View>
                <View>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Commission (15%)</Text>
                  <Text style={[styles.summaryValue, { color: "#E74C3C" }]}>-₹{(ride.fare - driverEarning).toLocaleString()}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  setShowSummary(false);
                  router.replace("/driver");
                }}
                style={styles.summaryDoneBtn}
              >
                <LinearGradient
                  colors={[Colors.gold, Colors.goldDark]}
                  style={styles.summaryDoneBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="home" size={20} color="#0a0a0a" />
                  <Text style={styles.summaryDoneText}>Back to Dashboard</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { fontFamily: "Poppins_400Regular", fontSize: 14, marginTop: 12 },
  backHomeBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: Colors.gold },
  backHomeBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0a0a0a" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },
  headerSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontFamily: "Poppins_500Medium", fontSize: 11 },

  mapCard: { borderRadius: 18, borderWidth: 1, marginTop: 20, marginBottom: 14, overflow: "hidden" },
  mapInner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 },
  mapDotsCol: { width: 20, alignItems: "center", gap: 0 },
  mapDot: { width: 12, height: 12, borderRadius: 6 },
  mapDashLine: { width: 2, height: 28, backgroundColor: "#ccc", marginVertical: 4 },
  mapLocLabel: { fontFamily: "Poppins_500Medium", fontSize: 10, letterSpacing: 0.5, marginBottom: 2 },
  mapLocText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, lineHeight: 20 },
  mapIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  mapStats: { flexDirection: "row", borderTopWidth: 1, paddingHorizontal: 18, paddingVertical: 12 },
  mapStat: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  mapStatVal: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  mapStatDivider: { width: 1, height: "80%" },

  passengerCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  passengerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  passengerName: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  passengerSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  passengerActions: { flexDirection: "row", gap: 8 },
  passengerActionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  fareCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  fareRow: { flexDirection: "row", alignItems: "center" },
  fareLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, marginBottom: 4, textAlign: "center" },
  fareValue: { fontFamily: "Poppins_700Bold", fontSize: 18, textAlign: "center" },
  fareDivider: { width: 1, height: 40, marginHorizontal: 12 },
  farePaymentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  farePaymentText: { fontFamily: "Poppins_400Regular", fontSize: 12 },

  timerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  timerLabel: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#fff", flex: 1 },
  timerValue: { fontFamily: "Poppins_700Bold", fontSize: 24, color: "#fff" },

  progressCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  progressTitle: { fontFamily: "Poppins_500Medium", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 16 },
  progressStep: { flexDirection: "row", gap: 14 },
  progressStepLeft: { alignItems: "center", width: 24 },
  progressStepDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  progressStepLine: { width: 2, flex: 1, minHeight: 16, marginVertical: 4 },
  progressStepLabel: { fontSize: 13, paddingTop: 3 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  actionBtnWrapper: { borderRadius: 16, overflow: "hidden" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  actionBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 17, color: "#fff" },

  awaitingPaymentCard: { borderRadius: 18, borderWidth: 1, padding: 22, gap: 10, alignItems: "center", marginTop: 4 },
  awaitingPaymentIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  awaitingPaymentTitle: { fontFamily: "Poppins_700Bold", fontSize: 18 },
  awaitingPaymentSub: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  awaitingDots: { flexDirection: "row", gap: 8, marginTop: 6 },
  awaitingDot: { width: 8, height: 8, borderRadius: 4 },

  otpOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  otpSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, gap: 16, alignItems: "center" },
  otpHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D0D0D0", marginBottom: 8 },
  otpIconWrap: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  otpTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24 },
  otpSub: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  otpInputRow: { borderRadius: 16, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 24, width: 200 },
  otpInput: { fontFamily: "Poppins_700Bold", fontSize: 36, letterSpacing: 12, textAlign: "center" },
  otpErrorText: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "#E74C3C", textAlign: "center", marginTop: 6 },
  otpBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
  otpCancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  otpCancelText: { fontFamily: "Poppins_500Medium", fontSize: 15 },
  otpSubmitBtn: { flex: 2, borderRadius: 14, overflow: "hidden" },
  otpSubmitGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  otpSubmitText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0a0a0a" },

  summaryOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", paddingHorizontal: 24 },
  summarySheet: { borderRadius: 24, overflow: "hidden" },
  summaryHero: { alignItems: "center", paddingVertical: 32, gap: 8 },
  summaryHeroTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: "#fff" },
  summaryHeroSub: { fontFamily: "Poppins_400Regular", fontSize: 15, color: "rgba(255,255,255,0.8)" },
  summaryBody: { padding: 24, gap: 4 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 8 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  summaryLabel: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  summaryValue: { fontFamily: "Poppins_700Bold", fontSize: 20 },
  summaryDivider: { height: 1, marginVertical: 2 },
  summaryDoneBtn: { borderRadius: 16, overflow: "hidden", marginTop: 16 },
  summaryDoneBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 17 },
  summaryDoneText: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#0a0a0a" },
});
