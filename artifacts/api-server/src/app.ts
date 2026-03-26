import express, { type Express } from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { paymentStore } from "./routes/payments";
import {
  setIO,
  onlineDrivers,
  activeDriverRides,
  ridesStore,
  broadcastRideRequest,
  type RideRecord,
  type OnlineDriver,
} from "./lib/io";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

// Wire the io singleton so routes can emit events
setIO(io);

// In-memory: OTP store and ride rooms
const otpStore = new Map<string, string>();
const rideRooms = new Map<string, { customerSocketId?: string; driverSocketId?: string }>();

export const pendingPaymentRides = new Map<string, { fare: number; status: "pending_payment" | "completed" }>();

function getRideRoom(rideId: string) {
  if (!rideRooms.has(rideId)) rideRooms.set(rideId, {});
  return rideRooms.get(rideId)!;
}

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Socket connected");

  // ── Ride rooms (customer + driver join for targeted events) ────────────────

  socket.on("joinRideRoom", ({ rideId, role }: { rideId: string; role: "customer" | "driver" }) => {
    socket.join(`ride:${rideId}`);
    const room = getRideRoom(rideId);
    if (role === "customer") room.customerSocketId = socket.id;
    if (role === "driver") room.driverSocketId = socket.id;
    logger.info({ rideId, role, socketId: socket.id }, "Joined ride room");

    // Re-emit requestPayment if customer rejoins a pending-payment ride
    if (role === "customer") {
      const pending = pendingPaymentRides.get(rideId);
      if (pending && pending.status === "pending_payment") {
        socket.emit("requestPayment", { rideId, fare: pending.fare });
      }
    }
  });

  // ── Driver online / offline ────────────────────────────────────────────────

  socket.on(
    "driverOnline",
    (payload: {
      driverId: string;
      driverName?: string;
      vehicle?: string;
      vehicleNumber?: string;
      rating?: number;
    }) => {
      const { driverId, driverName, vehicle, vehicleNumber, rating } = payload;

      // Join per-driver room so we can target this driver with ride requests
      socket.join(`driver:${driverId}`);

      const driverInfo: OnlineDriver = {
        socketId: socket.id,
        driverId,
        driverName: driverName || "Driver",
        vehicle: vehicle || "Sedan",
        vehicleNumber: vehicleNumber || "",
        rating: rating ?? 4.5,
      };
      onlineDrivers.set(driverId, driverInfo);
      logger.info({ driverId, vehicle }, "Driver online");
    },
  );

  socket.on("driverOffline", ({ driverId }: { driverId: string }) => {
    socket.leave(`driver:${driverId}`);
    onlineDrivers.delete(driverId);
    // NOTE: we intentionally keep activeDriverRides so if the driver reconnects mid-ride
    // the server still knows they're busy. It clears on paymentConfirmed.
    logger.info({ driverId }, "Driver offline");
  });

  // ── Customer looks for a driver ────────────────────────────────────────────

  socket.on(
    "findDriver",
    (payload: {
      rideId: string;
      pickup: string;
      drop: string;
      distanceKm: number;
      durationMin: number;
      fare: number;
      vehicleType: string;
      riderName?: string;
    }) => {
      const { rideId, pickup, drop, distanceKm, durationMin, fare, vehicleType, riderName } = payload;
      logger.info({ rideId, pickup, drop, fare }, "findDriver event received");

      // Store (or update) the ride record so drivers can see it
      if (!ridesStore.has(rideId)) {
        const ride: RideRecord = {
          rideId,
          pickup,
          drop,
          distanceKm,
          durationMin,
          fare,
          vehicleType,
          riderName: riderName || "Passenger",
          customerSocketId: socket.id,
          status: "searching",
          createdAt: Date.now(),
        };
        ridesStore.set(rideId, ride);
      } else {
        // Update customer socket id in case they reconnected
        const ride = ridesStore.get(rideId)!;
        ride.customerSocketId = socket.id;
        ridesStore.set(rideId, ride);
      }

      // Broadcast to all available online drivers
      const ride = ridesStore.get(rideId)!;
      const driverCount = broadcastRideRequest(ride);

      if (driverCount === 0) {
        // No drivers available right now — tell the customer
        socket.emit("noDriverAvailable", { rideId });
        logger.info({ rideId }, "No drivers available");
      }
    },
  );

  // ── Driver accepts a ride ──────────────────────────────────────────────────

  socket.on("acceptRide", ({ rideId, driverId }: { rideId: string; driverId: string }) => {
    // Block if driver already has an active ride
    const existingRide = activeDriverRides.get(driverId);
    if (existingRide && existingRide !== rideId) {
      socket.emit("rideAcceptError", {
        rideId,
        message: "You already have an active ride. Please complete it first.",
        activeRideId: existingRide,
      });
      logger.warn({ driverId, existingRide, rideId }, "Driver tried to double-accept");
      return;
    }

    const ride = ridesStore.get(rideId);
    if (!ride) {
      socket.emit("rideUnavailable", { rideId, reason: "not_found" });
      return;
    }

    // Race condition: another driver already accepted
    if (ride.status === "accepted" && ride.driverId !== driverId) {
      socket.emit("rideUnavailable", { rideId, reason: "taken" });
      return;
    }

    // Claim the ride
    const driver = onlineDrivers.get(driverId);
    ride.status = "accepted";
    ride.driverId = driverId;
    ride.driverName = driver?.driverName || "Driver";
    ride.driverVehicle = driver?.vehicle;
    ride.driverVehicleNumber = driver?.vehicleNumber;
    ride.driverRating = driver?.rating;
    ridesStore.set(rideId, ride);

    // Mark driver as busy
    activeDriverRides.set(driverId, rideId);
    logger.info({ driverId, rideId }, "Ride accepted via socket");

    // Tell all other drivers this ride is gone
    for (const [otherId] of onlineDrivers) {
      if (otherId !== driverId) {
        io.to(`driver:${otherId}`).emit("rideUnavailable", { rideId, reason: "taken" });
      }
    }

    // Notify both sides via the ride room
    io.to(`ride:${rideId}`).emit("rideAccepted", {
      rideId,
      driverId,
      driverName: ride.driverName,
      vehicle: ride.driverVehicle,
      vehicleNumber: ride.driverVehicleNumber,
      rating: ride.driverRating,
    });

    // Send driverFound to the customer socket directly (in case they haven't joined the room yet)
    if (ride.customerSocketId) {
      io.to(ride.customerSocketId).emit("driverFound", {
        rideId,
        driverId,
        driverName: ride.driverName,
        vehicle: ride.driverVehicle,
        vehicleNumber: ride.driverVehicleNumber,
        rating: ride.driverRating,
      });
    }
  });

  // ── Driver rejects a ride ──────────────────────────────────────────────────

  socket.on("rejectRide", ({ rideId, driverId }: { rideId: string; driverId: string }) => {
    logger.info({ rideId, driverId }, "Driver rejected ride");
    // No action needed — other drivers still hold the request
  });

  // ── Cancel ride ────────────────────────────────────────────────────────────

  socket.on("cancelRide", ({ rideId }: { rideId: string }) => {
    const ride = ridesStore.get(rideId);
    if (ride) {
      ride.status = "cancelled";
      ridesStore.set(rideId, ride);
      // Free the driver if they had claimed it
      if (ride.driverId) activeDriverRides.delete(ride.driverId);
    }
    io.to(`ride:${rideId}`).emit("rideCancelled", { rideId });
    otpStore.delete(rideId);
    logger.info({ rideId }, "Ride cancelled");
  });

  // ── OTP flow ───────────────────────────────────────────────────────────────

  socket.on("driverReachedPickup", ({ rideId }: { rideId: string }) => {
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    otpStore.set(rideId, otp);
    logger.info({ rideId, otp }, "Driver reached pickup — OTP generated");

    const room = getRideRoom(rideId);
    if (room.customerSocketId) {
      io.to(room.customerSocketId).emit("rideOtpReady", { otp });
    } else {
      // Also check the ride record's stored customerSocketId
      const ride = ridesStore.get(rideId);
      if (ride?.customerSocketId) {
        io.to(ride.customerSocketId).emit("rideOtpReady", { otp });
      } else {
        io.to(`ride:${rideId}`).emit("rideOtpReady", { otp });
      }
    }
    socket.emit("showOtpEntry", { rideId });
  });

  socket.on("driverSubmitOtp", ({ rideId, otp }: { rideId: string; otp: string }) => {
    const correctOtp = otpStore.get(rideId);
    logger.info({ rideId, submitted: otp, correct: correctOtp }, "Driver submitted OTP");

    if (correctOtp && otp.trim() === correctOtp) {
      otpStore.delete(rideId);
      // Mark ride as started
      const ride = ridesStore.get(rideId);
      if (ride) { ride.status = "started"; ridesStore.set(rideId, ride); }
      io.to(`ride:${rideId}`).emit("otpVerified", { rideId });
      logger.info({ rideId }, "OTP verified — ride started");
    } else {
      socket.emit("otpRejected", { rideId, message: "Incorrect OTP. Please try again." });
    }
  });

  // ── Payment flow ───────────────────────────────────────────────────────────

  socket.on("driverEndTrip", ({ rideId, fare }: { rideId: string; fare: number }) => {
    logger.info({ rideId, fare }, "Driver ended trip — awaiting customer payment");
    pendingPaymentRides.set(rideId, { fare, status: "pending_payment" });

    const room = getRideRoom(rideId);
    socket.emit("awaitingPayment", { rideId, fare });

    if (room.customerSocketId) {
      io.to(room.customerSocketId).emit("requestPayment", { rideId, fare });
    } else {
      const ride = ridesStore.get(rideId);
      if (ride?.customerSocketId) {
        io.to(ride.customerSocketId).emit("requestPayment", { rideId, fare });
      } else {
        io.to(`ride:${rideId}`).emit("requestPayment", { rideId, fare });
      }
    }
  });

  socket.on("customerPaymentDone", ({ rideId }: { rideId: string }) => {
    const payment = paymentStore.get(rideId);
    if (!payment || payment.status !== "paid") {
      socket.emit("paymentError", { rideId, message: "Payment not yet confirmed. Please try again." });
      return;
    }

    const pending = pendingPaymentRides.get(rideId);
    if (pending) pending.status = "completed";

    // Mark ride completed + free driver
    const ride = ridesStore.get(rideId);
    if (ride) {
      ride.status = "completed";
      ridesStore.set(rideId, ride);
      if (ride.driverId) {
        activeDriverRides.delete(ride.driverId);
        logger.info({ rideId, driverId: ride.driverId }, "Driver freed after payment confirmed");
      }
    }

    logger.info({ rideId }, "Payment confirmed — ride completed");
    io.to(`ride:${rideId}`).emit("paymentConfirmed", {
      rideId,
      fare: pending?.fare ?? payment.amount / 100,
      paymentId: payment.paymentId,
    });
    otpStore.delete(rideId);
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────

  socket.on("disconnect", () => {
    // Clean up from onlineDrivers map (find by socketId)
    for (const [driverId, driver] of onlineDrivers) {
      if (driver.socketId === socket.id) {
        onlineDrivers.delete(driverId);
        logger.info({ driverId }, "Driver removed from online map on disconnect");
        break;
      }
    }
    logger.info({ socketId: socket.id }, "Socket disconnected");
  });

  // ── Push tokens (no-op — expo-notifications not available in Expo Go) ──────
  socket.on("registerPushToken", ({ driverId, token }: { driverId: string; token: string }) => {
    logger.info({ driverId, token: token.slice(0, 20) + "…" }, "Push token registered (no-op)");
  });
});

export { httpServer };
export default app;
