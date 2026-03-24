import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { Image } from "expo-image";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "customer") router.replace("/customer");
      else if (user.role === "driver") router.replace("/driver");
      else if (user.role === "admin") router.replace("/admin");
    }
  }, [user, isLoading]);

  if (isLoading) return null;
  if (user) return null;

  const handleGetStarted = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/auth");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0A0A0A", "#1A1510", "#0A0A0A"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.decorCircle, styles.circle1]} />
      <View style={[styles.decorCircle, styles.circle2]} />
      <View style={[styles.decorCircle, styles.circle3]} />

      <View style={[styles.content, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 60, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40 }]}>
        <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.textSection}>
          <Text style={styles.brandName}>Safar Go</Text>
          <Text style={styles.tagline}>PREMIUM TRAVEL{"\n"}EXPERIENCE</Text>
          <Text style={styles.subtitle}>
            Discover India's finest destinations{"\n"}with our luxury car-hire service.{"\n"}Travel in comfort and style.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(800)} style={styles.bottomSection}>
          <View style={styles.featuresRow}>
            <View style={styles.feature}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.gold} />
              <Text style={styles.featureText}>Verified Drivers</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="star" size={22} color={Colors.gold} />
              <Text style={styles.featureText}>Luxury Fleet</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="time" size={22} color={Colors.gold} />
              <Text style={styles.featureText}>24/7 Service</Text>
            </View>
          </View>

          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.getStartedBtn,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={[Colors.gold, Colors.goldDark]}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.btnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#0A0A0A" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: Colors.gold,
    opacity: 0.03,
  },
  circle1: { width: 400, height: 400, top: -100, right: -100 },
  circle2: { width: 300, height: 300, bottom: 100, left: -150 },
  circle3: { width: 200, height: 200, top: height * 0.3, right: -50 },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(197, 165, 90, 0.3)",
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  textSection: {
    alignItems: "center",
    gap: 16,
  },
  brandName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 46,
    color: "#F5F5F5",
    letterSpacing: 2,
  },
  tagline: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    color: Colors.gold,
    letterSpacing: 4,
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },
  bottomSection: {
    alignItems: "center",
    gap: 24,
  },
  getStartedBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  btnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  btnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
    color: "#0A0A0A",
  },
  featuresRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  feature: {
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
});
