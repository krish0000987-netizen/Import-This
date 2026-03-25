import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useData } from "@/contexts/DataContext";
import { Ionicons } from "@/components/icons";
import { DestinationItem, CustomDestination, DestinationOverride } from "@/constants/data";

type FormState = {
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  distance: string;
  distanceKm: string;
  duration: string;
  basePrice: string;
  pricePerKm: string;
  rating: string;
  reviewCount: string;
  highlights: string;
  popular: boolean;
  latitude: string;
  longitude: string;
};

const emptyForm: FormState = {
  name: "",
  tagline: "",
  description: "",
  imageUrl: "",
  distance: "",
  distanceKm: "",
  duration: "",
  basePrice: "",
  pricePerKm: "12",
  rating: "4.5",
  reviewCount: "0",
  highlights: "",
  popular: false,
  latitude: "",
  longitude: "",
};

function destToForm(d: DestinationItem): FormState {
  return {
    name: d.name,
    tagline: d.tagline,
    description: d.description,
    imageUrl: (d as CustomDestination).imageUrl || "",
    distance: d.distance,
    distanceKm: String(d.distanceKm),
    duration: d.duration,
    basePrice: String(d.basePrice),
    pricePerKm: String(d.pricePerKm),
    rating: String(d.rating),
    reviewCount: String(d.reviewCount),
    highlights: d.highlights.join(", "),
    popular: d.popular,
    latitude: String(d.latitude),
    longitude: String(d.longitude),
  };
}

