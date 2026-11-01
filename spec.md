# Greenfield Mall Group: Indoor Wayfinding App

## 1. Document purpose and status

This specification defines the client-demo application and the frontend foundation for a later production backend. It records both the intended scope and the delivered demo behavior; browser and on-site validation remain separate from implementation.

The immediate deliverable is a functioning, customer-facing React application using a real Mappedin map and SDK routing, with local canned responses for mall business content. No application backend is required for this phase.

### Confirmed decisions

- Use React, TypeScript, Vite, and Twitter Bootstrap.
- Use TanStack Query (`@tanstack/react-query`) for asynchronous application data access and future API integration.
- Load real Mappedin map data and use SDK routing. Mappedin network requests are explicitly permitted.
- Simulate future mall/business APIs entirely inside the frontend with canned responses. Do not send HTTP requests to mock endpoints.
- Include simple demo pages for Sales, Food Court Menus, and Events, in addition to wayfinding.
- Do not build a backend unless a demonstrated requirement makes it unavoidable. Any separately approved backend must use Python and FastAPI.

### Working assumptions requiring client validation

- The demo covers one property and its main level, not all three properties.
- The simulated initial origin is Parking Lot B on the configured main level. It is a demo location, not a browser-measured visitor position or a claim of garage-level routing.
- The existing map is a demonstration venue until the customer supplies and approves their own map, floor, entrance, and storefront data.
- Preserve the existing Greenfield green branding as the starting visual direction. This is not a new branding engagement.
- English and metric distances are the initial presentation defaults, consistent with the existing prototype. Additional languages and alternate distance units are not required for demo acceptance.

## 2. Customer context and objective

**Customer:** Greenfield Mall Group, a mid-size regional mall operator with three properties totaling approximately 2.5 million square feet.

The customer has signed a platform deal and needs its first production application. Shoppers report difficulty finding stores, while tenant foot traffic concentrates near anchors. Visitor retention affects tenant revenue and renewal value. These are customer-provided business motivations, not independently verified measurements or promises of a particular business outcome.

**Primary objective:** A first-time visitor can open the application, find a store, and follow a clear route from the parking entrance to that storefront, while understanding their starting location and current navigation state.

**Secondary objective:** The demo frontend remains usable as the presentation layer when real mall content services are introduced, without rewriting the screens or wayfinding integration.

## 3. Existing repository baseline

Inspection of the working tree found:

| Area | Current implementation | Required direction |
| --- | --- | --- |
| Application | Vite and TypeScript, imperative DOM code in `src/main.ts` | Migrate the UI into React components without discarding useful SDK behavior |
| Mappedin | `@mappedin/mappedin-js` declared as `^6.30.0` | Continue with the v6 SDK family and select compatible React integration dependencies |
| Position demo | `@mappedin/blue-dot` declared as `^6.30.0-beta.0` | Retain deterministic simulated walking, visibly identified as a simulation |
| UI | Bootstrap `^5.3.8`, Bootstrap bundle, green-themed layout in `index.html` | Reuse Bootstrap and the established visual direction |
| Map interaction | Named-space labels, hover styling, door rendering, map clicks | Preserve useful behavior behind a shopper-oriented destination workflow |
| Routing | Click an arbitrary start space and end space, calculate and draw directions | Default to the configured parking entrance and select destinations through directory/search |
| Guidance | Basic instruction list and blue-dot movement along route coordinates | Present understandable guidance, route preview, progress, arrival, and reset |
| Navigation | Map, Sales, Food Court Menus, and Events anchors | Make all four sections functional demo views |
| Business data | No TanStack Query or React dependencies declared | Introduce typed data contracts, frontend fixtures, and query hooks |
| Offline assets | `public/sw.js` exists; Dexie is declared | Do not treat these as proof of offline map support; offline delivery is not in this phase |
| Tooling | `dev`, `build`, and `preview` scripts; build runs TypeScript then Vite | Retain Yarn commands and add focused tests during implementation |

The current map ID is `mappedin-demo-mall`. Its suitability for the client's main level, parking entrance, and storefront coverage has not been verified. Do not invent actual floor IDs, entrance IDs, or storefront mappings in this specification.

