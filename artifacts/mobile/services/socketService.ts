import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 3,
      timeout: 5000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitFindDriver(payload: {
  rideId: string;
  pickup: string;
  drop: string;
  distanceKm: number;
  durationMin: number;
  fare: number;
  vehicleType: string;
}) {
  if (socket) socket.emit("findDriver", payload);
}

export function emitCancelRide(rideId: string) {
  if (socket) socket.emit("cancelRide", { rideId });
}

export function emitDriverOnline(driverId: string) {
  if (socket) socket.emit("driverOnline", { driverId });
}

export function emitDriverOffline(driverId: string) {
  if (socket) socket.emit("driverOffline", { driverId });
}

export function emitAcceptRide(payload: { rideId: string; driverId: string }) {
  if (socket) socket.emit("acceptRide", payload);
}

export function emitRejectRide(payload: { rideId: string; driverId: string }) {
  if (socket) socket.emit("rejectRide", payload);
}

export function emitRegisterPushToken(payload: { driverId: string; token: string }) {
  if (socket) socket.emit("registerPushToken", payload);
}
