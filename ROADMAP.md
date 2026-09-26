# Roadmap

All status below reflects the source state on 2026-09-26. An item is complete only after implementation and its relevant verification are recorded.

## Foundation

- [x] Create the public `Ding-Ding-Projects/tds-site` source repository.
- [x] Register the Sites project and persist its opaque project ID in `.openai/hosting.json`.
- [x] Replace the generated starter screen with a strategy planner, tower simulator, searchable tower index, original 3D scene, and encyclopedia route. Source build succeeds; one desktop and one emulated mobile tuple are verified, while the full UI contract remains open.
- [x] Add the canonical public conversation-vocabulary notice and project documentation index.

## Research corpus

- [x] Snapshot and reconcile the current eligible wiki inventory from the MediaWiki API, including namespace counts and snapshot time.
- [x] Import 2,835 source records with revision, source, history, license, and adaptation metadata.
- [x] Render the 2,649 namespace 0 pages through the MediaWiki REST HTML route, sanitize active markup, route indexed links into the guide, omit unlicensed media, and retain the complete imported source fallback. Use the local source formatter for all 186 namespace 2900 map entries because the REST endpoint returns a map-widget fragment without a page-revision envelope. Historical transcluded-template versions and rendered HTML for offline use are not archived.
- [x] Add a hand-written corpus completeness check for the 2,835 indexed page files, revision allowlist, source text, timestamps, and source/license provenance; prove missing-page, missing-revision, and missing-license cases fail. `npm run test:wiki`: 12 passed.
- [x] Add dated, cited official, creator, and public community research with disagreement and confidence labels.

## Product experience

- [ ] Ship search, filters, article navigation, source attribution, and contribution/license notices. Search, source links, and a revision-pinned sanitized article reader exist; cross-viewport reader captures and offline rendered copies remain open.
- [ ] Ship validated mode, wave, reward, map, enemy, and strategy coverage. Fourteen mode types have solo planning notes; most are editorial checklists and not verified clears. Continue checking source conflicts and map geometry.
- [ ] Finish tower stat comparison and simulator formulas with worked, source-backed examples. The current simulator retains attack method, detection footnotes, and finite placement limits, constrains its count slider, reports per-tower and selected-count investment, and withholds generic DPS for special damage methods. Its source-contract negative checks pass for 83 towers; tower-specific full-cycle formulas, comparison views, and built UI evidence remain open.
- [ ] Ship the original interactive 3D defense explorer with keyboard, touch, reduced-motion, 2D, and text alternatives.
- [ ] Complete required localization, accessibility, appearance, settings, history, export, notification, command, and other per-surface contracts, with a hand-written inventory.
- [ ] Verify the full experience at small-screen widths, required themes, language modes, and scales. Dark English at 1280×900 and emulated mobile 390×844 are captured; the remaining matrix is open.

## Publication

- [ ] Run the smallest decisive build and verification set after implementation stabilizes.
- [x] Capture genuine local built-site evidence and record source commit, build identity, viewport, language, theme, and privacy state for 1280×900 desktop and 390×844 emulated mobile. The complete matrix remains open.
- [x] Save Site versions 1 through 3 from their recorded source revisions, then version 4 from `660515e0b1ed0d3893b90a5811e0d8b245d36dfc`. Version 4 has 2,928 files, 41,861,120 bytes, and SHA-256 `00ea454e20636e4fef8e3b54f5b5573339fc3ddfc91258ff1f71726fcd9d9057`. It is not deployed. Any later source change needs its own saved version before publication.
- [ ] Publish the complete guide publicly and confirm deployed source parity.
- [ ] Complete handoff and exact task-owned closeout after the required archive and ancestry proofs.
