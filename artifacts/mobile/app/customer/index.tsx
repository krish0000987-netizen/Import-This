import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@/components/icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Animated, { FadeInDown, FadeIn, SlideInUp } from "react-native-reanimated";
import { AppMapView, AppMarker } from "@/components/MapWrapper";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Destination, LUCKNOW_CENTER, popularPickupLocations, PickupLocation, DestinationItem, CustomDestination } from "@/constants/data";
import { useData } from "@/contexts/DataContext";
import { isStateSupported, SUPPORTED_STATE_LABELS } from "@/constants/supportedLocations";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;
const MAP_HEIGHT = Math.min(height * 0.78, 620);

const quickActions = [
  { icon: "time-outline", label: "Bookings", color: "#4CAF50", bg: "#E8F5E9", onPress: () => router.push("/customer/rides") },
  { icon: "heart", label: "Favorites", color: "#E91E63", bg: "#FCE4EC", onPress: () => {} },
  { icon: "chatbubble-ellipses", label: "Support", color: "#FF9800", bg: "#FFF3E0", onPress: () => {} },
];


type SearchField = "pickup" | "destination";

function DestinationCard({ item }: { item: DestinationItem }) {
  const isCustom = (item as CustomDestination).isCustom;
  const imgSource = isCustom ? { uri: (item as CustomDestination).imageUrl } : (item as any).image;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/destination/[id]", params: { id: item.id } });
      }}
      style={({ pressed }) => [
        styles.destCard,
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Image source={imgSource} style={styles.destImage} contentFit="cover" />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.65)"]}
        style={styles.destGradient}
      />
      <View style={styles.destInfo}>
        <Text style={styles.destName}>{item.name}</Text>
        <View style={styles.destMeta}>
          <Text style={styles.destPrice}>{"\u20B9"}{item.basePrice.toLocaleString()}</Text>
          <Text style={styles.destDistance}>{item.distance}</Text>
          <View style={styles.perKmBadge}>
            <Text style={styles.perKmText}>{"\u20B9"}{item.pricePerKm}/km</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

interface OlaPlace {
  id: string;
  name: string;
  sub: string;
  lat: number;
  lng: number;
  type: string;
  distanceKm?: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

async function safeFetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!text || (!text.trim().startsWith("{") && !text.trim().startsWith("["))) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchOlaSearch(
  query: string,
  biasLat?: number,
  biasLon?: number
): Promise<OlaPlace[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({ q: query.trim() });
    if (biasLat != null) params.append("lat", String(biasLat));
    if (biasLon != null) params.append("lon", String(biasLon));
    const data = await safeFetchJson(`${API_BASE}/api/ola/search?${params}`);
    if (!data) return [];
    const preds: any[] = data.predictions || [];
    return preds.map((p) => {
      const loc = p.geometry?.location;
      const lat = loc?.lat ?? null;
      const lng = loc?.lng ?? null;
      const main = p.structured_formatting?.main_text || p.description || "";
      const sub = p.structured_formatting?.secondary_text || "";
      return {
        id: p.place_id || main,
        name: main,
        sub: sub !== main ? sub : "",
        lat: lat ?? 0,
        lng: lng ?? 0,
        type: (p.types?.[0]) || "place",
        distanceKm: (biasLat != null && biasLon != null && lat && lng)
          ? haversineKm(biasLat, biasLon, lat, lng)
          : undefined,
      } as OlaPlace;
    }).filter((p) => p.name && p.lat !== 0);
  } catch {
    return [];
  }
}

async function fetchOlaReverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const data = await safeFetchJson(`${API_BASE}/api/ola/reverse?lat=${lat}&lon=${lon}`);
    if (!data) return null;
    const results: any[] = data.results || data.geocodingResults || [];
    const first = results[0];
    if (!first) return null;
    const comps: any[] = first.address_components || [];
    let area = "", city = "";
    comps.forEach((c) => {
      const t: string[] = c.types || [];
      if (t.includes("sublocality_level_1") || t.includes("neighborhood")) area = c.long_name;
      if (t.includes("locality") || t.includes("administrative_area_level_3")) city = c.long_name;
    });
    return [area, city].filter(Boolean).join(", ") || first.formatted_address || null;
  } catch {
    return null;
  }
}

async function calculateRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<{ distanceKm: number; durationMin: number }> {
  try {
    const params = new URLSearchParams({
      origin: `${fromLat},${fromLon}`,
      destination: `${toLat},${toLon}`,
    });
    const data = await safeFetchJson(`${API_BASE}/api/ola/directions?${params}`);
    const leg = data?.routes?.[0]?.legs?.[0];
    if (leg) {
      return {
        distanceKm: Math.round(leg.distance / 100) / 10,
        durationMin: Math.round(leg.duration / 60),
      };
    }
  } catch {}
  // Straight-line fallback
  const km = haversineKm(fromLat, fromLon, toLat, toLon) * 1.3;
  return { distanceKm: Math.round(km * 10) / 10, durationMin: Math.round(km * 3) };
}

function formatOlaName(p: OlaPlace): { main: string; sub: string } {
  return { main: p.name, sub: p.sub || "" };
}

