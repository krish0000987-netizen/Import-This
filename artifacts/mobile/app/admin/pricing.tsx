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
  last = false,
}: {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  accent?: string;
  last?: boolean;
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
    <View style={[styles.rateRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={styles.rateRowTop}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[styles.rateLabel, { color: colors.text }]}>{label}</Text>
          {sublabel ? (
            <Text style={[styles.rateSub, { color: colors.textSecondary }]}>{sublabel}</Text>
          ) : null}
        </View>
        <View style={styles.rateControls}>
          <Pressable
            onPress={() => step(-1)}
            style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Ionicons name="remove" size={16} color={colors.text} />
          </Pressable>
          <View style={[styles.rateInputWrap, { backgroundColor: colors.surface, borderColor: accent ? accent + "60" : colors.border }]}>
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
            style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Ionicons name="add" size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SampleCalc({ calculateFare }: { calculateFare: (km: number, v: "sedan" | "suv") => number }) {
  const { colors } = useTheme();
  const samples = [
    { km: 5, label: "5 km" },
    { km: 12, label: "12 km" },
    { km: 25, label: "25 km" },
    { km: 50, label: "50 km" },
    { km: 120, label: "120 km" },
  ];

  return (
    <View style={[styles.calcCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.calcHeader}>
        <Ionicons name="receipt-outline" size={16} color={Colors.gold} />
        <Text style={[styles.calcTitle, { color: colors.text }]}>Live Fare Preview</Text>
      </View>
      <View style={[styles.calcTableHeader, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[styles.calcColHdr, { color: colors.textSecondary, flex: 2 }]}>Distance</Text>
        <Text style={[styles.calcColHdr, { color: "#3498DB", flex: 1, textAlign: "right" }]}>Sedan</Text>
        <Text style={[styles.calcColHdr, { color: Colors.gold, flex: 1, textAlign: "right" }]}>SUV</Text>
      </View>
      {samples.map(({ km, label }, i) => (
        <View
          key={km}
          style={[
            styles.calcRow,
            { borderBottomColor: colors.border, backgroundColor: i % 2 === 0 ? "transparent" : (colors.background + "80") },
            i === samples.length - 1 && { borderBottomWidth: 0 },
          ]}
        >
          <Text style={[styles.calcKm, { color: colors.textSecondary, flex: 2 }]}>{label}</Text>
          <Text style={[styles.calcFare, { color: "#3498DB", flex: 1, textAlign: "right" }]}>₹{calculateFare(km, "sedan").toLocaleString()}</Text>
          <Text style={[styles.calcFare, { color: Colors.gold, flex: 1, textAlign: "right" }]}>₹{calculateFare(km, "suv").toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PricingSettings() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { config, updateConfig, resetConfig } = usePricing();

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
      Alert.alert("Saved", "Pricing settings updated. New fares apply to all upcoming bookings.");
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert("Reset to Defaults", "Restore all rates to original defaults?", [
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

  const saveBarHeight = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 72;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.iconBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Pricing Settings</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Fare rates by distance slab</Text>
          </View>
          <Pressable
            onPress={handleReset}
            style={[styles.iconBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {isDirty && (
          <Animated.View entering={FadeInDown.duration(250)} style={[styles.unsavedBanner, { backgroundColor: Colors.gold + "15", borderColor: Colors.gold + "35" }]}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.gold} />
            <Text style={[styles.unsavedText, { color: Colors.gold }]}>Unsaved changes — tap Save to apply</Text>
          </Animated.View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: saveBarHeight + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <Animated.View entering={FadeInDown.delay(40).duration(400)}>
          <View style={[styles.infoBanner, { backgroundColor: "#3498DB10", borderColor: "#3498DB25" }]}>
            <Ionicons name="information-circle-outline" size={16} color="#3498DB" />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Rides up to{" "}
              <Text style={{ color: colors.text, fontFamily: "Poppins_600SemiBold" }}>{draft.thresholdKm} km</Text>
              {" "}use the base rate. Beyond that, the long-haul (discounted) rate applies.
            </Text>
          </View>
        </Animated.View>

        {/* Sedan rates */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SEDAN RATES</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.vehicleHeader, { borderBottomColor: colors.border, backgroundColor: "#3498DB08" }]}>
              <Ionicons name="car-outline" size={15} color="#3498DB" />
              <Text style={[styles.vehicleTitle, { color: "#3498DB" }]}>4-Seater Sedan</Text>
            </View>
            <RateRow
              label={`Base rate (0–${draft.thresholdKm} km)`}
              sublabel="Charged per km for short trips"
              value={draft.sedanRateUpto10km}
              onChange={(v) => set("sedanRateUpto10km", v)}
              accent="#3498DB"
            />
            <RateRow
              label={`Long-haul (>${draft.thresholdKm} km)`}
              sublabel="Discounted rate for long trips"
              value={draft.sedanRateAfter10km}
              onChange={(v) => set("sedanRateAfter10km", v)}
              accent="#3498DB"
              last
            />
          </View>
        </Animated.View>

        {/* SUV rates */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SUV RATES</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.vehicleHeader, { borderBottomColor: colors.border, backgroundColor: Colors.gold + "08" }]}>
              <Ionicons name="car-sport-outline" size={15} color={Colors.gold} />
              <Text style={[styles.vehicleTitle, { color: Colors.gold }]}>7-Seater SUV</Text>
            </View>
            <RateRow
              label={`Base rate (0–${draft.thresholdKm} km)`}
              sublabel="Charged per km for short trips"
              value={draft.suvRateUpto10km}
              onChange={(v) => set("suvRateUpto10km", v)}
              accent={Colors.gold}
            />
            <RateRow
              label={`Long-haul (>${draft.thresholdKm} km)`}
              sublabel="Discounted rate for long trips"
              value={draft.suvRateAfter10km}
              onChange={(v) => set("suvRateAfter10km", v)}
              accent={Colors.gold}
              last
            />
          </View>
        </Animated.View>

        {/* Slab threshold */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SLAB THRESHOLD</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.thresholdRow}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={[styles.thresholdLabel, { color: colors.text }]}>Boundary distance</Text>
                <Text style={[styles.thresholdSub, { color: colors.textSecondary }]}>
                  Base rate below, long-haul rate above this
                </Text>
              </View>
              <View style={styles.thresholdControls}>
                <Pressable
                  onPress={() => set("thresholdKm", Math.max(5, draft.thresholdKm - 1))}
                  style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </Pressable>
                <View style={[styles.thresholdInput, { backgroundColor: colors.background, borderColor: Colors.gold + "50" }]}>
                  <Text style={[styles.thresholdValue, { color: Colors.gold }]}>{draft.thresholdKm}</Text>
                  <Text style={[styles.thresholdUnit, { color: colors.textSecondary }]}>km</Text>
                </View>
                <Pressable
                  onPress={() => set("thresholdKm", Math.min(50, draft.thresholdKm + 1))}
                  style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Dynamic pricing */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DYNAMIC PRICING</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Enable Dynamic Pricing</Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                  Surge multiplier during peak demand
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
                <View style={[styles.surgeBox, { backgroundColor: "#E74C3C08", borderColor: "#E74C3C25" }]}>
                  <View style={styles.surgeHeaderRow}>
                    <Ionicons name="trending-up" size={15} color="#E74C3C" />
                    <Text style={[styles.surgeTitle, { color: "#E74C3C" }]}>Surge Multiplier</Text>
                    <View style={[styles.surgePill, { backgroundColor: "#E74C3C18" }]}>
                      <Text style={styles.surgePillText}>{draft.surgeMultiplier.toFixed(1)}×</Text>
                    </View>
                  </View>
                  <Text style={[styles.surgeSub, { color: colors.textSecondary }]}>
                    All fares multiplied by this factor when surge is active
                  </Text>
                  <View style={styles.surgeChips}>
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

        {/* Fare preview */}
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
        <View style={styles.saveBarInner}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.saveBarLabel, { color: colors.textSecondary }]}>Current rates</Text>
            <Text style={[styles.saveBarRates, { color: colors.text }]}>
              Sedan ₹{draft.sedanRateUpto10km}/₹{draft.sedanRateAfter10km} · SUV ₹{draft.suvRateUpto10km}/₹{draft.suvRateAfter10km} per km
            </Text>
          </View>
          <Pressable
            onPress={handleSave}
            disabled={isSaving || !isDirty}
            style={{ opacity: !isDirty ? 0.45 : 1, borderRadius: 14, overflow: "hidden" }}
          >
            <LinearGradient
              colors={[Colors.gold, Colors.goldDark]}
              style={styles.saveBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name={isSaving ? "time-outline" : "checkmark-circle-outline"} size={18} color="#0A0A0A" />
              <Text style={styles.saveBtnText}>{isSaving ? "Saving…" : "Save"}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontFamily: "Poppins_700Bold", fontSize: 19 },
  headerSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 1 },
  unsavedBanner: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, marginTop: 12,
  },
  unsavedText: { fontFamily: "Poppins_500Medium", fontSize: 12, marginLeft: 8, flex: 1 },

  sectionLabel: {
    fontFamily: "Poppins_500Medium", fontSize: 11,
    letterSpacing: 0.5, textTransform: "uppercase",
    marginBottom: 8, marginTop: 20,
  },

  infoBanner: {
    flexDirection: "row", alignItems: "flex-start",
    borderRadius: 12, borderWidth: 1, padding: 12,
    marginTop: 12,
  },
  infoText: { fontFamily: "Poppins_400Regular", fontSize: 12, flex: 1, lineHeight: 18, marginLeft: 8 },

  card: {
    borderRadius: 16, borderWidth: 1,
    overflow: "hidden",
  },
  vehicleHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  vehicleTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 13, marginLeft: 8 },

  rateRow: {
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rateRowTop: {
    flexDirection: "row", alignItems: "center",
  },
  rateLabel: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  rateSub: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 2 },
  rateControls: { flexDirection: "row", alignItems: "center" },
  stepBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  rateInputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 6,
    marginHorizontal: 6, minWidth: 72,
    justifyContent: "center",
  },
  rateInput: {
    fontFamily: "Poppins_700Bold", fontSize: 17,
    textAlign: "center", minWidth: 28,
  },
  rateUnit: { fontFamily: "Poppins_400Regular", fontSize: 11, marginLeft: 3 },

  thresholdRow: {
    flexDirection: "row", alignItems: "center",
    padding: 16,
  },
  thresholdLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  thresholdSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 3, lineHeight: 17 },
  thresholdControls: { flexDirection: "row", alignItems: "center" },
  thresholdInput: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    marginHorizontal: 6, minWidth: 64,
    justifyContent: "center",
  },
  thresholdValue: { fontFamily: "Poppins_700Bold", fontSize: 18 },
  thresholdUnit: { fontFamily: "Poppins_400Regular", fontSize: 12, marginLeft: 3 },

  toggleRow: {
    flexDirection: "row", alignItems: "center",
    padding: 16,
  },
  toggleLabel: { fontFamily: "Poppins_600SemiBold", fontSize: 14 },
  toggleSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 3 },

  surgeBox: {
    margin: 12, borderRadius: 12, borderWidth: 1, padding: 14,
  },
  surgeHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  surgeTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14, flex: 1, marginLeft: 7 },
  surgePill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  surgePillText: { fontFamily: "Poppins_700Bold", fontSize: 13, color: "#E74C3C" },
  surgeSub: { fontFamily: "Poppins_400Regular", fontSize: 12, marginBottom: 12 },
  surgeChips: { flexDirection: "row", flexWrap: "wrap" },
  surgeChip: {
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
    marginRight: 7, marginBottom: 7,
  },
  surgeChipText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },

  calcCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  calcHeader: {
    flexDirection: "row", alignItems: "center",
    padding: 14, paddingBottom: 10,
  },
  calcTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 14, marginLeft: 8 },
  calcTableHeader: {
    flexDirection: "row", paddingHorizontal: 14, paddingVertical: 9,
    borderBottomWidth: 1,
  },
  calcColHdr: { fontFamily: "Poppins_600SemiBold", fontSize: 11 },
  calcRow: {
    flexDirection: "row", paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1,
  },
  calcKm: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  calcFare: { fontFamily: "Poppins_700Bold", fontSize: 13 },

  saveBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1,
  },
  saveBarInner: { flexDirection: "row", alignItems: "center" },
  saveBarLabel: { fontFamily: "Poppins_400Regular", fontSize: 11, marginBottom: 2 },
  saveBarRates: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  saveBtn: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 13,
    borderRadius: 14,
  },
  saveBtnText: { fontFamily: "Poppins_700Bold", fontSize: 14, color: "#0A0A0A", marginLeft: 7 },
});
