import { Router } from "express";
import { db } from "@workspace/db";
import { sgDrivers, sgDriverDocuments, sgRides, sgWithdrawals } from "@workspace/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// ── POST /api/drivers/register ────────────────────────────────────────────
// Called when a new driver completes registration on the mobile app.
router.post("/drivers/register", async (req, res) => {
  try {
    const { id, name, email, phone, passwordHash, vehicle, vehicleNumber, vehicleType, documents } =
      req.body as {
        id: string;
        name: string;
        email: string;
        phone: string;
        passwordHash: string;
        vehicle: string;
        vehicleNumber: string;
        vehicleType?: string;
        documents?: { type: string; label: string; status: string }[];
      };

    if (!id || !name || !email || !phone || !passwordHash) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Check if already registered
    const existing = await db.select({ id: sgDrivers.id }).from(sgDrivers).where(eq(sgDrivers.email, email)).limit(1);
    if (existing[0]) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    await db.insert(sgDrivers).values({
      id,
      name,
      email,
      phone,
      passwordHash,
      vehicle,
      vehicleNumber,
      vehicleType: vehicleType ?? "sedan",
      kycStatus: "submitted",
      isAvailable: false,
      isBlocked: false,
    });

    if (documents && documents.length > 0) {
      await db.insert(sgDriverDocuments).values(
        documents.map((d) => ({
          driverId: id,
          type: d.type,
          label: d.label,
          status: d.status,
          uploadDate: new Date().toLocaleDateString("en-IN"),
        }))
      );
    }

    logger.info({ driverId: id, email }, "Driver registered");
    res.json({ success: true, driverId: id });
  } catch (err) {
    logger.error({ err }, "drivers/register error");
    res.status(500).json({ error: "Failed to register driver" });
  }
});

// ── POST /api/drivers/login ───────────────────────────────────────────────
// Validate driver credentials against DB.
router.post("/drivers/login", async (req, res) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) {
      res.status(400).json({ error: "email required" });
      return;
    }
    const driver = await db.select().from(sgDrivers).where(eq(sgDrivers.email, email)).limit(1);
    if (!driver[0]) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    const d = driver[0];
    res.json({
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      passwordHash: d.passwordHash,
      vehicle: d.vehicle ?? "",
      vehicleNumber: d.vehicleNumber ?? "",
      vehicleType: d.vehicleType ?? "sedan",
      kycStatus: d.kycStatus ?? "submitted",
      isBlocked: d.isBlocked ?? false,
      commissionRate: d.commissionRate ?? 15,
      walletBalance: Number(d.walletBalance ?? 0),
    });
  } catch (err) {
    logger.error({ err }, "drivers/login error");
    res.status(500).json({ error: "Failed to login" });
  }
});

// ── GET /api/drivers/:id/dashboard ────────────────────────────────────────
router.get("/drivers/:id/dashboard", async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await db.select().from(sgDrivers).where(eq(sgDrivers.id, id)).limit(1);
    if (!driver[0]) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    const d = driver[0];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const [todayEarnings] = await db
      .select({ total: sql<number>`coalesce(sum(fare::numeric), 0)` })
      .from(sgRides)
      .where(and(eq(sgRides.driverId, id), eq(sgRides.status, "completed"), gte(sgRides.createdAt, todayStart.getTime())));

    const [weekEarnings] = await db
      .select({ total: sql<number>`coalesce(sum(fare::numeric), 0)` })
      .from(sgRides)
      .where(and(eq(sgRides.driverId, id), eq(sgRides.status, "completed"), gte(sgRides.createdAt, weekStart.getTime())));

    const recentRides = await db
      .select()
      .from(sgRides)
      .where(eq(sgRides.driverId, id))
      .orderBy(desc(sgRides.createdAt))
      .limit(10);

    res.json({
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      vehicle: d.vehicle ?? "",
      vehicleNumber: d.vehicleNumber ?? "",
      vehicleType: d.vehicleType ?? "sedan",
      kycStatus: d.kycStatus ?? "submitted",
      isBlocked: d.isBlocked ?? false,
      rating: Number(d.rating ?? 0),
      totalEarnings: Number(d.totalEarnings ?? 0),
      todayEarnings: Math.round(Number(todayEarnings?.total ?? 0)),
      weekEarnings: Math.round(Number(weekEarnings?.total ?? 0)),
      completedTrips: d.completedTrips ?? 0,
      commissionRate: d.commissionRate ?? 15,
      walletBalance: Number(d.walletBalance ?? 0),
      recentRides: recentRides.map((r) => ({
        rideId: r.id,
        pickup: r.pickup,
        drop: r.dropLocation,
        fare: Number(r.fare),
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, "drivers/dashboard error");
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

// ── POST /api/drivers/:id/withdraw ────────────────────────────────────────
router.post("/drivers/:id/withdraw", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, bankName, accountNumber, accountHolder, upiId, method } = req.body as {
      amount: number;
      bankName?: string;
      accountNumber?: string;
      accountHolder?: string;
      upiId?: string;
      method?: string;
    };

    const driver = await db.select().from(sgDrivers).where(eq(sgDrivers.id, id)).limit(1);
    if (!driver[0]) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    if (Number(driver[0].walletBalance) < amount) {
      res.status(400).json({ error: "Insufficient wallet balance" });
      return;
    }

    const wid = `WD${Date.now().toString().slice(-8)}`;
    await db.insert(sgWithdrawals).values({
      id: wid,
      driverId: id,
      driverName: driver[0].name,
      amount: String(amount),
      bankName: bankName ?? null,
      accountNumber: accountNumber ?? null,
      accountHolder: accountHolder ?? null,
      upiId: upiId ?? null,
      method: method ?? "bank",
      status: "pending",
      requestedAt: new Date().toLocaleDateString("en-IN"),
    });

    logger.info({ driverId: id, amount }, "Withdrawal requested");
    res.json({ success: true, withdrawalId: wid });
  } catch (err) {
    logger.error({ err }, "drivers/withdraw error");
    res.status(500).json({ error: "Failed to request withdrawal" });
  }
});

export default router;