The repository has existing uncommitted changes. Implementation must preserve user work, existing explanatory comments, and unrelated behavior. Do not reset files, broadly refactor unrelated code, commit, or push without authorization.

## 4. Scope

### Required for the client demo

1. Responsive, branded React application shell and working navigation.
2. Real Mappedin rendering of the selected venue's main level.
3. Clear parking entrance origin and a useful, honest location indicator.
4. Main-level store directory and store-name search.
5. Point-to-point routing from the configured entrance to each listed routable storefront.
6. Route preview and readable on-screen turn-by-turn guidance.
7. Clearly labeled simulated walking with route progress and arrival/reset behavior.
8. Canned-content Sales, Food Court Menus, and Events views.
9. Local asynchronous business-data services integrated through TanStack Query.
10. Loading, empty, error, unsupported destination, and no-route states.
11. Setup/run instructions and a short QA checklist with actual results and known gaps.

### Not in scope

- A database, application server, CMS, admin portal, tenant dashboard, or content editor.
- Actual mall/business API integrations, authentication, user accounts, checkout, ordering, ticketing, or push notifications.
- Production indoor positioning, GPS-based indoor tracking, Bluetooth beacons, or real-time location accuracy claims.
- Garage-level navigation, outdoor driving directions, multi-floor routing, or multi-property switching.
- Occupancy tracking, foot-traffic analytics, tenant revenue measurement, or optimization guarantees.
- Production offline/PWA support or guaranteed operation without Mappedin connectivity.
- Certified accessible routing, emergency evacuation guidance, or claims that every physical route has been field-validated.

Supplemental content pages support the demo story. They must not delay or replace the core wayfinding success criterion.

## 5. Primary visitor journey

1. Open the app to the Map view and see the mall name, main-level context, map loading state, and store search/directory entry point.
2. Once ready, see the configured parking entrance labeled as the starting point.
3. Search for a store or browse the directory. Select a result to view its name and main-level location and highlight it on the map.
4. Choose **Get directions** to calculate and preview a real SDK route from the entrance to that storefront.
5. Review the origin, destination, path, total distance when provided by the SDK, and the first instruction in a one-step-at-a-time guidance panel.
6. Use **Previous** and **Next** to move through instructions manually, or choose **Simulate walk** to demonstrate blue-dot movement and automatic instruction advancement. An optional **View all directions** control opens the complete ordered list.
7. On simulation completion, see **You have reached [store name]** and a clear **Done** action.
8. Choose **Done** to clear navigation and restore the default entrance/search state. A **Cancel route** action is available before arrival.

Shoppers must not need to understand a developer-oriented navigation mode or click two arbitrary spaces to complete this journey.

## 6. Functional requirements

### 6.1 Application shell and layout

- Provide Map, Sales, Food Court Menus, and Events navigation with an identifiable active section.
- Use Bootstrap layout and components, with scoped custom CSS for branding and map-specific layout.
- Desktop: show directory/details/guidance beside the map where space allows.
- Mobile: use a collapsible panel, offcanvas, or comparable Bootstrap pattern. Keep the route and essential instructions usable together rather than covering the map with an opaque full-screen instructions layer.
- Preserve pan, zoom, and rotation. Provide a clearly labeled control to return to the route or entrance view.
- Maintain map and route state while browsing supplemental sections. Keep the map instance mounted where practical; pause simulated walking when leaving Map and require an explicit resume on return.
- Prevent accidental duplicate Bootstrap behavior. Use Bootstrap's native interactive components or a React integration, not competing implementations for the same control.

### 6.2 Map, property, and entrance configuration

- Configure `propertyId`, display name, `mapId`, `mainFloorId`, and a valid SDK navigation target for the parking entrance in one dedicated configuration area.
- Restrict directory eligibility and demo routes to the configured main level. Reject or explain routes that require another level.
- Validate configured IDs against loaded map data. Invalid configuration produces a readable message, not a silently selected arbitrary floor or space.
- Clearly distinguish the start marker from the selected destination and route.
- At rest, label the origin **Starting point: Parking entrance**. Do not imply the browser has measured the visitor's position.
- During simulated walking, show a persistent **Simulated location** or **Demo walk** indication.
- Do not request browser geolocation permission.
- Mappedin geometry, routing connectivity, and map data remain authoritative. Do not invent route geometry to hide missing SDK routes.

