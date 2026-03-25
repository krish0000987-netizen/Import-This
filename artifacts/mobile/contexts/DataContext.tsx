import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BookingData, sampleBookings, sampleDrivers, DriverData, destinations, vehicleTypes,
  CouponData, sampleCoupons, ReviewData, sampleReviews,
  SupportTicket, sampleTickets, WithdrawalRequest, sampleWithdrawals, DriverDocument,
  CustomDestination, DestinationItem, DestinationOverride,
} from "@/constants/data";

interface DataContextValue {
  bookings: BookingData[];
  favorites: string[];
  drivers: DriverData[];
  coupons: CouponData[];
  reviews: ReviewData[];
  tickets: SupportTicket[];
  withdrawals: WithdrawalRequest[];
  commissionRate: number;
  customDestinations: CustomDestination[];
  destinationOverrides: Record<string, DestinationOverride>;
  addBooking: (booking: Omit<BookingData, "id">) => Promise<BookingData>;
  cancelBooking: (id: string) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingData["status"]) => Promise<void>;
  toggleFavorite: (destinationId: string) => void;
  isFavorite: (destinationId: string) => boolean;
  updateDriverStatus: (driverId: string, updates: Partial<DriverData>) => void;
  toggleDriverBlock: (driverId: string) => void;
  updateDriverDocument: (driverId: string, docType: string, updates: Partial<DriverDocument>) => void;
  applyCoupon: (code: string, amount: number) => { valid: boolean; discount: number; message: string };
  addCoupon: (coupon: Omit<CouponData, "id">) => void;
  updateCoupon: (id: string, updates: Partial<CouponData>) => void;
  deleteCoupon: (id: string) => void;
  addReview: (review: Omit<ReviewData, "id">) => void;
  getDriverReviews: (driverId: string) => ReviewData[];
  addTicket: (ticket: Omit<SupportTicket, "id">) => void;
  updateTicket: (id: string, updates: Partial<SupportTicket>) => void;
  addWithdrawal: (withdrawal: Omit<WithdrawalRequest, "id">) => void;
  updateWithdrawal: (id: string, updates: Partial<WithdrawalRequest>) => void;
  setCommissionRate: (rate: number) => void;
  addDestination: (dest: Omit<CustomDestination, "id" | "isCustom" | "createdAt">) => void;
  updateDestination: (id: string, updates: DestinationOverride) => void;
  deleteDestination: (id: string) => void;
  getAllDestinations: () => DestinationItem[];
  getStats: () => {
    totalBookings: number; activeBookings: number; totalRevenue: number;
    totalDrivers: number; activeDrivers: number; completedBookings: number;
    cancelledBookings: number; avgRating: number; totalCommission: number;
  };
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<BookingData[]>(sampleBookings);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<DriverData[]>(sampleDrivers);
  const [coupons, setCoupons] = useState<CouponData[]>(sampleCoupons);
  const [reviews, setReviews] = useState<ReviewData[]>(sampleReviews);
  const [tickets, setTickets] = useState<SupportTicket[]>(sampleTickets);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(sampleWithdrawals);
  const [commissionRate, setCommissionRateState] = useState(15);
  const [customDestinations, setCustomDestinations] = useState<CustomDestination[]>([]);
  const [destinationOverrides, setDestinationOverrides] = useState<Record<string, DestinationOverride>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storedBookings, storedFavorites, storedCoupons, storedReviews, storedTickets,
             storedCustomDests, storedDestOverrides] = await Promise.all([
        AsyncStorage.getItem("@safargo_bookings"),
        AsyncStorage.getItem("@safargo_favorites"),
        AsyncStorage.getItem("@safargo_coupons"),
        AsyncStorage.getItem("@safargo_reviews"),
        AsyncStorage.getItem("@safargo_tickets"),
        AsyncStorage.getItem("@safargo_custom_destinations"),
        AsyncStorage.getItem("@safargo_destination_overrides"),
      ]);
      if (storedBookings) setBookings(JSON.parse(storedBookings));
      if (storedFavorites) setFavorites(JSON.parse(storedFavorites));
      if (storedCoupons) setCoupons(JSON.parse(storedCoupons));
      if (storedReviews) setReviews(JSON.parse(storedReviews));
      if (storedTickets) setTickets(JSON.parse(storedTickets));
      if (storedCustomDests) setCustomDestinations(JSON.parse(storedCustomDests));
      if (storedDestOverrides) setDestinationOverrides(JSON.parse(storedDestOverrides));
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  const saveBookings = async (b: BookingData[]) => {
    await AsyncStorage.setItem("@safargo_bookings", JSON.stringify(b));
  };
  const saveFavorites = async (f: string[]) => {
    await AsyncStorage.setItem("@safargo_favorites", JSON.stringify(f));
  };
  const saveCoupons = async (c: CouponData[]) => {
    await AsyncStorage.setItem("@safargo_coupons", JSON.stringify(c));
  };
  const saveReviews = async (r: ReviewData[]) => {
    await AsyncStorage.setItem("@safargo_reviews", JSON.stringify(r));
  };
  const saveTickets = async (t: SupportTicket[]) => {
    await AsyncStorage.setItem("@safargo_tickets", JSON.stringify(t));
  };

  const addBooking = useCallback(async (booking: Omit<BookingData, "id">): Promise<BookingData> => {
    const id = "b" + Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const newBooking: BookingData = { ...booking, id };
    const updated = [newBooking, ...bookings];
    setBookings(updated);
    await saveBookings(updated);
    return newBooking;
  }, [bookings]);

  const cancelBooking = useCallback(async (id: string) => {
    const updated = bookings.map((b) =>
      b.id === id ? { ...b, status: "cancelled" as const } : b
    );
    setBookings(updated);
    await saveBookings(updated);
  }, [bookings]);

  const updateBookingStatus = useCallback(async (id: string, status: BookingData["status"]) => {
    const updated = bookings.map((b) =>
      b.id === id ? { ...b, status } : b
    );
    setBookings(updated);
    await saveBookings(updated);
  }, [bookings]);

  const toggleFavorite = useCallback((destinationId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(destinationId)
        ? prev.filter((f) => f !== destinationId)
        : [...prev, destinationId];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (destinationId: string) => favorites.includes(destinationId),
    [favorites]
  );

  const updateDriverStatus = useCallback((driverId: string, updates: Partial<DriverData>) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, ...updates } : d))
    );
  }, []);

  const toggleDriverBlock = useCallback((driverId: string) => {
    setDrivers((prev) =>
      prev.map((d) => d.id === driverId ? { ...d, isBlocked: !d.isBlocked, isAvailable: d.isBlocked ? d.isAvailable : false } : d)
    );
  }, []);

  const updateDriverDocument = useCallback((driverId: string, docType: string, updates: Partial<DriverDocument>) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const docs = d.documents.map((doc) =>
          doc.type === docType ? { ...doc, ...updates } : doc
        );
        return { ...d, documents: docs };
      })
    );
  }, []);

  const applyCoupon = useCallback((code: string, amount: number) => {
    const coupon = coupons.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (!coupon) return { valid: false, discount: 0, message: "Invalid coupon code" };
    if (!coupon.isActive) return { valid: false, discount: 0, message: "This coupon is no longer active" };
    if (new Date(coupon.expiryDate) < new Date()) return { valid: false, discount: 0, message: "This coupon has expired" };
    if (coupon.usedCount >= coupon.usageLimit) return { valid: false, discount: 0, message: "Coupon usage limit reached" };
    if (amount < coupon.minOrderAmount) return { valid: false, discount: 0, message: `Minimum order amount is \u20B9${coupon.minOrderAmount}` };

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = Math.min((amount * coupon.discountValue) / 100, coupon.maxDiscount);
    } else {
      discount = Math.min(coupon.discountValue, coupon.maxDiscount);
    }
    return { valid: true, discount: Math.round(discount), message: `\u20B9${Math.round(discount)} discount applied!` };
  }, [coupons]);

  const addCoupon = useCallback((coupon: Omit<CouponData, "id">) => {
    const id = "c" + Date.now().toString();
    const updated = [...coupons, { ...coupon, id }];
    setCoupons(updated);
    saveCoupons(updated);
  }, [coupons]);

  const updateCoupon = useCallback((id: string, updates: Partial<CouponData>) => {
    const updated = coupons.map((c) => c.id === id ? { ...c, ...updates } : c);
    setCoupons(updated);
    saveCoupons(updated);
  }, [coupons]);

  const deleteCoupon = useCallback((id: string) => {
    const updated = coupons.filter((c) => c.id !== id);
    setCoupons(updated);
    saveCoupons(updated);
  }, [coupons]);

  const addReview = useCallback((review: Omit<ReviewData, "id">) => {
    const id = "r" + Date.now().toString();
    const updated = [...reviews, { ...review, id }];
    setReviews(updated);
    saveReviews(updated);
    const bUpdated = bookings.map((b) => b.id === review.bookingId ? { ...b, hasReview: true } : b);
    setBookings(bUpdated);
    saveBookings(bUpdated);
  }, [reviews, bookings]);

  const getDriverReviews = useCallback((driverId: string) => {
    return reviews.filter((r) => r.driverId === driverId);
  }, [reviews]);

  const addTicket = useCallback((ticket: Omit<SupportTicket, "id">) => {
    const id = "t" + Date.now().toString();
    const updated = [{ ...ticket, id }, ...tickets];
    setTickets(updated);
    saveTickets(updated);
  }, [tickets]);

  const updateTicket = useCallback((id: string, updates: Partial<SupportTicket>) => {
    const updated = tickets.map((t) => t.id === id ? { ...t, ...updates } : t);
    setTickets(updated);
    saveTickets(updated);
  }, [tickets]);

  const addWithdrawal = useCallback((withdrawal: Omit<WithdrawalRequest, "id">) => {
    const id = "w" + Date.now().toString();
    setWithdrawals((prev) => [{ ...withdrawal, id }, ...prev]);
  }, []);

  const updateWithdrawal = useCallback((id: string, updates: Partial<WithdrawalRequest>) => {
    setWithdrawals((prev) => prev.map((w) => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const setCommissionRate = useCallback((rate: number) => {
    setCommissionRateState(rate);
  }, []);

  const addDestination = useCallback(async (dest: Omit<CustomDestination, "id" | "isCustom" | "createdAt">) => {
    const id = "cd" + Date.now().toString();
    const newDest: CustomDestination = { ...dest, id, isCustom: true, createdAt: new Date().toISOString() };
    const updated = [...customDestinations, newDest];
    setCustomDestinations(updated);
    await AsyncStorage.setItem("@safargo_custom_destinations", JSON.stringify(updated));
  }, [customDestinations]);

  const updateDestination = useCallback(async (id: string, updates: DestinationOverride) => {
    const isCustom = customDestinations.some((d) => d.id === id);
    if (isCustom) {
      const updated = customDestinations.map((d) => d.id === id ? { ...d, ...updates } : d);
      setCustomDestinations(updated);
      await AsyncStorage.setItem("@safargo_custom_destinations", JSON.stringify(updated));
    } else {
      const newOverrides = { ...destinationOverrides, [id]: { ...(destinationOverrides[id] || {}), ...updates } };
      setDestinationOverrides(newOverrides);
      await AsyncStorage.setItem("@safargo_destination_overrides", JSON.stringify(newOverrides));
    }
  }, [customDestinations, destinationOverrides]);

  const deleteDestination = useCallback(async (id: string) => {
    const updated = customDestinations.filter((d) => d.id !== id);
    setCustomDestinations(updated);
    await AsyncStorage.setItem("@safargo_custom_destinations", JSON.stringify(updated));
  }, [customDestinations]);

  const getAllDestinations = useCallback((): DestinationItem[] => {
    const staticWithOverrides: DestinationItem[] = destinations.map((d) => ({
      ...d,
      ...(destinationOverrides[d.id] || {}),
      isCustom: false as const,
    }));
    return [...staticWithOverrides, ...customDestinations];
  }, [destinationOverrides, customDestinations]);

  const getStats = useCallback(() => {
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "in_progress").length;
    const completedBookings = bookings.filter((b) => b.status === "completed").length;
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;
    const totalRevenue = bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + b.fare, 0);
    const totalDrivers = drivers.length;
    const activeDrivers = drivers.filter((d) => d.isAvailable && !d.isBlocked).length;
    const avgRating = drivers.filter((d) => d.rating > 0).reduce((sum, d) => sum + d.rating, 0) / Math.max(drivers.filter((d) => d.rating > 0).length, 1);
    const totalCommission = Math.round(totalRevenue * commissionRate / 100);
    return { totalBookings, activeBookings, totalRevenue, totalDrivers, activeDrivers, completedBookings, cancelledBookings, avgRating: Math.round(avgRating * 10) / 10, totalCommission };
  }, [bookings, drivers, commissionRate]);

  const value = useMemo(
    () => ({
      bookings, favorites, drivers, coupons, reviews, tickets, withdrawals, commissionRate,
      customDestinations, destinationOverrides,
      addBooking, cancelBooking, updateBookingStatus, toggleFavorite, isFavorite,
      updateDriverStatus, toggleDriverBlock, updateDriverDocument,
      applyCoupon, addCoupon, updateCoupon, deleteCoupon,
      addReview, getDriverReviews,
      addTicket, updateTicket,
      addWithdrawal, updateWithdrawal,
      setCommissionRate,
      addDestination, updateDestination, deleteDestination, getAllDestinations,
      getStats,
    }),
    [bookings, favorites, drivers, coupons, reviews, tickets, withdrawals, commissionRate,
     customDestinations, destinationOverrides,
     addBooking, cancelBooking, updateBookingStatus, toggleFavorite, isFavorite,
     updateDriverStatus, toggleDriverBlock, updateDriverDocument,
     applyCoupon, addCoupon, updateCoupon, deleteCoupon,
     addReview, getDriverReviews,
     addTicket, updateTicket,
     addWithdrawal, updateWithdrawal,
     setCommissionRate,
     addDestination, updateDestination, deleteDestination, getAllDestinations,
     getStats]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
}
