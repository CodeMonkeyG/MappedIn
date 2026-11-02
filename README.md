# Greenfield Mall Group Wayfinding App

## Delivery status

- The containerized frontend is deployed in its production environment.
- A manual sunny-day smoke pass covered discovery, routing, simulation, arrival promotions, and
  the responsive interface.
- `QA.md` records remaining route-coverage and physical-commissioning work.
- `summary.md`, `presentation-outline.md`, and `presentation.html` provide the final delivery and
  presentation materials.

## Run locally

Create a local `.env.local` file with:

```dotenv
VITE_MAPPEDIN_KEY=...
VITE_MAPPEDIN_SECRET=...
# Optional; set this to override the configured Greenfield map
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

## Container deployment

The Compose stack builds the Vite application and serves its static output from an unprivileged Nginx container. It intentionally does not configure TLS or a reverse proxy because the shared Nginx host handles those concerns.

Provide the public Mappedin build variables in the deployment environment, then build and start the service:

```sh
export VITE_MAPPEDIN_KEY=...
export VITE_MAPPEDIN_SECRET=...
export VITE_MAPPEDIN_MAP_ID=<greenfield-map-id>
docker compose up --build -d
```

The service listens on `${MAPPEDIN_PORT:-8088}` on the Docker host. Configure the external Nginx host to reverse-proxy the desired hostname/path to `http://<docker-host>:8088`. `VITE_*` values are compiled into the browser bundle and therefore must use the approved public Mappedin access model.

## Application behavior

- The React/Vite frontend loads Greenfield's blueprint-based production map directly with the
  Mappedin JS SDK. It has no application backend.
- The simulated location starts at Parking Lot B. Map selection can replace it, and saved parking is stored locally for the active demo session. The saved-parking cache intentionally clears on browser refresh.
- **Find Anything** and **Browse** expose every named main-level map space, grouped into storefronts and amenities. All named spaces can be selected as route destinations.
- Routes use real SDK geometry, preview the full path, present one instruction at a time, and support simulated walking, manual step positioning, cancellation, and rerouting from the current simulated coordinate.
- Promotions are deterministic local fixtures for all verified storefronts. Nearby offers appear during simulated walking, and a store’s offers appear on arrival. Food Court Menus and Events remain local sample content.

## Commissioning limitations

The map model represents Greenfield's intended production venue but has not yet been validated
against the physical building. Simulated walking is not browser geolocation or real indoor
positioning. Physical commissioning must confirm the parking/entrance target, storefront and
signage accuracy, route connectivity, accessible paths, and instruction usability before public
launch.
