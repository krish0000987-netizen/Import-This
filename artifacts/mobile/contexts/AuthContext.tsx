import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserData, DriverData } from "@/constants/data";
import { notifyDriverRegistered } from "@/services/driverBridge";

interface RegisterDriverPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  vehicle: string;
  vehicleNumber: string;
  vehicleType: "sedan" | "suv";
  documents: DriverData["documents"];
}

interface AuthContextValue {
  user: UserData | DriverData | null;
  isLoading: boolean;
  login: (email: string, password: string, role: string) => Promise<string | false>;
  register: (name: string, email: string, phone: string, password: string, role: string) => Promise<boolean>;
  registerDriver: (payload: RegisterDriverPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserData | DriverData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const defaultUsers: Record<string, UserData | DriverData> = {
  "admin@safargo.com": {
    id: "admin1",
    name: "Safar Admin",
    email: "admin@safargo.com",
    phone: "+91 99999 00000",
    role: "admin",
    walletBalance: 0,
    totalTrips: 0,
    memberSince: "2023-01-01",
  },
  "driver@safargo.com": {
    id: "demo_driver1",
    name: "Rajesh Kumar",
    email: "driver@safargo.com",
    phone: "+91 98765 43210",
    role: "driver",
    walletBalance: 1250,
    totalTrips: 142,
    memberSince: "2024-03-15",
    vehicle: "Maruti Suzuki Dzire",
    vehicleNumber: "UP 32 AB 1234",
    rating: 4.8,
    isAvailable: true,
    isBlocked: false,
    kycStatus: "approved",
    totalEarnings: 87450,
    todayEarnings: 1240,
    weekEarnings: 6800,
    monthEarnings: 22500,
    completedTrips: 138,
    commissionRate: 15,
    documents: [
      { type: "driving_license", label: "Driving License (DL)", status: "verified", uploadDate: "2024-03-16", expiryDate: "2029-03" },
      { type: "aadhaar", label: "Aadhaar Card", status: "verified", uploadDate: "2024-03-16" },
      { type: "pan", label: "PAN Card", status: "verified", uploadDate: "2024-03-16" },
      { type: "rc", label: "Vehicle RC (Registration)", status: "verified", uploadDate: "2024-03-16", expiryDate: "2026-08" },
      { type: "insurance", label: "Vehicle Insurance", status: "verified", uploadDate: "2024-03-16", expiryDate: "2025-12" },
    ],
  } as DriverData,
  "customer@safargo.com": {
    id: "demo_customer1",
    name: "Arjun Sharma",
    email: "customer@safargo.com",
    phone: "+91 98100 11223",
    role: "customer",
    walletBalance: 500,
    totalTrips: 23,
    memberSince: "2024-06-01",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | DriverData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem("@safargo_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load user", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, _password: string, _role: string): Promise<string | false> => {
    const normalizedEmail = email.toLowerCase().trim();
    const foundUser = defaultUsers[normalizedEmail];
    if (foundUser) {
      setUser(foundUser);
      await AsyncStorage.setItem("@safargo_user", JSON.stringify(foundUser));
      return foundUser.role;
    }
    const stored = await AsyncStorage.getItem("@safargo_registered_" + normalizedEmail);
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      await AsyncStorage.setItem("@safargo_user", JSON.stringify(u));
      return u.role;
    }
    return false;
  };

  const register = async (name: string, email: string, phone: string, _password: string, role: string): Promise<boolean> => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newUser: UserData = {
      id,
      name,
      email: email.toLowerCase().trim(),
      phone,
      role: role as "customer" | "driver" | "admin",
      walletBalance: 0,
      totalTrips: 0,
      memberSince: new Date().toISOString().split("T")[0],
    };
    setUser(newUser);
    await AsyncStorage.setItem("@safargo_user", JSON.stringify(newUser));
    await AsyncStorage.setItem("@safargo_registered_" + newUser.email, JSON.stringify(newUser));
    return true;
  };

  const registerDriver = async (payload: RegisterDriverPayload): Promise<boolean> => {
    const id = "d_" + Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const today = new Date().toISOString().split("T")[0];

    const newDriver: DriverData = {
      id,
      name: payload.name,
      email: payload.email.toLowerCase().trim(),
      phone: payload.phone,
      role: "driver",
      walletBalance: 0,
      totalTrips: 0,
      memberSince: today,
      vehicle: payload.vehicle,
      vehicleNumber: payload.vehicleNumber,
      rating: 0,
      isAvailable: false,
      isBlocked: false,
      kycStatus: "submitted",
      totalEarnings: 0,
      todayEarnings: 0,
      weekEarnings: 0,
      monthEarnings: 0,
      completedTrips: 0,
      commissionRate: 15,
      documents: payload.documents,
    };

    setUser(newDriver);
    await AsyncStorage.setItem("@safargo_user", JSON.stringify(newDriver));
    await AsyncStorage.setItem("@safargo_registered_" + newDriver.email, JSON.stringify(newDriver));

    const existing = await AsyncStorage.getItem("@safargo_pending_drivers");
    const pendingList: DriverData[] = existing ? JSON.parse(existing) : [];
    pendingList.push(newDriver);
    await AsyncStorage.setItem("@safargo_pending_drivers", JSON.stringify(pendingList));

    notifyDriverRegistered(newDriver);

    return true;
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem("@safargo_user");
  };

  const updateUser = async (updates: Partial<UserData | DriverData>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem("@safargo_user", JSON.stringify(updated));
    await AsyncStorage.setItem("@safargo_registered_" + updated.email, JSON.stringify(updated));
  };

  const value = useMemo(
    () => ({ user, isLoading, login, register, registerDriver, logout, updateUser }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
