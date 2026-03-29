import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { DriverData } from "@/constants/data";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5001";

const kycColors: Record<string, string> = {
  approved: "#2ECC71",
  submitted: "#F39C12",
  rejected: "#E74C3C",
  pending: "#9E9E9E",
};

const docStatusColors: Record<string, string> = {
  not_uploaded: "#9E9E9E",
  uploaded: "#F39C12",
  verified: "#2ECC71",
  rejected: "#E74C3C",
};

type Tab = "applications" | "approved" | "all";

async function apiCall(path: string, method = "GET", body?: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.ok;
}

function RejectReasonModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { colors } = useTheme();
  const [reason, setReason] = useState("");
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rejectStyles.overlay}>
        <View style={[rejectStyles.card, { backgroundColor: colors.surface }]}>
          <Text style={[rejectStyles.title, { color: colors.text }]}>Rejection Reason</Text>
          <Text style={[rejectStyles.subtitle, { color: colors.textSecondary }]}>
            Provide a reason so the driver can resubmit documents.
          </Text>
          <TextInput
            style={[rejectStyles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. Document photo is blurry, insurance expired..."
            placeholderTextColor={colors.textTertiary}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={rejectStyles.btnRow}>
            <Pressable onPress={onClose} style={[rejectStyles.btn, { backgroundColor: colors.background }]}>
              <Text style={[rejectStyles.btnText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { onConfirm(reason.trim() || "Documents did not meet requirements."); setReason(""); }}
              style={[rejectStyles.btn, { backgroundColor: "#E74C3C18" }]}
            >
              <Text style={[rejectStyles.btnText, { color: "#E74C3C" }]}>Reject</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DriverDetailModal({
  visible,
  onClose,
  driver,
  onActionDone,
}: {
  visible: boolean;
  onClose: () => void;
  driver: DriverData | null;
  onActionDone: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [rejectModalVisible, setRejectModalVisible] = useState(false);

  if (!driver) return null;

  const handleVerifyDoc = async (docType: string) => {
    const ok = await apiCall(`/api/admin/drivers/${driver.id}/documents/${docType}/verify`, "POST");
    if (ok) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onActionDone();
    }
  };

  const handleRejectDoc = (docType: string) => {
    Alert.alert("Reject Document", "Reject this document?", [
      { text: "Cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          await apiCall(`/api/admin/drivers/${driver.id}/documents/${docType}/reject`, "POST", {
            reason: "Document unclear or expired",
          });
          onActionDone();
        },
      },
    ]);
  };

  const handleApproveKyc = () => {
    Alert.alert("Approve KYC", `Approve ${driver.name} as a verified driver?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          await apiCall(`/api/admin/drivers/${driver.id}/approve`, "POST");
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onActionDone();
          onClose();
        },
      },
    ]);
  };

  return (
    <>
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
                  <View style={[detailStyles.kycBadge, { backgroundColor: (kycColors[driver.kycStatus] || "#9E9E9E") + "20" }]}>
                    <Ionicons
                      name={driver.kycStatus === "approved" ? "checkmark-circle" : driver.kycStatus === "rejected" ? "close-circle" : "time"}
                      size={14}
                      color={kycColors[driver.kycStatus] || "#9E9E9E"}
                    />
                    <Text style={[detailStyles.kycText, { color: kycColors[driver.kycStatus] || "#9E9E9E" }]}>
                      KYC {driver.kycStatus.charAt(0).toUpperCase() + driver.kycStatus.slice(1)}
                    </Text>
                  </View>
                  {driver.rejectionReason ? (
                    <View style={[detailStyles.rejectionNote, { backgroundColor: "#E74C3C10", borderColor: "#E74C3C30" }]}>
                      <Ionicons name="alert-circle-outline" size={14} color="#E74C3C" />
                      <Text style={[detailStyles.rejectionText, { color: "#E74C3C" }]}>{driver.rejectionReason}</Text>
                    </View>
                  ) : null}
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
                      <Text style={[detailStyles.statValue, { color: colors.text }]}>₹{driver.totalEarnings.toLocaleString()}</Text>
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
                  {driver.vehicleType ? (
                    <View style={detailStyles.infoRow}>
                      <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Type</Text>
                      <Text style={[detailStyles.infoValue, { color: colors.text }]}>{driver.vehicleType.toUpperCase()}</Text>
                    </View>
                  ) : null}
                  <View style={detailStyles.infoRow}>
                    <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Commission</Text>
                    <Text style={[detailStyles.infoValue, { color: Colors.gold }]}>{driver.commissionRate}%</Text>
                  </View>
                  <View style={detailStyles.infoRow}>
                    <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Wallet</Text>
                    <Text style={[detailStyles.infoValue, { color: colors.text }]}>₹{driver.walletBalance.toLocaleString()}</Text>
                  </View>
                  {driver.appliedAt ? (
                    <View style={detailStyles.infoRow}>
                      <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Applied</Text>
                      <Text style={[detailStyles.infoValue, { color: colors.text }]}>{driver.appliedAt}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Documents</Text>
                <View style={[detailStyles.docsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {driver.documents.map((doc, i) => {
                    const docColor = docStatusColors[doc.status];
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
                            {doc.rejectionReason ? (
                              <Text style={[detailStyles.docRejection, { color: "#E74C3C" }]}>{doc.rejectionReason}</Text>
                            ) : null}
                          </View>
                          {doc.status === "uploaded" && (
                            <View style={{ flexDirection: "row", gap: 6 }}>
                              <Pressable
                                onPress={() => handleVerifyDoc(doc.type)}
                                style={[detailStyles.docAction, { backgroundColor: "#2ECC7118" }]}
                              >
                                <Ionicons name="checkmark" size={16} color="#2ECC71" />
                              </Pressable>
                              <Pressable
                                onPress={() => handleRejectDoc(doc.type)}
                                style={[detailStyles.docAction, { backgroundColor: "#E74C3C18" }]}
                              >
                                <Ionicons name="close" size={16} color="#E74C3C" />
                              </Pressable>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {driver.kycStatus === "submitted" && (
                  <View style={detailStyles.kycActions}>
                    <Pressable onPress={handleApproveKyc} style={[detailStyles.kycBtn, { backgroundColor: "#2ECC7118" }]}>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#2ECC71" />
                      <Text style={[detailStyles.kycBtnText, { color: "#2ECC71" }]}>Approve Application</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setRejectModalVisible(true)}
                      style={[detailStyles.kycBtn, { backgroundColor: "#E74C3C18" }]}
                    >
                      <Ionicons name="close-circle-outline" size={20} color="#E74C3C" />
                      <Text style={[detailStyles.kycBtnText, { color: "#E74C3C" }]}>Reject Application</Text>
                    </Pressable>
                  </View>
                )}

                <Pressable
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(
                      driver.isBlocked ? "Unblock Driver" : "Block Driver",
                      driver.isBlocked
                        ? `Unblock ${driver.name}?`
                        : `Block ${driver.name}? They won't be able to accept rides.`,
                      [
                        { text: "Cancel" },
                        {
                          text: driver.isBlocked ? "Unblock" : "Block",
                          style: driver.isBlocked ? "default" : "destructive",
                          onPress: async () => {
                            await apiCall(`/api/admin/drivers/${driver.id}/block`, "POST");
                            onActionDone();
                            onClose();
                          },
                        },
                      ]
                    );
                  }}
                  style={[detailStyles.blockBtn, { backgroundColor: driver.isBlocked ? "#2ECC7118" : "#E74C3C18" }]}
                >
                  <Ionicons
                    name={driver.isBlocked ? "lock-open-outline" : "lock-closed-outline"}
                    size={18}
                    color={driver.isBlocked ? "#2ECC71" : "#E74C3C"}
                  />
                  <Text style={[detailStyles.blockText, { color: driver.isBlocked ? "#2ECC71" : "#E74C3C" }]}>
                    {driver.isBlocked ? "Unblock Driver" : "Block Driver"}
                  </Text>
                </Pressable>
              </>
            )}
          />
        </View>
      </Modal>

      <RejectReasonModal
        visible={rejectModalVisible}
        onClose={() => setRejectModalVisible(false)}
        onConfirm={async (reason) => {
          await apiCall(`/api/admin/drivers/${driver.id}/reject`, "POST", { reason });
          setRejectModalVisible(false);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          onActionDone();
          onClose();
        }}
      />
    </>
  );
}

