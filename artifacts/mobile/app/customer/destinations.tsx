import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useData } from "@/contexts/DataContext";
import { destinations, Destination } from "@/constants/data";

const { width } = Dimensions.get("window");

function DestListItem({ item, index }: { item: Destination; index: number }) {
  const { colors } = useTheme();
  const { toggleFavorite, isFavorite } = useData();
  const fav = isFavorite(item.id);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/destination/[id]", params: { id: item.id } });
        }}
        style={({ pressed }) => [
          styles.listCard,
          { backgroundColor: colors.surface, opacity: pressed ? 0.95 : 1 },
        ]}
      >
        <Image source={item.image} style={styles.listImage} contentFit="cover" />
        <View style={styles.listInfo}>
          <Text style={[styles.listName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.listTagline, { color: colors.textSecondary }]}>{item.tagline}</Text>
          <View style={styles.listMeta}>
            <View style={styles.listRating}>
              <Ionicons name="star" size={12} color={Colors.gold} />
              <Text style={[styles.listRatingText, { color: colors.text }]}>{item.rating}</Text>
              <Text style={[styles.listReviews, { color: colors.textTertiary }]}>({item.reviewCount})</Text>
            </View>
            <Text style={[styles.listDistance, { color: colors.textSecondary }]}>{item.distance}</Text>
          </View>
          <View style={styles.listBottom}>
            <Text style={styles.listPrice}>{"\u20B9"}{item.basePrice.toLocaleString()}</Text>
            <Text style={[styles.listDuration, { color: colors.textSecondary }]}>{item.duration}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleFavorite(item.id);
          }}
          style={styles.favBtn}
        >
          <Ionicons name={fav ? "heart" : "heart-outline"} size={20} color={fav ? "#E91E63" : colors.textTertiary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export default function DestinationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={destinations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: 100,
          paddingHorizontal: 20,
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.title, { color: colors.text }]}>Tour Packages</Text>
        }
        renderItem={({ item, index }) => <DestListItem item={item} index={index} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 32, marginBottom: 20 },
  listCard: {
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  listImage: { width: 110, height: 120 },
  listInfo: { flex: 1, padding: 12, gap: 2 },
  listName: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  listTagline: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  listMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  listRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  listRatingText: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  listReviews: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  listDistance: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  listBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, alignItems: "center" },
  listPrice: { fontFamily: "Poppins_700Bold", fontSize: 16, color: Colors.gold },
  listDuration: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  favBtn: { position: "absolute", top: 10, right: 10 },
});
