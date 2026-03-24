import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Animated as RNAnimated,
  TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import Colors from "@/constants/colors";

const DRIVERS = [
  {
    name: "Rajesh Kumar",
    vehicle: "Maruti Swift Dzire",
    vehicleNumber: "UP32 AB 1234",
    rating: 4.8,
    phone: "+91 98765 43210",
    distKm: 1.2,
    eta: 4,
    trips: 2340,
  },
  {
    name: "Amit Singh",
    vehicle: "Honda Amaze",
    vehicleNumber: "UP80 CD 5678",
    rating: 4.6,
    phone: "+91 87654 32109",
    distKm: 2.1,
    eta: 6,
    trips: 1820,
  },
  {
    name: "Suresh Verma",
    vehicle: "Hyundai Xcent",
    vehicleNumber: "DL3C EF 9012",
    rating: 4.9,
    phone: "+91 76543 21098",
    distKm: 0.8,
    eta: 3,
    trips: 3150,
  },
  {
    name: "Mohammad Rizvi",
    vehicle: "Toyota Etios",
    vehicleNumber: "UP65 GH 3456",
    rating: 4.7,
    phone: "+91 65432 10987",
    distKm: 1.8,
    eta: 5,
    trips: 1640,
  },
];

export default function DriverAssigned() {
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
    // Socket-matched driver data (may be present)
    driverName?: string;
    driverVehicle?: string;
    driverVehicleNumber?: string;
    driverRating?: string;
    driverDistKm?: string;
    driverEtaMin?: string;
  }>();

  const insets = useSafeAreaInsets();

  // Use real socket-matched driver if available, otherwise fall back to DRIVERS list
  const fallbackDriver = useRef(DRIVERS[Math.floor(Math.random() * DRIVERS.length)]).current;
  const driver = useRef({
    name: params.driverName || fallbackDriver.name,
    vehicle: params.driverVehicle || fallbackDriver.vehicle,
    vehicleNumber: params.driverVehicleNumber || fallbackDriver.vehicleNumber,
    rating: params.driverRating ? parseFloat(params.driverRating) : fallbackDriver.rating,
    phone: fallbackDriver.phone,
    distKm: params.driverDistKm ? parseFloat(params.driverDistKm) : fallbackDriver.distKm,
    eta: params.driverEtaMin ? parseInt(params.driverEtaMin) : fallbackDriver.eta,
    trips: fallbackDriver.trips,
  }).current;

  const serverOtp = params.otp || String(Math.floor(1000 + Math.random() * 9000));

  const [etaMin, setEtaMin] = useState(driver.eta);
  const [otpRevealed, setOtpRevealed] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const pulseBadge = useRef(new RNAnimated.Value(1)).current;
  const carMoveX = useRef(new RNAnimated.Value(0)).current;
  const carMoveY = useRef(new RNAnimated.Value(0)).current;
  const shakeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseBadge, { toValue: 1.06, duration: 850, useNativeDriver: true }),
        RNAnimated.timing(pulseBadge, { toValue: 1, duration: 850, useNativeDriver: true }),
      ])
    ).start();

    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.parallel([
          RNAnimated.timing(carMoveX, { toValue: 14, duration: 2200, useNativeDriver: true }),
          RNAnimated.timing(carMoveY, { toValue: -8, duration: 2200, useNativeDriver: true }),
        ]),
        RNAnimated.parallel([
          RNAnimated.timing(carMoveX, { toValue: 0, duration: 2200, useNativeDriver: true }),
          RNAnimated.timing(carMoveY, { toValue: 0, duration: 2200, useNativeDriver: true }),
        ]),
      ])
    ).start();

    const otpTimer = setTimeout(() => setOtpRevealed(true), 900);
    const etaInterval = setInterval(() => {
      setEtaMin((prev) => {
        if (prev <= 1) { clearInterval(etaInterval); return 1; }
        return prev - 1;
      });
    }, 60000);

    return () => {
      clearTimeout(otpTimer);
      clearInterval(etaInterval);
    };
  }, []);

  const shakeError = () => {
    RNAnimated.sequence([
      RNAnimated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleVerifyOtp = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (enteredOtp.trim() === serverOtp) {
      setOtpVerified(true);
      setOtpError("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setOtpError("Incorrect OTP. Please try again.");
      shakeError();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleStartTrip = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.replace({
      pathname: "/booking/confirmed",
      params: {
        bookingId: params.bookingId || `SG${Date.now().toString().slice(-6)}`,
        destination: params.destination,
        pickup: params.pickup,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        vehicle: params.vehicleType || "sedan",
        passengers: "1",
        fare: params.fare,
        originalFare: params.originalFare,
        couponCode: params.couponCode,
        couponDiscount: params.couponDiscount,
        distanceKm: params.distanceKm,
        driverName: driver.name,
        driverPhone: driver.phone,
        driverRating: String(driver.rating),
        driverVehicle: driver.vehicle,
        driverVehicleNumber: driver.vehicleNumber,
      },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0A0A0A", "#111108"]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 140,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Assigned badge */}
        <Animated.View entering={ZoomIn.delay(100).duration(500)} style={{ alignItems: "center", marginBottom: 18 }}>
          <LinearGradient
            colors={[Colors.gold + "35", Colors.gold + "12"]}
            style={styles.assignedBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
            <Text style={styles.assignedText}>Driver Assigned!</Text>
          </LinearGradient>
        </Animated.View>

        {/* Mini map */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.mapCard}>
          <LinearGradient colors={["#191914", "#141410"]} style={styles.mapInner}>
            {[15, 30, 45, 60, 75].map((pct) => (
              <View key={`h${pct}`} style={[styles.gridH, { top: `${pct}%` }]} />
            ))}
            {[15, 30, 45, 60, 75].map((pct) => (
              <View key={`v${pct}`} style={[styles.gridV, { left: `${pct}%` }]} />
            ))}
            <View style={styles.routeLine} />
            <View style={styles.pickupMarker}>
              <View style={styles.pickupInner} />
            </View>
            <View style={styles.dropMarker} />
            <RNAnimated.View
              style={[
                styles.movingCar,
                { transform: [{ translateX: carMoveX }, { translateY: carMoveY }] },
              ]}
            >
              <Text style={{ fontSize: 28 }}>🚗</Text>
            </RNAnimated.View>
            <View style={styles.mapEtaBadge}>
              <View style={styles.mapEtaDot} />
              <Text style={styles.mapEtaText}>{etaMin} min away</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Driver card */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.driverCard}>
          <View style={styles.driverTop}>
            <RNAnimated.View style={{ transform: [{ scale: pulseBadge }] }}>
              <LinearGradient
                colors={[Colors.gold + "30", Colors.gold + "10"]}
                style={styles.avatar}
              >
                <Ionicons name="person" size={30} color={Colors.gold} />
              </LinearGradient>
            </RNAnimated.View>

            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={Colors.gold} />
                <Text style={styles.ratingText}>{driver.rating.toFixed(1)}</Text>
                <View style={styles.sep} />
                <Text style={styles.driverVehicle}>{driver.vehicle}</Text>
              </View>
              <Text style={styles.vehicleNum}>{driver.vehicleNumber}</Text>
            </View>

            <View style={{ gap: 8 }}>
              <Pressable style={[styles.actionBtn, { backgroundColor: "#2ECC7118" }]}>
                <Ionicons name="call" size={17} color="#2ECC71" />
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: Colors.gold + "18" }]}>
                <Ionicons name="chatbubble" size={17} color={Colors.gold} />
              </Pressable>
            </View>
          </View>

          <View style={styles.statsBar}>
            <View style={styles.driverStat}>
              <Ionicons name="navigate" size={13} color={Colors.gold} />
              <Text style={styles.driverStatVal}>{driver.distKm} km</Text>
              <Text style={styles.driverStatLbl}>from you</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.driverStat}>
              <Ionicons name="time" size={13} color={Colors.gold} />
              <Text style={styles.driverStatVal}>{etaMin} min</Text>
              <Text style={styles.driverStatLbl}>ETA</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.driverStat}>
              <Ionicons name="car" size={13} color={Colors.gold} />
              <Text style={styles.driverStatVal}>{driver.trips.toLocaleString()}</Text>
              <Text style={styles.driverStatLbl}>trips</Text>
            </View>
          </View>
        </Animated.View>

        {/* OTP display card */}
        {otpRevealed && (
          <Animated.View entering={ZoomIn.delay(0).duration(600)} style={styles.otpCard}>
            <View style={styles.otpHeader}>
              <View style={styles.otpShield}>
                <Ionicons name="shield-checkmark" size={22} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.otpTitle}>Your Ride OTP</Text>
                <Text style={styles.otpSub}>
                  Share this 4-digit code with your driver
                </Text>
              </View>
            </View>

            <View style={styles.otpDigitsRow}>
              {serverOtp.split("").map((digit, i) => (
                <View key={i} style={styles.otpBox}>
                  <Text style={styles.otpDigit}>{digit}</Text>
                </View>
              ))}
            </View>

            <View style={styles.otpNote}>
              <Ionicons name="lock-closed-outline" size={13} color={Colors.gold} />
              <Text style={styles.otpNoteText}>
                Never share your OTP with anyone other than your assigned driver
              </Text>
            </View>
          </Animated.View>
        )}

        {/* OTP verification input */}
        {otpRevealed && !otpVerified && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.verifyCard}>
            <Text style={styles.verifyTitle}>Confirm Driver Verified OTP</Text>
            <Text style={styles.verifySub}>
              After sharing, confirm here once your driver acknowledges
            </Text>

            <RNAnimated.View
              style={[
                styles.otpInputRow,
                { transform: [{ translateX: shakeAnim }] },
                otpError ? styles.otpInputRowError : null,
              ]}
            >
              <Ionicons name="keypad-outline" size={18} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.otpInput}
                value={enteredOtp}
                onChangeText={(t) => {
                  setEnteredOtp(t.replace(/\D/g, "").slice(0, 4));
                  if (otpError) setOtpError("");
                }}
                placeholder="Enter 4-digit OTP"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
                onSubmitEditing={handleVerifyOtp}
              />
              {enteredOtp.length === 4 && (
                <Pressable
                  onPress={handleVerifyOtp}
                  style={[styles.verifyBtn, { backgroundColor: Colors.gold + "25" }]}
                >
                  <Text style={styles.verifyBtnText}>Verify</Text>
                </Pressable>
              )}
            </RNAnimated.View>

            {otpError !== "" && (
              <View style={styles.otpErrorRow}>
                <Ionicons name="alert-circle" size={14} color="#E74C3C" />
                <Text style={styles.otpErrorText}>{otpError}</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* OTP verified state */}
        {otpVerified && (
          <Animated.View entering={ZoomIn.delay(0).duration(500)} style={styles.verifiedCard}>
            <Ionicons name="checkmark-circle" size={26} color="#2ECC71" />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifiedTitle}>OTP Verified!</Text>
              <Text style={styles.verifiedSub}>Your driver is ready. Tap Start Trip to begin.</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <Animated.View
        entering={FadeInUp.delay(400).duration(500)}
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 },
        ]}
      >
        <View style={{ gap: 2 }}>
          <Text style={styles.bottomLbl}>Total Fare</Text>
          <Text style={styles.bottomFare}>
            {params.fare ? `₹${parseInt(params.fare).toLocaleString()}` : "—"}
          </Text>
        </View>
        <Pressable
          onPress={otpVerified ? handleStartTrip : handleVerifyOtp}
          style={({ pressed }) => [
            styles.startBtn,
            { opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <LinearGradient
            colors={
              otpVerified
                ? ["#2ECC71", "#27AE60"]
                : [Colors.gold, Colors.goldDark]
            }
            style={styles.startGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={otpVerified ? "flag" : "checkmark-circle-outline"}
              size={19}
              color="#0A0A0A"
            />
            <Text style={styles.startText}>
              {otpVerified ? "Start Trip" : "Verify & Start"}
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  assignedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 30,
  },
  assignedText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: Colors.gold },
  mapCard: { height: 195, borderRadius: 18, overflow: "hidden", marginBottom: 14 },
  mapInner: { flex: 1 },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  routeLine: {
    position: "absolute",
    bottom: "28%",
    left: "18%",
    right: "18%",
    height: 2,
    backgroundColor: Colors.gold + "55",
    borderRadius: 1,
  },
  pickupMarker: {
    position: "absolute",
    bottom: "26%",
    left: "16%",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2ECC7130",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2ECC71" },
  dropMarker: {
    position: "absolute",
    top: "20%",
    right: "16%",
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: Colors.gold,
  },
  movingCar: { position: "absolute", bottom: "36%", left: "32%" },
  mapEtaBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  mapEtaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#0A0A0A" },
  mapEtaText: { fontFamily: "Poppins_600SemiBold", fontSize: 11, color: "#0A0A0A" },
  driverCard: {
    backgroundColor: "#141410",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    gap: 16,
  },
  driverTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: { fontFamily: "Poppins_600SemiBold", fontSize: 17, color: "#fff" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  ratingText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: Colors.gold },
  sep: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)" },
  driverVehicle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },
  vehicleNum: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginTop: 3,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#1a1a14",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  driverStat: { flex: 1, alignItems: "center", gap: 4 },
  driverStatVal: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#fff" },
  driverStatLbl: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
  },
  statDiv: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignSelf: "stretch",
  },
  otpCard: {
    backgroundColor: "#141410",
    borderRadius: 18,
    padding: 20,
    gap: 18,
    borderWidth: 1,
    borderColor: Colors.gold + "25",
    marginBottom: 14,
  },
  otpHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  otpShield: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gold + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  otpTitle: { fontFamily: "Poppins_700Bold", fontSize: 17, color: "#fff" },
  otpSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    marginTop: 4,
    lineHeight: 18,
  },
  otpDigitsRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
  otpBox: {
    width: 66,
    height: 76,
    borderRadius: 14,
    backgroundColor: "#0A0A0A",
    borderWidth: 2,
    borderColor: Colors.gold + "60",
    alignItems: "center",
    justifyContent: "center",
  },
  otpDigit: { fontFamily: "Poppins_700Bold", fontSize: 34, color: Colors.gold },
  otpNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.gold + "0D",
  },
  otpNoteText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.38)",
    flex: 1,
    lineHeight: 16,
  },
  verifyCard: {
    backgroundColor: "#141410",
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 14,
  },
  verifyTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#fff" },
  verifySub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    lineHeight: 18,
  },
  otpInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1a1a14",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  otpInputRowError: {
    borderColor: "#E74C3C60",
  },
  otpInput: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 22,
    color: "#fff",
    letterSpacing: 8,
    padding: 0,
  },
  verifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  verifyBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: Colors.gold },
  otpErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  otpErrorText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#E74C3C",
    flex: 1,
  },
  verifiedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#2ECC7110",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2ECC7130",
    marginBottom: 14,
  },
  verifiedTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#2ECC71" },
  verifiedSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 3,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "#141410",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  bottomLbl: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  bottomFare: { fontFamily: "Poppins_700Bold", fontSize: 28, color: Colors.gold },
  startBtn: { borderRadius: 14, overflow: "hidden" },
  startGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  startText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0A0A0A" },
});
