import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

type AuthMode = "login" | "register";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const { colors, isDark } = useTheme();

  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  const bg = isDark ? "#0A0A0A" : "#FAFAF8";
  const inputBg = isDark ? "#1A1A1A" : "#F0EDE6";
  const borderColor = isDark ? "#2a2a2a" : "#E8E3DA";
  const textColor = colors.text;
  const secondaryText = colors.textSecondary;
  const placeholder = isDark ? "#555" : "#B0A89E";

  const switchMode = (next: AuthMode) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(next);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setAcceptedTerms(false);
    setShowPassword(false);
  };

  const handleLogin = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim(), password, "customer");
      if (result) {
        if (result === "admin") router.replace("/admin");
        else if (result === "driver") router.replace("/driver");
        else router.replace("/customer");
      } else {
        Alert.alert(
          "Login Failed",
          "No account found with those credentials. Please register or check your details and try again."
        );
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    if (!acceptedTerms) {
      Alert.alert("Terms Required", "Please accept the Terms & Conditions to create an account.");
      return;
    }
    setLoading(true);
    try {
      const success = await register(name.trim(), email.trim(), phone.trim(), password, "customer");
      if (success) {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/customer");
      } else {
        Alert.alert("Registration Failed", "An account with this email may already exist.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12,
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: Colors.gold + "18" }]}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.gold} />
          </Pressable>

          {/* Logo */}
          <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.logoSection}>
            <View style={styles.logoBox}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
          </Animated.View>

          {mode === "login" ? (
            /* ═══════════════════ LOGIN VIEW ═══════════════════ */
            <>
              <Animated.View entering={FadeInDown.delay(120).duration(500)}>
                <Text style={[styles.title, { color: textColor }]}>Welcome Back</Text>
                <Text style={[styles.subtitle, { color: secondaryText }]}>
                  Sign in to continue your journey
                </Text>
              </Animated.View>

              {/* ── Dev Quick Login ── */}
              <Animated.View entering={FadeInDown.delay(135).duration(400)}>
                <View style={[styles.devPanel, { backgroundColor: isDark ? "#111100" : "#FFFBEC", borderColor: Colors.gold + "30" }]}>
                  <View style={styles.devPanelHeader}>
                    <Ionicons name="code-slash-outline" size={13} color={Colors.gold} />
                    <Text style={[styles.devPanelTitle, { color: Colors.gold }]}>Dev Quick Login</Text>
                  </View>
                  <View style={styles.devChipsRow}>
                    {[
                      { label: "Admin", icon: "shield-outline", email: "admin@safargo.com" },
                      { label: "Driver", icon: "car-outline", email: "driver@safargo.com" },
                      { label: "Customer", icon: "person-outline", email: "customer@safargo.com" },
                    ].map((acc) => (
                      <Pressable
                        key={acc.email}
                        onPress={() => {
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setEmail(acc.email);
                          setPassword("demo1234");
                        }}
                        style={({ pressed }) => [
                          styles.devChip,
                          {
                            backgroundColor: email === acc.email
                              ? Colors.gold + "22"
                              : isDark ? "#1A1A00" : "#FFF8DC",
                            borderColor: email === acc.email ? Colors.gold : Colors.gold + "30",
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Ionicons name={acc.icon as any} size={13} color={Colors.gold} />
                        <Text style={[styles.devChipText, { color: Colors.gold }]}>{acc.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={[styles.devNote, { color: secondaryText }]}>
                    Tap a role above to auto-fill credentials, then press Sign In
                  </Text>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Email / Username</Text>
                <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor }]}>
                  <Ionicons name="at" size={18} color={secondaryText} />
                  <TextInput
                    ref={emailRef}
                    style={[styles.input, { color: textColor }]}
                    placeholder="Enter your email"
                    placeholderTextColor={placeholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Password</Text>
                <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={secondaryText} />
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, { color: textColor, flex: 1 }]}
                    placeholder="Enter your password"
                    placeholderTextColor={placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={secondaryText}
                    />
                  </Pressable>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(240).duration(500)}>
                <Pressable
                  onPress={handleLogin}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { opacity: pressed || loading ? 0.88 : 1 },
                  ]}
                >
                  <LinearGradient
                    colors={[Colors.gold, Colors.goldDark]}
                    style={styles.primaryBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#0A0A0A" />
                    ) : (
                      <>
                        <Ionicons name="log-in-outline" size={20} color="#0A0A0A" />
                        <Text style={styles.primaryBtnText}>Sign In</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.switchRow}>
                <Text style={[styles.switchText, { color: secondaryText }]}>
                  Don't have an account?{" "}
                </Text>
                <Pressable onPress={() => switchMode("register")}>
                  <Text style={styles.switchLink}>Sign Up</Text>
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(320).duration(500)}>
                <Pressable onPress={() => router.push("/terms")} style={styles.termsLink}>
                  <Text style={[styles.termsLinkText, { color: secondaryText }]}>
                    By continuing, you agree to our{" "}
                    <Text style={{ color: Colors.gold, fontFamily: "Poppins_500Medium" }}>
                      Terms & Conditions
                    </Text>
                  </Text>
                </Pressable>
              </Animated.View>
            </>
          ) : (
            /* ═══════════════════ REGISTER VIEW ═══════════════════ */
            <>
              <Animated.View entering={FadeInDown.delay(120).duration(500)}>
                <Text style={[styles.title, { color: textColor }]}>Create Account</Text>
                <Text style={[styles.subtitle, { color: secondaryText }]}>
                  Join Safar Go for premium travel
                </Text>
              </Animated.View>

              {/* Full Name */}
              <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Full Name</Text>
                <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor }]}>
                  <Ionicons name="person-outline" size={18} color={secondaryText} />
                  <TextInput
                    ref={nameRef}
                    style={[styles.input, { color: textColor }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={placeholder}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </View>
              </Animated.View>

              {/* Email */}
              <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Email Address</Text>
                <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor }]}>
                  <Ionicons name="mail-outline" size={18} color={secondaryText} />
                  <TextInput
                    ref={emailRef}
                    style={[styles.input, { color: textColor }]}
                    placeholder="Enter your email"
                    placeholderTextColor={placeholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                  />
                </View>
              </Animated.View>

              {/* Phone */}
              <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Phone Number</Text>
                <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor }]}>
                  <Ionicons name="call-outline" size={18} color={secondaryText} />
                  <TextInput
                    ref={phoneRef}
                    style={[styles.input, { color: textColor }]}
                    placeholder="+91 XXXXX XXXXX"
                    placeholderTextColor={placeholder}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </Animated.View>

              {/* Password */}
              <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: textColor }]}>Password</Text>
                <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={secondaryText} />
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, { color: textColor, flex: 1 }]}
                    placeholder="Create a password"
                    placeholderTextColor={placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={secondaryText}
                    />
                  </Pressable>
                </View>
              </Animated.View>

              {/* Terms checkbox */}
              <Animated.View entering={FadeInDown.delay(320).duration(500)}>
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAcceptedTerms(!acceptedTerms);
                  }}
                  style={styles.termsRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: acceptedTerms ? Colors.gold : secondaryText,
                        backgroundColor: acceptedTerms ? Colors.gold : "transparent",
                      },
                    ]}
                  >
                    {acceptedTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text style={[styles.termsText, { color: secondaryText }]}>
                    I agree to the{" "}
                    <Text
                      style={{ color: Colors.gold, fontFamily: "Poppins_500Medium" }}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push("/terms");
                      }}
                    >
                      Terms & Conditions
                    </Text>
                  </Text>
                </Pressable>
              </Animated.View>

              {/* Create Account button */}
              <Animated.View entering={FadeInDown.delay(360).duration(500)}>
                <Pressable
                  onPress={handleRegister}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { opacity: pressed || loading ? 0.88 : 1 },
                  ]}
                >
                  <LinearGradient
                    colors={[Colors.gold, Colors.goldDark]}
                    style={styles.primaryBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#0A0A0A" />
                    ) : (
                      <>
                        <Ionicons name="person-add-outline" size={20} color="#0A0A0A" />
                        <Text style={styles.primaryBtnText}>Create Account</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              {/* Sign in link */}
              <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.switchRow}>
                <Text style={[styles.switchText, { color: secondaryText }]}>
                  Already have an account?{" "}
                </Text>
                <Pressable onPress={() => switchMode("login")}>
                  <Text style={styles.switchLink}>Sign In</Text>
                </Pressable>
              </Animated.View>

              {/* Divider */}
              <Animated.View entering={FadeInUp.delay(440).duration(500)} style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                <Text style={[styles.dividerText, { color: secondaryText }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
              </Animated.View>

              {/* Driver CTA */}
              <Animated.View entering={FadeInUp.delay(480).duration(500)} style={styles.driverCta}>
                <Text style={[styles.driverCtaHint, { color: secondaryText }]}>
                  Want to earn with us?
                </Text>
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/driver-register");
                  }}
                  style={({ pressed }) => [
                    styles.driverBtn,
                    {
                      borderColor: Colors.gold + "60",
                      backgroundColor: Colors.gold + (isDark ? "10" : "08"),
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[Colors.gold + "25", Colors.gold + "08"]}
                    style={styles.driverBtnInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View style={[styles.driverIconWrap, { backgroundColor: Colors.gold + "20" }]}>
                      <Ionicons name="car-sport" size={18} color={Colors.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverBtnTitle}>Become a Driver</Text>
                      <Text style={[styles.driverBtnSub, { color: secondaryText }]}>
                        Flexible hours · Weekly payouts
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={Colors.gold} />
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 28 },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  logoSection: { alignItems: "center", marginBottom: 24 },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#0A0A0A",
  },
  logoImage: { width: 100, height: 100 },

  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 28,
  },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 13, marginBottom: 8 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    padding: 0,
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  termsText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },

  primaryBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  primaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
    color: "#0A0A0A",
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 4,
  },
  switchText: { fontFamily: "Poppins_400Regular", fontSize: 14 },
  switchLink: { fontFamily: "Poppins_600SemiBold", fontSize: 14, color: Colors.gold },

  termsLink: { marginTop: 16, alignItems: "center" },
  termsLinkText: { fontFamily: "Poppins_400Regular", fontSize: 12, textAlign: "center" },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: "Poppins_400Regular", fontSize: 13 },

  driverCta: { gap: 12, alignItems: "center" },
  driverCtaHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
  },
  driverBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    width: "100%",
  },
  driverBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  driverIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  driverBtnTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: Colors.gold,
  },
  driverBtnSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginTop: 2,
  },

  devPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  devPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  devPanelTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  devChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  devChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  devChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },
  devNote: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    textAlign: "center",
    opacity: 0.7,
  },
});