function getOlaPlaceState(p: OlaPlace): string | undefined {
  const sub = p.sub || "";
  const parts = sub.split(",").map((s) => s.trim()).filter(Boolean);
  // Indian addresses end with: "..., State, India" — skip trailing "India"
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.toLowerCase() !== "india" && part.length > 2) return part;
  }
  return undefined;
}

async function fetchStateFromCoords(lat: number, lng: number): Promise<string | undefined> {
  try {
    const data = await safeFetchJson(`${API_BASE}/api/ola/reverse?lat=${lat}&lon=${lng}`);
    if (!data) return undefined;
    const results: any[] = data.results || data.geocodingResults || [];
    const first = results[0];
    if (!first) return undefined;
    const comps: any[] = first.address_components || [];
    for (const c of comps) {
      const types: string[] = c.types || [];
      if (types.includes("administrative_area_level_1")) return c.long_name as string;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function SearchModal({
  visible,
  onClose,
  pickupText,
  onPickupChange,
  colors,
  isDark,
  initialField,
  userLat,
  userLon,
  userAreaName,
}: {
  visible: boolean;
  onClose: () => void;
  pickupText: string;
  onPickupChange: (name: string) => void;
  colors: any;
  isDark: boolean;
  initialField?: SearchField;
  userLat?: number;
  userLon?: number;
  userAreaName?: string;
}) {
  const insets = useSafeAreaInsets();
  const { getAllDestinations } = useData();
  const allDestinations = getAllDestinations();
  const [activeField, setActiveField] = useState<SearchField>(initialField || "destination");
  const [pickupQuery, setPickupQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState<OlaPlace[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<OlaPlace[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<OlaPlace[]>([]);
  const [loadingPickup, setLoadingPickup] = useState(false);
  const [loadingDest, setLoadingDest] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [localPickupLat, setLocalPickupLat] = useState<number | null>(null);
  const [localPickupLon, setLocalPickupLon] = useState<number | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const pickupRef = useRef<TextInput>(null);
  const destRef = useRef<TextInput>(null);
  const pickupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [unavailableLocationName, setUnavailableLocationName] = useState("");
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    if (visible) {
      setDestQuery("");
      setPickupQuery("");
      setPickupSuggestions([]);
      setDestSuggestions([]);
      const field = initialField || "destination";
      setActiveField(field);
      setTimeout(() => {
        if (field === "pickup") pickupRef.current?.focus();
        else destRef.current?.focus();
      }, 300);

      // Load nearby places as soon as the modal opens if we have user location
      if (userLat && userLon) {
        const query = userAreaName && userAreaName.trim() ? userAreaName : "station";
        setLoadingNearby(true);
        fetchOlaSearch(query, userLat, userLon)
          .then((results) => {
            const sorted = [...results].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
            setNearbyPlaces(sorted.slice(0, 8));
            setLoadingNearby(false);
          })
          .catch(() => {
            setLoadingNearby(false);
          });
      } else {
        setNearbyPlaces([]);
      }
    }
  }, [visible, initialField, userLat, userLon, userAreaName]);

  useEffect(() => {
    if (pickupTimerRef.current) clearTimeout(pickupTimerRef.current);
    if (pickupQuery.trim().length < 2) { setPickupSuggestions([]); return; }
    setLoadingPickup(true);
    pickupTimerRef.current = setTimeout(async () => {
      const results = await fetchOlaSearch(pickupQuery, userLat ?? 26.8467, userLon ?? 80.9462);
      setPickupSuggestions(results);
      setLoadingPickup(false);
    }, 250);
    return () => { if (pickupTimerRef.current) clearTimeout(pickupTimerRef.current); };
  }, [pickupQuery]);

  useEffect(() => {
    if (destTimerRef.current) clearTimeout(destTimerRef.current);
    if (destQuery.trim().length < 2) { setDestSuggestions([]); return; }
    setLoadingDest(true);
    destTimerRef.current = setTimeout(async () => {
      const biasLat = localPickupLat ?? userLat ?? 20.5937;
      const biasLon = localPickupLon ?? userLon ?? 78.9629;
      const results = await fetchOlaSearch(destQuery, biasLat, biasLon);
      setDestSuggestions(results);
      setLoadingDest(false);
    }, 250);
    return () => { if (destTimerRef.current) clearTimeout(destTimerRef.current); };
  }, [destQuery]);

  const filteredDestinations = destQuery.trim()
    ? allDestinations.filter(
        (d) =>
          d.name.toLowerCase().includes(destQuery.toLowerCase()) ||
          d.tagline.toLowerCase().includes(destQuery.toLowerCase()) ||
          d.highlights.some((h) => h.toLowerCase().includes(destQuery.toLowerCase()))
      )
    : allDestinations;

  const filteredPickups = pickupQuery.trim()
    ? popularPickupLocations.filter(
        (p) =>
          p.name.toLowerCase().includes(pickupQuery.toLowerCase()) ||
          p.area.toLowerCase().includes(pickupQuery.toLowerCase())
      )
    : popularPickupLocations;

  const handleSelectDestination = (dest: DestinationItem) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push({ pathname: "/booking/create", params: { destinationId: dest.id, pickup: pickupText } });
  };

  const handleSelectPickup = (loc: PickupLocation) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPickupChange(loc.name + ", " + loc.area);
    setPickupQuery("");
    setPickupSuggestions([]);
    setActiveField("destination");
    setTimeout(() => destRef.current?.focus(), 200);
  };

  const handleSelectOlaPickup = async (p: OlaPlace) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Step 1: try to read state from the sub-text
    let state = getOlaPlaceState(p);
    // Step 2: if ambiguous (state missing), confirm via reverse geocode on coords
    if (!state && p.lat && p.lng) {
      state = await fetchStateFromCoords(p.lat, p.lng);
    }
    if (!isStateSupported(state)) {
      setUnavailableLocationName(p.name + (state ? `, ${state}` : ""));
      setShowUnavailable(true);
      return;
    }
    onPickupChange(p.name);
    setLocalPickupLat(p.lat);
    setLocalPickupLon(p.lng);
    setPickupQuery("");
    setPickupSuggestions([]);
    setActiveField("destination");
    setTimeout(() => destRef.current?.focus(), 200);
  };

  const handleSelectOlaDest = async (p: OlaPlace) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Step 1: try to read state from the sub-text
    let state = getOlaPlaceState(p);
    // Step 2: if ambiguous (state missing), confirm via reverse geocode on coords
    if (!state && p.lat && p.lng) {
      state = await fetchStateFromCoords(p.lat, p.lng);
    }
    if (!isStateSupported(state)) {
      setUnavailableLocationName(p.name + (state ? `, ${state}` : ""));
      setShowUnavailable(true);
      return;
    }
    const { main } = formatOlaName(p);
    const destLat = p.lat;
    const destLon = p.lng;
    const pLat = localPickupLat ?? userLat;
    const pLon = localPickupLon ?? userLon;

    if (pLat && pLon) {
      setCalculatingRoute(true);
      try {
        const { distanceKm, durationMin } = await calculateRoute(pLat, pLon, destLat, destLon);
        onClose();
        router.push({
          pathname: "/booking/create",
          params: {
            destinationName: main,
            pickup: pickupText,
            distanceKm: String(distanceKm),
            durationMin: String(durationMin),
          },
        });
      } catch {
        onClose();
        router.push({ pathname: "/booking/create", params: { destinationName: main, pickup: pickupText } });
      } finally {
        setCalculatingRoute(false);
      }
    } else {
      onClose();
      router.push({ pathname: "/booking/create", params: { destinationName: main, pickup: pickupText } });
    }
  };

  const handleUseCurrentLocation = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsFetchingLocation(true);
    try {
      if (Platform.OS === "web") {
        if (navigator.geolocation) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                setLocalPickupLat(coords.latitude);
                setLocalPickupLon(coords.longitude);
                try {
                  const label = await fetchOlaReverseGeocode(coords.latitude, coords.longitude);
                  onPickupChange(label || "Current Location");
                } catch {
                  onPickupChange("Current Location");
                }
                resolve();
              },
              () => {
                if (userLat && userLon) { setLocalPickupLat(userLat); setLocalPickupLon(userLon); }
                onPickupChange("Current Location");
                resolve();
              },
              { timeout: 8000, enableHighAccuracy: false }
            );
          });
        } else {
          if (userLat && userLon) { setLocalPickupLat(userLat); setLocalPickupLon(userLon); }
          onPickupChange("Current Location");
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (userLat && userLon) { setLocalPickupLat(userLat); setLocalPickupLon(userLon); }
          onPickupChange("Current Location");
        } else {
          let coords: { latitude: number; longitude: number } | null = null;
          try {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          } catch {
            const last = await Location.getLastKnownPositionAsync({}).catch(() => null);
            if (last) coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
          }
          if (coords) {
            setLocalPickupLat(coords.latitude);
            setLocalPickupLon(coords.longitude);
            try {
              const [address] = await Location.reverseGeocodeAsync(coords);
              const label = address
                ? [address.name, address.street, address.city || address.subregion]
                    .filter(Boolean).slice(0, 2).join(", ")
                : null;
              onPickupChange(label || "Current Location");
            } catch {
              onPickupChange("Current Location");
            }
          } else {
            if (userLat && userLon) { setLocalPickupLat(userLat); setLocalPickupLon(userLon); }
            onPickupChange("Current Location");
          }
        }
      }
    } catch {
      if (userLat && userLon) { setLocalPickupLat(userLat); setLocalPickupLon(userLon); }
      onPickupChange("Current Location");
    } finally {
      setIsFetchingLocation(false);
      setPickupQuery("");
      setPickupSuggestions([]);
      setActiveField("destination");
      setTimeout(() => destRef.current?.focus(), 200);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[searchStyles.container, { backgroundColor: colors.background }]}>
          <View style={[searchStyles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 }]}>
            <Pressable onPress={onClose} style={[searchStyles.backBtn, { backgroundColor: colors.surface }]}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>

            <View style={{ flex: 1, gap: 4 }}>
              <Pressable
                onPress={() => {
                  setActiveField("pickup");
                  setTimeout(() => pickupRef.current?.focus(), 100);
                }}
                style={[
                  searchStyles.inputRow,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: activeField === "pickup" ? 1.5 : 0,
                    borderColor: activeField === "pickup" ? "#4CAF50" : "transparent",
                  },
                ]}
              >
                <View style={searchStyles.pickupDot} />
                {activeField === "pickup" ? (
                  <TextInput
                    ref={pickupRef}
                    style={[searchStyles.searchInput, { color: colors.text }]}
                    placeholder="Search pickup location"
                    placeholderTextColor={colors.textTertiary}
                    value={pickupQuery}
                    onChangeText={setPickupQuery}
                  />
                ) : (
                  <Text style={[searchStyles.pickupText, { color: colors.text }]} numberOfLines={1}>
                    {pickupText}
                  </Text>
                )}
                {activeField === "pickup" && pickupQuery.length > 0 && (
                  <Pressable onPress={() => { setPickupQuery(""); setPickupSuggestions([]); }}>
                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                  </Pressable>
                )}
              </Pressable>

              <View style={searchStyles.inputConnector}>
                <View style={[searchStyles.connectorLine, { backgroundColor: colors.border }]} />
              </View>

              <Pressable
                onPress={() => {
                  setActiveField("destination");
                  setTimeout(() => destRef.current?.focus(), 100);
                }}
                style={[
                  searchStyles.inputRow,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: activeField === "destination" ? 1.5 : 0,
                    borderColor: activeField === "destination" ? Colors.gold : "transparent",
                  },
                ]}
              >
                <View style={searchStyles.destDot} />
                <TextInput
                  ref={destRef}
                  style={[searchStyles.searchInput, { color: colors.text }]}
                  placeholder="Where to?"
                  placeholderTextColor={colors.textTertiary}
                  value={destQuery}
                  onChangeText={(t) => {
                    setDestQuery(t);
                    setActiveField("destination");
                  }}
                />
                {destQuery.length > 0 && (
                  <Pressable onPress={() => { setDestQuery(""); setDestSuggestions([]); }}>
                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                  </Pressable>
                )}
              </Pressable>
            </View>
          </View>

          {activeField === "pickup" ? (
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              <Pressable
                onPress={isFetchingLocation ? undefined : handleUseCurrentLocation}
                style={({ pressed }) => [
                  searchStyles.currentLocRow,
                  { backgroundColor: pressed && !isFetchingLocation ? colors.surface : "transparent", opacity: isFetchingLocation ? 0.7 : 1 },
                ]}
              >
                <View style={[searchStyles.currentLocIcon, { backgroundColor: "#E3F2FD" }]}>
                  {isFetchingLocation
                    ? <ActivityIndicator size="small" color="#1976D2" />
                    : <Ionicons name="navigate" size={18} color="#1976D2" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[searchStyles.currentLocTitle, { color: "#1976D2" }]}>
                    {isFetchingLocation ? "Detecting location…" : "Use Current Location"}
                  </Text>
                  <Text style={[searchStyles.currentLocSub, { color: colors.textSecondary }]}>
                    {isFetchingLocation ? "Please wait" : "Detect via GPS"}
                  </Text>
                </View>
                {!isFetchingLocation && <Ionicons name="locate-outline" size={18} color="#1976D2" />}
              </Pressable>

              <View style={[searchStyles.divider, { backgroundColor: colors.border }]} />

              {pickupQuery.trim().length >= 3 && (
                <>
                  {loadingPickup && (
                    <View style={searchStyles.loadingRow}>
                      <ActivityIndicator size="small" color={Colors.gold} />
                      <Text style={[searchStyles.loadingText, { color: colors.textSecondary }]}>Searching…</Text>
                    </View>
                  )}
                  {!loadingPickup && pickupSuggestions.length > 0 && (
                    <>
                      <Text style={[searchStyles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: 20, marginTop: 12 }]}>
                        Suggestions
                      </Text>
                      {pickupSuggestions.map((p) => {
                        const { main, sub } = formatOlaName(p);
                        const distLabel = p.distanceKm != null ? formatDistanceLabel(p.distanceKm) : null;
                        const icon = p.type === "establishment" ? "business-outline"
                          : p.type === "street_address" ? "home-outline"
                          : "map-outline";
                        return (
                          <Pressable
                            key={p.id}
                            onPress={() => handleSelectOlaPickup(p)}
                            style={({ pressed }) => [
                              searchStyles.pickupItem,
                              { backgroundColor: pressed ? colors.surface : "transparent" },
                            ]}
                          >
                            <View style={[searchStyles.recentIcon, { backgroundColor: isDark ? "#2A2A2A" : "#F0F0F0" }]}>
                              <Ionicons name={icon} size={18} color={Colors.gold} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[searchStyles.recentName, { color: colors.text }]} numberOfLines={1}>{main}</Text>
                              {sub ? <Text style={[searchStyles.recentSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{sub}</Text> : null}
                            </View>
                            {distLabel && (
                              <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: Colors.gold }}>{distLabel}</Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </>
                  )}
                  <View style={[searchStyles.divider, { backgroundColor: colors.border }]} />
                </>
              )}

              {/* Nearby places — always shown when no text typed and user has location */}
              {!pickupQuery.trim() && (nearbyPlaces.length > 0 || loadingNearby) && (
                <>
                  <Text style={[searchStyles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: 20, marginTop: 12 }]}>
                    Near You
                  </Text>
                  {loadingNearby && (
                    <View style={searchStyles.loadingRow}>
                      <ActivityIndicator size="small" color={Colors.gold} />
                      <Text style={[searchStyles.loadingText, { color: colors.textSecondary }]}>Finding nearby places…</Text>
                    </View>
                  )}
                  {!loadingNearby && nearbyPlaces.map((p) => {
                    const { main, sub } = formatOlaName(p);
                    const distLabel = p.distanceKm != null ? formatDistanceLabel(p.distanceKm) : null;
                    const icon = p.type === "establishment" ? "business-outline"
                      : p.type === "street_address" ? "home-outline"
                      : "navigate-circle-outline";
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => handleSelectOlaPickup(p)}
                        style={({ pressed }) => [
                          searchStyles.pickupItem,
                          { backgroundColor: pressed ? colors.surface : "transparent" },
                        ]}
                      >
                        <View style={[searchStyles.recentIcon, { backgroundColor: isDark ? "#1A2A1A" : "#E8F5E9" }]}>
                          <Ionicons name={icon} size={18} color="#4CAF50" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[searchStyles.recentName, { color: colors.text }]} numberOfLines={1}>{main}</Text>
                          {sub ? <Text style={[searchStyles.recentSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{sub}</Text> : null}
                        </View>
                        {distLabel && (
                          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: "#4CAF50" }}>{distLabel}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                  <View style={[searchStyles.divider, { backgroundColor: colors.border }]} />
                </>
              )}

              <Text style={[searchStyles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: 20, marginTop: 12 }]}>
                {pickupQuery.trim() && filteredPickups.length > 0 ? "Matching Saved Points" : "Popular Pickup Points"}
              </Text>
              {filteredPickups.map((loc) => (
                <Pressable
                  key={loc.id}
                  onPress={() => handleSelectPickup(loc)}
                  style={({ pressed }) => [
                    searchStyles.pickupItem,
                    { backgroundColor: pressed ? colors.surface : "transparent" },
                  ]}
                >
                  <View style={[searchStyles.recentIcon, { backgroundColor: isDark ? "#2A2A2A" : "#F0F0F0" }]}>
                    <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[searchStyles.recentName, { color: colors.text }]}>{loc.name}</Text>
                    <Text style={[searchStyles.recentSubtitle, { color: colors.textSecondary }]}>{loc.area}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
              {filteredPickups.length === 0 && !loadingPickup && pickupSuggestions.length === 0 && (
                <View style={searchStyles.emptySearch}>
                  <Ionicons name="location-outline" size={40} color={colors.textTertiary} />
                  <Text style={[searchStyles.emptyText, { color: colors.textSecondary }]}>No locations found</Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <>
              <View style={[searchStyles.divider, { backgroundColor: colors.border }]} />

              {destQuery.trim().length >= 2 && (
                <>
                  {loadingDest && (
                    <View style={searchStyles.loadingRow}>
                      <ActivityIndicator size="small" color={Colors.gold} />
                      <Text style={[searchStyles.loadingText, { color: colors.textSecondary }]}>Searching…</Text>
                    </View>
                  )}
                  {!loadingDest && destSuggestions.length > 0 && (
                    <>
                      <Text style={[searchStyles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: 20, marginTop: 8 }]}>
                        Places
                      </Text>
                      {destSuggestions.map((p, idx) => {
                        const { main, sub } = formatOlaName(p);
                        const distLabel = p.distanceKm != null ? formatDistanceLabel(p.distanceKm) : null;
                        const isTop = idx === 0;
                        const icon = p.type === "establishment" ? "business-outline"
                          : p.type === "street_address" ? "home-outline"
                          : "navigate-outline";
                        return (
                          <Pressable
                            key={p.id}
                            onPress={() => handleSelectOlaDest(p)}
                            style={({ pressed }) => [
                              searchStyles.destResult,
                              isTop && {
                                marginHorizontal: 12,
                                borderRadius: 14,
                                borderWidth: 1.5,
                                borderColor: Colors.gold + "40",
                                backgroundColor: isDark ? "#1A1A00" : "#FFFBF0",
                                marginBottom: 2,
                              },
                              !isTop && { backgroundColor: pressed ? colors.surface : "transparent" },
                            ]}
                          >
                            <View style={[searchStyles.recentIcon, {
                              backgroundColor: isTop ? Colors.gold + "20" : (isDark ? "#1E1E1E" : "#F5F5F5"),
                              width: 44, height: 44, borderRadius: 10,
                            }]}>
                              <Ionicons
                                name={isTop ? "location" : icon}
                                size={isTop ? 22 : 18}
                                color={isTop ? Colors.gold : colors.textSecondary}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[searchStyles.destResultName, {
                                  color: isTop ? Colors.gold : colors.text,
                                  fontFamily: isTop ? "Poppins_600SemiBold" : "Poppins_500Medium",
                                }]}
                                numberOfLines={1}
                              >{main}</Text>
                              {sub ? <Text style={[searchStyles.destResultTagline, { color: colors.textSecondary }]} numberOfLines={1}>{sub}</Text> : null}
                            </View>
                            <View style={{ alignItems: "flex-end", gap: 2 }}>
                              {distLabel && (
                                <Text style={{
                                  fontFamily: "Poppins_500Medium", fontSize: 11,
                                  color: isTop ? Colors.gold : colors.textSecondary,
                                }}>{distLabel}</Text>
                              )}
                              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                            </View>
                          </Pressable>
                        );
                      })}
                      <View style={[searchStyles.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />
                    </>
                  )}
                </>
              )}

              {/* Nearby places in destination field — shown when no text typed */}
              {!destQuery.trim() && (nearbyPlaces.length > 0 || loadingNearby) && (
                <>
                  <Text style={[searchStyles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: 20, marginTop: 4 }]}>
                    Near You
                  </Text>
                  {loadingNearby && (
                    <View style={searchStyles.loadingRow}>
                      <ActivityIndicator size="small" color={Colors.gold} />
                      <Text style={[searchStyles.loadingText, { color: colors.textSecondary }]}>Finding nearby places…</Text>
                    </View>
                  )}
                  {!loadingNearby && nearbyPlaces.map((p) => {
                    const { main, sub } = formatOlaName(p);
                    const distLabel = p.distanceKm != null ? formatDistanceLabel(p.distanceKm) : null;
                    const icon = p.type === "establishment" ? "business-outline"
                      : p.type === "street_address" ? "home-outline"
                      : "navigate-circle-outline";
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => handleSelectOlaDest(p)}
                        style={({ pressed }) => [
                          searchStyles.destResult,
                          { backgroundColor: pressed ? colors.surface : "transparent" },
                        ]}
                      >
                        <View style={[searchStyles.recentIcon, {
                          backgroundColor: isDark ? "#1A2A1A" : "#E8F5E9",
                          width: 44, height: 44, borderRadius: 10,
                        }]}>
                          <Ionicons name={icon} size={18} color="#4CAF50" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[searchStyles.destResultName, { color: colors.text }]} numberOfLines={1}>{main}</Text>
                          {sub ? <Text style={[searchStyles.destResultTagline, { color: colors.textSecondary }]} numberOfLines={1}>{sub}</Text> : null}
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 2 }}>
                          {distLabel && (
                            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: "#4CAF50" }}>{distLabel}</Text>
                          )}
                          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                        </View>
                      </Pressable>
                    );
                  })}
                  <View style={[searchStyles.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />
                </>
              )}

              <Text style={[searchStyles.sectionLabel, { color: colors.textSecondary, paddingHorizontal: 20, marginTop: 4 }]}>
                {destQuery.trim() ? `${filteredDestinations.length} curated destination${filteredDestinations.length !== 1 ? "s" : ""}` : "All Destinations"}
              </Text>

              <FlatList
                data={filteredDestinations}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleSelectDestination(item)}
                    style={({ pressed }) => [
                      searchStyles.destResult,
                      { backgroundColor: pressed ? colors.surface : "transparent" },
                    ]}
                  >
                    <Image
                      source={(item as CustomDestination).isCustom ? { uri: (item as CustomDestination).imageUrl } : (item as any).image}
                      style={searchStyles.destThumb}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[searchStyles.destResultName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[searchStyles.destResultTagline, { color: colors.textSecondary }]}>{item.tagline}</Text>
                      <View style={searchStyles.destResultMeta}>
                        <Ionicons name="navigate-outline" size={12} color={Colors.gold} />
                        <Text style={[searchStyles.destResultDist, { color: colors.textSecondary }]}>{item.distance}</Text>
                        <View style={searchStyles.pricePerKmBadge}>
                          <Text style={searchStyles.pricePerKmText}>{"\u20B9"}{item.pricePerKm}/km</Text>
                        </View>
                        <Text style={searchStyles.destResultPrice}>{"\u20B9"}{item.basePrice.toLocaleString()}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={searchStyles.emptySearch}>
                    <Ionicons name="search-outline" size={40} color={colors.textTertiary} />
                    <Text style={[searchStyles.emptyText, { color: colors.textSecondary }]}>No destinations found</Text>
                    <Text style={[searchStyles.emptySubtext, { color: colors.textTertiary }]}>Try a different search term</Text>
                  </View>
                }
              />
            </>
          )}
        {calculatingRoute && (
          <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}>
            <View style={{ backgroundColor: "#1A1A14", borderRadius: 20, padding: 28, alignItems: "center", gap: 14, minWidth: 220 }}>
              <ActivityIndicator size="large" color={Colors.gold} />
              <Text style={{ color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 15, textAlign: "center" }}>
                Calculating fare...
              </Text>
              <Text style={{ color: "#aaa", fontFamily: "Poppins_400Regular", fontSize: 12, textAlign: "center" }}>
                Calculating road distance at ₹12/km
              </Text>
            </View>
          </View>
        )}

        {showUnavailable && (
          <View style={unavailStyles.overlay}>
            <View style={[unavailStyles.sheet, { backgroundColor: colors.surface }]}>
              <View style={unavailStyles.iconWrap}>
                <Ionicons name="location-outline" size={36} color="#E74C3C" />
              </View>
              <Text style={[unavailStyles.title, { color: colors.text }]}>
                Service Not Available
              </Text>
              {unavailableLocationName ? (
                <Text style={[unavailStyles.location, { color: Colors.gold }]} numberOfLines={2}>
                  {unavailableLocationName}
                </Text>
              ) : null}
              <Text style={[unavailStyles.message, { color: colors.textSecondary }]}>
                Sorry, we currently don't have routes available for this location. We're working on expanding our services and will be available here soon.
              </Text>
              <View style={[unavailStyles.statesBox, { backgroundColor: colors.background }]}>
                <Text style={[unavailStyles.statesLabel, { color: colors.textTertiary }]}>Currently serving</Text>
                <View style={unavailStyles.statesRow}>
                  {SUPPORTED_STATE_LABELS.map((s) => (
                    <View key={s} style={[unavailStyles.statePill, { backgroundColor: Colors.gold + "18" }]}>
                      <Ionicons name="checkmark-circle" size={11} color={Colors.gold} />
                      <Text style={[unavailStyles.statePillText, { color: Colors.gold }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Pressable
                onPress={() => setShowUnavailable(false)}
                style={unavailStyles.closeBtn}
              >
                <LinearGradient
                  colors={[Colors.gold, Colors.goldDark]}
                  style={unavailStyles.closeBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={unavailStyles.closeBtnText}>Search Another Location</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function BookScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { getAllDestinations } = useData();
  const allDestinations = getAllDestinations();
  const mapRef = useRef<any>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(LUCKNOW_CENTER);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [userAreaName, setUserAreaName] = useState<string>("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchField, setSearchField] = useState<SearchField>("destination");
  const [pickupLabel, setPickupLabel] = useState("Detecting location...");
  const [locationDetected, setLocationDetected] = useState(false);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  const reverseGeocodeAndSet = useCallback(async (coords: { latitude: number; longitude: number }) => {
    if (Platform.OS === "web") {
      try {
        const shortName = await fetchOlaReverseGeocode(coords.latitude, coords.longitude);
        if (shortName) {
          const parts = shortName.split(",").map((s) => s.trim());
          setUserAreaName(parts[0] || "");
          setPickupLabel(shortName || "Current Location");
        } else {
          setPickupLabel("Current Location");
        }
      } catch {
        setPickupLabel("Current Location");
      }
    } else {
      try {
        const [address] = await Location.reverseGeocodeAsync(coords);
        if (address) {
          const area = address.neighborhood || address.district || address.subregion || address.city || "";
          setUserAreaName(area);
          const label = [address.name, address.street, address.city || address.subregion]
            .filter(Boolean).slice(0, 2).join(", ");
          setPickupLabel(label || "Current Location");
        } else {
          setPickupLabel("Current Location");
        }
      } catch {
        setPickupLabel("Current Location");
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const startLocationWatch = async () => {
      if (Platform.OS === "web") {
        try {
          if (!navigator.geolocation) throw new Error("no geolocation");
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              if (!mounted) return;
              const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
              setUserLocation(coords);
              setLocationPermission(true);
              setLocationDetected(true);
              setPickupLabel("Current Location");
              reverseGeocodeAndSet(coords);
            },
            () => {
              if (!mounted) return;
              setUserLocation(LUCKNOW_CENTER);
              setLocationPermission(false);
              setLocationDetected(false);
              setPickupLabel("Lucknow, Uttar Pradesh");
            },
            { timeout: 10000, enableHighAccuracy: false, maximumAge: 120000 }
          );
        } catch {
          if (!mounted) return;
          setUserLocation(LUCKNOW_CENTER);
          setLocationPermission(false);
          setLocationDetected(false);
          setPickupLabel("Lucknow, Uttar Pradesh");
        }
      } else {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (!mounted) return;

          if (status !== "granted") {
            setLocationPermission(false);
            setLocationDetected(false);
            setUserLocation(LUCKNOW_CENTER);
            setPickupLabel("Lucknow, Uttar Pradesh");
            return;
          }

          setLocationPermission(true);

          // Step 1: Show cached last-known position immediately (no GPS wait)
          try {
            const last = await Location.getLastKnownPositionAsync({});
            if (last && mounted) {
              const coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
              setUserLocation(coords);
              setLocationDetected(true);
              setPickupLabel("Current Location");
              reverseGeocodeAndSet(coords);
            }
          } catch {}

          // Step 2: Start watching for a fresh fix — more reliable than getCurrentPositionAsync on Expo Go
          // watchPositionAsync keeps retrying internally; we stop after first good fix
          if (!mounted) return;
          locationSubRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 10 },
            async (loc) => {
              // Got a fresh fix — stop watching
              locationSubRef.current?.remove();
              locationSubRef.current = null;
              if (!mounted) return;
              const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
              setUserLocation(coords);
              setLocationDetected(true);
              reverseGeocodeAndSet(coords);
            }
          );
        } catch {
          if (!mounted) return;
          setLocationPermission(false);
          setLocationDetected(false);
          setUserLocation(LUCKNOW_CENTER);
          setPickupLabel("Lucknow, Uttar Pradesh");
        }
      }
    };

    startLocationWatch();

    return () => {
      mounted = false;
      locationSubRef.current?.remove();
      locationSubRef.current = null;
    };
  }, [reverseGeocodeAndSet]);


  const mapRegion = {
    latitude: userLocation?.latitude || LUCKNOW_CENTER.latitude,
    longitude: userLocation?.longitude || LUCKNOW_CENTER.longitude,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.topBar}>
          <Pressable style={styles.profileBtn}>
            <Ionicons name="person-outline" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.logoBar}>
            <Text style={[styles.logoText, { color: colors.text }]}>Safar </Text>
            <View style={styles.goBadge}>
              <Text style={styles.goText}>Go</Text>
            </View>
          </View>
          <Pressable onPress={toggleTheme}>
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.mapSection}>
          {userLocation ? (
            <>
              <AppMapView
                mapRef={mapRef}
                style={styles.map}
                initialRegion={mapRegion}
                showsUserLocation={locationPermission === true}
                showsMyLocationButton={false}
                showsCompass={false}
                pickupLabel={pickupLabel}
                isDark={isDark}
                userCoordinates={locationDetected && userLocation ? userLocation : undefined}
                onRouteSelected={(pickup, destination, distanceKm, durationMin, fare, vehicleType) => {
                  router.push({
                    pathname: "/booking/create",
                    params: {
                      destinationName: destination,
                      pickup,
                      distanceKm: String(distanceKm),
                      durationMin: String(durationMin),
                      fare: String(fare),
                      vehicleType,
                      vehicleLabel:
                        vehicleType === "suv" ? "SUV" : vehicleType === "mini" ? "Mini" : "Sedan",
                    },
                  });
                }}
              >
                {userLocation && (
                  <AppMarker
                    coordinate={userLocation}
                    title="Your Location"
                    description={pickupLabel}
                  >
                    <View style={driverStyles.userPin}>
                      <View style={driverStyles.userPinInner} />
                    </View>
                  </AppMarker>
                )}

              </AppMapView>

            </>
          ) : (
            <View style={[styles.map, styles.mapLoading, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={[styles.mapLoadingText, { color: colors.textSecondary }]}>Loading map...</Text>
            </View>
          )}
        </View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.quickActionsSection}>
          <View style={styles.quickGrid}>
            {quickActions.map((action, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  action.onPress();
                }}
                style={({ pressed }) => [
                  styles.quickAction,
                  { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.text }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.chipsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {allDestinations.map((dest) => (
              <Pressable
                key={dest.id}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/destination/[id]", params: { id: dest.id } });
                }}
                style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="location" size={14} color={Colors.gold} />
                <Text style={[styles.chipText, { color: colors.text }]}>{dest.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.cardsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tour Packages</Text>
            <Pressable onPress={() => router.push("/customer/destinations")}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>
          <View style={styles.cardsGrid}>
            {allDestinations.map((dest) => (
              <DestinationCard key={dest.id} item={dest} />
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <SearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        pickupText={pickupLabel}
        onPickupChange={(name) => setPickupLabel(name)}
        colors={colors}
        isDark={isDark}
        initialField={searchField}
        userLat={userLocation?.latitude}
        userLon={userLocation?.longitude}
        userAreaName={userAreaName}
      />
    </>
  );
}

const searchStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  destInputRow: {
    borderWidth: 1.5,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
  },
  destDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E74C3C",
  },
  pickupText: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  editPickupBtn: {
    padding: 4,
  },
  inputConnector: {
    paddingLeft: 18,
    height: 8,
  },
  connectorLine: {
    width: 2,
    height: "100%",
    marginLeft: 3,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    paddingVertical: 0,
  },
  recentSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  recentName: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  recentSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginTop: 8,
  },
  destResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  destThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  destResultName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  destResultTagline: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginBottom: 4,
  },
  destResultMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  destResultDist: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginRight: 8,
  },
  destResultPrice: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.gold,
  },
  emptySearch: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  emptySubtext: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
  },
  currentLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  currentLocIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  currentLocTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  currentLocSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
  },
  pickupItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  pricePerKmBadge: {
    backgroundColor: Colors.gold + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
  },
  pricePerKmText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: Colors.gold,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
  },
});

const unavailStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    paddingHorizontal: 24,
  },
  sheet: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 14,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E74C3C18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  location: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  message: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  statesBox: {
    borderRadius: 14,
    padding: 14,
    alignSelf: "stretch",
    gap: 10,
  },
  statesLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  statesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  statePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statePillText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  closeBtn: {
    alignSelf: "stretch",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  closeBtnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#0A0A0A",
  },
});

