import React from "react";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";

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
  markers?: any[];
  polylines?: any[];
  mapRef?: React.RefObject<any>;
  children?: React.ReactNode;
  onRouteSelected?: (pickup: string, destination: string) => void;
  pickupLabel?: string;
  isDark?: boolean;
}

export function AppMapView(props: AppMapViewProps) {
  return (
    <MapView
      ref={props.mapRef}
      style={props.style}
      provider={PROVIDER_DEFAULT}
      initialRegion={props.initialRegion}
      showsUserLocation={props.showsUserLocation}
      showsMyLocationButton={props.showsMyLocationButton ?? false}
      showsCompass={props.showsCompass ?? false}
    >
      {props.children}
    </MapView>
  );
}

export function AppMarker(props: {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  children?: React.ReactNode;
  key?: string;
}) {
  return <Marker {...props} />;
}

export function AppPolyline(props: {
  coordinates: { latitude: number; longitude: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
}) {
  return <Polyline {...props} />;
}
