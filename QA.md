# QA results and remaining validation

## Executed

- [x] `yarn build` completed successfully on 2026-11-01.
- [x] Deployed the containerized frontend to its production environment.
- [x] Loaded the blueprint-based production map metadata with locally configured Mappedin credentials. The configured main level is `f_5835ab589321170c11000000` (`Lower Level`); five named `Entrance` spaces were found and are exposed dynamically.
- [x] Verified implementation-time map metadata for 134 storefronts and 150 named main-level spaces, including Parking Lot B, restrooms, parking, and entrances.
- [x] Smoke-tested search, Browse, promotion, food, event, and cached-parking destination selection; routing from initial and arbitrary origins; simulated walking and arrival; promotions; manual navigation controls; and visual control/display behavior.
- [x] Exercised the responsive presentation, mobile drawer, keyboard flows, dialogs, and reduced-motion behavior during the sunny-day pass.

## Remaining validation

- [ ] Validate all dynamically offered storefront routes from each entrance.
- [ ] Record SDK network traffic separately from the local business-content fixtures.
- [ ] Exercise no-route, empty-data, map-failure, and unsupported-rendering recovery paths.
- [ ] Run formal cross-browser, accessibility, and automated test coverage.

## Known gaps

- The blueprint-based production map has not yet been commissioned against the physical Greenfield property.
- No on-site entrance, route, signage, or turn-by-turn instruction validation has been performed.
- Simulated walking does not establish real indoor positioning or offline support.