const driverStyles = StyleSheet.create({
  userPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(66,133,244,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  userPinInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4285F4",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  driverPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.gold,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 8,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
  },
  goBadge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  goText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#FFF",
  },
  mapSection: {
    marginHorizontal: 0,
    marginBottom: 16,
    position: "relative",
  },
  map: {
    width: "100%",
    height: MAP_HEIGHT,
  },
  mapLoading: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapLoadingText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
  },
  mapOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  mapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  searchOverlay: {
    position: "absolute",
    bottom: 42,
    left: 16,
    right: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  searchPickupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  searchPickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
  },
  searchPickupLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
  },
  searchPickupSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  searchDividerLine: {
    height: 1,
    marginLeft: 20,
  },
  searchDestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  searchDestDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E74C3C",
  },
  searchDestPlaceholder: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    flex: 1,
  },
  driverCountBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  driverCountText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#333",
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  chipsSection: {
    marginBottom: 16,
  },
  chipsRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
  },
  seeAllText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.gold,
  },
  cardsSection: {
    paddingHorizontal: 20,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  destCard: {
    width: CARD_WIDTH,
    height: 170,
    borderRadius: 16,
    overflow: "hidden",
  },
  destImage: {
    width: "100%",
    height: "100%",
  },
  destGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  destInfo: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  destName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#FFF",
    marginBottom: 4,
  },
  destMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  destPrice: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: Colors.gold,
  },
  destDistance: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  perKmBadge: {
    backgroundColor: "rgba(197,165,90,0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  perKmText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: Colors.gold,
  },
});
