# Greenfield Mall Wayfinding Demo: Delivery Summary

## Executive summary

We delivered a deployed, customer-facing indoor wayfinding web application built with the
Mappedin SDK. It uses Greenfield's blueprint-based production map to demonstrate the core
shopper journey: a visitor starts from a clearly labeled simulated parking origin, finds a
destination, reviews a route, follows step-by-step directions, and can simulate the walk to
arrival.

The work was deliberately treated as a foundation for a production application, not a disposable
assignment prototype. The map integration, local business-content contracts, environment
configuration, component boundaries, documentation, and container packaging are designed to
support live Greenfield content services and production operations.

The core assignment scope is implemented. The map is the intended production model, while the
parking origin, location signal, store content, and promotions remain simulated. Route coverage,
accessibility, and physical-site commissioning remain required before public launch.

## The customer problem and the first slice

Greenfield Mall Group needs a first production application that helps a first-time visitor move
from parking to a specific store. The immediate success criterion is simple: open the app, find a
store, receive an understandable route from the parking entrance, and follow it with confidence.

We focused first on that journey rather than building a backend, tenant tools, checkout, or
analytics. Those are valid future needs, but they would have delayed the valuable first slice:
reliable visitor discovery and indoor routing.

## What a shopper can do today

1. Open the **Map** view and see the main-level Mappedin venue with labels, pan, zoom, and
   rotation available.
2. Begin from the explicitly simulated default origin, Parking Lot B, or select a replacement
   map origin. A parking location can be saved locally for the active demo session.
3. Use **Find Anything** to search named main-level locations, or use **Browse** to explore
   stores, restrooms, parking, entrances/exits, vertical access, accessible routes, and other
   spaces.
4. Select a destination, focus it on the map, and request directions.
5. Review a complete route preview, destination, route distance when supplied by the SDK, and
   one readable instruction at a time.
6. Walk the route through the simulation, or use Previous and Next to inspect individual
   instructions and reposition the simulated blue dot and camera.
7. Pause, resume, cancel, or reroute from the current simulated coordinate. Arrival preserves the
   simulated location for a next journey.
8. Receive a local promotional offer when arriving at a participating store.
9. Browse fixture-backed Promotions, Food Court Menus, and Events pages. Promotion search
   filters offers by store name and other offer details.

The responsive Bootstrap interface keeps directions and discovery usable on desktop and mobile.
Mobile navigation uses a right-side drawer, and reduced-motion preferences are respected.

## What shipped

| Area | Delivered capability |
| --- | --- |
| Wayfinding | Direct Mappedin JS SDK integration, map lifecycle management, labels, route drawing, complete-route framing, and route cleanup |
| Discovery | Verified catalog of 134 main-level storefronts, 150 named main-level spaces, normalized search, categorized browsing, and map selection |
| Navigation | Route preview, single-step directions, full-route simulation, follow and float camera modes, manual stepping, pause/resume, cancel, arrival, and rerouting |
| Location honesty | Persistent simulated-location messaging; no browser geolocation request or claim that a device position has been measured |
| Business content | Typed, deterministic local fixtures for promotions, food vendors/menus, and events, loaded through TanStack Query |
| Presentation | Greenfield Bootstrap theme, responsive layout, fixed navigation, accessible labels/dialogs, reduced-motion support, and content-page visual treatments |
| Engineering foundation | TypeScript, React, Vite, focused feature components, local content-service interfaces, environment-based map configuration, and Prettier formatting |
| Deployment | Docker Compose, multi-stage frontend build, unprivileged Nginx static serving, SPA fallback, and external reverse-proxy-ready documentation |
| Documentation | Setup instructions, implementation specification, QA record, assignment status, and this delivery summary |

## Product and delivery decisions

### We used a real map and real route geometry

The application requests map data and directions through Mappedin's SDK. It does not fabricate
paths or turn instructions. If the SDK cannot provide a viable route, the intended behavior is to
show a recoverable limitation rather than pretend navigation succeeded.

### We simulated location deliberately

Indoor positioning requires a separate business and technical decision: Bluetooth beacons,
visual positioning, Wi-Fi, or another approved approach. Until that is chosen, the blue dot is
explicitly a simulation. This lets Greenfield evaluate the navigation experience without making
an inaccurate positioning claim.

### We kept business data local, typed, and replaceable

Promotions, menus, and events use deterministic fixtures behind typed service contracts. TanStack
Query provides the loading, caching, and future API-integration seam, while the demo intentionally
makes no business-content network calls. Replacing local fixtures with approved Greenfield
services should not require rewriting the presentation or map flow.

