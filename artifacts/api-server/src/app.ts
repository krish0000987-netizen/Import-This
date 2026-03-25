import express, { type Express } from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
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

// In-memory stores
const otpStore = new Map<string, string>();
const rideRooms = new Map<string, { customerSocketId?: string; driverSocketId?: string }>();

// Utility
function getRideRoom(rideId: string) {
  if (!rideRooms.has(rideId)) rideRooms.set(rideId, {});
  return rideRooms.get(rideId)!;
}

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Socket connected");

  // Both customer and driver join a ride room so they can receive targeted events
  socket.on("joinRideRoom", ({ rideId, role }: { rideId: string; role: "customer" | "driver" }) => {
    socket.join(`ride:${rideId}`);
    const room = getRideRoom(rideId);
    if (role === "customer") room.customerSocketId = socket.id;
    if (role === "driver") room.driverSocketId = socket.id;
    logger.info({ rideId, role, socketId: socket.id }, "Joined ride room");
  });

  // Driver presses "Arrived at Pickup"
  socket.on("driverReachedPickup", ({ rideId }: { rideId: string }) => {
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    otpStore.set(rideId, otp);
    logger.info({ rideId, otp }, "Driver reached pickup – OTP generated");

    // Send OTP to customer only
    const room = getRideRoom(rideId);
    if (room.customerSocketId) {
      io.to(room.customerSocketId).emit("rideOtpReady", { otp });
    } else {
      // Broadcast to room as fallback
      io.to(`ride:${rideId}`).emit("rideOtpReady", { otp });
    }

    // Tell driver to open OTP entry
    socket.emit("showOtpEntry", { rideId });
  });

  // Driver submits OTP they read from customer
  socket.on("driverSubmitOtp", ({ rideId, otp }: { rideId: string; otp: string }) => {
    const correctOtp = otpStore.get(rideId);
    logger.info({ rideId, submitted: otp, correct: correctOtp }, "Driver submitted OTP");

    if (correctOtp && otp.trim() === correctOtp) {
      otpStore.delete(rideId);
      // Notify both
      io.to(`ride:${rideId}`).emit("otpVerified", { rideId });
      logger.info({ rideId }, "OTP verified – ride started");
    } else {
      socket.emit("otpRejected", { rideId, message: "Incorrect OTP. Please try again." });
    }
  });

  // Keep existing driver events
  socket.on("driverOnline", ({ driverId }: { driverId: string }) => {
    socket.join(`driver:${driverId}`);
    logger.info({ driverId }, "Driver online");
  });

  socket.on("driverOffline", ({ driverId }: { driverId: string }) => {
    socket.leave(`driver:${driverId}`);
    logger.info({ driverId }, "Driver offline");
  });

  socket.on("acceptRide", ({ rideId, driverId }: { rideId: string; driverId: string }) => {
    io.to(`ride:${rideId}`).emit("rideAccepted", { rideId, driverId });
    logger.info({ rideId, driverId }, "Ride accepted");
  });

  socket.on("rejectRide", ({ rideId, driverId }: { rideId: string; driverId: string }) => {
    logger.info({ rideId, driverId }, "Ride rejected");
  });

  socket.on("findDriver", (payload: Record<string, unknown>) => {
    logger.info({ payload }, "findDriver event received");
    // Simulate no drivers found after timeout if no real driver is connected
  });

  socket.on("cancelRide", ({ rideId }: { rideId: string }) => {
    io.to(`ride:${rideId}`).emit("rideCancelled", { rideId });
    otpStore.delete(rideId);
    logger.info({ rideId }, "Ride cancelled");
  });

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Socket disconnected");
  });
});

export { httpServer };
export default app;
