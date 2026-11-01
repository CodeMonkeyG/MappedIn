# QA results

## Executed

- [x] `yarn build` completed successfully on 2026-11-01.
- [x] Loaded demo-map metadata with locally configured Mappedin credentials. The configured main level is `f_5835ab589321170c11000000` (`Lower Level`); five named `Entrance` spaces were found and are exposed dynamically.
- [x] Verified implementation-time map metadata for 134 storefronts and 150 named main-level spaces, including Parking Lot B, restrooms, parking, and entrances.
- [x] Added deterministic local promotions, simulated-position routing, directory grouping/search, saved parking, and responsive presentation UI. These changes are build-validated only; they are not browser smoke-test results.

## Not yet executed

- [ ] Browser smoke test of map rendering, route coverage, simulation, manual step camera behavior, current-coordinate rerouting, keyboard navigation, and mobile layout.
- [x] Replaced watermarked supplemental-page images with the cleared atrium background asset.
- [ ] Validate all dynamically offered storefront routes from each entrance.
- [ ] Record SDK network traffic separately from the local business-content fixtures.

## Known gaps

- The venue is a Mappedin demonstration map, not a validated Greenfield property.
- No on-site entrance, route, or turn-by-turn instruction validation has been performed.
- Simulated walking does not establish real indoor positioning or offline support.