### 6.3 Store directory and selection

- Provide a browsable, alphabetically ordered list of main-level storefronts and case-insensitive store-name search with whitespace normalization.
- Search results show the store name and relevant location/category metadata when available.
- Show loading, no-results, and recoverable error states.
- Selecting a result highlights/focuses its mapped storefront and exposes **Get directions**.
- Clicking an eligible storefront on the map opens the same selection/details state as the directory.
- Named SDK spaces are not automatically stores. Use a validated storefront catalog and explicit map-target associations.
- Every directory entry offered for routing must have a valid target on the main level. Unmapped content may appear in supplemental pages, but must not offer a broken directions action.
- Build the catalog from actual map locations/spaces and/or fixture records bound to verified map IDs. Fictional promotional content must not imply nonexistent geometry exists.

### 6.4 Routing and instructions

- Use the configured entrance as the default origin. Arbitrary origin selection is not required.
- Calculate directions with the SDK and draw the returned route through the SDK navigation interface.
- Cover undefined routes, thrown errors, and directions with no drawable coordinates.
- For an already-at-destination result, show an appropriate message instead of drawing an empty path or starting simulation.
- Keep the destination visible in the guidance panel. By default, display one instruction at a time with meaningful turn/action wording, distance when available, and a **Step X of Y** indicator.
- Provide keyboard-accessible **Previous** and **Next** controls. Disable Previous at the first step and Next at the last step; support single-instruction routes without out-of-range navigation.
- Outside simulation, advancement is manual. Changing the displayed step does not move the location marker or establish that the visitor has physically completed a turn or arrived.
- Provide an optional **View all directions** control to open the complete ordered list and a **Back to step-by-step** action. Switching presentation modes preserves the selected step and route; it must not restart navigation.
- During active simulation, automatically display the instruction associated with simulated route progress. Using Previous or Next pauses the simulation before browsing steps; resuming synchronizes the displayed step to the simulated position.
- New or replacement routes begin at the first instruction. Cancel/reset clears the selected step and restores the default step-by-step presentation.
- Do not expose raw SDK action codes as the final shopper-facing instruction copy. Translate supported actions into readable English without inventing landmarks or route facts.
- If usable instructions are unavailable, explain the limitation. A path alone is not a passing result for the turn-by-turn requirement.
- Reset the previous path, progress, and timers before installing a replacement route.
- A stale route calculation must not overwrite a newer destination selection.

### 6.5 Demo walk and navigation state

Represent at least these states explicitly: map loading, idle, destination selected, route calculating, route preview, simulating, simulation paused, arrived, and recoverable error.

- Enable simulation only after a valid drawable route exists.
- Advance along actual route coordinates without requesting device position.
- Keep the current instruction aligned with route progress using SDK-supported progress or validated instruction/geometry associations. Do not advance instructions merely by elapsed time or assume one instruction per coordinate.
- Offer pause/resume and cancel. Do not allow multiple timers or competing simulations.
- At the endpoint, stop the timer and display arrival. This is simulated arrival, not a real-world arrival detection feature.
- **Done** or **Cancel route** clears path, simulated location, active instruction, selected destination, and timers, and restores the entrance context.
- Cancel pending asynchronous work or ignore stale completions on reset, route replacement, or component unmount.

### 6.6 Supplemental demo pages

All supplemental content is fixture-backed, read-only, and visibly labeled as sample/demo content.

| Section | Minimum behavior | Explicit exclusions |
| --- | --- | --- |
| Sales | Browse offer cards with title, participating store, description, and stated validity dates. Should line up with the sample map venue data by name as index for cross referencing in later phases. | No redemption, coupons requiring issuance, or checkout |
| Food Court Menus | Browse food vendors and view menu item names, descriptions, and sample prices with currency | No cart, ordering, payments, or live availability |
| Events | Browse events and open details with title, description, dates/times, and location | No booking, registration, or ticketing |

