import type { Coordinate, Directions } from "@mappedin/mappedin-js";

export type Section = "map" | "sales" | "food" | "events";
export type DirectoryMode = "search" | "browse";
export type Store = { id: string; name: string; floorId: string };
export type RouteOrigin =
  { kind: "space"; spaceId: string } | { kind: "current-location"; coordinate: Coordinate };
export type DirectoryCategory =
  | "Stores"
  | "Restrooms"
  | "Parking"
  | "Entrances & exits"
  | "Vertical access"
  | "Accessible routes"
  | "Other spaces";
export type DirectorySpace = Store & { category: DirectoryCategory; isStore: boolean };
export type DirectoryPayload = { stores: Store[]; namedSpaces: DirectorySpace[] };
export type NavigationState =
  | "loading"
  | "idle"
  | "selected"
  | "calculating"
  | "preview"
  | "simulating"
  | "paused"
  | "arrived"
  | "error";
export type SimulationCameraMode = "follow" | "float";
export type LocationToastState = "open" | "minimized" | "dismissed";
export type DirectionState = {
  navigation: NavigationState;
  directions?: Directions;
  instructionIndex: number;
};
