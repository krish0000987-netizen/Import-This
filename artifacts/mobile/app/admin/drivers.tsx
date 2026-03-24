import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useData } from "@/contexts/DataContext";
import { DriverData, DriverDocument } from "@/constants/data";

const statusColors: Record<string, string> = {
  not_uploaded: "#9E9E9E",
  uploaded: "#F39C12",
  verified: "#2ECC71",
  rejected: "#E74C3C",
};

function DriverDetailModal({
  visible, onClose, driver,
}: { visible: boolean; onClose: () => void; driver: DriverData | null }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { toggleDriverBlock, updateDriverDocument, getDriverReviews } = useData();

  if (!driver) return null;
  const driverReviews = getDriverReviews(driver.id);

  const handleVerifyDoc = (docType: string) => {
    updateDriverDocument(driver.id, docType, { status: "verified" });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRejectDoc = (docType: string) => {
    Alert.alert("Reject Document", "Reject this document?", [
      { text: "Cancel" },
      { text: "Reject", style: "destructive", onPress: () => updateDriverDocument(driver.id, docType, { status: "rejected", rejectionReason: "Document unclear or expired" }) },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[detailStyles.container, { backgroundColor: colors.background }]}>
        <View style={[detailStyles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
          <Pressable onPress={onClose} style={[detailStyles.closeBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[detailStyles.headerTitle, { color: colors.text }]}>Driver Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={[{ key: "content" }]}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={() => (
            <>
              <View style={detailStyles.profileSection}>
                <View style={[detailStyles.avatar, { backgroundColor: Colors.gold }]}>
                  <Text style={detailStyles.avatarText}>{driver.name[0]}</Text>
                </View>
                <Text style={[detailStyles.name, { color: colors.text }]}>{driver.name}</Text>
                <Text style={[detailStyles.phone, { color: colors.textSecondary }]}>{driver.phone}</Text>
                <View style={detailStyles.statsRow}>
                  <View style={detailStyles.statItem}>
                    <Ionicons name="star" size={16} color={Colors.gold} />
                    <Text style={[detailStyles.statValue, { color: colors.text }]}>{driver.rating || "N/A"}</Text>
                  </View>
                  <View style={detailStyles.statItem}>
                    <Ionicons name="navigate" size={16} color={Colors.gold} />
                    <Text style={[detailStyles.statValue, { color: colors.text }]}>{driver.completedTrips} trips</Text>
                  </View>
                  <View style={detailStyles.statItem}>
                    <Ionicons name="wallet" size={16} color={Colors.gold} />
                    <Text style={[detailStyles.statValue, { color: colors.text }]}>{"\u20B9"}{driver.totalEarnings.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              <View style={[detailStyles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={detailStyles.infoRow}>
                  <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Vehicle</Text>
                  <Text style={[detailStyles.infoValue, { color: colors.text }]}>{driver.vehicle}</Text>
                </View>
                <View style={detailStyles.infoRow}>
                  <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Number</Text>
                  <Text style={[detailStyles.infoValue, { color: colors.text }]}>{driver.vehicleNumber}</Text>
                </View>
                <View style={detailStyles.infoRow}>
                  <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Commission</Text>
                  <Text style={[detailStyles.infoValue, { color: Colors.gold }]}>{driver.commissionRate}%</Text>
                </View>
                <View style={detailStyles.infoRow}>
                  <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Wallet</Text>
                  <Text style={[detailStyles.infoValue, { color: colors.text }]}>{"\u20B9"}{driver.walletBalance.toLocaleString()}</Text>
                </View>
              </View>

              <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Documents</Text>
              <View style={[detailStyles.docsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {driver.documents.map((doc, i) => {
                  const docColor = statusColors[doc.status];
                  return (
                    <View key={doc.type}>
                      {i > 0 && <View style={[detailStyles.divider, { backgroundColor: colors.border }]} />}
                      <View style={detailStyles.docRow}>
                        <View style={[detailStyles.docDot, { backgroundColor: docColor }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[detailStyles.docLabel, { color: colors.text }]}>{doc.label}</Text>
                          <Text style={[detailStyles.docStatus, { color: docColor }]}>
                            {doc.status.replace("_", " ").charAt(0).toUpperCase() + doc.status.replace("_", " ").slice(1)}
                            {doc.uploadDate ? ` · ${doc.uploadDate}` : ""}
                          </Text>
                        </View>
                        {doc.status === "uploaded" && (
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            <Pressable onPress={() => handleVerifyDoc(doc.type)} style={[detailStyles.docAction, { backgroundColor: "#2ECC7118" }]}>
                              <Ionicons name="checkmark" size={16} color="#2ECC71" />
                            </Pressable>
                            <Pressable onPress={() => handleRejectDoc(doc.type)} style={[detailStyles.docAction, { backgroundColor: "#E74C3C18" }]}>
                              <Ionicons name="close" size={16} color="#E74C3C" />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {driverReviews.length > 0 && (
                <>
                  <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Reviews ({driverReviews.length})</Text>
                  {driverReviews.map((review) => (
                    <View key={review.id} style={[detailStyles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons key={s} name={s <= review.rating ? "star" : "star-outline"} size={12} color={Colors.gold} />
                        ))}
                        <Text style={[{ fontFamily: "Poppins_400Regular", fontSize: 11, marginLeft: 4 }, { color: colors.textTertiary }]}>{review.date}</Text>
                      </View>
                      {review.comment ? <Text style={[detailStyles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text> : null}
                    </View>
                  ))}
                </>
              )}

              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert(
                    driver.isBlocked ? "Unblock Driver" : "Block Driver",
                    driver.isBlocked ? `Unblock ${driver.name}?` : `Block ${driver.name}? They won't be able to accept rides.`,
                    [
                      { text: "Cancel" },
                      {
                        text: driver.isBlocked ? "Unblock" : "Block",
                        style: driver.isBlocked ? "default" : "destructive",
                        onPress: () => toggleDriverBlock(driver.id),
                      },
                    ]
                  );
                }}
                style={[detailStyles.blockBtn, { backgroundColor: driver.isBlocked ? "#2ECC7118" : "#E74C3C18" }]}
              >
                <Ionicons name={driver.isBlocked ? "lock-open-outline" : "lock-closed-outline"} size={18} color={driver.isBlocked ? "#2ECC71" : "#E74C3C"} />
                <Text style={[detailStyles.blockText, { color: driver.isBlocked ? "#2ECC71" : "#E74C3C" }]}>
                  {driver.isBlocked ? "Unblock Driver" : "Block Driver"}
                </Text>
              </Pressable>
            </>
          )}
        />
      </View>
    </Modal>
  );
}

function DriverCard({ driver, index, onApprove, onReject, onTap }: {
  driver: DriverData; index: number; onApprove: (id: string) => void; onReject: (id: string) => void; onTap: (driver: DriverData) => void;
}) {
  const { colors } = useTheme();
  const kycColors: Record<string, string> = { approved: "#2ECC71", submitted: "#F39C12", rejected: "#E74C3C", pending: "#9E9E9E" };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <Pressable onPress={() => onTap(driver)}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.driverAvatar, { backgroundColor: Colors.gold }]}>
              <Text style={styles.driverAvatarText}>{driver.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.driverName, { color: colors.text }]}>{driver.name}</Text>
                {driver.isBlocked && (
                  <View style={styles.blockedBadge}>
                    <Ionicons name="lock-closed" size={10} color="#E74C3C" />
                  </View>
                )}
              </View>
              <Text style={[styles.driverPhone, { color: colors.textSecondary }]}>{driver.phone}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: driver.isAvailable ? "#2ECC71" : "#E74C3C" }]} />
          </View>

          <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
            <View style={styles.infoItem}>
              <Ionicons name="car-sport-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{driver.vehicle}</Text>
            </View>
            <View style={styles.cardStats}>
              <View style={styles.miniStat}>
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Text style={[styles.miniStatText, { color: colors.text }]}>{driver.rating || "N/A"}</Text>
              </View>
              <View style={styles.miniStat}>
                <Ionicons name="navigate" size={14} color={Colors.gold} />
                <Text style={[styles.miniStatText, { color: colors.text }]}>{driver.completedTrips} trips</Text>
              </View>
              <View style={styles.miniStat}>
                <Ionicons name="wallet" size={14} color={Colors.gold} />
                <Text style={[styles.miniStatText, { color: colors.text }]}>{"\u20B9"}{driver.totalEarnings.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.docsStatusRow}>
              {driver.documents.map((doc) => (
                <View key={doc.type} style={[styles.docMiniDot, { backgroundColor: statusColors[doc.status] }]} />
              ))}
              <Text style={[styles.docsStatusText, { color: colors.textTertiary }]}>
                {driver.documents.filter((d) => d.status === "verified").length}/{driver.documents.length} docs
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={[styles.kycBadge, { backgroundColor: (kycColors[driver.kycStatus] || "#9E9E9E") + "18" }]}>
              <Ionicons name={driver.kycStatus === "approved" ? "checkmark-circle" : driver.kycStatus === "rejected" ? "close-circle" : "time"} size={14} color={kycColors[driver.kycStatus] || "#9E9E9E"} />
              <Text style={[styles.kycText, { color: kycColors[driver.kycStatus] || "#9E9E9E" }]}>KYC {driver.kycStatus.charAt(0).toUpperCase() + driver.kycStatus.slice(1)}</Text>
            </View>
            {driver.kycStatus === "submitted" && (
              <View style={styles.actionRow}>
                <Pressable onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onApprove(driver.id); }} style={[styles.actionBtn, { backgroundColor: "#2ECC7118" }]}>
                  <Ionicons name="checkmark" size={18} color="#2ECC71" />
                </Pressable>
                <Pressable onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReject(driver.id); }} style={[styles.actionBtn, { backgroundColor: "#E74C3C18" }]}>
                  <Ionicons name="close" size={18} color="#E74C3C" />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function DriversScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { drivers, updateDriverStatus } = useData();
  const [selectedDriver, setSelectedDriver] = useState<DriverData | null>(null);

  const handleApprove = (id: string) => {
    Alert.alert("Approve KYC", "Approve this driver's KYC?", [
      { text: "Cancel", style: "cancel" },
      { text: "Approve", onPress: () => updateDriverStatus(id, { kycStatus: "approved" } as any) },
    ]);
  };

  const handleReject = (id: string) => {
    Alert.alert("Reject KYC", "Reject this driver's KYC?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reject", style: "destructive", onPress: () => updateDriverStatus(id, { kycStatus: "rejected" } as any) },
    ]);
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={drivers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            paddingBottom: 100,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.title, { color: colors.text }]}>Manage Drivers ({drivers.length})</Text>
          }
          renderItem={({ item, index }) => (
            <DriverCard driver={item} index={index} onApprove={handleApprove} onReject={handleReject} onTap={setSelectedDriver} />
          )}
        />
      </View>
      <DriverDetailModal visible={!!selectedDriver} onClose={() => setSelectedDriver(null)} driver={selectedDriver} />
    </>
  );
}

const detailStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  headerTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18 },
  profileSection: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  avatarText: { fontFamily: "Poppins_700Bold", fontSize: 26, color: "#0A0A0A" },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  phone: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 20, marginTop: 12 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  infoLabel: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  infoValue: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 12 },
  docsCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20 },
  divider: { height: 1, marginVertical: 6 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  docDot: { width: 10, height: 10, borderRadius: 5 },
  docLabel: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  docStatus: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  docAction: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  reviewCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  reviewComment: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  blockBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
  blockText: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, marginBottom: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  driverAvatarText: { fontFamily: "Poppins_700Bold", fontSize: 18, color: "#0A0A0A" },
  driverName: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  driverPhone: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  blockedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#E74C3C18", alignItems: "center", justifyContent: "center" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardBody: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, gap: 6 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  cardStats: { flexDirection: "row", gap: 16, marginTop: 4 },
  miniStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  miniStatText: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  docsStatusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  docMiniDot: { width: 8, height: 8, borderRadius: 4 },
  docsStatusText: { fontFamily: "Poppins_400Regular", fontSize: 11, marginLeft: 4 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  kycBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  kycText: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
