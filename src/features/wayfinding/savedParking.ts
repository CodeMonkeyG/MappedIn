import type { Store } from "./types";

const savedParkingStorageKey = "greenfield-demo-saved-parking";
const clearOnReload = true;

const isSavedParking = (value: unknown): value is Store =>
  typeof value === "object" &&
  value !== null &&
  ["id", "name", "floorId"].every((field) => {
    const candidate = Reflect.get(value, field);
    return typeof candidate === "string" && Boolean(candidate.trim());
  });

export const readSavedParking = (): Store | undefined => {
  try {
    if (
      clearOnReload &&
      performance
        .getEntriesByType("navigation")
        .some((entry) => entry instanceof PerformanceNavigationTiming && entry.type === "reload")
    ) {
      localStorage.removeItem(savedParkingStorageKey);
      return undefined;
    }
    const parsed: unknown = JSON.parse(localStorage.getItem(savedParkingStorageKey) ?? "null");
    if (isSavedParking(parsed)) return parsed;
    localStorage.removeItem(savedParkingStorageKey);
  } catch {
    try {
      localStorage.removeItem(savedParkingStorageKey);
    } catch {
      // Storage is unavailable.
    }
  }
  return undefined;
};

export const saveSavedParking = (parking: Store) =>
  localStorage.setItem(savedParkingStorageKey, JSON.stringify(parking));
export const removeSavedParking = () => localStorage.removeItem(savedParkingStorageKey);
