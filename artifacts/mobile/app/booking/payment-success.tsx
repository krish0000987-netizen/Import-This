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
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

export default function PaymentSuccess() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const {
    rideId, fare, destination, pickup, distanceKm,
    couponCode, couponDiscount, originalFare, vehicle,
  } = useLocalSearchParams<{
    rideId?: string; fare?: string; destination?: string; pickup?: string;
    distanceKm?: string; couponCode?: string; couponDiscount?: string;
    originalFare?: string; vehicle?: string;
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
  const hasDiscount = !!couponCode && discountNum > 0;
  const refId = rideId || `SG${Date.now().toString().slice(-6)}`;

  const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 0.15, 0] });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My Safar Go trip to ${destination} is complete!\nFare paid: ₹${fareNum.toLocaleString()}\nRef: #${refId}`,
      });
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20,
          paddingBottom: insets.bottom + 130,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success animation */}
        <Animated.View entering={ZoomIn.delay(100).duration(600)} style={styles.successSection}>
          <View style={styles.rippleWrapper}>
            <RNAnimated.View style={[styles.ripple, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]} />
            <RNAnimated.View style={[styles.checkCircle, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient colors={["#2ECC71", "#27AE60"]} style={styles.checkGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="checkmark" size={44} color="#fff" />
              </LinearGradient>
            </RNAnimated.View>
          </View>

          <Text style={[styles.confirmedTitle, { color: colors.text }]}>Payment Successful!</Text>
          <Text style={[styles.confirmedSub, { color: colors.textSecondary }]}>
            Your ride is complete. Thank you for choosing Safar Go.
          </Text>

          <View style={[styles.refBadge, { backgroundColor: Colors.gold + "18", borderColor: Colors.gold + "40" }]}>
            <Ionicons name="receipt-outline" size={14} color={Colors.gold} />
            <Text style={styles.refText}>Ref #{refId}</Text>
            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <Ionicons name="share-outline" size={16} color={Colors.gold} />
            </Pressable>
          </View>

          <View style={[styles.paidBadge, { backgroundColor: "#2ECC7115", borderColor: "#2ECC7130" }]}>
            <Ionicons name="shield-checkmark" size={14} color="#2ECC71" />
            <Text style={[styles.paidText]}>Paid via Razorpay · Online</Text>
          </View>
        </Animated.View>

        {/* Trip route */}
        {(pickup || destination) && (
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Trip Summary</Text>
            <View style={styles.routeRow}>
              <View style={styles.routeDots}>
                <View style={styles.dotGreen} />
                <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
                <View style={styles.dotGold} />
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
            {distNum > 0 && (
              <View style={[styles.distRow, { borderTopColor: colors.border }]}>
                <Ionicons name="navigate-outline" size={15} color={Colors.gold} />
                <Text style={[styles.distText, { color: colors.textSecondary }]}>{distNum} km</Text>
                <Text style={[styles.distText, { color: colors.textSecondary }]}>·</Text>
                <Text style={[styles.distText, { color: colors.textSecondary }]}>{vehicle === "suv" ? "SUV" : "Sedan"}</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Fare breakdown */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Payment Breakdown</Text>
          {distNum > 0 && (
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Distance ({distNum} km)</Text>
              <Text style={[styles.fareValue, { color: colors.text }]}>₹{(hasDiscount ? originalFareNum : fareNum).toLocaleString()}</Text>
            </View>
          )}
          {hasDiscount && (
            <>
              <View style={styles.fareRow}>
                <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Promo "{couponCode}"</Text>
                <Text style={[styles.fareValue, { color: "#2ECC71" }]}>-₹{discountNum.toLocaleString()}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{fareNum.toLocaleString()}</Text>
          </View>
          <View style={[styles.paymentMethodRow, { backgroundColor: "#2ECC7110" }]}>
            <Ionicons name="shield-checkmark" size={14} color="#2ECC71" />
            <Text style={[styles.paymentMethodText, { color: "#2ECC71" }]}>Paid online via Razorpay</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom actions */}
      <Animated.View
        entering={FadeInUp.delay(400).duration(500)}
        style={[
          styles.bottomBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 },
        ]}
      >
        <Pressable
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.dismissAll(); router.push("/customer/rides"); }}
          style={[styles.outlineBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="list-outline" size={18} color={colors.text} />
          <Text style={[styles.outlineBtnText, { color: colors.text }]}>My Rides</Text>
        </Pressable>
        <Pressable
          onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.dismissAll(); }}
          style={styles.primaryBtnWrapper}
        >
          <LinearGradient colors={[Colors.gold, Colors.goldDark]} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="home-outline" size={18} color="#0A0A0A" />
            <Text style={styles.primaryBtnText}>Back to Home</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  successSection: { alignItems: "center", paddingVertical: 20, gap: 10 },
  rippleWrapper: { width: 110, height: 110, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  ripple: { position: "absolute", width: 110, height: 110, borderRadius: 55, backgroundColor: "#2ECC71" },
  checkCircle: { width: 88, height: 88, borderRadius: 44, overflow: "hidden" },
  checkGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  confirmedTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, textAlign: "center" },
  confirmedSub: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center" },
  refBadge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  refText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: Colors.gold, flex: 1 },
  shareBtn: { padding: 2 },
  paidBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  paidText: { fontFamily: "Poppins_500Medium", fontSize: 12, color: "#2ECC71" },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 14, gap: 14 },
  cardTitle: { fontFamily: "Poppins_500Medium", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  routeRow: { flexDirection: "row", gap: 14 },
  routeDots: { alignItems: "center", paddingTop: 4 },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#2ECC71" },
  dotGold: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.gold },
  routeLine: { width: 2, flex: 1, minHeight: 30, marginVertical: 6 },
  routeLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, marginBottom: 2 },
  routeValue: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  distRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 12, borderTopWidth: 1 },
  distText: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  divider: { height: 1, marginVertical: 4 },
  fareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fareLabel: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  fareValue: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  totalLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  totalValue: { fontFamily: "Poppins_700Bold", fontSize: 22, color: Colors.gold },
  paymentMethodRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, marginTop: 4 },
  paymentMethodText: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  outlineBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5 },
  outlineBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  primaryBtnWrapper: { flex: 1.6, borderRadius: 14, overflow: "hidden" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  primaryBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#0A0A0A" },
});
