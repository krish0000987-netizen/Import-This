import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      timeout: 8000,
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

export function getSocket(): Socket | null {
  return socket;
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

export function emitDriverOnline(payload: {
  driverId: string;
  driverName?: string;
  vehicle?: string;
  vehicleNumber?: string;
  rating?: number;
}) {
  if (socket) socket.emit("driverOnline", payload);
}

export function emitDriverOffline(driverId: string) {
  if (socket) socket.emit("driverOffline", { driverId });
}

export function emitAcceptRide(rideId: string, driverId: string) {
  if (socket) socket.emit("acceptRide", { rideId, driverId });
}

export function emitRejectRide(rideId: string, driverId: string) {
  if (socket) socket.emit("rejectRide", { rideId, driverId });
}

export function emitRegisterPushToken(driverId: string, token: string) {
  if (socket) socket.emit("registerPushToken", { driverId, token });
}

// ── OTP Flow ──────────────────────────────────────────────────────────────

/** Join a ride room so real-time events can be received. Call on both sides. */
export function emitJoinRideRoom(rideId: string, role: "customer" | "driver") {
  if (socket) socket.emit("joinRideRoom", { rideId, role });
}

/** Driver: notify server they have arrived at pickup → triggers OTP generation */
export function emitDriverReachedPickup(rideId: string) {
  if (socket) socket.emit("driverReachedPickup", { rideId });
}

/** Driver: submit the OTP they read from the customer's screen */
export function emitDriverSubmitOtp(rideId: string, otp: string) {
  if (socket) socket.emit("driverSubmitOtp", { rideId, otp });
}

// ── Payment Flow ──────────────────────────────────────────────────────────

/** Driver: signal that the trip has ended and payment is required */
export function emitDriverEndTrip(rideId: string, fare: number) {
  if (socket) socket.emit("driverEndTrip", { rideId, fare });
}

/** Customer: notify server that payment was verified successfully */
export function emitCustomerPaymentDone(rideId: string) {
  if (socket) socket.emit("customerPaymentDone", { rideId });
}
