# Handoff

## Current state

The public source repository is at https://github.com/Ding-Ding-Projects/tds-site. Before this handoff update, `git ls-remote` confirmed `main` at `b15feef069c1203770cdce2259ef17fb4d85219d`. The task includes an indexed, attributed wiki snapshot, a tower-stat simulator, solo and co-op mode notes, a 3D scene, a deep-research prompt, and documentation. `npm run lint` and `npm run build` passed on source revision `a3025f8d4d79fdf816c2d603cc88597632e5b0c7`; a production build also passed on revision `b15feef069c1203770cdce2259ef17fb4d85219d`. Both builds report a large-client-chunk warning. The archive prepared from revision `b15feef069c1203770cdce2259ef17fb4d85219d` was validated with 2,948 entries, size 7,289,037 bytes, and SHA-256 `B54E2AEBD24CD820DBD42DAAF3ED218C210F5A88B630751E8EDCBB7E9A7A82F6`; its embedded manifest carries the matching Site project ID. This handoff update is not in that archive. Rebuild and repackage the new source head before saving a Sites version. No version is saved or deployed yet.

The production build was pinned to the default revision. Isolated desktop and emulated mobile captures now show the read-aloud control and current mode label. Their provenance, hashes, dimensions, runtime checks, and limits are in `evidence/site/current-build.json`. They verify one dark English desktop tuple at 1280×900 and one dark English emulated mobile tuple at 390×844. They do not cover the complete language, theme, and display-scale matrix, touch orbit gestures, or all simulator formulas.

The Sites project is registered, but no version has been saved and no public deployment has been verified. An earlier protected credential exposure remains unresolved, so publication is withheld. Do not claim a live public guide.

## Solo strategy coverage

The planner has separate solo notes for all 14 mode types and keeps co-op guidance distinct. Public creator demonstrations cover Frost, Molten, Fallen, and Pizza Party. The Official Wiki Index lists solo-triumph badges for Molten, Fallen, Pizza Party, Badlands II, and Polluted Wasteland II. The latter's solo availability is documented, while a current reproducible route has not been established. Hardcore is an anecdotal loadout report. Voidcore evidence is conflicting, and one recorded creator triumph is not labeled solo. Most remaining solo notes are cautious preparation checklists, not verified wave-by-wave clears. Evidence and source limits are in `docs/research/solo-strategy-evidence.md`.

## Data and research limits

The import contains 2,835 wiki source records: 2,649 namespace 0 pages and 186 map pages, plus 83 tower records and 431 upgrade-level records. Counts are tied to the captured API inventory because live site counters and paginated titles differed. Source text and full-text search are available, but article bodies are not yet rendered as complete readable pages. The encyclopedia currently presents a concise readable extract and escaped original markup. Imported text retains page revision, attribution, history, retrieval date, license, and adaptation information. Media is not redistributed without individually verified terms.

The initial user-supplied dossier was not imported as fact. Research identified stale or incorrect examples, including tower values and Frost boss identity. Raw community reports remain labeled as such.

## Design and status limitations

Material Designer and Status Hub tools were unavailable in this session. A task-local status record exists outside the repository; do not claim a Hub update. The Site's protected credential exposure must be resolved through its supported owner recovery path before any publication. A newly generated write credential is not evidence that the earlier credential was revoked.

## Remaining work

1. Complete a readable renderer for full imported wiki article details and verify attribution presentation.
2. Expand simulator coverage and model tower-specific mechanics that the generic DPS formula cannot represent.
3. Finish solo research with reproducible wave-by-wave routes, current update identifiers, and run evidence; keep unsupported entries labeled as checklists or anecdotes.
4. Complete the required viewport, language, theme, and scale matrix, and verify touch interactions on the 3D scene.
5. Resolve the exposed Site credential through the owner-supported recovery process, then save a Site version from a build bound to the current source revision.
6. Publish and verify public page access and image delivery only after the credential blocker is resolved.

## Verification

- `npm run lint`: passed with zero warnings on the first source revision.
- `npm run build`: passed on the first source revision; the client bundle warning remains.
- Isolated Edge production build review: one 1280×900 desktop and one 390×844 emulated mobile capture, with no console exceptions, failed resources, unnamed interactive controls, or horizontal page overflow in those tuples.
- Not verified: full cross-product viewport matrix, physical-device behavior, all tower formulas, touch orbit, complete readable wiki rendering, deployment, or live public access.
