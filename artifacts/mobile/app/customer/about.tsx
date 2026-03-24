import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

const APP_VERSION = "1.0.0";

const links = [
  { label: "Privacy Policy", icon: "shield-outline", url: "https://safargo.in/privacy" },
  { label: "Terms of Service", icon: "document-text-outline", route: "/terms" },
  { label: "Open Source Licenses", icon: "code-slash-outline", url: "https://safargo.in/licenses" },
];

const team = [
  { name: "Safar Go Team", role: "Product & Engineering" },
  { name: "Lucknow Operations", role: "Driver Relations" },
  { name: "Customer Support", role: "24 × 7 Assistance" },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={[styles.logoCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.logoCircle, { backgroundColor: Colors.gold }]}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>
            Safar <Text style={{ color: Colors.gold }}>Go</Text>
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Premium Luxury Travel · Uttar Pradesh
          </Text>
          <View style={[styles.versionBadge, { borderColor: colors.border }]}>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version {APP_VERSION}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Our Mission</Text>
        <View style={[styles.missionCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.missionText, { color: colors.textSecondary }]}>
            Safar Go connects travellers across Uttar Pradesh's most sacred and historic cities — Ayodhya, Varanasi, Agra, Mathura, Lucknow, and Prayagraj — with professional, verified drivers and a luxury fleet of Sedans and SUVs.{"\n\n"}
            We are committed to making inter-city travel safe, comfortable, and transparent for every passenger.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Meet the Team</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {team.map((member, i) => (
            <View
              key={i}
              style={[
                styles.teamRow,
                i < team.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.teamAvatar, { backgroundColor: Colors.gold + "20" }]}>
                <Ionicons name="person" size={18} color={Colors.gold} />
              </View>
              <View>
                <Text style={[styles.teamName, { color: colors.text }]}>{member.name}</Text>
                <Text style={[styles.teamRole, { color: colors.textSecondary }]}>{member.role}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Legal & Links</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {links.map((link, i) => (
            <Pressable
              key={i}
              onPress={() => {
                if (link.route) router.push(link.route as any);
                else if (link.url) Linking.openURL(link.url);
              }}
              style={({ pressed }) => [
                styles.linkRow,
                i < links.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name={link.icon as any} size={20} color={Colors.gold} />
              <Text style={[styles.linkLabel, { color: colors.text }]}>{link.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <Text style={[styles.copyright, { color: colors.textTertiary }]}>
          © {new Date().getFullYear()} Safar Go. All rights reserved.{"\n"}Made with ❤️ in Lucknow, India
        </Text>
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
  logoCard: { alignItems: "center", padding: 28, borderRadius: 20, marginBottom: 24 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  logoLetter: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 36, color: "#0A0A0A" },
  appName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, marginBottom: 4 },
  tagline: { fontFamily: "Poppins_400Regular", fontSize: 13, textAlign: "center", marginBottom: 12 },
  versionBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  versionText: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  sectionTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, marginBottom: 12 },
  missionCard: { borderRadius: 16, padding: 18, marginBottom: 24 },
  missionText: { fontFamily: "Poppins_400Regular", fontSize: 14, lineHeight: 22 },
  card: { borderRadius: 16, overflow: "hidden", marginBottom: 24 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  teamAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  teamName: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  teamRole: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  linkLabel: { fontFamily: "Poppins_500Medium", fontSize: 14, flex: 1 },
  copyright: { fontFamily: "Poppins_400Regular", fontSize: 12, textAlign: "center", lineHeight: 18 },
});
