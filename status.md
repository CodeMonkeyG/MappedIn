# Assignment Status

## What we delivered

The core assignment is met with a real, reusable foundation rather than a throwaway prototype:

- **Mappedin SDK wayfinding:** real map loading, labels, point-to-point routing, full-route preview, and one-step-at-a-time instructions.
- **Parking-to-destination flow:** simulated origin defaults to Parking Lot B; users can select a new map origin, save parking locally, cancel and re-route from their current simulated coordinate, and use **Where am I?**.
- **Discovery:** searchable **Find Anything** plus a categorized Browse view of all named main-level spaces. Stores, parking, restrooms, entrances, and other amenities can be routed to.
- **Guidance:** Begin/Pause/Resume, Previous/Next that move the blue dot and camera, manual step positioning, simulated progress, arrival, and destination promotion presentation.
- **Presentation quality:** responsive Bootstrap UI, mobile drawer, motion with reduced-motion support, fixed navigation, visual content pages, and accessible labels/dialog behavior.
- **Production-oriented structure:** React/TypeScript/Vite, typed local content contracts, TanStack Query for content-loading behavior, environment-based map configuration, componentized map/directory/navigation/promotion UI, formatter enforcement, and documented non-obvious SDK invariants.
- **Deployment:** Docker Compose, multi-stage build, and unprivileged Nginx packaging are deployed in the production environment.
- **QA/documentation:** documented manual sunny-day smoke testing; README, specification, QA checklist, delivery summary, and a seven-slide presentation.

Promotions, Food Court Menus, Events, saved parking, and the richer directory exceed the assignment's minimal scope. They establish reusable content and presentation patterns around the core wayfinding experience.

## What we missed or have not proven

The assignment asks for a short QA checklist, and one exists, but several checks remain explicitly unexecuted:

- No **route-coverage run** proving every advertised storefront/amenity has a usable SDK route.
- Parking Lot B is a simulated origin, not yet commissioned against the physical parking-garage/entrance geometry.
- No real indoor positioning, live tenant content source, accessibility certification, or production operational validation.
- No automated unit/E2E test suite yet; build/type/format checks are currently the repeatable verification layer.

## What must happen next

1. Run a scripted SDK route-coverage check for every advertised named destination and disclose exceptions.
2. Commission the blueprint-based map against the physical property: confirm the parking/entrance target, storefronts, signage, accessibility, and representative instructions.
3. Use `presentation.html` and `presentation-outline.md` to present the customer challenge, delivered first slice, intentional scope boundaries, next phase, and discussion questions.
4. Confirm positioning expectations and content ownership before public launch.

## Why this remains a viable starting point

The map lifecycle is isolated in `MapCanvas`; content is behind typed service interfaces; configuration is environment-based; UI features are separated into components; and current data is deterministic rather than embedded throughout the UI. Adding live content APIs or a positioning integration should extend those seams rather than require rebuilding the application.
