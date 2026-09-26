# Per-surface completeness inventory

This inventory is hand-written and checked by `scripts/test-site-completeness.mjs`. The check fails when a required family is missing or duplicated, the table schema changes unexpectedly, or a row claims completion without implementation, documentation, persistence, focused-check, and built-site evidence. A negative regression removes a required row and proves the check detects the omission. No row is complete until it links implementation, localized copy, persistence where relevant, documentation, focused checks, built-site interaction evidence, and a current capture. Missing items remain open.

| Contract family | Implementation | Documentation | Persistence | Focused checks | Built-site evidence | Status |
|---|---|---|---|---|---|---|
| English, Cantonese, bilingual, funny levels, emoji, School mode, narration | pending | pending | pending | pending | pending | open |
| Personal vocabulary upload, validation, replace, clear, local-only handling | pending | pending | pending | pending | pending | open |
| Scheduled and external settings, dim-sum surprise, notifications | pending | pending | pending | pending | pending | open |
| Search, regex builders, tabs/groups, command palette, settings search | pending | pending | pending | pending | pending | open |
| Visual appearance, element editors, logo customization and conversion | pending | pending | pending | pending | pending | open |
| Accessibility, responsive sizing, ADHD modes, reduced motion | pending | pending | pending | pending | pending | open |
| Local history, changelog, exports, bulk actions, external-editor handoff | pending | pending | pending | pending | pending | open |
| Destructive-action confirmation, locks, unlock ladder, Support Tickets | pending | pending | pending | pending | pending | open |
| File conversion and local Ollama suite manager | pending | pending | pending | pending | pending | open |
| Version/provenance, offline documentation, public-link preview graphic | pending | pending | pending | pending | pending | open |
| Shared Status Hub registration and reporting | unavailable in current tool surface | pending | pending | pending | pending | blocked, fallback to be recorded |
| Browser-extension download progress states | pending | pending | pending | pending | pending | open |

## Requested product features

| Feature | Implementation | Documentation/evidence | Verification | State |
|---|---|---|---|---|
| Solo and Co-op strategy selection across 14 mode types | `components/strategy-lab.tsx`, `lib/solo-strategy-coverage.mjs` | [solo strategy evidence](../research/solo-strategy-evidence.md), [strategy index](../strategies/README.md) | `npm run test:wiki` verifies one attributed Solo and Co-op plan for every mode and proves deleted plans or changed mode catalog fail; built-page interaction coverage remains partial | Implemented, data coverage verified; team plans are editorial and built interaction evidence is open |
| Tower statistics, source-aware DPS estimate, placement-count cap, and investment totals | `components/tower-simulator.tsx`, `scripts/extract-tower-stats.mjs`, `lib/tower-stats-contract.mjs`, `data/tower-stats.json` | [simulator notes](../simulator/README.md), per-tower source revision metadata | `npm run test:wiki` checks all 83 rows, source contract failures, Accelerator, Operator, Commando, Soldier, Golden Soldier, Freezer, Demoman, and Golden Demoman cycle fields, source-published examples, unsupported special-damage handling, and selected-count investment math; built controls still need capture because the required isolated headless route is unavailable in this session | Implemented, data contract verified; visual interaction evidence open |
| Readable imported articles and full-text search | `app/encyclopedia/page.tsx`, `app/api/wiki-rendered/[revisionId]/route.ts`, `components/wiki-rendered-article.tsx`, `lib/wiki-html-sanitizer.mjs`, `public/wiki/` | [data pipeline](../data-pipeline/README.md) | `npm run test:wiki`: 30/30; 2,649 namespace 0 revisions passed the rendered audit, 186 maps are routed to the imported-source fallback; local Worker checks returned 200, 501, and 404 for the expected route classes; article UI captures remain open | Namespace 0 uses sanitized revision-pinned HTML; 186 map-namespace pages use the local imported-source formatter; full source remains expandable; historical transcluded templates are not archived |
| Wiki corpus inventory and provenance | `lib/wiki-corpus-contract.mjs`, `data/wiki-revisions.json`, `public/wiki/index.json`, `public/wiki/pages/` | [data pipeline](../data-pipeline/README.md) | `npm run test:wiki`: missing page, revision, and license metadata regressions all fail | 2,835 current imported records checked against source files, revision allowlist, and source/license provenance |
| Interactive 3D scene | `components/defense-scene.tsx`, `lib/scene-render-scheduler.mjs`, `app/globals.css` | [user guide](./README.md) | `scripts/test-scene-render-scheduler.mjs` covers reduced-motion static rendering, animation scheduling, and stop behavior; `scripts/test-scene-controls.mjs` checks the 44×44 px touch target and its negative regression; WebGL, keyboard, touch, and fallback states not captured | Implemented; built runtime interaction evidence open |
| Mobile solo planner layout | `app/globals.css`, `components/strategy-lab.tsx` | [`current-build.json`](../../evidence/site/current-build.json) | 390×844 emulated viewport: one-column hero/planner, horizontal rail, no document overflow | Verified for this tuple only |