function DriverCard({
  driver,
  index,
  onApprove,
  onReject,
  onTap,
}: {
  driver: DriverData;
  index: number;
  onApprove: (driver: DriverData) => void;
  onReject: (driver: DriverData) => void;
  onTap: (driver: DriverData) => void;
}) {
  const { colors } = useTheme();

  const verifiedCount = driver.documents.filter((d) => d.status === "verified").length;
  const totalDocs = driver.documents.length;
  const progress = totalDocs > 0 ? verifiedCount / totalDocs : 0;

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
              <Ionicons name="car-sport-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{driver.vehicle} · {driver.vehicleNumber}</Text>
            </View>
            <View style={styles.cardStats}>
              <View style={styles.miniStat}>
                <Ionicons name="star" size={13} color={Colors.gold} />
                <Text style={[styles.miniStatText, { color: colors.text }]}>{driver.rating || "N/A"}</Text>
              </View>
              <View style={styles.miniStat}>
                <Ionicons name="navigate" size={13} color={Colors.gold} />
                <Text style={[styles.miniStatText, { color: colors.text }]}>{driver.completedTrips} trips</Text>
              </View>
            </View>

            <View style={styles.docsProgress}>
              <View style={{ flex: 1 }}>
                <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: progress === 1 ? "#2ECC71" : Colors.gold }]} />
                </View>
              </View>
              <Text style={[styles.docsStatusText, { color: colors.textTertiary }]}>{verifiedCount}/{totalDocs} docs</Text>
            </View>

            {driver.appliedAt ? (
              <Text style={[styles.appliedAt, { color: colors.textTertiary }]}>Applied {driver.appliedAt}</Text>
            ) : null}
          </View>

          <View style={styles.cardFooter}>
            <View style={[styles.kycBadge, { backgroundColor: (kycColors[driver.kycStatus] || "#9E9E9E") + "18" }]}>
              <Ionicons
                name={driver.kycStatus === "approved" ? "checkmark-circle" : driver.kycStatus === "rejected" ? "close-circle" : "time"}
                size={13}
                color={kycColors[driver.kycStatus] || "#9E9E9E"}
              />
              <Text style={[styles.kycText, { color: kycColors[driver.kycStatus] || "#9E9E9E" }]}>
                {driver.kycStatus.charAt(0).toUpperCase() + driver.kycStatus.slice(1)}
              </Text>
            </View>
            {driver.kycStatus === "submitted" && (
              <View style={styles.actionRow}>
                <Pressable
                  onPress={(e) => { e.stopPropagation(); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onApprove(driver); }}
                  style={[styles.actionBtn, { backgroundColor: "#2ECC7118" }]}
                >
                  <Ionicons name="checkmark" size={18} color="#2ECC71" />
                </Pressable>
                <Pressable
                  onPress={(e) => { e.stopPropagation(); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReject(driver); }}
                  style={[styles.actionBtn, { backgroundColor: "#E74C3C18" }]}
                >
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

  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("applications");
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [pendingRejectDriver, setPendingRejectDriver] = useState<DriverData | null>(null);

  const fetchDrivers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/drivers`);
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const applications = useMemo(() => drivers.filter((d) => d.kycStatus === "submitted"), [drivers]);
  const approved = useMemo(() => drivers.filter((d) => d.kycStatus === "approved"), [drivers]);

  const tabDrivers = useMemo(() => {
    if (activeTab === "applications") return applications;
    if (activeTab === "approved") return approved;
    return drivers;
  }, [activeTab, drivers, applications, approved]);

  const handleApprove = (driver: DriverData) => {
    Alert.alert("Approve KYC", `Approve ${driver.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          await apiCall(`/api/admin/drivers/${driver.id}/approve`, "POST");
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          fetchDrivers();
        },
      },
    ]);
  };

  const handleReject = (driver: DriverData) => {
    setPendingRejectDriver(driver);
    setRejectModalVisible(true);
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "applications", label: "Applications", count: applications.length },
    { key: "approved", label: "Approved", count: approved.length },
    { key: "all", label: "All", count: drivers.length },
  ];

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.gold} size="large" />
          </View>
        ) : (
          <FlatList
            data={tabDrivers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
              paddingBottom: 100,
              paddingHorizontal: 20,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchDrivers(true)} tintColor={Colors.gold} />
            }
            ListHeaderComponent={
              <>
                <Text style={[styles.title, { color: colors.text }]}>Manage Drivers</Text>
                <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <Pressable
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={[styles.tab, isActive && { backgroundColor: Colors.gold }]}
                      >
                        <Text style={[styles.tabLabel, { color: isActive ? "#0A0A0A" : colors.textSecondary }]}>
                          {tab.label}
                        </Text>
                        {tab.count !== undefined && tab.count > 0 && (
                          <View style={[styles.tabBadge, { backgroundColor: isActive ? "#0A0A0A30" : Colors.gold + "30" }]}>
                            <Text style={[styles.tabBadgeText, { color: isActive ? "#0A0A0A" : Colors.gold }]}>{tab.count}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                {tabDrivers.length === 0 && (
                  <Animated.View entering={FadeIn.duration(300)} style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name={activeTab === "applications" ? "document-text-outline" : "people-outline"} size={36} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {activeTab === "applications" ? "No Pending Applications" : activeTab === "approved" ? "No Approved Drivers" : "No Drivers Yet"}
                    </Text>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      {activeTab === "applications"
                        ? "New driver applications will appear here."
                        : activeTab === "approved"
                        ? "Approved drivers will appear here."
                        : "Register drivers via the app to see them here."}
                    </Text>
                  </Animated.View>
                )}
              </>
            }
            renderItem={({ item, index }) => (
              <DriverCard
                driver={item}
                index={index}
                onApprove={handleApprove}
                onReject={handleReject}
                onTap={setSelectedDriver}
              />
            )}
          />
        )}
      </View>

      <DriverDetailModal
        visible={!!selectedDriver}
        onClose={() => setSelectedDriver(null)}
        driver={selectedDriver}
        onActionDone={fetchDrivers}
      />

      <RejectReasonModal
        visible={rejectModalVisible}
        onClose={() => { setRejectModalVisible(false); setPendingRejectDriver(null); }}
        onConfirm={async (reason) => {
          if (pendingRejectDriver) {
            await apiCall(`/api/admin/drivers/${pendingRejectDriver.id}/reject`, "POST", { reason });
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            fetchDrivers();
          }
          setRejectModalVisible(false);
          setPendingRejectDriver(null);
        }}
      />
    </>
  );
}

const rejectStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#00000088", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 6 },
  subtitle: { fontFamily: "Poppins_400Regular", fontSize: 13, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontFamily: "Poppins_400Regular", fontSize: 14, minHeight: 80, marginBottom: 20 },
  btnRow: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
});

const detailStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  headerTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18 },
  profileSection: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  avatarText: { fontFamily: "Poppins_700Bold", fontSize: 26, color: "#0A0A0A" },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  phone: { fontFamily: "Poppins_400Regular", fontSize: 14, marginBottom: 8 },
  kycBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginBottom: 8 },
  kycText: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  rejectionNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8, maxWidth: "90%" },
  rejectionText: { fontFamily: "Poppins_400Regular", fontSize: 12, flex: 1 },
  statsRow: { flexDirection: "row", gap: 20, marginTop: 8 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  infoLabel: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  infoValue: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 12 },
  docsCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20 },
  divider: { height: 1, marginVertical: 6 },
  docRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 6 },
  docDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  docLabel: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  docStatus: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 1 },
  docRejection: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 2, fontStyle: "italic" },
  docAction: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  kycActions: { gap: 10, marginTop: 16, marginBottom: 8 },
  kycBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  kycBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  blockBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  blockText: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, marginBottom: 16 },
  tabBar: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 20, gap: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10 },
  tabLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  tabBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  tabBadgeText: { fontFamily: "Poppins_700Bold", fontSize: 11 },
  emptyCard: { borderRadius: 18, borderWidth: 1, padding: 36, alignItems: "center", gap: 10, marginTop: 20 },
  emptyTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  emptyText: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center" },
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
  cardStats: { flexDirection: "row", gap: 16, marginTop: 2 },
  miniStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  miniStatText: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  docsProgress: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  progressBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  docsStatusText: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  appliedAt: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  kycBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  kycText: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
