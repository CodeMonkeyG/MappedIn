import type { Space } from "@mappedin/mappedin-js";
import { mainLevelStorefronts } from "../../services/storefronts";
import type { DirectoryCategory, DirectorySpace } from "./types";

export const directoryCategories: readonly DirectoryCategory[] = [
  "Stores",
  "Restrooms",
  "Parking",
  "Entrances & exits",
  "Vertical access",
  "Accessible routes",
  "Other spaces",
];

const storefrontIds = new Set(mainLevelStorefronts.map((store) => store.id));

export const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const isParking = (name: string) => /\bparking\b/i.test(name);
export const isStore = (space: Space) => storefrontIds.has(space.id);
export const categoryFor = (name: string, store: boolean): DirectoryCategory => {
  if (store) return "Stores";
  if (/\b(restroom|washroom|toilet)\b/i.test(name)) return "Restrooms";
  if (/\bparking\b/i.test(name)) return "Parking";
  if (/\b(entrance|exit)\b/i.test(name)) return "Entrances & exits";
  if (/\b(stairs?|escalator|elevator|lift)\b/i.test(name)) return "Vertical access";
  if (/\b(ramp|accessible|accessibility)\b/i.test(name)) return "Accessible routes";
  return "Other spaces";
};

export const searchDirectory = (spaces: DirectorySpace[], query: string) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const match = new RegExp(escapeRegex(normalizedQuery), "i");
  const startsWith = new RegExp(`^${escapeRegex(normalizedQuery)}`, "i");
  return spaces
    .filter((space) => match.test(normalize(space.name)))
    .sort((left, right) => {
      const leftStarts = startsWith.test(normalize(left.name));
      const rightStarts = startsWith.test(normalize(right.name));
      return leftStarts === rightStarts ? left.name.localeCompare(right.name) : leftStarts ? -1 : 1;
    });
};

export const groupDirectory = (spaces: DirectorySpace[]) =>
  directoryCategories
    .map((category) => ({
      category,
      spaces: spaces.filter((space) => space.category === category),
    }))
    .filter((group) => group.spaces.length > 0);
