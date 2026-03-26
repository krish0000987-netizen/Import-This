import { pgTable, text, boolean, numeric, integer, timestamp, bigint, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sgDrivers = pgTable("sg_drivers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  vehicle: text("vehicle"),
  vehicleNumber: text("vehicle_number"),
  vehicleType: text("vehicle_type").default("sedan"),
  kycStatus: text("kyc_status").default("submitted"),
  isAvailable: boolean("is_available").default(false),
  isBlocked: boolean("is_blocked").default(false),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  totalEarnings: numeric("total_earnings", { precision: 12, scale: 2 }).default("0"),
  todayEarnings: numeric("today_earnings", { precision: 12, scale: 2 }).default("0"),
  weekEarnings: numeric("week_earnings", { precision: 12, scale: 2 }).default("0"),
  monthEarnings: numeric("month_earnings", { precision: 12, scale: 2 }).default("0"),
  completedTrips: integer("completed_trips").default(0),
  commissionRate: integer("commission_rate").default(15),
  walletBalance: numeric("wallet_balance", { precision: 12, scale: 2 }).default("0"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
});

export const sgDriverDocuments = pgTable("sg_driver_documents", {
  id: serial("id").primaryKey(),
  driverId: text("driver_id").notNull().references(() => sgDrivers.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  label: text("label").notNull(),
  status: text("status").default("pending"),
  uploadDate: text("upload_date"),
  rejectionReason: text("rejection_reason"),
});

export const sgRides = pgTable("sg_rides", {
  id: text("id").primaryKey(),
  pickup: text("pickup").notNull(),
  dropLocation: text("drop_location").notNull(),
  distanceKm: numeric("distance_km", { precision: 8, scale: 2 }),
  durationMin: integer("duration_min"),
  fare: numeric("fare", { precision: 10, scale: 2 }).notNull(),
  vehicleType: text("vehicle_type").default("sedan"),
  riderName: text("rider_name"),
  customerId: text("customer_id"),
  driverId: text("driver_id"),
  driverName: text("driver_name"),
  driverVehicle: text("driver_vehicle"),
  driverVehicleNumber: text("driver_vehicle_number"),
  status: text("status").default("searching"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  acceptedAt: bigint("accepted_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
});

export const sgWithdrawals = pgTable("sg_withdrawals", {
  id: text("id").primaryKey(),
  driverId: text("driver_id").notNull(),
  driverName: text("driver_name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountHolder: text("account_holder"),
  upiId: text("upi_id"),
  method: text("method").default("bank"),
  status: text("status").default("pending"),
  requestedAt: text("requested_at").notNull(),
  approvedAt: text("approved_at"),
  paidAt: text("paid_at"),
  rejectionReason: text("rejection_reason"),
});

export const insertDriverSchema = createInsertSchema(sgDrivers);
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof sgDrivers.$inferSelect;

export const insertRideSchema = createInsertSchema(sgRides);
export type InsertRide = z.infer<typeof insertRideSchema>;
export type Ride = typeof sgRides.$inferSelect;

export const insertWithdrawalSchema = createInsertSchema(sgWithdrawals);
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof sgWithdrawals.$inferSelect;
