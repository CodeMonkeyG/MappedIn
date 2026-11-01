# Assignment Status

## What we delivered

The core assignment is met with a real, reusable foundation rather than a throwaway prototype:

- **Mappedin SDK wayfinding:** real map loading, labels, point-to-point routing, full-route preview, and one-step-at-a-time instructions.
- **Parking-to-destination flow:** simulated origin defaults to Parking Lot B; users can select a new map origin, save parking locally, cancel and re-route from their current simulated coordinate, and use **Where am I?**.
- **Discovery:** searchable **Find Anything** plus a categorized Browse view of all named main-level spaces. Stores, parking, restrooms, entrances, and other amenities can be routed to.
- **Guidance:** Begin/Pause/Resume, Previous/Next that move the blue dot and camera, manual step positioning, simulated progress, arrival, and destination promotion presentation.
- **Presentation quality:** responsive Bootstrap UI, mobile drawer, motion with reduced-motion support, fixed navigation, visual content pages, and accessible labels/dialog behavior.
- **Production-oriented structure:** React/TypeScript/Vite, typed local content contracts, TanStack Query for content-loading behavior, environment-based map configuration, componentized map/directory/navigation/promotion UI, formatter enforcement, and documented non-obvious SDK invariants.
- **QA/documentation:** README, specification, QA checklist, repeated `yarn format:check` and `yarn build` validation.

Promotions, Food Court Menus, Events, saved parking, and the richer directory exceed the assignment's minimal scope. They establish reusable content and presentation patterns around the core wayfinding experience.

## What we missed or have not proven

The assignment asks for a short QA checklist, and one exists, but several checks remain explicitly unexecuted:

- No recorded **browser smoke test** of map rendering, mobile behavior, keyboard flows, modal/drawer transitions, or the end-to-end route journey.
- No **route-coverage run** proving every advertised storefront/amenity has a usable SDK route.
- Parking Lot B is a demo-origin choice, not validated customer parking-garage/entrance geometry.
- No real indoor positioning, customer map, tenant content source, production authentication, accessibility certification, or operational deployment.
- No automated unit/E2E test suite yet; build/type/format checks are currently the repeatable verification layer.

## What must happen next

1. Run and record a focused browser QA pass: first load, search-to-route, Browse-to-route, simulation, manual step camera movement, mid-route reroute, arrival, mobile drawer, keyboard use, and error/no-route behavior.
2. Run a scripted SDK route-coverage check for every advertised named destination and disclose exceptions.
3. Prepare the presentation around the assignment's story: customer problem, intentionally scoped first slice, live core flow, what shipped beyond scope, QA gaps, and production path.
4. Ask Greenfield to confirm the production map, exact parking/entrance target, storefront catalog, expected positioning model, and content ownership before calling the design final.

## Why this remains a viable starting point

The map lifecycle is isolated in `MapCanvas`; content is behind typed service interfaces; configuration is environment-based; UI features are separated into components; and current data is deterministic rather than embedded throughout the UI. Replacing demo map credentials/data or adding real content APIs should extend those seams rather than require rebuilding the application.
