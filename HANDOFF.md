# Handoff

## Current state

The public source repository is at https://github.com/Ding-Ding-Projects/tds-site. `git ls-remote` last confirmed `main` at `a0f45ee6bb71c339ae1ba725e8c329eb13e5bad0`; the current simulator repair is local and not yet included in that source revision. The task includes an indexed, attributed wiki snapshot, a tower-stat simulator, separate solo and co-op mode notes, a 3D scene, research, and documentation. The current working tree passes `npm run test:wiki` with 15/15 tests, `npm run lint`, and `npm run build`. The build reports a large-client-chunk warning and a route-classification warning. Sites version 3 is saved from source revision `a0f45ee6bb71c339ae1ba725e8c329eb13e5bad0`; it contains 2,928 files, 41,881,600 bytes, and SHA-256 `0458b087ff203cf9c63d516068199a47fa51b05e439cdbfd8b13cb3e439e28f6`. Version 3 predates the current simulator repair and has no deployment.

The production build was pinned to the default revision. Existing isolated desktop and emulated mobile captures show an earlier build with the read-aloud control and current mode label. Their provenance, hashes, dimensions, runtime checks, and limits are in `evidence/site/current-build.json`. They verify one dark English desktop tuple at 1280×900 and one dark English emulated mobile tuple at 390×844, but do not show the current simulator repair. The required isolated headless interaction and capture route was not available in this session, so current simulator controls remain visually unverified. The captures also do not cover the complete language, theme, and display-scale matrix, touch orbit gestures, or all simulator formulas.

The Sites project is active and version 3 is saved from source revision `a0f45ee6bb71c339ae1ba725e8c329eb13e5bad0`. The current access mode remains custom owner access, `current_live_url` is null, and no deployment has been verified. The requested public deployment is not live. A previously returned protected Sites credential has not been rotated; resolve that credential exposure before changing access or deploying publicly. The latest local simulator source must be pushed and saved as a later Site version before publication.

## Solo strategy coverage

The planner has separate solo notes for all 14 mode types and keeps co-op guidance distinct. Public creator demonstrations cover Frost, Molten, Fallen, and Pizza Party. A Frost community poster reports a solo win after following replies, but the loadouts conflict and detection claims need current verification. The Official Wiki Index lists solo-triumph badges for Molten, Fallen, Pizza Party, Badlands II, and Polluted Wasteland II. The latter's solo availability is documented, while a current reproducible route has not been established. Hardcore is an anecdotal loadout report. Voidcore evidence is conflicting, and one recorded creator triumph is not labeled solo. Most remaining solo notes are cautious preparation checklists, not verified wave-by-wave clears. Evidence and source limits are in `docs/research/solo-strategy-evidence.md`.

## Data and research limits

The import contains 2,835 wiki source records: 2,649 namespace 0 pages and 186 map pages, plus 83 tower records and 431 upgrade-level records. Counts are tied to the captured API inventory because live site counters and paginated titles differed. Source text and full-text search are available. The 2,649 namespace 0 articles request source-rendered HTML for their exact imported revisions through a same-origin Worker route. The Worker sanitizes scripts, styles, hidden challenge markup, and remote images, then returns semantic article nodes; indexed internal links open in the guide. The 186 map-namespace articles use the local imported-source formatter because their REST endpoint returns a map-widget fragment without a page-revision envelope. Full source is local for every entry; historical versions of transcluded templates are not archived. Imported text retains page revision, attribution, history, retrieval date, license, and adaptation information. Media is not redistributed without individually verified terms.

The initial user-supplied dossier was not imported as fact. Research identified stale or incorrect examples, including tower values and Frost boss identity. Raw community reports remain labeled as such.

## Design and status limitations

Material Designer and Status Hub tools were unavailable in this session. A task-local status record exists outside the repository; do not claim a Hub update. The Site's protected credential exposure must be resolved through its supported owner recovery path before any publication. A newly generated write credential is not evidence that the earlier credential was revoked.

## Remaining work

1. Verify the sanitized reader visually across representative article types and required viewport, language, theme, and scale tuples. Confirm live Sites supports outbound requests to the source wiki. Offline pages currently fall back to partial rendering and source markup; historical transcluded-template versions are not archived.
2. Expand simulator coverage beyond the 83 tower infobox pages and model tower-specific mechanics with source-verified full-cycle formulas. Damage methods, placement limits, and a fail-closed source contract are now present; special damage remains explicitly unmodeled.
3. Finish solo research with reproducible wave-by-wave routes, current update identifiers, and run evidence; keep unsupported entries labeled as checklists or anecdotes.
4. Complete the required viewport, language, theme, and scale matrix, and verify touch interactions on the 3D scene.
5. Resolve the pending credential-rotation decision. After authorization, set the requested public access mode, deploy a version bound to the latest source revision, and verify public access and image delivery. The current version 3 is saved but not deployed, and it predates the local simulator changes.

## Verification

- `npm run lint`: passed with zero warnings on the first source revision.
- `npm run test:wiki`: 16/16 passed on the current local changes, including corpus completeness, negative missing-entry, missing-revision, missing-license, invalid tower cap, stale tower revision, special-DPS, and detection-footnote checks, plus rendered-audit snapshot binding.
- `npm run lint`: passed on the current local simulator changes.
- `npm run build`: passed on the current local simulator changes. Large-client-chunk and route-classification warnings remain.
- The production build passed with the source-rendering API route; large client-chunk and route-classification warnings remain.
- The local production Worker returned 200 for imported revision `670384` (746 semantic nodes, no active or remote-media nodes) and 404 for revision `123456789999`, which is outside the imported allowlist.
- Isolated Edge production build review on an earlier source revision: one 1280×900 desktop and one 390×844 emulated mobile capture, with no console exceptions, failed resources, unnamed interactive controls, or horizontal page overflow in those tuples.
- Current simulator repair capture: unrun because the required isolated headless browser route was unavailable; no alternate computer-use route was used.
- Not verified: full cross-product viewport matrix, physical-device behavior, all tower formulas, touch orbit, complete readable wiki rendering, deployment, or live public access.
