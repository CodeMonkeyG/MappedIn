# Greenfield Mall Group demo

Set `VITE_MAPPEDIN_KEY` and `VITE_MAPPEDIN_SECRET` in a local `.env.local` file, then run the frontend with `yarn dev --host 127.0.0.1 --port 4173`. Open the printed local URL. Build it with `yarn build`. Set `VITE_MAPPEDIN_MAP_ID` only when using a venue other than `mappedin-demo-mall`.

The demo uses Mappedin configuration supplied locally and no application backend. It dynamically derives lower-level named storefronts and every lower-level space named `Entrance`; presenters choose the applicable parking entrance before requesting directions. Sales, food, and event data are deterministic local fixtures provided through TanStack Query.

This is a demonstration venue. Simulated walking is not device positioning, and real-world entrance, storefront, connectivity, and instruction validation remain required before production use.
