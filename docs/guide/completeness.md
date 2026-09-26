# Per-surface completeness inventory

This inventory is hand-written. No row is complete until it links implementation, localized copy, persistence where relevant, documentation, focused checks, built-site interaction evidence, and a current capture. Missing items remain open.

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
| Solo strategy selection across 14 mode types | `components/strategy-lab.tsx` | [solo strategy evidence](../research/solo-strategy-evidence.md), [strategy index](../strategies/README.md) | Solo Molten and the unsupported Co-op fallback were driven in the built page; full per-mode interaction coverage is open | Implemented, partly verified |
| Tower statistics and placement-count estimate | `components/tower-simulator.tsx`, `data/tower-stats.json` | [simulator notes](../simulator/README.md), per-tower source revision metadata | Build passed; formula and rendered controls not captured | Implemented, runtime unverified |
| Complete imported article source and full-text search | `app/encyclopedia/page.tsx`, `public/wiki/` | [data pipeline](../data-pipeline/README.md) | Source inventory/materialization counts checked; rendered full-page parsing is unavailable | Partial: full source is searchable and expandable, readable page rendering is incomplete |
| Interactive 3D scene | `components/defense-scene.tsx` | [user guide](./README.md) | Build passed; WebGL, keyboard, touch, and fallback states not captured | Implemented, runtime unverified |
| Mobile solo planner layout | `app/globals.css`, `components/strategy-lab.tsx` | [`current-build.json`](../../evidence/site/current-build.json) | 390×844 emulated viewport: one-column hero/planner, horizontal rail, no document overflow | Verified for this tuple only |
