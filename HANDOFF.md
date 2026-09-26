# Handoff

## Current state

The public source repository is at https://github.com/Ding-Ding-Projects/tds-site. Before this handoff update, `git ls-remote` confirmed `main` at `d3e015b00be44c299e4536321f5d96d69676babd`. The task includes an indexed, attributed wiki snapshot, a tower-stat simulator, solo and co-op mode notes, a 3D scene, a deep-research prompt, and documentation. `npm run lint` passed on source revision `a3025f8d4d79fdf816c2d603cc88597632e5b0c7`; production builds passed on `a3025f8d4d79fdf816c2d603cc88597632e5b0c7`, `b15feef069c1203770cdce2259ef17fb4d85219d`, and `d3e015b00be44c299e4536321f5d96d69676babd`. Each build reports a large-client-chunk warning. The archive prepared from `d3e015b00be44c299e4536321f5d96d69676babd` was validated with 2,948 entries, size 7,289,132 bytes, and SHA-256 `FA6EE45550590CDE74319F38665277531636AD1403072E1D335180CC37C0BC45`. The Sites workflow later produced the upload archive, which Sites saved as version 1 from the same source revision. This handoff update is not in version 1. Rebuild and repackage the new source head before saving any later Sites version. Version 1 has no deployment.

The production build was pinned to the default revision. Isolated desktop and emulated mobile captures now show the read-aloud control and current mode label. Their provenance, hashes, dimensions, runtime checks, and limits are in `evidence/site/current-build.json`. They verify one dark English desktop tuple at 1280×900 and one dark English emulated mobile tuple at 390×844. They do not cover the complete language, theme, and display-scale matrix, touch orbit gestures, or all simulator formulas.

The Sites project is active and version 1 is saved from source revision `d3e015b00be44c299e4536321f5d96d69676babd`. The current access mode remains custom owner access, `current_live_url` is null, and no deployment has been verified. The requested public deployment is not live. A previously returned protected Sites credential has not been rotated; resolve that credential exposure before changing access or deploying publicly.

## Solo strategy coverage

The planner has separate solo notes for all 14 mode types and keeps co-op guidance distinct. Public creator demonstrations cover Frost, Molten, Fallen, and Pizza Party. The Official Wiki Index lists solo-triumph badges for Molten, Fallen, Pizza Party, Badlands II, and Polluted Wasteland II. The latter's solo availability is documented, while a current reproducible route has not been established. Hardcore is an anecdotal loadout report. Voidcore evidence is conflicting, and one recorded creator triumph is not labeled solo. Most remaining solo notes are cautious preparation checklists, not verified wave-by-wave clears. Evidence and source limits are in `docs/research/solo-strategy-evidence.md`.

## Data and research limits

The import contains 2,835 wiki source records: 2,649 namespace 0 pages and 186 map pages, plus 83 tower records and 431 upgrade-level records. Counts are tied to the captured API inventory because live site counters and paginated titles differed. Source text and full-text search are available. The article view now renders common Wikitext structures through `lib/wiki-source-renderer.mjs`, preserves full source markup, and provides a readable partial page; MediaWiki-compatible extensions, parser functions, and complex templates remain unimplemented. Imported text retains page revision, attribution, history, retrieval date, license, and adaptation information. Media is not redistributed without individually verified terms.

The initial user-supplied dossier was not imported as fact. Research identified stale or incorrect examples, including tower values and Frost boss identity. Raw community reports remain labeled as such.

## Design and status limitations

Material Designer and Status Hub tools were unavailable in this session. A task-local status record exists outside the repository; do not claim a Hub update. The Site's protected credential exposure must be resolved through its supported owner recovery path before any publication. A newly generated write credential is not evidence that the earlier credential was revoked.

## Remaining work

1. Extend partial Wikitext coverage toward MediaWiki-compatible article rendering, then verify attribution and representative article layouts in the built site. The current renderer check has five focused cases; visual evidence for this new article view is still unrun.
2. Expand simulator coverage and model tower-specific mechanics that the generic DPS formula cannot represent.
3. Finish solo research with reproducible wave-by-wave routes, current update identifiers, and run evidence; keep unsupported entries labeled as checklists or anecdotes.
4. Complete the required viewport, language, theme, and scale matrix, and verify touch interactions on the 3D scene.
5. Rotate the exposed protected Sites credential through its supported owner recovery operation, then rebuild and save a Site version bound to the current source revision.
6. Set the requested public access mode, deploy the saved version, and verify public page access and image delivery only after the credential blocker is resolved.

## Verification

- `npm run lint`: passed with zero warnings on the first source revision.
- `npm run build`: passed on the first source revision; the client bundle warning remains. After the readable-renderer change, `npm run test:wiki-renderer` passed 5/5 and `npm run build` passed; the large client chunk and route-classification warnings remain.
- Isolated Edge production build review: one 1280×900 desktop and one 390×844 emulated mobile capture, with no console exceptions, failed resources, unnamed interactive controls, or horizontal page overflow in those tuples.
- Not verified: full cross-product viewport matrix, physical-device behavior, all tower formulas, touch orbit, complete readable wiki rendering, deployment, or live public access.