### We favored a reusable frontend over speculative infrastructure

There is no application backend, database, CMS, account system, or analytics pipeline because
none is needed to validate the first visitor journey. The application is packaged for deployment
as static assets in a container, while the deployment environment provides TLS and reverse
proxying.

This was deliberate scope control, not a missing capability. Building a request-to-database CRUD
path, WebSocket workflow, file-processing flow, or push-notification service would add delivery
work without proving the central outcome: that a visitor can discover and navigate to a
destination. Typed local service interfaces and TanStack Query demonstrate an API-ready boundary,
so a future approved backend can replace fixture implementations without rewriting the screens or
wayfinding integration.

## Architecture for technical stakeholders

The frontend is React, TypeScript, Vite, Bootstrap, TanStack Query, and the Mappedin JS SDK.

- `App.tsx` owns application-level section, directory, route, and presentation state.
- `MapCanvas.tsx` isolates the Mappedin SDK lifecycle, route calculations, blue dot, camera
  behavior, markers, simulation timers, stale-route protection, and cleanup.
- Directory, navigation, promotion, status, and wayfinding helpers are split into focused feature
  modules.
- `services/content.ts` defines content contracts; `services/mockContent.ts` supplies deterministic
  demo data.
- `config/mall.ts` centralizes property, map, floor, and public build-time map configuration.
- Map credentials come from local/deployment `VITE_*` environment values and are never committed.
  Because Vite embeds those values into the browser bundle, production access must use an
  approved public Mappedin authentication model.

The container uses a Node build stage followed by an unprivileged Nginx runtime. Docker Compose
exposes the service for an external Nginx host to reverse proxy. TLS, domain routing, and
platform operations intentionally remain outside this repository.

## Assignment alignment

The practical assignment requested a main-level Mappedin wayfinding application, parking-to-store
routing, directory or search, basic turn-by-turn instructions, and a short QA checklist. Those
capabilities are present, alongside additional discovery, simulation, promotions, content pages,
deployment packaging, and documentation.

The assignment also asks for judgment, not just features:

- **Scope ownership:** we prioritized the visitor's end-to-end route journey and explicitly
  deferred backend, live content integration, real positioning, multi-floor routing, and other
  unneeded systems.
- **AI velocity:** AI-assisted development accelerated implementation, investigation,
  formatting, component extraction, documentation, and iteration while preserving the SDK as the
  source of truth for map geometry and routing.
- **Product taste:** the interface favors clear shopper choices, visible labels, explicit
  navigation start, understandable route state, responsive layouts, and an honest simulation
  label over developer-oriented map controls.
- **Delivery judgment:** known constraints and unexecuted QA are documented rather than hidden.

### Assignment scope versus production validation

The assignment requires point-to-point routing from **a parking entrance** to a storefront. It
does not require a customer-specific venue, surveyed entrance geometry, onsite route validation,
or production indoor positioning. The application provides a functioning simulated parking origin
and real SDK routing on the blueprint-based production map, satisfying the intended product-flow
exercise.

Physical commissioning is therefore a production-readiness activity, not an omitted assignment
deliverable. Before public launch, Greenfield would confirm that the modeled Parking Lot B
location represents the physical parking entrance and validate that displayed routes match the
completed building. For the interview, describe Parking Lot B accurately as the simulated origin
on the production map rather than imply it has already been physically validated.

## Validation completed

- Production TypeScript/Vite builds have passed repeatedly; the most recent local build passed on
  2026-11-01.
- The configured blueprint-based production map metadata was inspected during implementation.
- The main-level catalog includes 134 verified storefronts and 150 named spaces.
- The deployed application has been manually smoke-tested across the intended sunny-day user
  journey.
  - This included:
    - Routing from the initial arrival point to a designated destination
    - Routing from an arbitrary arrival point to a designated destination
    - Destination designation through text search
    - Destination designation through browse
    - Destination designation through promotion selection
    - Destination designation through menu selection
    - Destination designation through event selection
    - Routing to locally cached parking position
    - Walking routes
    - Confirming walking and arrival displays of available promotions
    - Visual acceptance of all controls, displays, and interfaces

The final presentation is captured in `presentation.html`, with its seven-slide content mirrored
in `presentation-outline.md`.

## Final Validation still required

The following are not claims we should make until tested and recorded:

- Every advertised storefront and named destination has a viable SDK route from the intended
  entrance.
