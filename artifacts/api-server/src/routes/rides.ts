import { Router } from "express";
import { logger } from "../lib/logger";
import {
  ridesStore,
  onlineDrivers,
  activeDriverRides,
  broadcastRideRequest,
  getIO,
  type RideRecord,
} from "../lib/io";

const router = Router();

// ── POST /api/rides/create ─────────────────────────────────────────────────
// Called by customer when creating a ride. Stores the ride and broadcasts
// newRideRequest to all available online drivers.
router.post("/rides/create", (req, res) => {
  const {
    rideId: clientRideId,
    pickup,
    drop,
    distanceKm,
    durationMin,
    fare,
    vehicleType,
    riderName,
    customerSocketId,
  } = req.body as {
    rideId?: string;
    pickup: string;
    drop: string;
    distanceKm: number;
    durationMin: number;
    fare: number;
    vehicleType: string;
    riderName?: string;
    customerSocketId?: string;
  };

  if (!pickup || !drop || !fare) {
    res.status(400).json({ error: "pickup, drop, and fare are required" });
    return;
  }

  const rideId = clientRideId || `SG${Date.now().toString().slice(-8)}`;

  // Prevent duplicate creation
  if (ridesStore.has(rideId)) {
    const existing = ridesStore.get(rideId)!;
    res.json({ rideId, status: existing.status, driverCount: 0 });
    return;
  }

  const ride: RideRecord = {
    rideId,
    pickup,
    drop,
    distanceKm: distanceKm || 0,
    durationMin: durationMin || 0,
    fare,
    vehicleType: vehicleType || "sedan",
    riderName: riderName || "Passenger",
    customerSocketId,
    status: "searching",
    createdAt: Date.now(),
  };

  ridesStore.set(rideId, ride);
  logger.info({ rideId, pickup, drop, fare }, "Ride created");

  const driverCount = broadcastRideRequest(ride);
  logger.info({ rideId, driverCount }, "Broadcasted ride request to drivers");

  res.json({ rideId, status: "searching", driverCount });
});

// ── GET /api/rides/:rideId/status ─────────────────────────────────────────
// Customer polls this to check if a driver has been assigned.
router.get("/rides/:rideId/status", (req, res) => {
  const ride = ridesStore.get(req.params.rideId);
  if (!ride) {
    res.json({ status: "not_found" });
    return;
  }
  res.json({
    status: ride.status,
    rideId: ride.rideId,
    driverId: ride.driverId,
    driverName: ride.driverName,
    driverVehicle: ride.driverVehicle,
    driverVehicleNumber: ride.driverVehicleNumber,
    driverRating: ride.driverRating,
  });
});

// ── POST /api/rides/:rideId/accept ────────────────────────────────────────
// Called by driver after emitting acceptRide socket event.
// Prevents double-acceptance and marks driver as busy.
router.post("/rides/:rideId/accept", (req, res) => {
  const { rideId } = req.params;
  const { driverId, driverName } = req.body as { driverId: string; driverName?: string };

  if (!driverId) {
    res.status(400).json({ error: "driverId is required" });
    return;
  }

  // Check if driver already has an active ride
  const existingRide = activeDriverRides.get(driverId);
  if (existingRide && existingRide !== rideId) {
    logger.warn({ driverId, existingRide, rideId }, "Driver tried to accept ride while already on one");
    res.status(409).json({
      error: "You already have an active ride. Please complete your current ride first.",
      activeRideId: existingRide,
    });
    return;
  }

  const ride = ridesStore.get(rideId);
  if (!ride) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }

  if (ride.status === "accepted" && ride.driverId !== driverId) {
    res.status(409).json({ error: "Ride already accepted by another driver" });
    return;
  }

  // Mark ride as accepted
  const driver = onlineDrivers.get(driverId);
  ride.status = "accepted";
  ride.driverId = driverId;
  ride.driverName = driverName || driver?.driverName || "Driver";
  ride.driverVehicle = driver?.vehicle;
  ride.driverVehicleNumber = driver?.vehicleNumber;
  ride.driverRating = driver?.rating;
  ridesStore.set(rideId, ride);

  // Mark driver as busy
  activeDriverRides.set(driverId, rideId);
  logger.info({ driverId, rideId }, "Driver accepted ride — marked as busy");

  // Notify all other online drivers that this ride is unavailable
  const io = getIO();
  if (io) {
    for (const [otherId] of onlineDrivers) {
      if (otherId !== driverId) {
        io.to(`driver:${otherId}`).emit("rideUnavailable", { rideId, reason: "taken" });
      }
    }

    // Emit driverFound to customer via ride room
    io.to(`ride:${rideId}`).emit("driverFound", {
      rideId,
      driverId,
      driverName: ride.driverName,
      vehicle: ride.driverVehicle,
      vehicleNumber: ride.driverVehicleNumber,
      rating: ride.driverRating,
    });
  }

  res.json({ success: true, rideId, driverId });
});

// ── POST /api/rides/:rideId/complete ─────────────────────────────────────
// Called (internally via socket) when payment is confirmed.
// Also exposed as REST for robustness.
router.post("/rides/:rideId/complete", (req, res) => {
  const { rideId } = req.params;
  const ride = ridesStore.get(rideId);
  if (!ride) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }
  ride.status = "completed";
  ridesStore.set(rideId, ride);

  if (ride.driverId) {
    activeDriverRides.delete(ride.driverId);
    logger.info({ rideId, driverId: ride.driverId }, "Ride completed — driver freed");
  }

  res.json({ success: true });
});

export default router;
