import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useData } from "@/contexts/DataContext";
import { destinations } from "@/constants/data";

const { width } = Dimensions.get("window");

export default function DestinationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { toggleFavorite, isFavorite } = useData();

  const destination = destinations.find((d) => d.id === id);
  if (!destination) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.text }}>Destination not found</Text>
      </View>
    );
  }

  const fav = isFavorite(destination.id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.imageSection}>
          <Image source={destination.image} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "transparent", "transparent", "rgba(0,0,0,0.7)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
            <Pressable
              onPress={() => router.back()}
              style={styles.iconBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleFavorite(destination.id);
              }}
              style={styles.iconBtn}
            >
              <Ionicons name={fav ? "heart" : "heart-outline"} size={22} color={fav ? "#E74C3C" : "#FFF"} />
            </Pressable>
          </View>
          <View style={styles.heroOverlay}>
            <Text style={styles.heroName}>{destination.name}</Text>
            <Text style={styles.heroTagline}>{destination.tagline}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 120 }}>
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.metaRow}>
            <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="navigate-outline" size={18} color={Colors.gold} />
              <Text style={[styles.metaValue, { color: colors.text }]}>{destination.distance}</Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Distance</Text>
            </View>
            <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={18} color={Colors.gold} />
              <Text style={[styles.metaValue, { color: colors.text }]}>{destination.duration}</Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Duration</Text>
            </View>
            <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="star" size={18} color={Colors.gold} />
              <Text style={[styles.metaValue, { color: colors.text }]}>{destination.rating}</Text>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>{destination.reviewCount} reviews</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {destination.description}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Highlights</Text>
            <View style={styles.highlightsGrid}>
              {destination.highlights.map((h, i) => (
                <View
                  key={i}
                  style={[styles.highlightChip, { backgroundColor: Colors.gold + "15", borderColor: Colors.gold + "30" }]}
                >
                  <Ionicons name="flag-outline" size={14} color={Colors.gold} />
                  <Text style={[styles.highlightText, { color: colors.text }]}>{h}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

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
        <View>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Starting from ({"\u20B9"}{destination.pricePerKm}/km)</Text>
          <Text style={styles.price}>{"\u20B9"}{destination.basePrice.toLocaleString()}</Text>
        </View>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({ pathname: "/booking/create", params: { destinationId: destination.id } });
          }}
          style={({ pressed }) => [
            styles.bookBtn,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <LinearGradient
            colors={[Colors.gold, Colors.goldDark]}
            style={styles.bookBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.bookBtnText}>Book Now</Text>
            <Ionicons name="arrow-forward" size={18} color="#0A0A0A" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageSection: { width, height: 340, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: { position: "absolute", bottom: 20, left: 20 },
  heroName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 34, color: "#FFF" },
  heroTagline: { fontFamily: "Poppins_400Regular", fontSize: 15, color: "rgba(255,255,255,0.8)" },
  metaRow: { flexDirection: "row", gap: 10, marginVertical: 20 },
  metaCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  metaValue: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  metaLabel: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 12, marginTop: 20 },
  description: { fontFamily: "Poppins_400Regular", fontSize: 14, lineHeight: 24 },
  highlightsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  highlightChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  highlightText: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  priceLabel: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  price: { fontFamily: "Poppins_700Bold", fontSize: 24, color: Colors.gold },
  bookBtn: { borderRadius: 14, overflow: "hidden" },
  bookBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  bookBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#0A0A0A" },
});
