import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@safargo_pricing_config";

export interface PricingConfig {
  sedanRateUpto10km: number;
  sedanRateAfter10km: number;
  suvRateUpto10km: number;
  suvRateAfter10km: number;
  thresholdKm: number;
  dynamicPricingEnabled: boolean;
  surgeMultiplier: number;
}

export const DEFAULT_PRICING: PricingConfig = {
  sedanRateUpto10km: 15,
  sedanRateAfter10km: 12,
  suvRateUpto10km: 16,
  suvRateAfter10km: 13,
  thresholdKm: 10,
  dynamicPricingEnabled: false,
  surgeMultiplier: 1.2,
};

interface PricingContextValue {
  config: PricingConfig;
  updateConfig: (updates: Partial<PricingConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
  calculateFare: (distanceKm: number, vehicleKey: "sedan" | "suv") => number;
  isLoaded: boolean;
}

const PricingContext = createContext<PricingContextValue>({
  config: DEFAULT_PRICING,
  updateConfig: async () => {},
  resetConfig: async () => {},
  calculateFare: (distanceKm, vehicleKey) => {
    const baseRate = vehicleKey === "suv" ? DEFAULT_PRICING.suvRateUpto10km : DEFAULT_PRICING.sedanRateUpto10km;
    const longRate = vehicleKey === "suv" ? DEFAULT_PRICING.suvRateAfter10km : DEFAULT_PRICING.sedanRateAfter10km;
    if (distanceKm <= DEFAULT_PRICING.thresholdKm)
      return Math.round(distanceKm * baseRate);
    return Math.round(DEFAULT_PRICING.thresholdKm * baseRate + (distanceKm - DEFAULT_PRICING.thresholdKm) * longRate);
  },
  isLoaded: false,
});

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PricingConfig>(DEFAULT_PRICING);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setConfig({ ...DEFAULT_PRICING, ...parsed });
          } catch {}
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const updateConfig = useCallback(
    async (updates: Partial<PricingConfig>) => {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    },
    [config]
  );

  const resetConfig = useCallback(async () => {
    setConfig(DEFAULT_PRICING);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRICING));
  }, []);

  const calculateFare = useCallback(
    (distanceKm: number, vehicleKey: "sedan" | "suv"): number => {
      const {
        sedanRateUpto10km,
        sedanRateAfter10km,
        suvRateUpto10km,
        suvRateAfter10km,
        thresholdKm,
        dynamicPricingEnabled,
        surgeMultiplier,
      } = config;

      const baseRate = vehicleKey === "suv" ? suvRateUpto10km : sedanRateUpto10km;
      const longRate = vehicleKey === "suv" ? suvRateAfter10km : sedanRateAfter10km;

      let fare: number;
      if (distanceKm <= thresholdKm) {
        fare = distanceKm * baseRate;
      } else {
        fare = thresholdKm * baseRate + (distanceKm - thresholdKm) * longRate;
      }

      if (dynamicPricingEnabled) {
        fare = fare * surgeMultiplier;
      }

      return Math.round(fare);
    },
    [config]
  );

  return (
    <PricingContext.Provider value={{ config, updateConfig, resetConfig, calculateFare, isLoaded }}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  return useContext(PricingContext);
}
