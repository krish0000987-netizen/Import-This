import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import { buildMapHtml, MarkerData } from "./mapHtmlBuilder";

const GOLD = "#C5A55A";

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:5000";
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
  const webViewRef = useRef<WebView>(null);
  const lat = initialRegion?.latitude ?? 26.8467;
  const lng = initialRegion?.longitude ?? 80.9462;
  const latDelta = initialRegion?.latitudeDelta ?? 0.04;
  const zoom = latDelta < 0.01 ? 16 : latDelta < 0.05 ? 13 : 11;
  const apiBase = getApiBase();
  const olaApiKey = getOlaApiKey();

  const html = useMemo(
    () => buildMapHtml(lat, lng, zoom, showsUserLocation ?? false, markers, isDark, "", GOLD, apiBase, olaApiKey),
    [lat, lng, zoom, showsUserLocation, isDark, apiBase, olaApiKey]
  );

  const inject = useCallback((code: string) => {
    webViewRef.current?.injectJavaScript(`(function(){${code}})();true;`);
  }, []);

  const postToWebView = useCallback((msg: object) => {
    inject(`window.__nativeMsg(${JSON.stringify(msg)})`);
  }, [inject]);

  useEffect(() => {
    postToWebView({ type: "UPDATE_MARKERS", markers });
  }, [markers, postToWebView]);

  useEffect(() => {
    if (mapRef) {
      (mapRef as React.MutableRefObject<any>).current = {
        animateToRegion: (region: any) =>
          postToWebView({ type: "PAN_TO", lat: region.latitude, lng: region.longitude, zoom: 14 }),
        panTo: (la: number, ln: number, z?: number) =>
          postToWebView({ type: "PAN_TO", lat: la, lng: ln, zoom: z ?? 13 }),
        showRoute: (fLat: number, fLng: number, tLat: number, tLng: number) =>
          postToWebView({ type: "SHOW_ROUTE", fromLat: fLat, fromLng: fLng, toLat: tLat, toLng: tLng }),
        setPickup: (name: string, la?: number, ln?: number) =>
          postToWebView({ type: "SET_PICKUP", name, lat: la, lng: ln }),
        setDest: (name: string, la?: number, ln?: number) =>
          postToWebView({ type: "SET_DEST", name, lat: la, lng: ln }),
      };
    }
  }, [mapRef, postToWebView]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (!data) return;
      if (data.type === "BOOK_RIDE" && onRouteSelected) {
        onRouteSelected(
          data.pickup || "",
          data.destination || "",
          data.distanceKm || 0,
          data.durationMin || 0,
          data.fare || 0,
          data.rideType || "sedan"
        );
      }
    } catch (_) {}
  }, [onRouteSelected]);

  return (
    <View style={[style, nativeStyles.container]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={nativeStyles.webview}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={["*"]}
        mixedContentMode="always"
        allowUniversalAccessFromFileURLs
        allowFileAccessFromFileURLs
        onMessage={onMessage}
        onError={(e) => console.warn("[MapWrapper.native] WebView error:", e.nativeEvent.description)}
      />
    </View>
  );
}

export function AppMarker(_props: any) { return null; }
export function AppPolyline(_props: any) { return null; }

const nativeStyles = StyleSheet.create({
  container: { overflow: "hidden" },
  webview: { flex: 1, backgroundColor: "transparent" },
});
