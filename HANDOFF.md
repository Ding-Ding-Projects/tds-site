# Handoff

## Current state

The public source repository is at https://github.com/Ding-Ding-Projects/tds-site. The latest verified source revision is `a99e2539bf6d27164543402a069d9af077f67426`, confirmed on `main` with `git ls-remote`. It includes an indexed, attributed wiki snapshot, a tower-stat simulator, distinct Solo and Co-op plans for all 14 planner modes, a 3D scene, research, and documentation. Co-op entries are editorial mode-specific guidance, not independently tested clears. Solo research includes cited Badlands II and Polluted Wasteland II reports and a Hardcore Wave 48 partial attempt, all with explicit evidence limits. The planner labels its v2.11.0 reference snapshot and September 26, 2026 review date, with a link to Roblox's listing. On this source, `npm run test:wiki` passes 24/24, `npm run lint` passes, and `npm run build` passes with existing large-client-chunk and route-classification warnings. Sites version 4 is saved from revision `660515e0b1ed0d3893b90a5811e0d8b245d36dfc`; it contains 2,928 files, 41,861,120 bytes, and SHA-256 `00ea454e20636e4fef8e3b54f5b5573339fc3ddfc91258ff1f71726fcd9d9057`. Version 4 has no deployment. The connector still reports its configured `main` at `660515e0b1ed0d3893b90a5811e0d8b245d36dfc`; synchronizing source is required before saving a newer version.

The production build was pinned to the default revision. Existing isolated desktop and emulated mobile captures show an earlier build with the read-aloud control and current mode label. Their provenance, hashes, dimensions, runtime checks, and limits are in `evidence/site/current-build.json`. They verify one dark English desktop tuple at 1280×900 and one dark English emulated mobile tuple at 390×844, but do not show the current simulator repair or strategy version-context label. The required isolated headless interaction and capture route was not available in this session, so current simulator controls remain visually unverified. The captures also do not cover the complete language, theme, and display-scale matrix, touch orbit gestures, or all simulator formulas.

The Sites project is active and version 4 is saved from source revision `660515e0b1ed0d3893b90a5811e0d8b245d36dfc`. The current access mode remains custom owner access, `current_live_url` is null, and no deployment has been verified. The requested public deployment is not live. A save attempt for `474d7fbba09c1b751913badb0507901ff5902c5e` was rejected because the Sites connector's configured source `main` still reports `660515e0b1ed0d3893b90a5811e0d8b245d36dfc`; no new version was created. The source sync and any access changes or production publication remain pending the owner-confirmation path.

## Solo strategy coverage

The planner has separate solo notes for all 14 mode types and keeps co-op guidance distinct. A source test fails if a mode plan or its catalog entry is missing. Public creator demonstrations cover Frost, Molten, Fallen, and Pizza Party. A Frost community poster reports a solo win after following replies, but the loadouts conflict and detection claims need current verification. The Official Wiki Index lists solo-triumph badges for Molten, Fallen, Pizza Party, Badlands II, and Polluted Wasteland II. A Badlands II player reports a no-micro clear with Minigunner, Engineer, Commander, DJ Booth, and Mortar, but gives no wave log or tower levels; it remains a candidate loadout. A separate Hardcore report reaches Wave 48 but is not a triumph. Polluted Wasteland II community accounts conflict, including one Wave 18 loss and later feasibility disagreements. Voidcore evidence is conflicting, and one recorded creator triumph is not labeled solo. Most remaining solo notes are cautious preparation checklists, not verified wave-by-wave clears. Evidence and source limits are in `docs/research/solo-strategy-evidence.md`.

## Data and research limits

The import contains 2,835 wiki source records: 2,649 namespace 0 pages and 186 map pages, plus 83 tower records and 431 upgrade-level records. Counts are tied to the captured API inventory because live site counters and paginated titles differed. Source text and full-text search are available. The 2,649 namespace 0 articles request source-rendered HTML for their exact imported revisions through a same-origin Worker route. The Worker sanitizes scripts, styles, hidden challenge markup, and remote images, then returns semantic article nodes; indexed internal links open in the guide. The 186 map-namespace articles use the local imported-source formatter because their REST endpoint returns a map-widget fragment without a page-revision envelope. Full source is local for every entry; historical versions of transcluded templates are not archived. Imported text retains page revision, attribution, history, retrieval date, license, and adaptation information. Media is not redistributed without individually verified terms.

The initial user-supplied dossier was not imported as fact. Research identified stale or incorrect examples, including tower values and Frost boss identity. Raw community reports remain labeled as such.

## Design and status limitations

Material Designer and Status Hub tools were unavailable in this session. No live Hub update is claimed. Access changes and production publication remain pending the required owner-side confirmation through the Sites access flow.

The completeness document has an executable validator for its 12 hand-written contract families. The planner has a separate guard for all 14 Solo and 14 Co-op mode plans, with negative regressions for missing plans and mode-catalog drift. Co-op entries are editorial, mode-specific role guidance, not independently tested clears. All user-facing contract families remain open until their implementation and built-artifact evidence exist.

GitHub issue #1 remains open for the broader delivery. No progress comment was added for this solo-research slice because the current isolated capture route is unavailable and the issue's visible-surface comment contract requires a genuine capture.

## Remaining work

1. Verify the sanitized reader visually across representative article types and required viewport, language, theme, and scale tuples. Confirm live Sites supports outbound requests to the source wiki. Offline pages currently fall back to partial rendering and source markup; historical transcluded-template versions are not archived.
2. Expand simulator coverage beyond the 83 tower infobox pages and model tower-specific mechanics with source-verified full-cycle formulas. Damage methods, placement limits, and a fail-closed source contract are now present; special damage remains explicitly unmodeled.
3. Finish solo research with reproducible wave-by-wave routes, current update identifiers, and run evidence. Badlands II, Hardcore, and Polluted Wasteland II now include additional cited candidate, partial, or conflicting reports, but none is a reproduced route.
4. Complete the required viewport, language, theme, and scale matrix, and verify touch interactions on the 3D scene.
5. Complete the required owner-side access confirmation. Then set the requested public access mode, deploy a version bound to the latest source revision, and verify public access and image delivery. Version 4 is saved but not deployed.

## Verification

- `npm run test:wiki`: 27/27 passed on the current source, including three negative completeness regressions, four strategy coverage checks for Solo and Co-op omissions and catalog drift, and three scene-render scheduler checks.
- `npm run lint`: passed on the current source.
- `npm run build`: passed on the current source. Large-client-chunk and route-classification warnings remain.
- The local production Worker returned 200 for imported revision `670384` (746 semantic nodes, no active or remote-media nodes) and 404 for revision `123456789999`, which is outside the imported allowlist.
- Isolated Edge production build review on an earlier source revision: one 1280×900 desktop and one 390×844 emulated mobile capture, with no console exceptions, failed resources, unnamed interactive controls, or horizontal page overflow in those tuples.
- Current simulator and solo-planner version-label captures: unrun because the required isolated headless browser route was unavailable; no alternate computer-use route was used.
- Not verified: full cross-product viewport matrix, physical-device behavior, all tower formulas, touch orbit, complete readable wiki rendering, deployment, or live public access.