function DestCard({
  item,
  index,
  onEdit,
  onDelete,
  colors,
  isDark,
}: {
  item: DestinationItem;
  index: number;
  onEdit: (item: DestinationItem) => void;
  onDelete: (item: DestinationItem) => void;
  colors: any;
  isDark: boolean;
}) {
  const isCustom = (item as CustomDestination).isCustom;
  const imgSrc = isCustom
    ? { uri: (item as CustomDestination).imageUrl }
    : (item as any).image;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(350)}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardRow}>
          <View style={styles.cardThumb}>
            {imgSrc ? (
              <Image source={imgSrc} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumbPlaceholder, { backgroundColor: isDark ? "#1A1A1A" : "#F0EDE6" }]}>
                <Ionicons name="image-outline" size={24} color={Colors.gold} />
              </View>
            )}
            {isCustom && (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>Custom</Text>
              </View>
            )}
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardTagline, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.tagline}
            </Text>
            <View style={styles.cardMeta}>
              <Ionicons name="navigate-outline" size={12} color={Colors.gold} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.distance}</Text>
              <Ionicons name="star" size={12} color={Colors.gold} style={{ marginLeft: 8 }} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.rating}</Text>
            </View>
            <Text style={styles.priceText}>₹{item.basePrice.toLocaleString()}</Text>
          </View>
        </View>
        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEdit(item);
            }}
            style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="create-outline" size={15} color={Colors.gold} />
            <Text style={[styles.actionText, { color: Colors.gold }]}>Edit</Text>
          </Pressable>
          {isCustom && (
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDelete(item);
              }}
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="trash-outline" size={15} color="#E74C3C" />
              <Text style={[styles.actionText, { color: "#E74C3C" }]}>Delete</Text>
            </Pressable>
          )}
          {!isCustom && (
            <View style={styles.actionBtn}>
              <Ionicons name="lock-closed-outline" size={13} color={colors.textTertiary} />
              <Text style={[styles.actionText, { color: colors.textTertiary }]}>Built-in</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function AdminDestinationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { getAllDestinations, addDestination, updateDestination, deleteDestination } = useData();

  const allDestinations = getAllDestinations();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<DestinationItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [filter, setFilter] = useState<"all" | "popular" | "custom">("all");

  const bg = isDark ? "#0A0A0A" : "#FAFAF8";
  const inputBg = isDark ? "#1A1A1A" : "#F0EDE6";
  const borderColor = isDark ? "#2A2A26" : "#E8E3DA";

  const openAdd = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setImagePreviewError(false);
    setShowForm(true);
  };

  const openEdit = (item: DestinationItem) => {
    setEditingItem(item);
    setForm(destToForm(item));
    setImagePreviewError(false);
    setShowForm(true);
  };

  const handleDelete = (item: DestinationItem) => {
    if (!(item as CustomDestination).isCustom) return;
    Alert.alert(
      "Delete Destination",
      `Remove "${item.name}" from the app? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteDestination(item.id);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Validation", "Destination name is required.");
      return;
    }
    if (!form.tagline.trim()) {
      Alert.alert("Validation", "Tagline is required.");
      return;
    }
    if (!form.basePrice || isNaN(Number(form.basePrice))) {
      Alert.alert("Validation", "Please enter a valid base price.");
      return;
    }
    if (!editingItem && !form.imageUrl.trim()) {
      Alert.alert("Validation", "Please enter an image URL for new destinations.");
      return;
    }

    setSaving(true);
    try {
      const highlights = form.highlights
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);

      if (editingItem) {
        const updates: DestinationOverride = {
          name: form.name.trim(),
          tagline: form.tagline.trim(),
          description: form.description.trim(),
          distance: form.distance.trim(),
          distanceKm: parseFloat(form.distanceKm) || editingItem.distanceKm,
          duration: form.duration.trim(),
          basePrice: parseInt(form.basePrice) || editingItem.basePrice,
          pricePerKm: parseFloat(form.pricePerKm) || editingItem.pricePerKm,
          rating: parseFloat(form.rating) || editingItem.rating,
          reviewCount: parseInt(form.reviewCount) || editingItem.reviewCount,
          highlights,
          popular: form.popular,
          latitude: parseFloat(form.latitude) || editingItem.latitude,
          longitude: parseFloat(form.longitude) || editingItem.longitude,
        };
        if ((editingItem as CustomDestination).isCustom && form.imageUrl.trim()) {
          (updates as any).imageUrl = form.imageUrl.trim();
        }
        await updateDestination(editingItem.id, updates);
      } else {
        await addDestination({
          name: form.name.trim(),
          tagline: form.tagline.trim(),
          description: form.description.trim(),
          imageUrl: form.imageUrl.trim(),
          distance: form.distance.trim() || `${Math.round(parseFloat(form.distanceKm) || 100)} km`,
          distanceKm: parseFloat(form.distanceKm) || 100,
          duration: form.duration.trim() || "2h 30m",
          basePrice: parseInt(form.basePrice) || 1000,
          pricePerKm: parseFloat(form.pricePerKm) || 12,
          rating: parseFloat(form.rating) || 4.5,
          reviewCount: parseInt(form.reviewCount) || 0,
          highlights,
          popular: form.popular,
          latitude: parseFloat(form.latitude) || 26.8467,
          longitude: parseFloat(form.longitude) || 80.9462,
        });
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowForm(false);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save destination. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredDestinations = allDestinations.filter((d) => {
    if (filter === "popular") return d.popular;
    if (filter === "custom") return (d as CustomDestination).isCustom;
    return true;
  });

  const customCount = allDestinations.filter((d) => (d as CustomDestination).isCustom).length;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8,
            backgroundColor: bg,
            borderBottomColor: borderColor,
          },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Tours & Destinations</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {allDestinations.length} total · {customCount} custom
          </Text>
        </View>
        <Pressable
          onPress={openAdd}
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <LinearGradient colors={[Colors.gold, "#A08840"]} style={styles.addBtnGrad}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>Add New</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={[styles.filterRow, { borderBottomColor: borderColor }]}>
        {(["all", "popular", "custom"] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === "all" ? "All" : f === "popular" ? "Popular" : "Custom"}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredDestinations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === "custom" ? "No custom destinations yet.\nTap Add New to create one." : "No destinations found."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <DestCard
            item={item}
            index={index}
            onEdit={openEdit}
            onDelete={handleDelete}
            colors={colors}
            isDark={isDark}
          />
        )}
      />

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalContainer, { backgroundColor: bg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Pressable onPress={() => setShowForm(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingItem ? "Edit Destination" : "Add New Tour"}
              </Text>
              <Pressable onPress={handleSave} disabled={saving} style={styles.modalSave}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.gold} />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
            >
              <SectionLabel label="Basic Info" />
              <FormField
                label="Destination Name *"
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g., Prayagraj"
                inputBg={inputBg}
                borderColor={borderColor}
                colors={colors}
              />
              <FormField
                label="Tagline *"
                value={form.tagline}
                onChangeText={(v) => setForm((f) => ({ ...f, tagline: v }))}
                placeholder="e.g., City of Sangam"
                inputBg={inputBg}
                borderColor={borderColor}
                colors={colors}
              />
              <FormField
                label="Description"
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="Describe the destination..."
                multiline
                numberOfLines={4}
                inputBg={inputBg}
                borderColor={borderColor}
                colors={colors}
              />

              <SectionLabel label="Image" />
              {editingItem && !(editingItem as CustomDestination).isCustom ? (
                <View style={[styles.infoBox, { backgroundColor: isDark ? "#1A1A1A" : "#F5F3EE", borderColor }]}>
                  <Ionicons name="image-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoBoxText, { color: colors.textSecondary }]}>
                    Built-in destinations use bundled images. Image cannot be changed.
                  </Text>
                </View>
              ) : (
                <>
                  <FormField
                    label="Image URL *"
                    value={form.imageUrl}
                    onChangeText={(v) => { setForm((f) => ({ ...f, imageUrl: v })); setImagePreviewError(false); }}
                    placeholder="https://example.com/image.jpg"
                    inputBg={inputBg}
                    borderColor={borderColor}
                    colors={colors}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {form.imageUrl.trim() ? (
                    <View style={styles.imagePreviewWrap}>
                      {!imagePreviewError ? (
                        <Image
                          source={{ uri: form.imageUrl.trim() }}
                          style={styles.imagePreview}
                          contentFit="cover"
                          onError={() => setImagePreviewError(true)}
                        />
                      ) : (
                        <View style={[styles.imagePreviewError, { backgroundColor: inputBg }]}>
                          <Ionicons name="alert-circle-outline" size={24} color="#E74C3C" />
                          <Text style={{ color: "#E74C3C", fontSize: 12, marginTop: 4 }}>
                            Could not load image
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : null}
                </>
              )}

              <SectionLabel label="Distance & Duration" />
              <View style={styles.row2}>
                <FormField
                  label="Distance (text)"
                  value={form.distance}
                  onChangeText={(v) => setForm((f) => ({ ...f, distance: v }))}
                  placeholder="e.g., 200 km"
                  inputBg={inputBg}
                  borderColor={borderColor}
                  colors={colors}
                  flex={1}
                />
                <View style={{ width: 12 }} />
                <FormField
                  label="Distance (km)"
                  value={form.distanceKm}
                  onChangeText={(v) => setForm((f) => ({ ...f, distanceKm: v }))}
                  placeholder="200"
                  inputBg={inputBg}
                  borderColor={borderColor}
                  colors={colors}
                  keyboardType="decimal-pad"
                  flex={1}
                />
              </View>
              <FormField
                label="Duration"
                value={form.duration}
                onChangeText={(v) => setForm((f) => ({ ...f, duration: v }))}
                placeholder="e.g., 3h 30m"
                inputBg={inputBg}
                borderColor={borderColor}
                colors={colors}
              />

              <SectionLabel label="Pricing" />
              <View style={styles.row2}>
                <FormField
                  label="Base Price (₹) *"
                  value={form.basePrice}
                  onChangeText={(v) => setForm((f) => ({ ...f, basePrice: v }))}
                  placeholder="2400"
                  inputBg={inputBg}
                  borderColor={borderColor}
                  colors={colors}
                  keyboardType="numeric"
                  flex={1}
                />
                <View style={{ width: 12 }} />
                <FormField
                  label="Per Km Rate (₹)"
                  value={form.pricePerKm}
                  onChangeText={(v) => setForm((f) => ({ ...f, pricePerKm: v }))}
                  placeholder="12"
                  inputBg={inputBg}
                  borderColor={borderColor}
                  colors={colors}
                  keyboardType="decimal-pad"
                  flex={1}
                />
              </View>

              <SectionLabel label="Ratings & Reviews" />
              <View style={styles.row2}>
                <FormField
                  label="Rating (0–5)"
                  value={form.rating}
                  onChangeText={(v) => setForm((f) => ({ ...f, rating: v }))}
                  placeholder="4.5"
                  inputBg={inputBg}
                  borderColor={borderColor}
                  colors={colors}
                  keyboardType="decimal-pad"
                  flex={1}
                />
                <View style={{ width: 12 }} />
                <FormField
                  label="Review Count"
                  value={form.reviewCount}
                  onChangeText={(v) => setForm((f) => ({ ...f, reviewCount: v }))}
                  placeholder="0"
                  inputBg={inputBg}
                  borderColor={borderColor}
                  colors={colors}
                  keyboardType="numeric"
                  flex={1}
                />
              </View>

              <SectionLabel label="Highlights" />
              <FormField
                label="Highlights (comma-separated)"
                value={form.highlights}
                onChangeText={(v) => setForm((f) => ({ ...f, highlights: v }))}
                placeholder="Ram Mandir, Saryu Aarti, Hanuman Garhi"
                inputBg={inputBg}
                borderColor={borderColor}
                colors={colors}
                multiline
                numberOfLines={3}
              />
              {form.highlights.trim() ? (
                <View style={styles.highlightChips}>
                  {form.highlights.split(",").filter((h) => h.trim()).map((h, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: isDark ? "#2A2A26" : "#F0EDE6" }]}>
                      <Text style={[styles.chipText, { color: colors.text }]}>{h.trim()}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <SectionLabel label="Location (GPS)" />
              <View style={styles.row2}>
                <FormField
                  label="Latitude"
                  value={form.latitude}
                  onChangeText={(v) => setForm((f) => ({ ...f, latitude: v }))}
                  placeholder="26.7922"
                  inputBg={inputBg}
                  borderColor={borderColor}
                  colors={colors}
                  keyboardType="decimal-pad"
                  flex={1}
                />
                <View style={{ width: 12 }} />
                <FormField
                  label="Longitude"
                  value={form.longitude}
                  onChangeText={(v) => setForm((f) => ({ ...f, longitude: v }))}
                  placeholder="82.1998"
                  inputBg={inputBg}
                  borderColor={borderColor}
                  colors={colors}
                  keyboardType="decimal-pad"
                  flex={1}
                />
              </View>

              <SectionLabel label="Visibility" />
              <View style={[styles.switchRow, { backgroundColor: isDark ? "#1A1A1A" : "#F0EDE6", borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Mark as Popular</Text>
                  <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                    Popular destinations are featured on the home screen
                  </Text>
                </View>
                <Switch
                  value={form.popular}
                  onValueChange={(v) => setForm((f) => ({ ...f, popular: v }))}
                  trackColor={{ false: "#767577", true: Colors.gold }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  inputBg,
  borderColor,
  colors,
  multiline,
  numberOfLines,
  keyboardType,
  autoCapitalize,
  flex,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  inputBg: string;
  borderColor: string;
  colors: any;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: any;
  autoCapitalize?: any;
  flex?: number;
}) {
  return (
    <View style={[styles.fieldWrap, flex ? { flex } : {}]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType || "default"}
        autoCapitalize={autoCapitalize || "sentences"}
        style={[
          styles.input,
          { backgroundColor: inputBg, borderColor, color: colors.text },
          multiline && { height: (numberOfLines || 3) * 22 + 20, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  subtitle: { fontFamily: "Poppins_400Regular", fontSize: 12, marginTop: 2 },
  addBtn: { borderRadius: 10, overflow: "hidden" },
  addBtnGrad: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, gap: 5 },
  addBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#FFF" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#888",
  },
  filterChipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  filterChipText: { fontFamily: "Poppins_500Medium", fontSize: 12, color: "#888" },
  filterChipTextActive: { color: "#FFF" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardRow: { flexDirection: "row", padding: 12, gap: 12 },
  cardThumb: { position: "relative" },
  thumb: { width: 80, height: 80, borderRadius: 10 },
  thumbPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  customBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: Colors.gold,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  customBadgeText: { fontFamily: "Poppins_600SemiBold", fontSize: 9, color: "#FFF" },
  cardInfo: { flex: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  cardName: { fontFamily: "Poppins_600SemiBold", fontSize: 14, flex: 1 },
  popularBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularText: { fontFamily: "Poppins_500Medium", fontSize: 9, color: "#E65100" },
  cardTagline: { fontFamily: "Poppins_400Regular", fontSize: 12, marginBottom: 4 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 4 },
  metaText: { fontFamily: "Poppins_400Regular", fontSize: 11 },
  priceText: { fontFamily: "Poppins_700Bold", fontSize: 14, color: Colors.gold },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontFamily: "Poppins_500Medium", fontSize: 12 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontFamily: "Poppins_400Regular", fontSize: 14, textAlign: "center", marginTop: 12, lineHeight: 22 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === "ios" ? 24 : 16,
  },
  modalClose: { padding: 4 },
  modalTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  modalSave: { padding: 4 },
  modalSaveText: { fontFamily: "Poppins_700Bold", fontSize: 15, color: Colors.gold },
  formContent: { padding: 20 },
  sectionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.gold,
    marginTop: 20,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontFamily: "Poppins_500Medium", fontSize: 12, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
  row2: { flexDirection: "row" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  switchLabel: { fontFamily: "Poppins_500Medium", fontSize: 14 },
  switchSub: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 2 },
  imagePreviewWrap: { marginBottom: 12 },
  imagePreview: { width: "100%", height: 160, borderRadius: 10 },
  imagePreviewError: {
    width: "100%",
    height: 100,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoBoxText: { fontFamily: "Poppins_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
  highlightChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontFamily: "Poppins_500Medium", fontSize: 11 },
});
