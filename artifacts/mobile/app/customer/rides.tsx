import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppMapView, AppMarker, AppPolyline } from "@/components/MapWrapper";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { LUCKNOW_CENTER, vehicleTypes } from "@/constants/data";
import { useRef } from "react";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

interface ApiRide {
  rideId: string;
  pickup: string;
  drop: string;
  distanceKm: number;
  durationMin: number;
  fare: number;
  vehicleType: string;
  status: string;
  customerId?: string;
  driverId?: string;
  driverName?: string;
  createdAt: number;
  completedAt?: number;
  hasReview?: boolean;
}

function statusToUI(apiStatus: string): "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" {
  switch (apiStatus) {
    case "searching": return "pending";
    case "assigned": return "confirmed";
    case "started": return "in_progress";
    case "completed": return "completed";
    case "cancelled": return "cancelled";
    default: return "pending";
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function DriverTrackingModal({
  visible, onClose, ride,
}: { visible: boolean; onClose: () => void; ride: ApiRide | null; }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const [driverPos, setDriverPos] = useState({ latitude: LUCKNOW_CENTER.latitude + 0.008, longitude: LUCKNOW_CENTER.longitude + 0.005 });

  useEffect(() => {
    if (!visible || !ride) return;
    setDriverPos({ latitude: LUCKNOW_CENTER.latitude + 0.008, longitude: LUCKNOW_CENTER.longitude + 0.005 });
    const target = LUCKNOW_CENTER;
    const interval = setInterval(() => {
      setDriverPos((prev) => ({
        latitude: prev.latitude + (target.latitude - prev.latitude) * 0.02 + (Math.random() - 0.5) * 0.001,
        longitude: prev.longitude + (target.longitude - prev.longitude) * 0.02 + (Math.random() - 0.5) * 0.001,
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [visible, ride]);

  if (!ride) return null;

  const pickupCoord = LUCKNOW_CENTER;
  const midLat = (pickupCoord.latitude + driverPos.latitude) / 2;
  const midLng = (pickupCoord.longitude + driverPos.longitude) / 2;
  const latDelta = Math.abs(pickupCoord.latitude - driverPos.latitude) * 2 + 0.02;
  const lngDelta = Math.abs(pickupCoord.longitude - driverPos.longitude) * 2 + 0.02;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[trackStyles.container, { backgroundColor: colors.background }]}>
        <View style={[trackStyles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
          <Pressable onPress={onClose} style={[trackStyles.closeBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[trackStyles.headerTitle, { color: colors.text }]}>Track Driver</Text>
          <View style={{ width: 40 }} />
        </View>
        <AppMapView mapRef={mapRef} style={trackStyles.map} initialRegion={{ latitude: midLat, longitude: midLng, latitudeDelta: Math.max(latDelta, 0.03), longitudeDelta: Math.max(lngDelta, 0.03) }}>
          <AppMarker coordinate={pickupCoord} title="Pickup" description={ride.pickup}>
            <View style={trackStyles.pickupPin}><View style={trackStyles.pickupPinInner} /></View>
          </AppMarker>
          <AppMarker coordinate={driverPos} title={ride.driverName || "Driver"} description="En route">
            <View style={trackStyles.driverPin}><Ionicons name="car" size={16} color="#FFF" /></View>
          </AppMarker>
          <AppPolyline coordinates={[pickupCoord, driverPos]} strokeColor={Colors.gold} strokeWidth={3} lineDashPattern={[6, 4]} />
        </AppMapView>
        <View style={[trackStyles.bottomSheet, { backgroundColor: colors.surface }]}>
          <View style={trackStyles.bottomHandle} />
          <View style={trackStyles.driverRow}>
            <View style={trackStyles.driverAvatar}><Ionicons name="person" size={24} color="#FFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[trackStyles.driverName, { color: colors.text }]}>{ride.driverName || "Assigned Driver"}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[trackStyles.driverVehicle, { color: colors.textSecondary }]}>
                  {vehicleTypes[ride.vehicleType as keyof typeof vehicleTypes]?.name || ride.vehicleType}
                </Text>
              </View>
            </View>
            <View style={trackStyles.driverActions}>
              <Pressable style={[trackStyles.actionCircle, { backgroundColor: "#E8F5E9" }]}><Ionicons name="call" size={18} color="#4CAF50" /></Pressable>
              <Pressable style={[trackStyles.actionCircle, { backgroundColor: "#E3F2FD" }]}><Ionicons name="chatbubble" size={18} color="#1976D2" /></Pressable>
            </View>
          </View>
          <View style={[trackStyles.routeInfo, { borderTopColor: colors.border }]}>
            <View style={trackStyles.routeRow}>
              <View style={[trackStyles.routeDotSmall, { backgroundColor: "#4CAF50" }]} />
              <Text style={[trackStyles.routeText, { color: colors.text }]}>{ride.pickup}</Text>
            </View>
            <View style={[trackStyles.routeLineSmall, { borderLeftColor: colors.border }]} />
            <View style={trackStyles.routeRow}>
              <View style={[trackStyles.routeDotSmall, { backgroundColor: "#E74C3C" }]} />
              <Text style={[trackStyles.routeText, { color: colors.text }]}>{ride.drop}</Text>
            </View>
          </View>
          <View style={[trackStyles.fareRow, { borderTopColor: colors.border }]}>
            <View>
              <Text style={[trackStyles.fareLabel, { color: colors.textSecondary }]}>Estimated Fare</Text>
              <Text style={trackStyles.fareAmount}>{"\u20B9"}{ride.fare.toLocaleString()}</Text>
            </View>
            <View style={trackStyles.etaBox}>
              <Ionicons name="time" size={16} color={Colors.gold} />
              <Text style={[trackStyles.etaText, { color: colors.text }]}>~{ride.durationMin} min</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ReviewModal({
  visible, onClose, ride, onSubmit,
}: { visible: boolean; onClose: () => void; ride: ApiRide | null; onSubmit: (rating: number, comment: string) => void; }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  if (!ride) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={reviewStyles.overlay}>
        <View style={[reviewStyles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
          <View style={reviewStyles.handle} />
          <Text style={[reviewStyles.title, { color: colors.text }]}>Rate Your Trip</Text>
          <Text style={[reviewStyles.subtitle, { color: colors.textSecondary }]}>
            {ride.drop} with {ride.driverName || "Your Driver"}
          </Text>

          <View style={reviewStyles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => { setRating(s); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <Ionicons name={s <= rating ? "star" : "star-outline"} size={40} color={Colors.gold} />
              </Pressable>
            ))}
          </View>

          <TextInput
            style={[reviewStyles.commentInput, { color: colors.text, backgroundColor: isDark ? "#242420" : "#F5F3EE" }]}
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={reviewStyles.btnRow}>
            <Pressable onPress={onClose} style={[reviewStyles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={[reviewStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSubmit(rating, comment);
                setComment("");
                setRating(5);
              }}
              style={reviewStyles.submitBtn}
            >
              <Text style={reviewStyles.submitText}>Submit Review</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TripCard({
  ride, onCancel, onTrack, onReview,
}: {
  ride: ApiRide; onCancel: (id: string) => void; onTrack: (ride: ApiRide) => void; onReview: (ride: ApiRide) => void;
}) {
  const { colors } = useTheme();
  const uiStatus = statusToUI(ride.status);
  const statusColor = uiStatus === "completed" ? "#4CAF50" : uiStatus === "confirmed" ? "#1976D2" : uiStatus === "cancelled" ? "#E74C3C" : uiStatus === "in_progress" ? "#2ECC71" : "#FF9800";
  const canCancel = uiStatus === "pending" || uiStatus === "confirmed";
  const canTrack = uiStatus === "confirmed" || uiStatus === "in_progress";
  const canReview = uiStatus === "completed" && !ride.hasReview;
  const vehicleLabel = vehicleTypes[ride.vehicleType as keyof typeof vehicleTypes]?.name || ride.vehicleType;

  return (
    <View style={[styles.tripCard, { backgroundColor: colors.surface }]}>
      <View style={styles.tripHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tripId, { color: colors.textTertiary }]}>#{ride.rideId}</Text>
          <Text style={[styles.tripDate, { color: colors.textSecondary }]}>{formatDate(ride.createdAt)} · {formatTime(ride.createdAt)}</Text>
        </View>
        <View style={[styles.tripBadge, { backgroundColor: statusColor + "18" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {uiStatus === "in_progress" ? "In Progress" : uiStatus.charAt(0).toUpperCase() + uiStatus.slice(1)}
          </Text>
        </View>
        {canCancel && (
          <Pressable onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onCancel(ride.rideId); }} style={{ marginLeft: 8 }}>
            <Ionicons name="close-circle-outline" size={22} color="#E74C3C" />
          </Pressable>
        )}
      </View>

      <View style={styles.routeSection}>
        <View style={styles.routeIndicator}>
          <View style={[styles.routeDotGreen, { backgroundColor: "#4CAF50" }]} />
          <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
          <View style={[styles.routeDotRed, { backgroundColor: "#E74C3C" }]} />
        </View>
        <View style={styles.routeTexts}>
          <Text style={[styles.routeLabel, { color: colors.text }]} numberOfLines={1}>{ride.pickup}</Text>
          <Text style={[styles.routeLabel, { color: colors.text, marginTop: 20 }]} numberOfLines={1}>{ride.drop}</Text>
        </View>
      </View>

      {ride.driverName && (
        <View style={[styles.driverInfoRow, { borderTopColor: colors.border }]}>
          <View style={styles.driverAvatarSmall}>
            <Ionicons name="person" size={14} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.driverNameText, { color: colors.text }]}>{ride.driverName}</Text>
            <Text style={[styles.driverDetailText, { color: colors.textSecondary }]}>{vehicleLabel}</Text>
          </View>
        </View>
      )}

      <View style={[styles.tripFooter, { borderTopColor: colors.border }]}>
        <View style={styles.vehicleInfo}>
          <Ionicons name="car-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.vehicleText, { color: colors.textSecondary }]}>{vehicleLabel}</Text>
          {ride.distanceKm > 0 && (
            <Text style={[styles.vehicleText, { color: colors.textTertiary }]}>· {ride.distanceKm.toFixed(1)} km</Text>
          )}
        </View>
        <Text style={styles.fareText}>{"\u20B9"}{ride.fare.toLocaleString()}</Text>
      </View>

      {canTrack && (
        <Pressable onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onTrack(ride); }} style={styles.trackBtn}>
          <Ionicons name="navigate" size={16} color="#FFF" />
          <Text style={styles.trackBtnText}>Track Driver</Text>
        </Pressable>
      )}

      {canReview && (
        <Pressable onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReview(ride); }} style={[styles.reviewBtn, { borderColor: Colors.gold }]}>
          <Ionicons name="star-outline" size={16} color={Colors.gold} />
          <Text style={[styles.reviewBtnText, { color: Colors.gold }]}>Rate & Review</Text>
        </Pressable>
      )}

      {ride.hasReview && (
        <View style={styles.reviewedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#2ECC71" />
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: "#2ECC71" }}>Reviewed</Text>
        </View>
      )}
    </View>
  );
}

export default function RidesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { addReview } = useData();
  const [rides, setRides] = useState<ApiRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingRide, setTrackingRide] = useState<ApiRide | null>(null);
  const [reviewRide, setReviewRide] = useState<ApiRide | null>(null);

  const customerId = user?.id || "guest";

  const fetchRides = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/rides?customerId=${encodeURIComponent(customerId)}`);
      if (res.ok) {
        const data: ApiRide[] = await res.json();
        setRides(data);
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const handleCancel = (rideId: string) => {
    Alert.alert("Cancel Ride", "Are you sure you want to cancel this ride?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/api/rides/${rideId}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "cancelled" }),
            });
            setRides((prev) => prev.map((r) => r.rideId === rideId ? { ...r, status: "cancelled" } : r));
          } catch {
            Alert.alert("Error", "Could not cancel ride. Please try again.");
          }
        },
      },
    ]);
  };

  const handleReviewSubmit = (rating: number, comment: string) => {
    if (!reviewRide) return;
    addReview({
      bookingId: reviewRide.rideId,
      userId: user?.id || "guest",
      driverId: reviewRide.driverId || "",
      rating,
      comment,
      date: new Date().toISOString().split("T")[0],
    });
    setRides((prev) => prev.map((r) => r.rideId === reviewRide.rideId ? { ...r, hasReview: true } : r));
    setReviewRide(null);
    Alert.alert("Thank You!", "Your review has been submitted successfully.");
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchRides(true)}
            tintColor={Colors.gold}
          />
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>My Bookings</Text>

        {loading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator color={Colors.gold} size="large" />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading your trips...</Text>
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            {rides.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                <Ionicons name="car-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No trips yet</Text>
                <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Book your first ride to get started!</Text>
              </View>
            ) : (
              rides.map((ride) => (
                <TripCard
                  key={ride.rideId}
                  ride={ride}
                  onCancel={handleCancel}
                  onTrack={setTrackingRide}
                  onReview={setReviewRide}
                />
              ))
            )}
          </Animated.View>
        )}
      </ScrollView>

      <DriverTrackingModal visible={!!trackingRide} onClose={() => setTrackingRide(null)} ride={trackingRide} />
      <ReviewModal visible={!!reviewRide} onClose={() => setReviewRide(null)} ride={reviewRide} onSubmit={handleReviewSubmit} />
    </>
  );
}

const reviewStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D0D0D0", alignSelf: "center", marginBottom: 20 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center" },
  subtitle: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center", marginTop: 4, marginBottom: 20 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 20 },
  commentInput: { borderRadius: 12, padding: 14, fontFamily: "Poppins_400Regular", fontSize: 14, minHeight: 80, marginBottom: 20 },
  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontFamily: "Poppins_500Medium", fontSize: 15 },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.gold, alignItems: "center" },
  submitText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0A0A0A" },
});

const trackStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, zIndex: 10 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  headerTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18 },
  map: { flex: 1 },
  bottomSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  bottomHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D0D0D0", alignSelf: "center", marginTop: 12, marginBottom: 16 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.gold, alignItems: "center", justifyContent: "center" },
  driverName: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  driverVehicle: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  driverActions: { flexDirection: "row", gap: 10 },
  actionCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  routeInfo: { paddingTop: 16, borderTopWidth: 1, marginBottom: 16 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeDotSmall: { width: 10, height: 10, borderRadius: 5 },
  routeLineSmall: { height: 16, borderLeftWidth: 2, marginLeft: 4 },
  routeText: { fontFamily: "Poppins_500Medium", fontSize: 14, flex: 1 },
  fareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTopWidth: 1 },
  fareLabel: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  fareAmount: { fontFamily: "Poppins_700Bold", fontSize: 22, color: Colors.gold },
  etaBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  etaText: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  pickupPin: { width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(76,175,80,0.3)", alignItems: "center", justifyContent: "center" },
  pickupPinInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4CAF50", borderWidth: 2, borderColor: "#FFF" },
  driverPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#0A0A0A", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.gold },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 32, marginBottom: 20 },
  tripCard: { borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  tripHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  tripId: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  tripDate: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  tripBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  routeSection: { flexDirection: "row", gap: 14 },
  routeIndicator: { alignItems: "center", paddingTop: 4 },
  routeDotGreen: { width: 12, height: 12, borderRadius: 6 },
  routeLine: { width: 2, height: 24 },
  routeDotRed: { width: 12, height: 12, borderRadius: 6 },
  routeTexts: { flex: 1 },
  routeLabel: { fontFamily: "Poppins_500Medium", fontSize: 15 },
  driverInfoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  driverAvatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.gold, alignItems: "center", justifyContent: "center" },
  driverNameText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  driverDetailText: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  tripFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  vehicleInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  vehicleText: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  fareText: { fontFamily: "Poppins_700Bold", fontSize: 18, color: Colors.gold },
  trackBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.gold, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  trackBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#FFF" },
  reviewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, paddingVertical: 12, borderRadius: 12, marginTop: 10 },
  reviewBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  reviewedBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 },
  emptyCard: { alignItems: "center", padding: 32, borderRadius: 16, gap: 8, marginBottom: 16 },
  emptyText: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  emptySubtext: { fontFamily: "Poppins_400Regular", fontSize: 13 },
});
