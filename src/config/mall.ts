const key = import.meta.env.VITE_MAPPEDIN_KEY ?? '';
const secret = import.meta.env.VITE_MAPPEDIN_SECRET ?? '';

export const mallConfig = {
  propertyId: 'greenfield-demo',
  displayName: 'Greenfield Mall Group',
  mapId: import.meta.env.VITE_MAPPEDIN_MAP_ID ?? 'mappedin-demo-mall',
  mainFloorId: 'f_5835ab589321170c11000000',
  credentials: { key, secret, mapId: import.meta.env.VITE_MAPPEDIN_MAP_ID ?? 'mappedin-demo-mall' },
} as const;

export const hasMapCredentials = Boolean(key && secret);