- Include enough varied fixtures to exercise multiple records and an empty state in each section. Keep dates deterministic and avoid misleading live/expired claims based on the presenter's clock.
- When a participating store/vendor/location maps to an eligible main-level storefront, provide **Find on map**. This opens Map with that destination selected; routing remains an explicit visitor action.
- Omit or disable this action with an explanation when no valid mapped destination exists.
- A failed supplemental query must not disable map navigation.

## 7. Technical architecture

### 7.1 Stack and boundaries

- **UI:** React with TypeScript.
- **Build/dev server:** Existing Vite project, managed with Yarn.
- **Styling/components:** Twitter Bootstrap 5 and the existing Greenfield theme.
- **Application data:** TanStack Query v5 for queries, caching, loading/error states, and later remote integration.
- **Mapping:** Mappedin v6. Prefer the official `@mappedin/react-sdk` integration, using compatible versions of the JS SDK and blue-dot package. Verify APIs against installed declarations before implementation.
- **State:** React state/context for selection and navigation. No additional global state framework is required.
- **Deployment:** Static frontend assets. No backend or database in the demo architecture.

TanStack Query is a data orchestration layer, not an HTTP client requirement. Its query functions must call local Promise-returning service methods for business content. Do not introduce `fetch`, Axios, a mock HTTP server, MSW, or a service-worker API interceptor merely to simulate a backend.

SDK rendering, map interactions, route drawing, and simulation belong in the Mappedin integration, not in business-content query functions. SDK-managed network requests do not need to be wrapped in TanStack Query.

### 7.2 Local service contract

Define domain types and a small application-data service interface, independent of React and SDK object instances. Suggested contract:

```ts
interface MallContentService {
  listStores(propertyId: string): Promise<Store[]>;
  listSales(propertyId: string): Promise<Sale[]>;
  listFoodVendors(propertyId: string): Promise<FoodVendor[]>;
  listEvents(propertyId: string): Promise<MallEvent[]>;
}
```

- `Store`: stable ID, property ID, name, optional category/description, floor ID, and explicit Mappedin target reference.
- `Sale`: stable ID, property ID, title, description, store reference, and validity dates.
- `FoodVendor`: stable ID, property ID, name, optional store reference, and menu items with stable IDs, descriptions, prices, and currency.
- `MallEvent`: stable ID, property ID, title, description, start/end timestamps with timezone information, location label, and optional store reference.
- Mappedin target references carry both target kind and ID where needed. Do not assume a location ID is interchangeable with a space ID.
- Keep currency representation explicit, preferably integer minor units with an ISO currency code.
- Use a local mock implementation returning deterministic typed fixtures. An optional short configurable delay may demonstrate loading states.
- Provide explicit development/test scenarios for errors and empty responses. Do not randomly fail during a client presentation.
- Query keys include property and resource, for example `['mall', propertyId, 'stores']`. Search can filter the cached store catalog locally.
- Configure deliberate stale-time/retry/refetch behavior. Canned data must not refetch unexpectedly on focus or retry endlessly.
- Create the service and QueryClient once at application composition boundaries, not on every render.

When a backend is later authorized, add an HTTP implementation of this interface and swap it at the composition boundary. Query hooks and presentation components must not need endpoint-specific rewrites. These method names define frontend contracts, not already agreed production REST endpoints.

### 7.3 Suggested project organization

This is a proposed structure, not permission to reorganize unrelated existing files:

```text
src/
  main.tsx                     # React entrypoint and providers
  App.tsx                      # Shell and section selection
  config/mall.ts               # Property, floor, entrance, SDK configuration
  components/                  # Shared shell and reusable status UI
  features/wayfinding/         # Map, directory, store details, route instructions
  features/sales/              # Offer list/details
  features/food/               # Vendor/menu views
  features/events/             # Event list/details
  services/content.ts          # Domain contracts and service interface
  services/mockContent.ts      # Local Promise-returning implementation
  fixtures/                    # Demo content and explicit failure/empty scenarios
  queries/                     # TanStack Query hooks and keys
  styles/                      # Bootstrap overrides and existing theme
```

Use a narrow adapter/hook inside `features/wayfinding/` to encapsulate SDK lifecycle, map-target resolution, route drawing/cleanup, and simulation. Do not place SDK objects into serializable business fixtures or make presentation components depend on HTTP details.

