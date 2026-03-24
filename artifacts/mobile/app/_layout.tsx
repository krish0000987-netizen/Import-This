import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DataProvider } from "@/contexts/DataContext";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_600SemiBold,
} from "@expo-google-fonts/playfair-display";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="customer" />
      <Stack.Screen name="driver" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="destination/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="booking/create"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="booking/confirmed"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen name="terms" options={{ headerShown: false }} />
      <Stack.Screen name="driver-agreement" options={{ headerShown: false }} />
      <Stack.Screen name="driver-register" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <ThemeProvider>
              <AuthProvider>
                <DataProvider>
                  <RootLayoutNav />
                </DataProvider>
              </AuthProvider>
            </ThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
