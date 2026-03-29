import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { buildMapHtml, MarkerData } from "./mapHtmlBuilder";

const GOLD = "#C5A55A";

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return domain.startsWith("http") ? domain : `https://${domain}`;
  return "http://localhost:5001";
}

function getOlaApiKey(): string {
  return process.env.EXPO_PUBLIC_OLA_API_KEY ?? "";
}

interface AppMapViewProps {
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  markers?: MarkerData[];
  mapRef?: React.RefObject<any>;
  children?: React.ReactNode;
  onRouteSelected?: (
    pickup: string,
    destination: string,
    distanceKm: number,
    durationMin: number,
    fare: number,
    vehicleType: string
  ) => void;
  pickupLabel?: string;
  isDark?: boolean;
  userCoordinates?: { latitude: number; longitude: number };
}

export function AppMapView({
  style,
  initialRegion,
  showsUserLocation,
  markers = [],
  mapRef,
  isDark = false,
  onRouteSelected,
}: AppMapViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lat = initialRegion?.latitude ?? 26.8467;
  const lng = initialRegion?.longitude ?? 80.9462;
  const latDelta = initialRegion?.latitudeDelta ?? 0.04;
  const zoom = latDelta < 0.01 ? 16 : latDelta < 0.05 ? 13 : 11;
  const apiBase = getApiBase();
  const olaApiKey = getOlaApiKey();

  const initialHtml = useMemo(
    () => buildMapHtml(lat, lng, zoom, showsUserLocation ?? false, markers, isDark, "", GOLD, apiBase, olaApiKey),
    [lat, lng, zoom, showsUserLocation, isDark, apiBase, olaApiKey]
  );

  const postMsg = useCallback((msg: object) => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) iframe.contentWindow.postMessage(msg, "*");
  }, []);

  useEffect(() => {
    postMsg({ type: "UPDATE_MARKERS", markers });
  }, [markers, postMsg]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === "BOOK_RIDE" && onRouteSelected) {
        onRouteSelected(
          e.data.pickup || "",
          e.data.destination || "",
          e.data.distanceKm || 0,
          e.data.durationMin || 0,
          e.data.fare || 0,
          e.data.rideType || "sedan"
        );
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onRouteSelected]);

  useEffect(() => {
    if (mapRef) {
      (mapRef as React.MutableRefObject<any>).current = {
        panTo: (la: number, ln: number, z?: number) => postMsg({ type: "PAN_TO", lat: la, lng: ln, zoom: z }),
        showRoute: (fLat: number, fLng: number, tLat: number, tLng: number) =>
          postMsg({ type: "SHOW_ROUTE", fromLat: fLat, fromLng: fLng, toLat: tLat, toLng: tLng }),
        setPickup: (name: string, la?: number, ln?: number) => postMsg({ type: "SET_PICKUP", name, lat: la, lng: ln }),
        setDest: (name: string, la?: number, ln?: number) => postMsg({ type: "SET_DEST", name, lat: la, lng: ln }),
      };
    }
  }, [mapRef, postMsg]);

  return (
    <View style={[style, webStyles.container]}>
      <iframe
        ref={iframeRef as any}
        srcDoc={initialHtml}
        style={{ width: "100%", height: "100%", border: "none" } as any}
        title="Safar Go Map"
        sandbox="allow-scripts allow-same-origin"
        allow="geolocation"
      />
    </View>
  );
}

export function AppMarker(_props: any) { return null; }
export function AppPolyline(_props: any) { return null; }

const webStyles = StyleSheet.create({
  container: { position: "relative", overflow: "hidden" },
});
