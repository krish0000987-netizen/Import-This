import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { destinations } from "@/constants/data";

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [favorites, setFavorites] = useState<string[]>(["1", "2", "4"]);

  const favoriteDestinations = destinations.filter((d) => favorites.includes(d.id));

  const toggleFavorite = (id: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Favorites</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {favoriteDestinations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={56} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Favorites Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Save destinations you love by tapping the heart icon.
            </Text>
            <Pressable
              onPress={() => router.push("/customer/destinations")}
              style={styles.exploreBtn}
            >
              <Text style={styles.exploreBtnText}>Explore Destinations</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {favoriteDestinations.length} saved destination{favoriteDestinations.length !== 1 ? "s" : ""}
            </Text>
            {favoriteDestinations.map((dest) => (
              <Pressable
                key={dest.id}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/destination/[id]", params: { id: dest.id } });
                }}
                style={({ pressed }) => [styles.destCard, { opacity: pressed ? 0.95 : 1 }]}
              >
                <Image source={dest.image} style={styles.destImage} contentFit="cover" />
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.gradient} />
                <View style={styles.destInfo}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.destName}>{dest.name}</Text>
                    <Text style={styles.destTagline}>{dest.tagline}</Text>
                    <Text style={styles.destPrice}>
                      from \u20B9{dest.basePrice.toLocaleString()} · {dest.distance}
                    </Text>
                  </View>
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); toggleFavorite(dest.id); }}
                    style={styles.heartBtn}
                  >
                    <Ionicons name="heart" size={22} color="#E91E63" />
                  </Pressable>
                </View>
              </Pressable>
            ))}

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 24 }]}>
              More Destinations
            </Text>
            {destinations.filter((d) => !favorites.includes(d.id)).map((dest) => (
              <Pressable
                key={dest.id}
                onPress={() => router.push({ pathname: "/destination/[id]", params: { id: dest.id } })}
                style={[styles.listRow, { backgroundColor: colors.surface }]}
              >
                <Image source={dest.image} style={styles.listThumb} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listName, { color: colors.text }]}>{dest.name}</Text>
                  <Text style={[styles.listSub, { color: colors.textSecondary }]}>
                    from \u20B9{dest.basePrice.toLocaleString()} · {dest.distance}
                  </Text>
                </View>
                <Pressable onPress={() => toggleFavorite(dest.id)} style={styles.heartBtn}>
                  <Ionicons name="heart-outline" size={22} color={colors.textTertiary} />
                </Pressable>
              </Pressable>
            ))}
          </>
        )}
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
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 18 },
  emptySub: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
  exploreBtn: {
    backgroundColor: Colors.gold, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, marginTop: 8,
  },
  exploreBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 15, color: "#0A0A0A" },
  sectionLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  destCard: { height: 160, borderRadius: 16, overflow: "hidden", marginBottom: 14, position: "relative" },
  destImage: { ...StyleSheet.absoluteFillObject },
  gradient: { ...StyleSheet.absoluteFillObject },
  destInfo: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 14, flexDirection: "row", alignItems: "flex-end",
  },
  destName: { fontFamily: "Poppins_600SemiBold", fontSize: 18, color: "#fff" },
  destTagline: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)" },
  destPrice: { fontFamily: "Poppins_500Medium", fontSize: 12, color: Colors.gold, marginTop: 2 },
  heartBtn: { padding: 6 },
  listRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 14, marginBottom: 8,
  },
  listThumb: { width: 52, height: 52, borderRadius: 10 },
  listName: { fontFamily: "Poppins_500Medium", fontSize: 15 },
  listSub: { fontFamily: "Poppins_400Regular", fontSize: 13, marginTop: 2 },
});
