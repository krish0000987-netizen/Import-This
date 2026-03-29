import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserData, DriverData } from "@/constants/data";
import { notifyDriverRegistered } from "@/services/driverBridge";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5001";

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

// Admin credentials — change this password before going live
const ADMIN_EMAIL = "admin@safargo.com";
const ADMIN_PASSWORD = "demo1234";

const adminUser: UserData = {
  id: "admin1",
  name: "Safar Admin",
  email: ADMIN_EMAIL,
  phone: "+91 99999 00000",
  role: "admin",
  walletBalance: 0,
  totalTrips: 0,
  memberSince: "2023-01-01",
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

  const login = async (email: string, password: string, _role: string): Promise<string | false> => {
    const normalizedEmail = email.toLowerCase().trim();

    // Admin account — fixed credentials
    if (normalizedEmail === ADMIN_EMAIL) {
      if (password.trim() !== ADMIN_PASSWORD) return false;
      setUser(adminUser);
      await AsyncStorage.setItem("@safargo_user", JSON.stringify(adminUser));
      return "admin";
    }

    // Registered users (drivers and customers)
    const stored = await AsyncStorage.getItem("@safargo_registered_" + normalizedEmail);
    if (stored) {
      const record = JSON.parse(stored) as (UserData | DriverData) & { _pw?: string };
      if (record._pw && record._pw !== password) return false;
      const { _pw: _, ...u } = record;
      setUser(u as UserData | DriverData);
      await AsyncStorage.setItem("@safargo_user", JSON.stringify(u));
      return u.role;
    }

    return false;
  };

  const register = async (name: string, email: string, phone: string, password: string, role: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();

    // Prevent registering with the admin email
    if (normalizedEmail === ADMIN_EMAIL) return false;

    // Check if email already registered
    const existing = await AsyncStorage.getItem("@safargo_registered_" + normalizedEmail);
    if (existing) return false;

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newUser: UserData = {
      id,
      name,
      email: normalizedEmail,
      phone,
      role: role as "customer" | "driver" | "admin",
      walletBalance: 0,
      totalTrips: 0,
      memberSince: new Date().toISOString().split("T")[0],
    };
    // Store password separately alongside the user record
    const stored = { ...newUser, _pw: password };
    setUser(newUser);
    await AsyncStorage.setItem("@safargo_user", JSON.stringify(newUser));
    await AsyncStorage.setItem("@safargo_registered_" + normalizedEmail, JSON.stringify(stored));
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
    // Store driver record with password so they can log back in
    const storedDriver = { ...newDriver, _pw: payload.password };
    await AsyncStorage.setItem("@safargo_registered_" + newDriver.email, JSON.stringify(storedDriver));

    const existing = await AsyncStorage.getItem("@safargo_pending_drivers");
    const pendingList: DriverData[] = existing ? JSON.parse(existing) : [];
    pendingList.push(newDriver);
    await AsyncStorage.setItem("@safargo_pending_drivers", JSON.stringify(pendingList));

    notifyDriverRegistered(newDriver);

    // Also register on the server for admin panel visibility
    try {
      await fetch(`${API_BASE}/api/drivers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: newDriver.name,
          email: newDriver.email,
          phone: newDriver.phone,
          passwordHash: payload.password,
          vehicle: newDriver.vehicle,
          vehicleNumber: newDriver.vehicleNumber,
          vehicleType: (payload as any).vehicleType ?? "sedan",
          documents: payload.documents.map((d) => ({
            type: d.type,
            label: d.label,
            status: d.status,
          })),
        }),
      });
    } catch {
      // Registration still succeeds locally even if server is unreachable
    }

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
    // Preserve the stored password when updating profile
    const storedRaw = await AsyncStorage.getItem("@safargo_registered_" + updated.email);
    const pw = storedRaw ? (JSON.parse(storedRaw) as any)._pw : undefined;
    await AsyncStorage.setItem(
      "@safargo_registered_" + updated.email,
      JSON.stringify(pw ? { ...updated, _pw: pw } : updated),
    );
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
