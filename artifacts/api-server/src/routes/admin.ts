import { Router } from "express";
import { db } from "@workspace/db";
import { sgDrivers, sgDriverDocuments, sgRides, sgWithdrawals } from "@workspace/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { logger } from "../lib/logger";
import { ridesStore, onlineDrivers, activeDriverRides } from "../lib/io";

const router = Router();

// ── GET /api/admin/stats ──────────────────────────────────────────────────
router.get("/admin/stats", async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = todayStart.getTime();

    const liveRides = Array.from(ridesStore.values());
    const activeRidesList = liveRides.filter((r) => r.status === "searching" || r.status === "accepted" || r.status === "started");
    const searchingRides = liveRides.filter((r) => r.status === "searching").length;

    const onlineCount = onlineDrivers.size;
    const busyCount = activeDriverRides.size;

    const [completedRows] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sgRides)
      .where(eq(sgRides.status, "completed"));

    const [cancelledRows] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sgRides)
      .where(eq(sgRides.status, "cancelled"));

    const [todayCompletedRows] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sgRides)
      .where(and(eq(sgRides.status, "completed"), gte(sgRides.createdAt, todayTs)));

    const [totalRevenueRow] = await db
      .select({ total: sql<number>`coalesce(sum(fare::numeric), 0)` })
      .from(sgRides)
      .where(eq(sgRides.status, "completed"));

    const [todayRevenueRow] = await db
      .select({ total: sql<number>`coalesce(sum(fare::numeric), 0)` })
      .from(sgRides)
      .where(and(eq(sgRides.status, "completed"), gte(sgRides.createdAt, todayTs)));

    const [avgFareRow] = await db
      .select({ avg: sql<number>`coalesce(avg(fare::numeric), 0)` })
      .from(sgRides)
      .where(eq(sgRides.status, "completed"));

    const completedTotal = Number(completedRows?.count ?? 0);
    const cancelledTotal = Number(cancelledRows?.count ?? 0);

    res.json({
      totalRides: completedTotal + cancelledTotal + activeRidesList.length + liveRides.filter(r => r.status === "searching").length,
      activeRides: activeRidesList.length,
      searchingRides,
      completedToday: Number(todayCompletedRows?.count ?? 0),
      completedTotal,
      cancelledTotal,
      onlineDrivers: onlineCount,
      busyDrivers: busyCount,
      todayRevenue: Math.round(Number(todayRevenueRow?.total ?? 0)),
      totalRevenue: Math.round(Number(totalRevenueRow?.total ?? 0)),
      avgFare: Math.round(Number(avgFareRow?.avg ?? 0)),
    });
  } catch (err) {
    logger.error({ err }, "admin/stats error");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ── GET /api/admin/online-drivers ─────────────────────────────────────────
router.get("/admin/online-drivers", (_req, res) => {
  const drivers = Array.from(onlineDrivers.values()).map((d) => ({
    driverId: d.driverId,
    driverName: d.driverName,
    vehicle: d.vehicle,
    vehicleNumber: d.vehicleNumber,
    rating: d.rating,
    isOnline: true,
    isBusy: activeDriverRides.has(d.driverId),
  }));
  res.json(drivers);
});

// ── GET /api/admin/rides ──────────────────────────────────────────────────
router.get("/admin/rides", async (_req, res) => {
  try {
    const dbRides = await db
      .select()
      .from(sgRides)
      .orderBy(desc(sgRides.createdAt))
      .limit(200);

    const liveRides = Array.from(ridesStore.values())
      .filter((r) => !dbRides.some((d) => d.id === r.rideId))
      .map((r) => ({
        rideId: r.rideId,
        pickup: r.pickup,
        drop: r.drop,
        distanceKm: r.distanceKm,
        durationMin: r.durationMin,
        fare: r.fare,
        vehicleType: r.vehicleType,
        riderName: r.riderName,
        driverId: r.driverId,
        driverName: r.driverName,
        status: r.status,
        createdAt: r.createdAt,
      }));

    const combined = [
      ...liveRides,
      ...dbRides.map((r) => ({
        rideId: r.id,
        pickup: r.pickup,
        drop: r.dropLocation,
        distanceKm: Number(r.distanceKm ?? 0),
        durationMin: r.durationMin ?? 0,
        fare: Number(r.fare),
        vehicleType: r.vehicleType ?? "sedan",
        riderName: r.riderName ?? "",
        driverId: r.driverId ?? undefined,
        driverName: r.driverName ?? undefined,
        status: r.status ?? "searching",
        createdAt: r.createdAt,
      })),
    ].sort((a, b) => b.createdAt - a.createdAt);

    res.json(combined);
  } catch (err) {
    logger.error({ err }, "admin/rides error");
    res.status(500).json({ error: "Failed to fetch rides" });
  }
});

// ── GET /api/admin/drivers ────────────────────────────────────────────────
router.get("/admin/drivers", async (_req, res) => {
  try {
    const drivers = await db
      .select()
      .from(sgDrivers)
      .orderBy(desc(sgDrivers.createdAt));

    const documents = await db.select().from(sgDriverDocuments);

    const result = drivers.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      vehicle: d.vehicle ?? "",
      vehicleNumber: d.vehicleNumber ?? "",
      vehicleType: d.vehicleType ?? "sedan",
      kycStatus: d.kycStatus ?? "submitted",
      isAvailable: d.isAvailable ?? false,
      isBlocked: d.isBlocked ?? false,
      rating: Number(d.rating ?? 0),
      totalEarnings: Number(d.totalEarnings ?? 0),
      completedTrips: d.completedTrips ?? 0,
      commissionRate: d.commissionRate ?? 15,
      walletBalance: Number(d.walletBalance ?? 0),
      rejectionReason: d.rejectionReason ?? undefined,
      appliedAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-IN") : undefined,
      documents: documents
        .filter((doc) => doc.driverId === d.id)
        .map((doc) => ({
          type: doc.type,
          label: doc.label,
          status: doc.status ?? "pending",
          uploadDate: doc.uploadDate ?? undefined,
          rejectionReason: doc.rejectionReason ?? undefined,
          docNumber: undefined,
          expiryDate: undefined,
        })),
    }));

    res.json(result);
  } catch (err) {
    logger.error({ err }, "admin/drivers error");
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

// ── POST /api/admin/drivers/:id/approve ──────────────────────────────────
router.post("/admin/drivers/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    await db
      .update(sgDrivers)
      .set({ kycStatus: "approved", approvedAt: new Date(), rejectionReason: null })
      .where(eq(sgDrivers.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "admin/drivers/approve error");
    res.status(500).json({ error: "Failed to approve driver" });
  }
});

