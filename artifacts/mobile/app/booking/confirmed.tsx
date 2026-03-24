import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Animated as RNAnimated,
  Share,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

export default function BookingConfirmed() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const {
    bookingId,
    destination,
    pickup,
    date,
    time,
    vehicle,
    passengers,
    fare,
    originalFare,
    couponCode,
    couponDiscount,
    distanceKm,
    driverName,
    driverPhone,
    driverRating,
    driverVehicle,
    driverVehicleNumber,
  } = useLocalSearchParams<{
    bookingId?: string;
    destination?: string;
    pickup?: string;
    date?: string;
    time?: string;
    vehicle?: string;
    passengers?: string;
    fare?: string;
    originalFare?: string;
    couponCode?: string;
    couponDiscount?: string;
    distanceKm?: string;
    driverName?: string;
    driverPhone?: string;
    driverRating?: string;
    driverVehicle?: string;
    driverVehicleNumber?: string;
  }>();

  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const rippleAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(rippleAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        RNAnimated.delay(400),
        RNAnimated.timing(rippleAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fareNum = fare ? parseInt(fare) : 0;
  const originalFareNum = originalFare ? parseInt(originalFare) : 0;
  const discountNum = couponDiscount ? parseInt(couponDiscount) : 0;
  const distNum = distanceKm ? parseFloat(distanceKm) : 0;
  const ratingNum = driverRating ? parseFloat(driverRating) : 0;
  const passNum = passengers ? parseInt(passengers) : 1;
  const hasDiscount = !!couponCode && discountNum > 0;
  const hasDriver = !!driverName && driverName !== "Auto Assigned";
  const refId = bookingId || `SG${Date.now().toString().slice(-6)}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My Safar Go trip to ${destination} is confirmed!\nDate: ${date} at ${time}\nFare: ₹${fareNum.toLocaleString()}\nRef: #${refId}`,
      });
    } catch {}
  };

  const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 0.15, 0] });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success animation */}
        <Animated.View entering={ZoomIn.delay(100).duration(600)} style={styles.successSection}>
          <View style={styles.rippleWrapper}>
            <RNAnimated.View
              style={[
                styles.ripple,
                { opacity: rippleOpacity, transform: [{ scale: rippleScale }] },
              ]}
            />
            <RNAnimated.View style={[styles.checkCircle, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={["#2ECC71", "#27AE60"]}
                style={styles.checkGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark" size={44} color="#fff" />
              </LinearGradient>
            </RNAnimated.View>
          </View>

          <Text style={[styles.confirmedTitle, { color: colors.text }]}>Booking Confirmed!</Text>
          <Text style={[styles.confirmedSub, { color: colors.textSecondary }]}>
            Your luxury ride is all set
          </Text>

          <View style={[styles.refBadge, { backgroundColor: Colors.gold + "18", borderColor: Colors.gold + "40" }]}>
            <Ionicons name="receipt-outline" size={14} color={Colors.gold} />
            <Text style={styles.refText}>Ref #{refId}</Text>
            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <Ionicons name="share-outline" size={16} color={Colors.gold} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Trip route card */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Trip Details</Text>

          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={[styles.dotGreen]} />
              <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
              <View style={[styles.dotGold]} />
            </View>
            <View style={{ flex: 1, gap: 16 }}>
              <View>
                <Text style={[styles.routeLabel, { color: colors.textSecondary }]}>Pickup</Text>
                <Text style={[styles.routeValue, { color: colors.text }]} numberOfLines={2}>{pickup || "—"}</Text>
              </View>
              <View>
                <Text style={[styles.routeLabel, { color: colors.textSecondary }]}>Destination</Text>
                <Text style={[styles.routeValue, { color: colors.text }]} numberOfLines={2}>{destination || "—"}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.metaGrid}>
            <MetaItem icon="calendar-outline" label="Date" value={date || "—"} colors={colors} />
            <MetaItem icon="time-outline" label="Time" value={time || "—"} colors={colors} />
            <MetaItem icon="car-outline" label="Vehicle" value={vehicle === "sedan" ? "Sedan" : "SUV"} colors={colors} />
            <MetaItem icon="people-outline" label="Passengers" value={`${passNum}`} colors={colors} />
            {distNum > 0 && (
              <MetaItem icon="navigate-outline" label="Distance" value={`${distNum} km`} colors={colors} />
            )}
          </View>
        </Animated.View>

        {/* Driver card */}
        {hasDriver && (
          <Animated.View
            entering={FadeInDown.delay(400).duration(500)}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Your Driver</Text>
            <View style={styles.driverRow}>
              <View style={[styles.driverAvatar, { backgroundColor: Colors.gold + "20" }]}>
                <Ionicons name="person" size={28} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.driverName, { color: colors.text }]}>{driverName}</Text>
                {ratingNum > 0 && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color={Colors.gold} />
                    <Text style={[styles.ratingText, { color: colors.textSecondary }]}>{ratingNum.toFixed(1)}</Text>
                  </View>
                )}
                {driverVehicle && (
                  <Text style={[styles.driverVehicle, { color: colors.textSecondary }]}>
                    {driverVehicle}
                    {driverVehicleNumber ? ` · ${driverVehicleNumber}` : ""}
                  </Text>
                )}
              </View>
              {driverPhone && (
                <View style={styles.driverActions}>
                  <View style={[styles.callBtn, { backgroundColor: "#2ECC7115" }]}>
                    <Ionicons name="call" size={18} color="#2ECC71" />
                  </View>
                  <View style={[styles.callBtn, { backgroundColor: Colors.gold + "15" }]}>
                    <Ionicons name="chatbubble" size={18} color={Colors.gold} />
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.driverStatusBadge, { backgroundColor: "#2ECC7110", borderColor: "#2ECC7130" }]}>
              <View style={styles.driverStatusDot} />
              <Text style={styles.driverStatusText}>Driver confirmed & en route to pickup</Text>
            </View>
          </Animated.View>
        )}

        {/* Fare breakdown */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(500)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Fare Breakdown</Text>

          {distNum > 0 && (
            <FareRow
              label={`Distance (${distNum} km)`}
              value={`₹${(hasDiscount ? originalFareNum : fareNum).toLocaleString()}`}
              colors={colors}
            />
          )}
          {hasDiscount && (
            <>
              <FareRow label={`Promo "${couponCode}"`} value={`-₹${discountNum.toLocaleString()}`} green colors={colors} />
              <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />
            </>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{fareNum.toLocaleString()}</Text>
          </View>

          <View style={[styles.paymentBadge, { backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5" }]}>
            <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.paymentText, { color: colors.textSecondary }]}>Pay on arrival · Cash / UPI</Text>
          </View>
        </Animated.View>

        {/* Status timeline */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(500)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Trip Status</Text>
          <StatusStep icon="checkmark-circle" label="Booking Confirmed" sub="Your trip is booked" done colors={colors} />
          <StatusStep icon="car" label="Driver Assigned" sub={hasDriver ? driverName! : "Being assigned"} done={hasDriver} colors={colors} />
          <StatusStep icon="navigate" label="Driver En Route" sub="Heading to pickup" colors={colors} />
          <StatusStep icon="flag" label="Trip Started" sub="Enjoy your ride!" colors={colors} last />
        </Animated.View>
      </ScrollView>

      {/* Bottom actions */}
      <Animated.View
        entering={FadeInUp.delay(400).duration(500)}
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.dismissAll();
            router.push("/customer/rides");
          }}
          style={[styles.outlineBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="list-outline" size={18} color={colors.text} />
          <Text style={[styles.outlineBtnText, { color: colors.text }]}>My Rides</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.dismissAll();
          }}
          style={styles.primaryBtnWrapper}
        >
          <LinearGradient
            colors={[Colors.gold, Colors.goldDark]}
            style={styles.primaryBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="home-outline" size={18} color="#0A0A0A" />
            <Text style={styles.primaryBtnText}>Back to Home</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function MetaItem({
  icon, label, value, colors,
}: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon as any} size={15} color={Colors.gold} />
      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function FareRow({
  label, value, green, colors,
}: { label: string; value: string; green?: boolean; colors: any }) {
  return (
    <View style={styles.fareRow}>
      <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.fareValue, { color: green ? "#2ECC71" : colors.text }]}>{value}</Text>
    </View>
  );
}

function StatusStep({
  icon, label, sub, done, last, colors,
}: { icon: string; label: string; sub: string; done?: boolean; last?: boolean; colors: any }) {
  return (
    <View style={styles.statusStep}>
      <View style={styles.statusLeft}>
        <View style={[
          styles.statusIcon,
          { backgroundColor: done ? "#2ECC7120" : colors.background, borderColor: done ? "#2ECC71" : colors.border },
        ]}>
          <Ionicons name={icon as any} size={16} color={done ? "#2ECC71" : colors.textTertiary} />
        </View>
        {!last && <View style={[styles.statusLine, { backgroundColor: done ? "#2ECC7140" : colors.border }]} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 20 }}>
        <Text style={[styles.statusLabel, { color: done ? colors.text : colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.statusSub, { color: colors.textTertiary }]}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  successSection: { alignItems: "center", paddingVertical: 20, gap: 10 },
  rippleWrapper: { width: 110, height: 110, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  ripple: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#2ECC71",
  },
  checkCircle: { width: 88, height: 88, borderRadius: 44, overflow: "hidden" },
  checkGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  confirmedTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, textAlign: "center" },
  confirmedSub: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center" },
  refBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  refText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: Colors.gold, flex: 1 },
  shareBtn: { padding: 2 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },
  cardTitle: { fontFamily: "Poppins_500Medium", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  routeRow: { flexDirection: "row", gap: 14 },
  routeDots: { alignItems: "center", paddingTop: 4, gap: 0 },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#2ECC71" },
  dotGold: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.gold },
  routeLine: { width: 2, flex: 1, minHeight: 30, marginVertical: 6 },
  routeLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, marginBottom: 2 },
  routeValue: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  divider: { height: 1, marginVertical: 4 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: { width: "45%", gap: 3 },
  metaLabel: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  metaValue: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  ratingText: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  driverVehicle: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  driverActions: { gap: 8 },
  callBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  driverStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  driverStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2ECC71" },
  driverStatusText: { fontFamily: "Poppins_500Medium", fontSize: 12, color: "#2ECC71", flex: 1 },
  fareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fareLabel: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  fareValue: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  totalLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  totalValue: { fontFamily: "Poppins_700Bold", fontSize: 22, color: Colors.gold },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  paymentText: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  statusStep: { flexDirection: "row", gap: 14 },
  statusLeft: { alignItems: "center", width: 32 },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  statusLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 4 },
  statusLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  statusSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  outlineBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  primaryBtnWrapper: { flex: 1.6, borderRadius: 14, overflow: "hidden" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  primaryBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#0A0A0A" },
});
