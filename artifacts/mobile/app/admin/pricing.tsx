import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@/components/icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { usePricing, DEFAULT_PRICING, type PricingConfig } from "@/contexts/PricingContext";
import * as Haptics from "expo-haptics";

function RateRow({
  label,
  sublabel,
  value,
  onChange,
  min = 5,
  max = 99,
  unit = "₹/km",
  accent,
}: {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  accent?: string;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(text);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    } else {
      setText(String(value));
    }
  };

  const step = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    onChange(next);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.rateRow, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rateLabel, { color: colors.text }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.rateSub, { color: colors.textSecondary }]}>{sublabel}</Text>
        ) : null}
      </View>
      <View style={styles.rateControls}>
        <Pressable
          onPress={() => step(-1)}
          style={[styles.stepBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="remove" size={16} color={colors.text} />
        </Pressable>
        <View style={[styles.rateInputWrap, { backgroundColor: colors.background, borderColor: accent ? accent + "60" : colors.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            onBlur={commit}
            keyboardType="number-pad"
            style={[styles.rateInput, { color: accent || colors.text }]}
            selectTextOnFocus
          />
          <Text style={[styles.rateUnit, { color: colors.textSecondary }]}>{unit}</Text>
        </View>
        <Pressable
          onPress={() => step(1)}
          style={[styles.stepBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="add" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function SampleCalc({ calculateFare }: { calculateFare: (km: number, v: "sedan" | "suv") => number }) {
  const { colors } = useTheme();
  const samples = [
    { km: 5, label: "5 km (city)" },
    { km: 12, label: "12 km (suburb)" },
    { km: 25, label: "25 km (outstation)" },
    { km: 50, label: "50 km (long)" },
    { km: 120, label: "120 km (highway)" },
  ];

  return (
    <View style={[styles.calcCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.calcHeader}>
        <Ionicons name="calculator-outline" size={18} color={Colors.gold} />
        <Text style={[styles.calcTitle, { color: colors.text }]}>Fare Preview</Text>
      </View>
      <View style={[styles.calcTableHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.calcColHdr, { color: colors.textSecondary, flex: 1.4 }]}>Distance</Text>
        <Text style={[styles.calcColHdr, { color: "#3498DB", flex: 1 }]}>Sedan</Text>
        <Text style={[styles.calcColHdr, { color: Colors.gold, flex: 1 }]}>SUV</Text>
      </View>
      {samples.map(({ km, label }, i) => (
        <View
          key={km}
          style={[
            styles.calcRow,
            { borderBottomColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : colors.background + "60" },
          ]}
        >
          <Text style={[styles.calcKm, { color: colors.textSecondary, flex: 1.4 }]}>{label}</Text>
          <Text style={[styles.calcFare, { color: "#3498DB", flex: 1 }]}>₹{calculateFare(km, "sedan").toLocaleString()}</Text>
          <Text style={[styles.calcFare, { color: Colors.gold, flex: 1 }]}>₹{calculateFare(km, "suv").toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PricingSettings() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { config, updateConfig, resetConfig, calculateFare } = usePricing();

  const [draft, setDraft] = useState<PricingConfig>(config);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const set = useCallback(<K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const previewFare = useCallback(
    (km: number, vehicle: "sedan" | "suv") => {
      const { sedanRateUpto10km, sedanRateAfter10km, suvRateUpto10km, suvRateAfter10km, thresholdKm, dynamicPricingEnabled, surgeMultiplier } = draft;
      const baseRate = vehicle === "suv" ? suvRateUpto10km : sedanRateUpto10km;
      const longRate = vehicle === "suv" ? suvRateAfter10km : sedanRateAfter10km;
      let fare: number;
      if (km <= thresholdKm) {
        fare = km * baseRate;
      } else {
        fare = thresholdKm * baseRate + (km - thresholdKm) * longRate;
      }
      if (dynamicPricingEnabled) fare = fare * surgeMultiplier;
      return Math.round(fare);
    },
    [draft]
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfig(draft);
      setIsDirty(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Pricing settings updated successfully. New fares will apply to all upcoming bookings.");
    } catch {
      Alert.alert("Error", "Failed to save pricing settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert("Reset to Defaults", "This will restore all pricing rates to the original defaults. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          setDraft(DEFAULT_PRICING);
          await resetConfig();
          setIsDirty(false);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const paddingBottom = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#0A0A0A", "#0F0F0A"] : ["#FAFAF8", "#F5F3EE"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Pricing Settings</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Control fare rates by distance slab
            </Text>
          </View>
          <Pressable
            onPress={handleReset}
            style={[styles.resetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {isDirty && (
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.unsavedBanner, { backgroundColor: Colors.gold + "18", borderColor: Colors.gold + "40" }]}>
            <Ionicons name="alert-circle-outline" size={15} color={Colors.gold} />
            <Text style={[styles.unsavedText, { color: Colors.gold }]}>Unsaved changes — tap Save to apply</Text>
          </Animated.View>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Slab explainer */}
        <Animated.View entering={FadeInDown.delay(40).duration(400)}>
          <View style={[styles.slabCard, { backgroundColor: "#3498DB12", borderColor: "#3498DB30" }]}>
            <Ionicons name="information-circle-outline" size={18} color="#3498DB" />
            <Text style={[styles.slabInfo, { color: colors.textSecondary }]}>
              Rides up to <Text style={{ color: colors.text, fontFamily: "Poppins_600SemiBold" }}>{draft.thresholdKm} km</Text> are billed at the base rate. 
              Distance beyond <Text style={{ color: colors.text, fontFamily: "Poppins_600SemiBold" }}>{draft.thresholdKm} km</Text> is billed at the lower long-haul rate.
            </Text>
          </View>
        </Animated.View>

        {/* Sedan rates */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SEDAN</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.vehicleBadge, { backgroundColor: "#3498DB15" }]}>
              <Ionicons name="car-outline" size={16} color="#3498DB" />
              <Text style={[styles.vehicleBadgeText, { color: "#3498DB" }]}>4-Seater Sedan</Text>
            </View>
            <RateRow
              label={`Price per km (0–${draft.thresholdKm} km)`}
              sublabel="Base slab rate"
              value={draft.sedanRateUpto10km}
              onChange={(v) => set("sedanRateUpto10km", v)}
              accent="#3498DB"
            />
            <RateRow
              label={`Price per km (after ${draft.thresholdKm} km)`}
              sublabel="Long-haul rate"
              value={draft.sedanRateAfter10km}
              onChange={(v) => set("sedanRateAfter10km", v)}
              accent="#3498DB"
            />
          </View>
        </Animated.View>

        {/* SUV rates */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SUV</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.vehicleBadge, { backgroundColor: Colors.gold + "15" }]}>
              <Ionicons name="car-sport-outline" size={16} color={Colors.gold} />
              <Text style={[styles.vehicleBadgeText, { color: Colors.gold }]}>7-Seater SUV</Text>
            </View>
            <RateRow
              label={`Price per km (0–${draft.thresholdKm} km)`}
              sublabel="Base slab rate"
              value={draft.suvRateUpto10km}
              onChange={(v) => set("suvRateUpto10km", v)}
              accent={Colors.gold}
            />
            <RateRow
              label={`Price per km (after ${draft.thresholdKm} km)`}
              sublabel="Long-haul rate"
              value={draft.suvRateAfter10km}
              onChange={(v) => set("suvRateAfter10km", v)}
              accent={Colors.gold}
            />
          </View>
        </Animated.View>

        {/* Threshold KM */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SLAB THRESHOLD</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <RateRow
              label="Slab boundary (km)"
              sublabel="Base rate applies below this distance, long-haul rate applies above"
              value={draft.thresholdKm}
              onChange={(v) => set("thresholdKm", v)}
              min={5}
              max={50}
              unit="km"
            />
          </View>
        </Animated.View>

        {/* Dynamic pricing */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DYNAMIC PRICING</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Enable Dynamic Pricing</Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                  Applies a surge multiplier during high demand. All fares will be multiplied by the surge factor.
                </Text>
              </View>
              <Switch
                value={draft.dynamicPricingEnabled}
                onValueChange={(v) => {
                  set("dynamicPricingEnabled", v);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                trackColor={{ false: colors.border, true: Colors.gold + "80" }}
                thumbColor={draft.dynamicPricingEnabled ? Colors.gold : colors.textSecondary}
              />
            </View>

            {draft.dynamicPricingEnabled && (
              <Animated.View entering={FadeInDown.duration(250)}>
                <View style={[styles.surgeBox, { backgroundColor: "#E74C3C10", borderColor: "#E74C3C30" }]}>
                  <View style={styles.surgeHeader}>
                    <Ionicons name="trending-up" size={16} color="#E74C3C" />
                    <Text style={[styles.surgeTitle, { color: "#E74C3C" }]}>Surge Multiplier</Text>
                    <View style={[styles.surgePill, { backgroundColor: "#E74C3C20" }]}>
                      <Text style={styles.surgePillText}>{draft.surgeMultiplier.toFixed(1)}×</Text>
                    </View>
                  </View>
                  <Text style={[styles.surgeSub, { color: colors.textSecondary }]}>
                    All fares will be multiplied by this factor when dynamic pricing is active.
                  </Text>
                  <View style={styles.surgeSlabRow}>
                    {[1.0, 1.1, 1.2, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0].map((mult) => (
                      <Pressable
                        key={mult}
                        onPress={() => {
                          set("surgeMultiplier", mult);
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[
                          styles.surgeChip,
                          {
                            backgroundColor: draft.surgeMultiplier === mult ? "#E74C3C" : colors.background,
                            borderColor: draft.surgeMultiplier === mult ? "#E74C3C" : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.surgeChipText, { color: draft.surgeMultiplier === mult ? "#fff" : colors.textSecondary }]}>
                          {mult.toFixed(1)}×
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* Live preview */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FARE PREVIEW (DRAFT)</Text>
          <SampleCalc calculateFare={previewFare} />
        </Animated.View>
      </ScrollView>

      {/* Save bar */}
      <Animated.View
        entering={FadeInUp.delay(100).duration(400)}
        style={[
          styles.saveBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8,
          },
        ]}
      >
        <View style={styles.currentRatePills}>
          <View style={[styles.ratePill, { backgroundColor: "#3498DB15", borderColor: "#3498DB30" }]}>
            <Ionicons name="car-outline" size={12} color="#3498DB" />
            <Text style={[styles.ratePillText, { color: "#3498DB" }]}>
              Sedan ₹{draft.sedanRateUpto10km}/₹{draft.sedanRateAfter10km} per km
            </Text>
          </View>
          <View style={[styles.ratePill, { backgroundColor: Colors.gold + "15", borderColor: Colors.gold + "30" }]}>
            <Ionicons name="car-sport-outline" size={12} color={Colors.gold} />
            <Text style={[styles.ratePillText, { color: Colors.gold }]}>
              SUV ₹{draft.suvRateUpto10km}/₹{draft.suvRateAfter10km} per km
            </Text>
          </View>
          {draft.dynamicPricingEnabled && (
            <View style={[styles.ratePill, { backgroundColor: "#E74C3C15", borderColor: "#E74C3C30" }]}>
              <Ionicons name="trending-up" size={12} color="#E74C3C" />
              <Text style={[styles.ratePillText, { color: "#E74C3C" }]}>Surge {draft.surgeMultiplier.toFixed(1)}×</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={handleSave}
          disabled={isSaving || !isDirty}
          style={[styles.saveBtn, { opacity: !isDirty ? 0.5 : 1 }]}
        >
          <LinearGradient
            colors={[Colors.gold, Colors.goldDark]}
            style={styles.saveBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name={isSaving ? "hourglass-outline" : "checkmark-circle-outline"} size={20} color="#0A0A0A" />
            <Text style={styles.saveBtnText}>{isSaving ? "Saving…" : "Save Changes"}</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0,
    gap: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontFamily: "Poppins_700Bold", fontSize: 20 },
  headerSub: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  resetBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  unsavedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  unsavedText: { fontFamily: "Poppins_500Medium", fontSize: 13 },

  sectionLabel: {
    fontFamily: "Poppins_500Medium", fontSize: 11,
    letterSpacing: 0.6, textTransform: "uppercase",
    marginBottom: 8, marginTop: 20,
  },
  card: {
    borderRadius: 16, borderWidth: 1,
    overflow: "hidden",
  },
  vehicleBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  vehicleBadgeText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },

  rateRow: {
    flexDirection: "row", alignItems: "center",
    gap: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rateLabel: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  rateSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  rateControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  rateInputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    minWidth: 80,
  },
  rateInput: {
    fontFamily: "Poppins_700Bold", fontSize: 18,
    textAlign: "center", minWidth: 32,
  },
  rateUnit: { fontFamily: "Poppins_400Regular", fontSize: 11, marginLeft: 4 },

  slabCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 4,
  },
  slabInfo: { fontFamily: "Poppins_400Regular", fontSize: 13, flex: 1, lineHeight: 20 },

  toggleRow: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 16, padding: 16,
  },
  toggleLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  toggleSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 3, lineHeight: 18 },

  surgeBox: {
    margin: 12, borderRadius: 12, borderWidth: 1, padding: 14, gap: 10,
  },
  surgeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  surgeTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14, flex: 1 },
  surgePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  surgePillText: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#E74C3C" },
  surgeSub: { fontFamily: "Poppins_400Regular", fontSize: 12 },
  surgeSlabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  surgeChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  surgeChipText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },

  calcCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  calcHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, paddingBottom: 10,
  },
  calcTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 15 },
  calcTableHeader: {
    flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  calcColHdr: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  calcRow: {
    flexDirection: "row", paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1,
  },
  calcKm: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  calcFare: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },

  saveBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16, borderTopWidth: 1, gap: 12,
  },
  currentRatePills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ratePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
  },
  ratePillText: { fontFamily: "Poppins_500Medium", fontSize: 11 },
  saveBtn: { borderRadius: 14, overflow: "hidden" },
  saveBtnGradient: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10, paddingVertical: 16,
  },
  saveBtnText: { fontFamily: "Poppins_700Bold", fontSize: 16, color: "#0A0A0A" },
});
