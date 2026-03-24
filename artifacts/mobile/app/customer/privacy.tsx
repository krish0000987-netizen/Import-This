import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [shareLocation, setShareLocation] = useState(true);
  const [shareTrip, setShareTrip] = useState(false);
  const [personalisedAds, setPersonalisedAds] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => Alert.alert("Request Submitted", "Your account deletion request has been submitted. Our team will process it within 7 days.") },
      ]
    );
  };

  const handleDownloadData = () => {
    Alert.alert("Download My Data", "We will email a copy of your data to your registered email address within 24 hours.");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Control how Safar Go uses your personal data.
        </Text>

        <Text style={[styles.groupTitle, { color: colors.text }]}>Location & Sharing</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Share Live Location</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Allow driver to see your real-time location during rides</Text>
            </View>
            <Switch value={shareLocation} onValueChange={setShareLocation}
              trackColor={{ false: colors.border, true: Colors.gold + "80" }}
              thumbColor={shareLocation ? Colors.gold : "#f4f3f4"} />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Trip Status Sharing</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Let contacts track your trip in real-time</Text>
            </View>
            <Switch value={shareTrip} onValueChange={setShareTrip}
              trackColor={{ false: colors.border, true: Colors.gold + "80" }}
              thumbColor={shareTrip ? Colors.gold : "#f4f3f4"} />
          </View>
        </View>

        <Text style={[styles.groupTitle, { color: colors.text }]}>Data & Analytics</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Personalised Suggestions</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Use trip history to suggest destinations</Text>
            </View>
            <Switch value={personalisedAds} onValueChange={setPersonalisedAds}
              trackColor={{ false: colors.border, true: Colors.gold + "80" }}
              thumbColor={personalisedAds ? Colors.gold : "#f4f3f4"} />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>App Analytics</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Help us improve by sharing anonymous usage data</Text>
            </View>
            <Switch value={analytics} onValueChange={setAnalytics}
              trackColor={{ false: colors.border, true: Colors.gold + "80" }}
              thumbColor={analytics ? Colors.gold : "#f4f3f4"} />
          </View>
        </View>

        <Text style={[styles.groupTitle, { color: colors.text }]}>Your Data</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Pressable onPress={handleDownloadData} style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={[styles.actionIcon, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="download-outline" size={20} color="#1976D2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Download My Data</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Get a copy of all your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
          <Pressable onPress={handleDeleteAccount} style={styles.row}>
            <View style={[styles.actionIcon, { backgroundColor: "#FBE9E7" }]}>
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: "#E74C3C" }]}>Delete Account</Text>
              <Text style={[styles.rowSub, { color: colors.textSecondary }]}>Permanently remove your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  intro: { fontFamily: "Poppins_400Regular", fontSize: 14, marginBottom: 24, lineHeight: 20 },
  groupTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14, marginBottom: 10 },
  card: { borderRadius: 16, overflow: "hidden", marginBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  rowSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  actionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
});
