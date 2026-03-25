import { DriverData } from "@/constants/data";

let _onDriverRegistered: ((driver: DriverData) => void) | null = null;

export function registerDriverAddedCallback(cb: (driver: DriverData) => void) {
  _onDriverRegistered = cb;
}

export function notifyDriverRegistered(driver: DriverData) {
  _onDriverRegistered?.(driver);
}