// ── POST /api/admin/drivers/:id/reject ───────────────────────────────────
router.post("/admin/drivers/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    await db
      .update(sgDrivers)
      .set({ kycStatus: "rejected", rejectionReason: reason ?? "Documents did not meet requirements." })
      .where(eq(sgDrivers.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "admin/drivers/reject error");
    res.status(500).json({ error: "Failed to reject driver" });
  }
});

// ── POST /api/admin/drivers/:id/block ─────────────────────────────────────
router.post("/admin/drivers/:id/block", async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await db.select().from(sgDrivers).where(eq(sgDrivers.id, id)).limit(1);
    if (!driver[0]) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    const newBlocked = !driver[0].isBlocked;
    await db.update(sgDrivers).set({ isBlocked: newBlocked }).where(eq(sgDrivers.id, id));
    res.json({ success: true, isBlocked: newBlocked });
  } catch (err) {
    logger.error({ err }, "admin/drivers/block error");
    res.status(500).json({ error: "Failed to toggle driver block" });
  }
});

// ── POST /api/admin/drivers/:id/documents/:type/verify ───────────────────
router.post("/admin/drivers/:id/documents/:type/verify", async (req, res) => {
  try {
    const { id, type } = req.params;
    await db
      .update(sgDriverDocuments)
      .set({ status: "verified", rejectionReason: null })
      .where(and(eq(sgDriverDocuments.driverId, id), eq(sgDriverDocuments.type, type)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "admin/documents/verify error");
    res.status(500).json({ error: "Failed to verify document" });
  }
});

// ── POST /api/admin/drivers/:id/documents/:type/reject ───────────────────
router.post("/admin/drivers/:id/documents/:type/reject", async (req, res) => {
  try {
    const { id, type } = req.params;
    const { reason } = req.body as { reason?: string };
    await db
      .update(sgDriverDocuments)
      .set({ status: "rejected", rejectionReason: reason ?? "Document unclear or expired" })
      .where(and(eq(sgDriverDocuments.driverId, id), eq(sgDriverDocuments.type, type)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "admin/documents/reject error");
    res.status(500).json({ error: "Failed to reject document" });
  }
});

// ── GET /api/admin/withdrawals ────────────────────────────────────────────
router.get("/admin/withdrawals", async (_req, res) => {
  try {
    const withdrawals = await db
      .select()
      .from(sgWithdrawals)
      .orderBy(desc(sgWithdrawals.requestedAt));
    res.json(
      withdrawals.map((w) => ({
        id: w.id,
        driverId: w.driverId,
        driverName: w.driverName,
        amount: Number(w.amount),
        bankName: w.bankName ?? undefined,
        accountNumber: w.accountNumber ?? undefined,
        accountHolder: w.accountHolder ?? undefined,
        upiId: w.upiId ?? undefined,
        method: w.method ?? "bank",
        status: w.status ?? "pending",
        requestedAt: w.requestedAt,
        approvedAt: w.approvedAt ?? undefined,
        paidAt: w.paidAt ?? undefined,
        rejectionReason: w.rejectionReason ?? undefined,
      }))
    );
  } catch (err) {
    logger.error({ err }, "admin/withdrawals error");
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

// ── POST /api/admin/withdrawals/:id/approve ───────────────────────────────
router.post("/admin/withdrawals/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    await db
      .update(sgWithdrawals)
      .set({ status: "approved", approvedAt: new Date().toLocaleDateString("en-IN") })
      .where(eq(sgWithdrawals.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "admin/withdrawals/approve error");
    res.status(500).json({ error: "Failed to approve withdrawal" });
  }
});

// ── POST /api/admin/withdrawals/:id/pay ───────────────────────────────────
router.post("/admin/withdrawals/:id/pay", async (req, res) => {
  try {
    const { id } = req.params;
    const w = await db.select().from(sgWithdrawals).where(eq(sgWithdrawals.id, id)).limit(1);
    if (!w[0]) {
      res.status(404).json({ error: "Withdrawal not found" });
      return;
    }
    const paid_at = new Date().toLocaleDateString("en-IN");
    await db
      .update(sgWithdrawals)
      .set({ status: "paid", paidAt: paid_at })
      .where(eq(sgWithdrawals.id, id));
    await db
      .update(sgDrivers)
      .set({ walletBalance: sql`wallet_balance::numeric - ${Number(w[0].amount)}` })
      .where(eq(sgDrivers.id, w[0].driverId));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "admin/withdrawals/pay error");
    res.status(500).json({ error: "Failed to mark withdrawal as paid" });
  }
});

// ── POST /api/admin/withdrawals/:id/reject ────────────────────────────────
router.post("/admin/withdrawals/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    await db
      .update(sgWithdrawals)
      .set({ status: "rejected", rejectionReason: reason ?? "Request rejected by admin." })
      .where(eq(sgWithdrawals.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "admin/withdrawals/reject error");
    res.status(500).json({ error: "Failed to reject withdrawal" });
  }
});

export default router;
