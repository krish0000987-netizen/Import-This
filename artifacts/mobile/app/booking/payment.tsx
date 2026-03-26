import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { connectSocket, emitCustomerPaymentDone, emitJoinRideRoom } from "@/services/socketService";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

type PaymentState = "idle" | "creating_order" | "webview" | "verifying" | "success" | "failed" | "cancelled";

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const params = useLocalSearchParams<{
    rideId?: string;
    fare?: string;
    destination?: string;
    pickup?: string;
    distanceKm?: string;
    couponCode?: string;
    couponDiscount?: string;
    originalFare?: string;
    vehicle?: string;
  }>();

  const rideId = params.rideId || "";
  const fare = params.fare ? parseInt(params.fare) : 0;
  const destination = params.destination || "";
  const pickup = params.pickup || "";

  const [state, setState] = useState<PaymentState>("idle");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderId, setOrderId] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryCountdown, setAutoRetryCountdown] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const successScale = useRef(new RNAnimated.Value(0)).current;

  // Join ride room so we can receive paymentConfirmed from server
  useEffect(() => {
    const socket = connectSocket();
    if (rideId) emitJoinRideRoom(rideId, "customer");

    socket.on("paymentConfirmed", ({ rideId: confirmedRideId }: { rideId: string; fare: number; paymentId?: string }) => {
      if (confirmedRideId === rideId) {
        handlePaymentSuccess();
      }
    });

    return () => {
      socket.off("paymentConfirmed");
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, [rideId]);

  const handlePaymentSuccess = useCallback(() => {
    setState("success");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    RNAnimated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }).start();
  }, []);

  const createOrder = useCallback(async () => {
    if (!rideId || !fare) {
      Alert.alert("Error", "Invalid ride or fare. Please go back.");
      return;
    }
    setState("creating_order");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, amount: fare, receipt: rideId }),
      });

      if (res.status === 409) {
        // Already paid
        handlePaymentSuccess();
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create payment order");
      }

      const data = await res.json();
      setOrderId(data.orderId);

      // Build checkout URL hosted on API server
      const urlParams = new URLSearchParams({
        orderId: data.orderId,
        amount: String(data.amount),
        key: data.keyId || "",
        rideId,
        name: user?.name || "Passenger",
        email: (user as any)?.email || "",
        phone: user?.phone || "",
        desc: destination ? `${pickup} → ${destination}` : "Ride Payment",
        ...(data.isDev ? { isDev: "1" } : {}),
      });

      setCheckoutUrl(`${API_BASE}/api/payments/checkout?${urlParams.toString()}`);
      setState("webview");
    } catch (err: any) {
      setState("failed");
      setErrorMsg(err.message || "Could not initiate payment. Please try again.");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      startAutoRetryCountdown();
    }
  }, [rideId, fare, user, destination, pickup]);

  const verifyPayment = useCallback(async (paymentId: string, orderIdParam: string, signature: string) => {
    setState("verifying");

    try {
      const res = await fetch(`${API_BASE}/api/payments/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId,
          orderId: orderIdParam,
          paymentId,
          signature,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Payment verification failed");
      }

      const data = await res.json();
      if (!data.success) throw new Error("Payment could not be verified");

      // Tell server payment is done → server emits paymentConfirmed to both
      emitCustomerPaymentDone(rideId);
      handlePaymentSuccess();
    } catch (err: any) {
      setState("failed");
      setErrorMsg("Payment verification failed. Contact support if amount was deducted.");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [rideId, orderId, handlePaymentSuccess]);

  const startAutoRetryCountdown = useCallback(() => {
    setAutoRetryCountdown(10);
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    retryTimerRef.current = setInterval(() => {
      setAutoRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(retryTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Auto-retry when countdown reaches 0
  useEffect(() => {
    if (autoRetryCountdown === 0 && state === "failed" && retryCount < 3) {
      // Don't auto-retry, just clear — user can tap manually
    }
  }, [autoRetryCountdown, state, retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    setAutoRetryCountdown(0);
    createOrder();
  }, [createOrder]);

  const handleWebViewNavigation = useCallback((navState: WebViewNavigation) => {
    const url = navState.url || "";

    if (url.startsWith("https://payment.safargo.local/success")) {
      const urlObj = new URL(url);
      const paymentId = urlObj.searchParams.get("payment_id") || "";
      const orderIdParam = urlObj.searchParams.get("order_id") || "";
      const signature = urlObj.searchParams.get("signature") || "";
      verifyPayment(paymentId, orderIdParam, signature);
      return false; // Prevent WebView from navigating
    }

    if (url.startsWith("https://payment.safargo.local/cancelled")) {
      setState("cancelled");
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return false;
    }

    if (url.startsWith("https://payment.safargo.local/failed")) {
      const urlObj = new URL(url);
      const error = urlObj.searchParams.get("error") || "Payment failed";
      setState("failed");
      setErrorMsg(decodeURIComponent(error));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      startAutoRetryCountdown();
      return false;
    }

    return true;
  }, [verifyPayment, startAutoRetryCountdown]);

  const navigateToConfirmation = useCallback(() => {
    router.replace({
      pathname: "/booking/payment-success",
      params: {
        rideId,
        fare: String(fare),
        destination,
        pickup,
        vehicle: params.vehicle,
        distanceKm: params.distanceKm,
        couponCode: params.couponCode,
        couponDiscount: params.couponDiscount,
        originalFare: params.originalFare,
      },
    });
  }, [rideId, fare, destination, pickup, params]);

  // ── WebView mode ──────────────────────────────────────────────────────────
  if (state === "webview" && checkoutUrl) {
    return (
      <View style={[styles.container, { backgroundColor: "#0A0A0A" }]}>
        <View style={[styles.webviewHeader, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
          <Pressable
            onPress={() => {
              setState("cancelled");
            }}
            style={[styles.closeBtn, { backgroundColor: "#1A1A1A" }]}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
          <View style={styles.webviewHeaderCenter}>
            <Text style={styles.webviewHeaderTitle}>Secure Payment</Text>
            <View style={styles.secureRow}>
              <Ionicons name="lock-closed" size={11} color="#2ECC71" />
              <Text style={styles.secureText}>Secured by Razorpay</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.fareChip, { backgroundColor: Colors.gold + "20" }]}>
          <Text style={styles.fareChipText}>₹{fare.toLocaleString()}</Text>
        </View>
        <WebView
          source={{ uri: checkoutUrl }}
          style={styles.webview}
          onShouldStartLoadWithRequest={handleWebViewNavigation}
          onNavigationStateChange={handleWebViewNavigation}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color={Colors.gold} />
              <Text style={styles.webviewLoadingText}>Opening payment gateway…</Text>
            </View>
          )}
          onError={() => {
            setState("failed");
            setErrorMsg("Failed to load payment page. Please check your connection.");
            startAutoRetryCountdown();
          }}
        />
      </View>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <Animated.View entering={ZoomIn.duration(500)} style={styles.successWrap}>
          <RNAnimated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <LinearGradient colors={["#2ECC71", "#27AE60"]} style={styles.successGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </LinearGradient>
          </RNAnimated.View>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ alignItems: "center", gap: 8, marginBottom: 40 }}>
          <Text style={[styles.successTitle, { color: colors.text }]}>Payment Successful!</Text>
          <Text style={[styles.successAmount, { color: Colors.gold }]}>₹{fare.toLocaleString()}</Text>
          <Text style={[styles.successSub, { color: colors.textSecondary }]}>Ride completed. Thank you for riding with Safar Go.</Text>
          <View style={[styles.refBadge, { backgroundColor: Colors.gold + "15", borderColor: Colors.gold + "30" }]}>
            <Ionicons name="receipt-outline" size={13} color={Colors.gold} />
            <Text style={[styles.refText]}>Ref #{rideId}</Text>
          </View>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={{ width: "100%", gap: 12 }}>
          <Pressable onPress={navigateToConfirmation} style={styles.successBtnWrapper}>
            <LinearGradient colors={[Colors.gold, Colors.goldDark]} style={styles.successBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="receipt" size={20} color="#0A0A0A" />
              <Text style={styles.successBtnText}>View Receipt</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => { router.dismissAll(); router.replace("/"); }}
            style={[styles.homeBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="home-outline" size={18} color={colors.text} />
            <Text style={[styles.homeBtnText, { color: colors.text }]}>Back to Home</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // ── Idle / Creating / Failed / Cancelled ──────────────────────────────────
  const isCancelled = state === "cancelled";
  const isFailed = state === "failed";
  const isCreating = state === "creating_order" || state === "verifying";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Complete Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Fare Summary */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)}>
          <View style={[styles.fareCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.fareCardTop}>
              <View style={[styles.fareIcon, { backgroundColor: Colors.gold + "20" }]}>
                <Ionicons name="car-sport" size={28} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Total Fare</Text>
                <Text style={[styles.fareAmount, { color: colors.text }]}>₹{fare.toLocaleString()}</Text>
              </View>
              <View style={[styles.onlineBadge, { backgroundColor: "#3498DB18" }]}>
                <Ionicons name="globe-outline" size={14} color="#3498DB" />
                <Text style={[styles.onlineBadgeText, { color: "#3498DB" }]}>Online Only</Text>
              </View>
            </View>

            {destination ? (
              <View style={[styles.fareRoute, { borderTopColor: colors.border }]}>
                <View style={styles.routeDot} />
                <Text style={[styles.fareRouteText, { color: colors.textSecondary }]} numberOfLines={1}>{pickup}</Text>
              </View>
            ) : null}
            {destination ? (
              <View style={styles.fareRoute}>
                <View style={[styles.routeDot, { backgroundColor: Colors.gold }]} />
                <Text style={[styles.fareRouteText, { color: colors.textSecondary }]} numberOfLines={1}>{destination}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Status / Error Banner */}
        {isCancelled && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <View style={[styles.banner, { backgroundColor: "#F39C1215", borderColor: "#F39C1240" }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#F39C12" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: "#F39C12" }]}>Payment Cancelled</Text>
                <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>You cancelled the payment. Please complete payment to finish your ride.</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {isFailed && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <View style={[styles.banner, { backgroundColor: "#E74C3C15", borderColor: "#E74C3C40" }]}>
              <Ionicons name="close-circle-outline" size={20} color="#E74C3C" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: "#E74C3C" }]}>Payment Failed</Text>
                <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                  {errorMsg || "Please complete payment to finish the ride."}
                  {autoRetryCountdown > 0 ? `\nAuto-retry in ${autoRetryCountdown}s` : ""}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Info cards */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#2ECC71" />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>Payment secured by Razorpay with 256-bit encryption</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={18} color={Colors.gold} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>UPI, Cards, Net Banking, Wallets accepted</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="refresh-outline" size={18} color="#3498DB" />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>Retry anytime — your ride is held until payment completes</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Bottom CTA */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(400)}
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12,
          },
        ]}
      >
        {isCreating ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.gold} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {state === "verifying" ? "Verifying payment…" : "Creating secure order…"}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={createOrder}
            style={[styles.payBtnWrapper, { opacity: isCreating ? 0.6 : 1 }]}
            disabled={isCreating}
          >
            <LinearGradient
              colors={[Colors.gold, Colors.goldDark]}
              style={styles.payBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="lock-closed" size={20} color="#0A0A0A" />
              <Text style={styles.payBtnText}>
                {isFailed || isCancelled ? `Retry Payment · ₹${fare.toLocaleString()}` : `Pay Now · ₹${fare.toLocaleString()}`}
              </Text>
            </LinearGradient>
          </Pressable>
        )}
        {(isFailed || isCancelled) && !isCreating && (
          <Text style={[styles.helpText, { color: colors.textTertiary }]}>
            Having issues? Contact support — don't pay twice.
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18 },
  content: { flex: 1, padding: 20, gap: 14 },

  fareCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 12 },
  fareCardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  fareIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  fareLabel: { fontFamily: "Poppins_400Regular", fontSize: 12, marginBottom: 2 },
  fareAmount: { fontFamily: "Poppins_700Bold", fontSize: 28 },
  onlineBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  onlineBadgeText: { fontFamily: "Poppins_600SemiBold", fontSize: 11 },
  fareRoute: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2ECC71" },
  fareRouteText: { fontFamily: "Poppins_400Regular", fontSize: 13, flex: 1 },

  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  bannerTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14, marginBottom: 2 },
  bannerSub: { fontFamily: "Poppins_400Regular", fontSize: 12 },

  infoCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 0 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10 },
  infoText: { fontFamily: "Poppins_400Regular", fontSize: 13, flex: 1 },
  infoDivider: { height: 1 },

  bottomBar: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    gap: 10,
  },
  payBtnWrapper: { borderRadius: 16, overflow: "hidden" },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  payBtnText: { fontFamily: "Poppins_700Bold", fontSize: 17, color: "#0A0A0A" },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 18 },
  loadingText: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  helpText: { fontFamily: "Poppins_400Regular", fontSize: 12, textAlign: "center" },

  // WebView
  webviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#0A0A0A",
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  webviewHeaderCenter: { alignItems: "center" },
  webviewHeaderTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#fff" },
  secureRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  secureText: { fontFamily: "Poppins_400Regular", fontSize: 11, color: "#2ECC71" },
  fareChip: { alignSelf: "center", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 8 },
  fareChipText: { fontFamily: "Poppins_700Bold", fontSize: 18, color: Colors.gold },
  webview: { flex: 1 },
  webviewLoading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#0A0A0A" },
  webviewLoadingText: { fontFamily: "Poppins_400Regular", fontSize: 14, color: "#888" },

  // Success
  successWrap: { marginBottom: 32 },
  successCircle: { width: 110, height: 110, borderRadius: 55, overflow: "hidden", shadowColor: "#2ECC71", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  successGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  successTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28 },
  successAmount: { fontFamily: "Poppins_700Bold", fontSize: 36 },
  successSub: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center" },
  refBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  refText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: Colors.gold },
  successBtnWrapper: { borderRadius: 16, overflow: "hidden" },
  successBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  successBtnText: { fontFamily: "Poppins_700Bold", fontSize: 16, color: "#0A0A0A" },
  homeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5 },
  homeBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
});
