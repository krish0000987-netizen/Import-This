import React, { useState } from "react";
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
} from "react-native";
import LogoutModal from "@/components/LogoutModal";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { DriverData, DriverDocument } from "@/constants/data";

const docIcons: Record<string, string> = {
  driving_license: "card-outline",
  rc: "car-outline",
  aadhaar: "person-outline",
  insurance: "shield-outline",
  pan: "document-text-outline",
};

const statusColors: Record<string, string> = {
  not_uploaded: "#9E9E9E",
  uploaded: "#F39C12",
  verified: "#2ECC71",
  rejected: "#E74C3C",
};

const statusLabels: Record<string, string> = {
  not_uploaded: "Not Uploaded",
  uploaded: "Under Review",
  verified: "Verified",
  rejected: "Rejected",
};

export default function DriverProfile() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { updateDriverDocument, getDriverReviews } = useData();
  const driver = user as DriverData | null;
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DriverDocument | null>(null);

  const driverReviews = getDriverReviews(driver?.id || "");
  const verifiedCount = driver?.documents?.filter((d) => d.status === "verified").length || 0;
  const totalDocs = driver?.documents?.length || 5;

  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLogout(true);
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setShowLogout(false);
    router.replace("/");
  };

  const handleUploadDoc = (doc: DriverDocument) => {
    if (doc.status === "verified") {
      Alert.alert("Already Verified", "This document has been verified.");
      return;
    }
    Alert.alert(
      "Upload Document",
      `Upload your ${doc.label}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Upload",
          onPress: () => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            updateDriverDocument(driver?.id || "", doc.type, {
              status: "uploaded",
              uploadDate: new Date().toISOString().split("T")[0],
            });
            Alert.alert("Uploaded", `${doc.label} has been uploaded and is now under review.`);
          },
        },
      ]
    );
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: Colors.gold }]}>
            <Text style={styles.avatarText}>{driver?.name?.[0] || "D"}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{driver?.name || "Driver"}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{driver?.email}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={Colors.gold} />
            <Text style={[styles.rating, { color: colors.text }]}>{driver?.rating || 0}</Text>
            <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>({driver?.completedTrips || 0} trips)</Text>
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="car-sport" size={20} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Vehicle</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{driver?.vehicle || "N/A"}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={20} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Registration</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{driver?.vehicleNumber || "N/A"}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={20} color={driver?.kycStatus === "approved" ? "#2ECC71" : "#F39C12"} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>KYC Status</Text>
                <Text style={[styles.infoValue, { color: driver?.kycStatus === "approved" ? "#2ECC71" : "#F39C12" }]}>
                  {(driver?.kycStatus || "pending").charAt(0).toUpperCase() + (driver?.kycStatus || "pending").slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Documents ({verifiedCount}/{totalDocs})</Text>
          <View style={[styles.docsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(verifiedCount / totalDocs) * 100}%` }]} />
            </View>
            {driver?.documents?.map((doc, i) => {
              const color = statusColors[doc.status];
              return (
                <React.Fragment key={doc.type}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <Pressable
                    onPress={() => {
                      if (doc.status === "not_uploaded" || doc.status === "rejected") {
                        handleUploadDoc(doc);
                      } else {
                        setSelectedDoc(doc);
                        setShowDocModal(true);
                      }
                    }}
                    style={styles.docRow}
                  >
                    <View style={[styles.docIcon, { backgroundColor: color + "18" }]}>
                      <Ionicons name={docIcons[doc.type] as any || "document-outline"} size={18} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docLabel, { color: colors.text }]}>{doc.label}</Text>
                      <Text style={[styles.docStatus, { color }]}>{statusLabels[doc.status]}</Text>
                    </View>
                    {doc.status === "not_uploaded" || doc.status === "rejected" ? (
                      <View style={[styles.uploadBtn, { backgroundColor: Colors.gold + "18" }]}>
                        <Ionicons name="cloud-upload-outline" size={16} color={Colors.gold} />
                        <Text style={styles.uploadBtnText}>Upload</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    )}
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>
        </Animated.View>

        {driverReviews.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Reviews</Text>
            {driverReviews.slice(0, 3).map((review) => (
              <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons key={s} name={s <= review.rating ? "star" : "star-outline"} size={14} color={Colors.gold} />
                    ))}
                  </View>
                  <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>{review.date}</Text>
                </View>
                {review.comment ? <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text> : null}
              </View>
            ))}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }}
                trackColor={{ false: "#D4D4D4", true: Colors.gold + "60" }}
                thumbColor={isDark ? Colors.gold : "#FFF"}
              />
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/terms");
              }}
              style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="document-text-outline" size={20} color={Colors.gold} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Terms & Conditions</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/driver-agreement");
              }}
              style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="car-sport-outline" size={20} color={Colors.gold} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Driver Agreement</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          </View>
        </Animated.View>

        <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>

      <LogoutModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />

      <Modal visible={showDocModal} animationType="slide" transparent onRequestClose={() => setShowDocModal(false)}>
        <View style={docModalStyles.overlay}>
          <View style={[docModalStyles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
            <View style={docModalStyles.handle} />
            {selectedDoc && (
              <>
                <View style={[docModalStyles.iconCircle, { backgroundColor: statusColors[selectedDoc.status] + "18" }]}>
                  <Ionicons name={docIcons[selectedDoc.type] as any || "document-outline"} size={28} color={statusColors[selectedDoc.status]} />
                </View>
                <Text style={[docModalStyles.title, { color: colors.text }]}>{selectedDoc.label}</Text>
                <View style={[docModalStyles.statusBadge, { backgroundColor: statusColors[selectedDoc.status] + "18" }]}>
                  <Text style={[docModalStyles.statusText, { color: statusColors[selectedDoc.status] }]}>{statusLabels[selectedDoc.status]}</Text>
                </View>

                <View style={docModalStyles.detailsCard}>
                  {selectedDoc.uploadDate && (
                    <View style={docModalStyles.detailRow}>
                      <Text style={[docModalStyles.detailLabel, { color: colors.textSecondary }]}>Uploaded</Text>
                      <Text style={[docModalStyles.detailValue, { color: colors.text }]}>{selectedDoc.uploadDate}</Text>
                    </View>
                  )}
                  {selectedDoc.expiryDate && (
                    <View style={docModalStyles.detailRow}>
                      <Text style={[docModalStyles.detailLabel, { color: colors.textSecondary }]}>Expiry</Text>
                      <Text style={[docModalStyles.detailValue, { color: colors.text }]}>{selectedDoc.expiryDate}</Text>
                    </View>
                  )}
                  {selectedDoc.rejectionReason && (
                    <View style={docModalStyles.detailRow}>
                      <Text style={[docModalStyles.detailLabel, { color: "#E74C3C" }]}>Reason</Text>
                      <Text style={[docModalStyles.detailValue, { color: "#E74C3C" }]}>{selectedDoc.rejectionReason}</Text>
                    </View>
                  )}
                </View>

                <Pressable onPress={() => setShowDocModal(false)} style={[docModalStyles.closeBtn, { borderColor: colors.border }]}>
                  <Text style={[docModalStyles.closeBtnText, { color: colors.text }]}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const docModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: "center" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D0D0D0", marginBottom: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 8 },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, marginBottom: 20 },
  statusText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  detailsCard: { width: "100%", gap: 12, marginBottom: 20 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  detailValue: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  closeBtn: { width: "100%", paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  closeBtnText: { fontFamily: "Poppins_500Medium", fontSize: 15 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { alignItems: "center", paddingHorizontal: 20, marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontFamily: "Poppins_700Bold", fontSize: 32, color: "#0A0A0A" },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24 },
  email: { fontFamily: "Poppins_400Regular", fontSize: 14, marginTop: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  rating: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  ratingLabel: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  infoCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 8 },
  infoLabel: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  infoValue: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  divider: { height: 1, marginVertical: 4 },
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, paddingHorizontal: 20, marginBottom: 12 },
  docsCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  progressBarBg: { height: 4, backgroundColor: "#E0E0E0", borderRadius: 2, marginBottom: 14 },
  progressBarFill: { height: 4, backgroundColor: "#2ECC71", borderRadius: 2 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  docIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docLabel: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  docStatus: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  uploadBtnText: { fontFamily: "Poppins_500Medium", fontSize: 12, color: Colors.gold },
  reviewCard: { marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  starsRow: { flexDirection: "row", gap: 2 },
  reviewDate: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  reviewComment: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  section: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingLabel: { fontFamily: "Poppins_500Medium", fontSize: 15 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 20, paddingVertical: 16, borderRadius: 14, backgroundColor: "rgba(231,76,60,0.08)", marginTop: 8 },
  logoutText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#E74C3C" },
});
