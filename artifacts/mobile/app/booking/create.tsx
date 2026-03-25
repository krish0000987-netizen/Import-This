import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { calculateFare } from "@/constants/data";
import { useData } from "@/contexts/DataContext";
import { connectSocket } from "@/services/socketService";
import { isStateSupported } from "@/constants/supportedLocations";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

async function fetchStateFromCoords(lat: number, lng: number): Promise<string | undefined> {
  try {
    const res = await fetch(`${API_BASE}/api/ola/reverse?lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const results: any[] = data.results || data.geocodingResults || [];
    const comps: any[] = results[0]?.address_components || [];
    for (const c of comps) {
      if ((c.types || []).includes("administrative_area_level_1")) return c.long_name as string;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export default function CreateBooking() {
  const { user } = useAuth();
  const { getAllDestinations } = useData();
  const {
    destinationId,
    destinationName: dynDestName,
    pickup: pickupParam,
    distanceKm: distanceKmParam,
    durationMin: durationMinParam,
    vehicleType: vehicleTypeParam,
    vehicleLabel: vehicleLabelParam,
    fare: fareParam,
    pickupLat: pickupLatParam,
    pickupLon: pickupLonParam,
    destLat: destLatParam,
    destLon: destLonParam,
  } = useLocalSearchParams<{
    destinationId?: string;
    destinationName?: string;
    pickup?: string;
    distanceKm?: string;
    durationMin?: string;
    vehicleType?: string;
    vehicleLabel?: string;
    fare?: string;
    pickupLat?: string;
    pickupLon?: string;
    destLat?: string;
    destLon?: string;
  }>();

  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const curatedDest = getAllDestinations().find((d) => d.id === destinationId);
  const isDynamic = !curatedDest && !!dynDestName;

  const destDisplayName = curatedDest ? curatedDest.name : (dynDestName || "Custom Destination");
  const distKm = curatedDest
    ? curatedDest.distanceKm
    : distanceKmParam ? parseFloat(distanceKmParam) : 0;
  const durationMin = durationMinParam ? parseInt(durationMinParam) : 0;
  const pickup = pickupParam || "Current Location";

  const vehicleType = (vehicleTypeParam || "sedan") as "mini" | "sedan" | "suv";
  const vehicleLabel =
    vehicleLabelParam ||
    (vehicleType === "mini" ? "Mini" : vehicleType === "suv" ? "SUV" : "Sedan");
  const vehicleIcon: any = vehicleType === "suv" ? "car-sport-outline" : "car-outline";

  const fareCalcKey: "sedan" | "suv" = vehicleType === "suv" ? "suv" : "sedan";
  const baseFare = fareParam
    ? parseInt(fareParam)
    : distKm > 0
    ? calculateFare(distKm, fareCalcKey)
    : 0;

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [routeStatus, setRouteStatus] = useState<"checking" | "valid" | "blocked">("checking");
  const [showRouteBlockedModal, setShowRouteBlockedModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const validate = async () => {
      const dLat = destLatParam ? parseFloat(destLatParam) : null;
      const dLon = destLonParam ? parseFloat(destLonParam) : null;
      let pLat = pickupLatParam ? parseFloat(pickupLatParam) : null;
      let pLon = pickupLonParam ? parseFloat(pickupLonParam) : null;

      // If no pickup coords provided, try to get from GPS (native only)
      if ((!pLat || !pLon) && Platform.OS !== "web") {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            pLat = pos.coords.latitude;
            pLon = pos.coords.longitude;
          }
        } catch {}
      }

      // Validate destination
      let destOk = true;
      if (dLat && dLon) {
        const destState = await fetchStateFromCoords(dLat, dLon);
        destOk = isStateSupported(destState);
      }

      // Validate pickup
      let pickupOk = true;
      if (pLat && pLon) {
        const pickupState = await fetchStateFromCoords(pLat, pLon);
        pickupOk = isStateSupported(pickupState);
      }

      if (cancelled) return;
      if (!destOk || !pickupOk) {
        setRouteStatus("blocked");
      } else {
        setRouteStatus("valid");
      }
    };
    validate();
    return () => { cancelled = true; };
  }, [destLatParam, destLonParam, pickupLatParam, pickupLonParam]);

  const fare = couponApplied ? Math.max(0, baseFare - couponDiscount) : baseFare;

  if (!curatedDest && !isDynamic) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: colors.text }}>Destination not found</Text>
      </View>
    );
  }

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const code = couponCode.trim().toUpperCase();
    if (code === "SAFAR10") {
      setCouponApplied(true);
      setCouponDiscount(Math.round(baseFare * 0.1));
      setCouponMessage("10% discount applied!");
    } else if (code === "SAFAR20") {
      setCouponApplied(true);
      setCouponDiscount(Math.round(baseFare * 0.2));
      setCouponMessage("20% discount applied!");
    } else if (code === "FIRSTRIDE") {
      const disc = Math.min(150, Math.round(baseFare * 0.15));
      setCouponApplied(true);
      setCouponDiscount(disc);
      setCouponMessage(`Flat ₹${disc} off on your first ride!`);
    } else {
      setCouponApplied(false);
      setCouponDiscount(0);
      setCouponMessage("Invalid code. Try SAFAR10, SAFAR20, or FIRSTRIDE.");
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponMessage("");
  };

  const handleBook = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const socket = connectSocket();
      const res = await fetch(`${API_BASE}/api/rides/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup,
          drop: destDisplayName,
          distanceKm: distKm,
          durationMin,
          fare,
          vehicleType,
          customerId: user?.id || "guest",
          riderName: user?.name || "Passenger",
          customerSocketId: socket.id || undefined,
        }),
      });

      let rideId = `SG${Date.now().toString().slice(-6)}`;
      let otp = String(Math.floor(1000 + Math.random() * 9000));

      if (res.ok) {
        const data = await res.json();
        rideId = data.rideId || rideId;
        otp = data.otp || otp;
      }

      router.push({
        pathname: "/booking/searching",
        params: {
          pickup,
          destination: destDisplayName,
          distanceKm: String(distKm),
          durationMin: String(durationMin),
          vehicleType,
          vehicleLabel,
          fare: String(fare),
          originalFare: couponApplied ? String(baseFare) : undefined,
          couponCode: couponApplied ? couponCode : undefined,
          couponDiscount: couponApplied ? String(couponDiscount) : undefined,
          bookingId: rideId,
          otp,
        },
      });
    } catch {
      Alert.alert(
        "Connection Error",
        "Could not connect to server. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 130,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Trip Details</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Route card */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(500)}
          style={[styles.routeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.routeRow}>
            <View style={styles.routeTimeline}>
              <View style={styles.dotGreen} />
              <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              <View style={styles.dotGold} />
            </View>
            <View style={{ flex: 1, gap: 20 }}>
              <View>
                <Text style={[styles.routeTag, { color: colors.textSecondary }]}>PICKUP</Text>
                <Text style={[styles.routeValue, { color: colors.text }]} numberOfLines={2}>
                  {pickup}
                </Text>
              </View>
              <View>
                <Text style={[styles.routeTag, { color: colors.textSecondary }]}>DROP</Text>
                <Text style={[styles.routeValue, { color: colors.text }]} numberOfLines={2}>
                  {destDisplayName}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats strip */}
          <View style={[styles.statsStrip, { borderTopColor: colors.border }]}>
            <View style={styles.stripItem}>
              <Ionicons name="navigate-outline" size={15} color={Colors.gold} />
              <Text style={[styles.stripVal, { color: colors.text }]}>
                {distKm > 0 ? `${distKm} km` : "—"}
              </Text>
              <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Distance</Text>
            </View>
            <View style={[styles.stripDiv, { backgroundColor: colors.border }]} />
            <View style={styles.stripItem}>
              <Ionicons name="time-outline" size={15} color={Colors.gold} />
              <Text style={[styles.stripVal, { color: colors.text }]}>
                {durationMin > 0 ? `${durationMin} min` : "—"}
              </Text>
              <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Est. Time</Text>
            </View>
            <View style={[styles.stripDiv, { backgroundColor: colors.border }]} />
            <View style={styles.stripItem}>
              <Ionicons name={vehicleIcon} size={15} color={Colors.gold} />
              <Text style={[styles.stripVal, { color: colors.text }]}>{vehicleLabel}</Text>
              <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Vehicle</Text>
            </View>
          </View>
        </Animated.View>

        {/* Fare card */}
        <Animated.View
          entering={FadeInDown.delay(160).duration(500)}
          style={[styles.fareCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.fareCardHeader}>
            <Ionicons name="wallet-outline" size={17} color={Colors.gold} />
            <Text style={[styles.fareCardTitle, { color: colors.textSecondary }]}>
              Fare Breakdown
            </Text>
          </View>

          <View style={styles.fareMainRow}>
            <Text style={styles.fareAmount}>
              {fare > 0 ? `₹${fare.toLocaleString()}` : "—"}
            </Text>
            {couponApplied && (
              <Text style={styles.fareStrike}>₹{baseFare.toLocaleString()}</Text>
            )}
          </View>

          {distKm > 0 && (
            <View style={styles.fareLineRow}>
              <Text style={[styles.fareLineLbl, { color: colors.textSecondary }]}>
                Base fare ({distKm} km)
              </Text>
              <Text style={[styles.fareLineVal, { color: colors.text }]}>
                ₹{baseFare.toLocaleString()}
              </Text>
            </View>
          )}
          {couponApplied && (
            <View style={styles.fareLineRow}>
              <Text style={[styles.fareLineLbl, { color: "#2ECC71" }]}>
                Promo "{couponCode}"
              </Text>
              <Text style={[styles.fareLineVal, { color: "#2ECC71" }]}>
                −₹{couponDiscount.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={[styles.payBadge, { backgroundColor: isDark ? "#1a1a18" : "#F5F3EE" }]}>
            <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.payText, { color: colors.textSecondary }]}>
              Pay on arrival · Cash / UPI
            </Text>
          </View>
        </Animated.View>

        {/* Promo code */}
        <Animated.View entering={FadeInDown.delay(240).duration(500)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Promo Code</Text>
          <View
            style={[
              styles.couponRow,
              {
                backgroundColor: isDark ? "#1e1e1c" : "#F5F3EE",
                borderColor: couponApplied ? "#2ECC71" : colors.border,
              },
            ]}
          >
            <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.couponInput, { color: colors.text }]}
              value={couponCode}
              onChangeText={(t) => {
                setCouponCode(t.toUpperCase());
                if (couponApplied) handleRemoveCoupon();
              }}
              placeholder="SAFAR10, SAFAR20, FIRSTRIDE"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              editable={!couponApplied}
            />
            {couponApplied ? (
              <Pressable onPress={handleRemoveCoupon}>
                <Ionicons name="close-circle" size={22} color="#E74C3C" />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleApplyCoupon}
                style={[styles.applyBtn, { backgroundColor: Colors.gold + "20" }]}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </Pressable>
            )}
          </View>
          {couponMessage !== "" && (
            <View
              style={[
                styles.couponMsgRow,
                { backgroundColor: couponApplied ? "#2ECC7112" : "#E74C3C12" },
              ]}
            >
              <Ionicons
                name={couponApplied ? "checkmark-circle" : "alert-circle"}
                size={14}
                color={couponApplied ? "#2ECC71" : "#E74C3C"}
              />
              <Text
                style={[
                  styles.couponMsgText,
                  { color: couponApplied ? "#2ECC71" : "#E74C3C" },
                ]}
              >
                {couponMessage}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Info note */}
        <Animated.View
          entering={FadeInDown.delay(320).duration(500)}
          style={[
            styles.infoNote,
            { backgroundColor: Colors.gold + "0E", borderColor: Colors.gold + "35" },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.gold} />
          <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
            A secure OTP will be generated and assigned to your trip. Share it with your driver to begin.
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(500)}
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12,
          },
        ]}
      >
        <View style={styles.bottomFareCol}>
          <Text style={[styles.bottomFareLbl, { color: colors.textSecondary }]}>Total Fare</Text>
          <Text style={[styles.bottomFareVal, routeStatus === "blocked" ? { color: colors.textSecondary } : {}]}>
            {routeStatus === "blocked" ? "N/A" : fare > 0 ? `₹${fare.toLocaleString()}` : "—"}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            if (routeStatus === "blocked") {
              setShowRouteBlockedModal(true);
              return;
            }
            handleBook();
          }}
          disabled={loading || routeStatus === "checking"}
          style={({ pressed }) => [
            styles.confirmBtn,
            {
              opacity: pressed || loading || routeStatus === "checking" ? 0.88 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={routeStatus === "blocked" ? ["#555", "#333"] : [Colors.gold, Colors.goldDark]}
            style={styles.confirmGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {routeStatus === "checking" ? (
              <ActivityIndicator size="small" color={routeStatus === "checking" ? "#999" : "#0A0A0A"} />
            ) : routeStatus === "blocked" ? (
              <Ionicons name="close-circle-outline" size={19} color="#ccc" />
            ) : loading ? (
              <ActivityIndicator size="small" color="#0A0A0A" />
            ) : (
              <Ionicons name="car" size={19} color="#0A0A0A" />
            )}
            <Text style={[styles.confirmText, routeStatus === "blocked" ? { color: "#bbb" } : {}]}>
              {routeStatus === "checking"
                ? "Checking route…"
                : routeStatus === "blocked"
                ? "Not Available"
                : loading
                ? "Creating ride..."
                : "Confirm Booking"}
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Route Blocked Modal */}
      <Modal
        visible={showRouteBlockedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRouteBlockedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <View style={styles.modalIconRow}>
              <View style={[styles.modalIconBg, { backgroundColor: "#E74C3C18" }]}>
                <Ionicons name="location-outline" size={32} color="#E74C3C" />
              </View>
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Route Not Available</Text>
            <Text style={[styles.modalMsg, { color: colors.textSecondary }]}>
              We are not available for this route yet.{"\n"}We currently serve only{" "}
              <Text style={{ color: Colors.gold, fontFamily: "Poppins_600SemiBold" }}>
                Delhi
              </Text>{" "}
              and{" "}
              <Text style={{ color: Colors.gold, fontFamily: "Poppins_600SemiBold" }}>
                Uttar Pradesh
              </Text>
              .{"\n\n"}Coming soon to more cities!
            </Text>
            <Pressable
              onPress={() => setShowRouteBlockedModal(false)}
              style={[styles.modalBtn, { backgroundColor: Colors.gold + "20" }]}
            >
              <Text style={[styles.modalBtnText, { color: Colors.gold }]}>Got it</Text>
            </Pressable>
            <Pressable
              onPress={() => { setShowRouteBlockedModal(false); router.back(); }}
              style={styles.modalSecondaryBtn}
            >
              <Text style={[styles.modalSecondaryBtnText, { color: colors.textSecondary }]}>
                Change Location
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  screenTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  routeCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 14 },
  routeRow: { flexDirection: "row", gap: 16, marginBottom: 18 },
  routeTimeline: { alignItems: "center", paddingTop: 5, width: 14 },
  dotGreen: { width: 13, height: 13, borderRadius: 7, backgroundColor: "#2ECC71" },
  timelineLine: { width: 2, flex: 1, marginVertical: 8, minHeight: 28 },
  dotGold: { width: 13, height: 13, borderRadius: 7, backgroundColor: Colors.gold },
  routeTag: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  routeValue: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  statsStrip: { flexDirection: "row", borderTopWidth: 1, paddingTop: 14 },
  stripItem: { flex: 1, alignItems: "center", gap: 4 },
  stripDiv: { width: 1 },
  stripVal: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  stripLbl: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  fareCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 14, gap: 12 },
  fareCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  fareCardTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  fareMainRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  fareAmount: { fontFamily: "Poppins_700Bold", fontSize: 38, color: Colors.gold, lineHeight: 44 },
  fareStrike: {
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: "#9E9E9E",
    textDecorationLine: "line-through",
    marginBottom: 4,
  },
  fareLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareLineLbl: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  fareLineVal: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  payBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  payText: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  sectionLabel: { fontFamily: "Poppins_500Medium", fontSize: 13, marginBottom: 8, marginTop: 4 },
  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  couponInput: { flex: 1, fontFamily: "Poppins_400Regular", fontSize: 14, padding: 0 },
  applyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  applyBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: Colors.gold },
  couponMsgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  couponMsgText: { fontFamily: "Poppins_500Medium", fontSize: 12, flex: 1 },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  infoNoteText: { fontFamily: "Poppins_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
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
    borderTopWidth: 1,
  },
  bottomFareCol: { gap: 2 },
  bottomFareLbl: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  bottomFareVal: { fontFamily: "Poppins_700Bold", fontSize: 28, color: Colors.gold },
  confirmBtn: { borderRadius: 14, overflow: "hidden" },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  confirmText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0A0A0A" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalBox: {
    borderRadius: 20,
    padding: 28,
    width: "100%",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconRow: { marginBottom: 4 },
  modalIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    textAlign: "center",
    marginTop: 4,
  },
  modalMsg: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4,
    marginBottom: 8,
  },
  modalBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  modalBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  modalSecondaryBtn: { paddingVertical: 10, alignItems: "center" },
  modalSecondaryBtnText: { fontFamily: "Poppins_500Medium", fontSize: 13 },
});
