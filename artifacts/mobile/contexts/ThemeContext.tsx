import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: typeof Colors.light;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    AsyncStorage.getItem("@safargo_theme").then((v) => {
      if (v === "dark" || v === "light") setMode(v);
    });
  }, []);

  const toggleTheme = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    AsyncStorage.setItem("@safargo_theme", next);
  };

  const value = useMemo(
    () => ({
      mode,
      colors: mode === "dark" ? Colors.dark : Colors.light,
      isDark: mode === "dark",
      toggleTheme,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