### 7.4 SDK lifecycle and known integration rules

- Follow the React SDK's supported map lifecycle. Avoid recreating the map on ordinary UI updates.
- Clean up event subscriptions, SDK resources where owned by the component, and all simulation timers. Verify React development Strict Mode does not cause duplicate maps, listeners, or walks.
- Preserve type-only imports for SDK types.
- Existing v6 usage calculates `mapData.getDirections(origin, destination)` and passes the resulting `Directions` to `mapView.Navigation.draw(directions)`. Do not pass two spaces directly to the drawing method.
- Check route validity and nonempty geometry before path rendering or simulation; clear navigation with the SDK's supported clear method.
- Use `watchDevicePosition: false` for the demonstration blue dot.
- Verify the compatibility of the existing beta blue-dot dependency rather than silently upgrading the whole SDK stack.

### 7.5 Network and credential policy

- Allow the SDK's required map-data, asset, authentication, and any documented SDK-managed network traffic. Record observed SDK traffic during QA; do not claim zero external requests.
- No mall business-content request may leave the browser in demo mode.
- Use official permitted demo credentials only for demo maps, subject to Mappedin's terms. Do not reproduce credential values in documentation or logs.
- Configuration/environment variables improve configurability but do not make browser-bundled values secret. In particular, `VITE_*` values are public in the compiled frontend.
- Do not ship privileged customer credentials in the frontend. Before using customer maps, confirm licensing and an approved authentication approach.
- If customer-map access requires protecting credentials and there is no approved token provider, raise that as a blocker. A minimal FastAPI token broker is a separately approved exception, not a reason to build a general backend now.

## 8. Usability, accessibility, and reliability

- Search, directory results, controls, page navigation, instruction lists, and status messages must be keyboard operable and have accessible names.
- Provide visible focus states, adequate contrast, non-color-only origin/destination indicators, and sensible touch targets.
- Present textual route guidance outside the canvas. Do not claim the 3D map itself meets complete screen-reader accessibility requirements without testing.
- Announce significant loading, route errors, and arrival changes appropriately, without noisy announcements for every simulated coordinate.
- Account for reduced-motion preferences and avoid mandatory camera-follow animation to read directions.
- Target modern Chrome, Edge, Firefox, and Safari, including a real or representative mobile viewport. Record actual tested browsers/devices rather than implying all were tested.
- If map initialization fails or WebGL is unavailable, show a clear retry/unsupported message. Locally backed supplemental pages should remain accessible.
- Never silently substitute a fake map, fabricated route, or canned directions for a failed Mappedin operation.
- Do not promise physical route correctness until the client has validated the entrance, map connectivity, storefront associations, and instructions on site.

## 9. Acceptance criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-01 | App runs as a frontend-only React/Bootstrap application | Start with documented Yarn command; no application backend required |
| AC-02 | Correct main level and configured entrance are shown | Validate configuration against loaded data and inspect map/labels |
| AC-03 | Visitor finds and selects a store through directory or name search | Test browse, mixed-case search, whitespace, no results, and map selection |
| AC-04 | Each offered main-level storefront can be routed from the entrance | Validate catalog-target bindings and run an SDK route coverage check for every routable catalog entry; record exceptions as failures/gaps |
| AC-05 | Directions default to one instruction at a time and correspond to the displayed path | Verify Previous/Next boundaries, Step X of Y, full-list toggle and return, manual advancement without location/arrival changes, and simulation-driven advancement for representative routes |
| AC-06 | Location presentation is honest | No geolocation prompt; entrance assumption and simulation are clearly identified |
| AC-07 | Simulation supports progress, pause/resume, arrival, cancel, and reset | Exercise the complete state flow and repeat it without duplicate timers or stale routes |
| AC-08 | Sales, Food Court Menus, and Events work with local demo data | Open each section/details view; test valid and unmapped Find on map actions |
| AC-09 | Business-content services make no network requests | Inspect network traffic during every section flow and error/retry scenario; distinguish SDK traffic from application content |
| AC-10 | Failure states are recoverable | Exercise map failure, no route, empty route, invalid mapping, query failure, and empty content |
| AC-11 | Mobile layout and keyboard controls are usable | Test a phone-sized viewport and keyboard-only directory-to-directions flow |
| AC-12 | Build and handoff are reproducible | `yarn build` passes; setup docs and QA results identify commands, environment, tested cases, and known gaps |

