import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger";

export interface OnlineDriver {
  socketId: string;
  driverId: string;
  driverName: string;
  vehicle: string;
  vehicleNumber: string;
  rating: number;
}

export interface RideRecord {
  rideId: string;
  pickup: string;
  drop: string;
  distanceKm: number;
  durationMin: number;
  fare: number;
  vehicleType: string;
  riderName: string;
  customerSocketId?: string;
  driverId?: string;
  driverName?: string;
  driverVehicle?: string;
  driverVehicleNumber?: string;
  driverRating?: number;
  status: "searching" | "accepted" | "started" | "completed" | "cancelled";
  createdAt: number;
}

let _io: SocketIOServer | null = null;

/** All currently online drivers: driverId → driver info */
export const onlineDrivers = new Map<string, OnlineDriver>();

/** Drivers with an active (non-completed) ride: driverId → rideId */
export const activeDriverRides = new Map<string, string>();

/** All rides: rideId → RideRecord */
export const ridesStore = new Map<string, RideRecord>();

export function setIO(io: SocketIOServer): void {
  _io = io;
}

export function getIO(): SocketIOServer | null {
  return _io;
}

/**
 * Broadcast a new ride request to all online drivers who:
 *  - are not currently on another ride
 *  - (optionally) match the vehicle type
 */
export function broadcastRideRequest(ride: RideRecord): number {
  const io = getIO();
  if (!io) return 0;

  let sent = 0;
  const payload = {
    rideId: ride.rideId,
    pickup: ride.pickup,
    drop: ride.drop,
    distanceKm: ride.distanceKm,
    durationMin: ride.durationMin,
    fare: ride.fare,
    vehicleType: ride.vehicleType,
    riderName: ride.riderName,
    createdAt: ride.createdAt,
  };

  for (const [driverId, driver] of onlineDrivers) {
    if (activeDriverRides.has(driverId)) continue; // skip busy drivers

    io.to(`driver:${driverId}`).emit("newRideRequest", payload);
    sent++;
    logger.info({ driverId, rideId: ride.rideId }, "Sent newRideRequest to driver");
  }

  return sent;
}