- Textual instructions are understandable for representative short, long, and multi-turn routes.
- The full simulated-walk lifecycle works repeatedly without stale routes or duplicate timers.
- Browser behavior is sound across supported desktop and mobile browsers.
- Keyboard-only navigation, dialogs, mobile layout, and reduced-motion behavior are usable.
- Map failure, unsupported rendering, empty data, no-route, and query-error states are recoverable.
- Business content produces no network traffic; SDK traffic is separately understood.
- Routes, parking origin, storefront mapping, and instructions are physically correct for a real
  Greenfield property.

`QA.md` records the current executed checks and these known gaps.

## Known limitations and risks

| Topic | Current state | Why it matters |
| --- | --- | --- |
| Map model | Greenfield's blueprint-based production map has not been commissioned against the physical property | Physical validation must confirm the modeled floor, storefronts, connectivity, signage, and accessible paths before public launch |
| Parking origin | Parking Lot B is a simulated origin, not a physically confirmed entrance target | The model-to-site relationship must be confirmed during commissioning |
| Positioning | The blue dot is simulated | Indoor positioning needs a separate hardware/software and privacy decision |
| Route assurance | Full route coverage and on-site walk validation are outstanding | A route that renders is not automatically a route a shopper can safely follow |
| Content | Offers, menus, and events are deterministic sample data | Content ownership, approvals, availability, and update workflows are required |
| Credentials | Browser configuration is public at build time | Customer map access needs licensing and an approved public/token authentication model |
| Accessibility | Usability-oriented implementation exists, but no certification or formal audit | Real customer deployment needs keyboard, screen-reader, contrast, and route-accessibility validation |
| Offline support | Not provided | The app depends on normal Mappedin connectivity and should not be marketed as offline-capable |

## What remains to do

### Before a customer demo or hiring-panel walkthrough

1. DONE: Run and record a browser smoke test for map load, search-to-route, Browse-to-route, step
   navigation, simulated walk, pause/resume, cancel, reroute, arrival, and promotion modal.
2. DONE: Test the mobile drawer, touch layout, keyboard navigation, dialogs, and reduced-motion behavior.
3. DONE: Demonstrate one representative end-to-end route without developer tools.
4. DONE: Present the demo origin as a **simulated parking origin** unless an approved parking entrance
   has been confirmed.

### Before customer acceptance

1. Run an automated route-coverage check for every advertised storefront; document exceptions
   rather than silently removing them.
2. Validate representative routes and instruction wording on site with Greenfield stakeholders.
3. Replace fixture content with approved tenant, promotion, menu, and event data.
4. Agree on a customer-facing positioning strategy and accurately describe its capabilities and
   limitations.
5. Add focused automated tests for directory filtering, fixture/map binding, route state transitions,
   and content query states, then add browser end-to-end coverage.

### Before a production launch

1. Complete accessibility testing and supported-browser/device validation.
2. Add monitoring, error reporting, release process, deployment rollback, and operational runbooks.
3. Confirm security, privacy, retention, analytics, consent, and incident-response requirements.

## Questions to resolve with Greenfield

1. Who owns store, promotion, food, and event content, and how frequently must it change?
2. Which destinations must be routable at launch, including accessible routes and amenities?
3. What browsers, devices, accessibility expectations, and authentication model are required?

## Recommended presentation flow

1. Restate the visitor problem: a first-time shopper cannot easily find a store from parking.
2. Demonstrate search or browse, explicit route selection, route preview, directions, simulated
   walking, arrival, and a follow-on promotion.
3. Explain the deliberate boundaries: blueprint-based production map pending commissioning,
   simulated location, local content, and no speculative backend.
4. Show the technical foundation briefly: SDK isolation, typed content contracts, configuration,
   and containerized deployment.
5. Close with the validation plan and the Greenfield decisions needed to turn this first slice into
   a production service.

## Bottom line

This is a functioning, deployed first slice of a Greenfield indoor wayfinding application. It meets
the assignment's core product flow and provides a credible foundation for a real rollout. The next
work is not more feature accumulation: it is commissioning the production map and routes,
deciding the positioning and content model, proving usability across devices, and establishing
the operating model required for customer launch.

## Next phases

1. **Commission the map:** Validate the modeled parking entrance, storefronts, routes, signage,
   and accessible paths against the physical property.
2. **Connect live experiences:** Replace fixtures with approved content, define the needed
   positioning experience, and integrate the operational services that support it.
3. **Prepare for scale:** Complete automated coverage, accessibility and device validation,
   monitoring, release processes, and operational readiness.

## Questions

- Which shopper journeys should Greenfield prioritize after the first launch?
- Which live content and positioning capabilities would create the most value first?
- What should success look like for the first 90 days of operation?