**Demo success gate:** A presenter can open the app, find a mapped store, obtain a real entrance-to-store route, read usable instructions, demonstrate the walk, and reset, without developer tools or a running application backend.

Demo success does not establish production readiness, live indoor positioning, or measured tenant/retention improvements.

## 10. Implementation sequence and deliverables

1. **Validate map inputs:** Confirm the demo venue, main-floor ID, entrance target, and storefront catalog. Identify any missing connectivity before polishing the UI.
2. **Deepen Bootstrap:** Replace all currently explicitly defined css rules with twitter bootstrap classes where applicable. Whenever possible, avoid defining custom css and prefer Bootstrap.
3. **Introduce React:** Add compatible React/SDK dependencies and TSX/Vite configuration; move the existing branded shell into components. Preserve the existing prototype's useful behavior and comments.
4. **Define local content services:** Add domain types, deterministic fixtures, service composition, QueryClient, and query hooks.
5. **Build the core visitor flow:** Directory/search, destination details, entrance-based routing, route preview, readable instructions, and explicit error states.
6. **Integrate the demo walk:** Coordinate-based simulation, current-step guidance, pause/resume, arrival, reset, stale-operation protection, and cleanup.
7. **Build supplemental sections:** Sales, food menus, and events with consistent status UI and valid map handoffs.
8. **Verify and document:** Automated tests, browser checks, route coverage, network audit, build, setup instructions, and known gaps.

Expected implementation deliverables:

- Working frontend source and updated dependencies/lockfile.
- Configurable property/main-floor/entrance and validated demo data.
- Runnable development and production-build instructions in `README.md`, including required public demo configuration and chosen local port. Avoid colliding with other local projects; do not introduce Docker or backend infrastructure solely for this demo.
- `QA.md` with tested cases, outcomes, browser/device context, and known gaps.
- Focused automated tests for directory filtering, fixture/mapping validation, instruction formatting, query states, and navigation state/cleanup. Add suitable test scripts when the implementation adds the harness; they do not exist in the inspected baseline.
- Browser smoke coverage for search-to-route, simulation-to-arrival/reset, supplemental navigation, and recoverable failures.

No application code is authorized by the creation of this specification alone.

## 11. QA checklist template

All boxes below start unchecked. Check them only after actual execution and attach results or notes in `QA.md`.

- [ ] Install with Yarn and start the documented frontend command.
- [ ] Load the actual demo map and verify the configured main level and entrance.
- [ ] Validate every routable catalog entry and check entrance-to-store route coverage.
- [ ] Browse/search/select stores, including case and whitespace variations and no matches.
- [ ] Compare text instructions with representative short, long, and multi-turn paths.
- [ ] Verify one-instruction default, Step X of Y, Previous/Next boundaries, and single-instruction routes.
- [ ] Open View all directions and return to step-by-step without losing the selected step or restarting the route.
- [ ] Verify manual step changes do not move the marker or trigger arrival; automatic advancement follows simulated position, not elapsed time.
- [ ] Browse steps during simulation and verify it pauses; resume and confirm the current step resynchronizes with simulated position.
- [ ] Verify route replacement and cancel/reset clear the old step and restore the default presentation.
- [ ] Handle no route, empty geometry, same-location arrival, and invalid target IDs.
- [ ] Reject out-of-scope cross-floor destinations/routes rather than silently routing elsewhere.
- [ ] Simulate, pause, resume, arrive, cancel, reset, and repeat without duplicate movement.
- [ ] Switch destinations during route calculation and verify stale results are ignored.
- [ ] Leave Map during simulation, return, and explicitly resume without losing route context.
- [ ] Exercise all three supplemental pages, details, and mapped/unmapped location actions.
- [ ] Force deterministic query loading, error, empty, and retry states.
- [ ] Inspect network requests and confirm business content is entirely local.
- [ ] Test map load failure and unsupported rendering with a usable fallback message.
- [ ] Test mobile layout, keyboard access, status announcements, and reduced motion.
- [ ] Run automated tests and `yarn build`; record the actual output and unresolved warnings.
- [ ] Record that real indoor positioning, offline operation, and on-site route validation are not established by the demo.

