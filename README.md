# Greenfield Mall Group demo

## Run locally

Create a local `.env.local` file with:

```dotenv
VITE_MAPPEDIN_KEY=...
VITE_MAPPEDIN_SECRET=...
# Optional; defaults to mappedin-demo-mall
VITE_MAPPEDIN_MAP_ID=...
```

Then run:

```sh
yarn dev --host 127.0.0.1 --port 4173
```

Open the printed local URL. Build the production bundle with:

```sh
yarn build
```

Credentials remain local-only; do not commit `.env.local`.

## Demo behavior

- The React/Vite frontend loads the Mappedin demo venue directly with the Mappedin JS SDK. It has no application backend.
- The simulated location starts at Parking Lot B. Map selection can replace it, and saved parking is stored locally for the active demo session. The saved-parking cache intentionally clears on browser refresh.
- **Find Anything** and **Browse** expose every named main-level map space, grouped into storefronts and amenities. All named spaces can be selected as route destinations.
- Routes use real SDK geometry, preview the full path, present one instruction at a time, and support simulated walking, manual step positioning, cancellation, and rerouting from the current simulated coordinate.
- Promotions are deterministic local fixtures for all verified storefronts. Nearby offers appear during simulated walking, and a store’s offers appear on arrival. Food Court Menus and Events remain local sample content.

## Demo limitations

This is a demonstration venue, not a validated Greenfield property. Simulated walking is not browser geolocation or real indoor positioning. Real storefront coverage, parking/entrance targets, accessibility, route connectivity, and instructions require client and on-site validation before production use.