## 12. Dependencies, risks, and client questions

These items do not block writing the spec, but some must be resolved before a client-specific demo or production rollout:

- **Venue data:** Does the client have a published, licensed map with accurate main-level pedestrian connectivity and storefront associations? Until supplied, use an explicitly labeled demonstration venue.
- **Entrance:** Which parking entrance is the agreed start? Confirm its precise indoor navigation target; do not substitute an arbitrary named space.
- **Store coverage:** Is the map data complete enough to route to every intended storefront? Missing mappings or connectivity must be fixed or disclosed, not hidden by reducing the directory without agreement.
- **Authentication:** Are public demo credentials sufficient for the selected demonstration venue? Customer credentials require a separate security/licensing decision.
- **Positioning:** Does the client expect real-time indoor location? This is a separate integration and is not provided by the simulated blue dot.
- **Instructions:** Can the current venue geometry and instruction data provide directions a first-time visitor can follow? Field validation remains necessary for production.
- **Content:** Obtain approved branding, tenant names, menus, offers, event information, and permission to show them before replacing sample content.
- **Device coverage:** Confirm the customer's supported devices and browsers before committing to a production support matrix.
- **Backend follow-on:** Define content ownership, endpoint contracts, authentication, deployment, and operational responsibilities as a later phase. Do not prebuild speculative services.

## 13. References and evidence limits

Official documentation reviewed in a real browser while preparing this specification:

- [Mappedin Web SDK getting started](https://developer.mappedin.com/web-sdk/getting-started): v6 setup, map loading/rendering, licensing, demo credentials, and bearer-token authentication options.
- [Mappedin React SDK v6 reference](https://docs.mappedin.com/react/v6/latest/): official `@mappedin/react-sdk`, `useMapData`, and `MapView` integration.

Repository evidence: `AGENTS.md`, `package.json`, `src/main.ts`, `index.html`, `tsconfig.json`, and `public/sw.js` in the current working tree.

Direct documentation extraction was unavailable and plain HTTP retrieval returned 403; the pages were successfully read through the browser. No application build, runtime route coverage, positioning test, or client-map validation was performed as part of this documentation-only task. Package compatibility and exact SDK method signatures must be checked during implementation against the installed versions.

## 14. Delivered demo behavior

The following implementation is present in the current frontend and supersedes planning-only statements above where they conflict:

- The application uses a React `MapCanvas` integration with `@mappedin/mappedin-js`, not the React SDK wrapper proposed as an option in section 7.
- Parking Lot B initializes the simulated blue dot. A map click replaces the origin. A parking-space prompt can save a named parking location in `localStorage`; a clearly named demo-only setting clears that cache on browser reload.
- The directory has **Search** and **Browse** pills. **Find Anything** searches every named main-level space and reports `Name | Category`; Browse groups named spaces into stores, restrooms, parking, entrances/exits, vertical access, accessible routes, and other spaces.
- Every named main-level space is selectable as a route destination. A route may begin from a mapped space or the retained current simulated coordinate after walking, stepping, cancellation, or arrival.
- The route preview frames the complete returned route. Guidance displays one instruction at a time. Previous and Next pause simulation, reposition the blue dot and camera at the instruction coordinate, and Resume continues from that coordinate.
- Simulated arrival keeps the blue dot and current-coordinate origin available for continued wayfinding. Store arrivals show fixture-backed promotions; amenity arrivals do not present a store promotion modal.
- Deterministic promotions exist for the verified storefront catalog and appear on the Promotions page, as nearby simulated-walk markers, and at eligible store arrival. The Promotions page supports free-text search across promotion fields.
- The supplemental pages use fixed, centered cover-image presentation layers with elevated Bootstrap cards. Mobile navigation uses a Bootstrap offcanvas-style drawer with keyboard dismissal, a transparent click-capture backdrop, and reduced-motion-aware transitions.
- `yarn build` has passed repeatedly. Runtime/browser checks and route coverage remain recorded as outstanding in `QA.md`.
