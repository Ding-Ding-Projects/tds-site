# User guide and accessibility

The front view leads to solo/co-op strategies, an 83-tower simulator, and a lazily loaded interactive 3D defense scene. The 3D view supports pointer orbit, arrow-key orbit, touch-sized rotate buttons, reduced-motion behavior, and a text fallback when WebGL is unavailable. Article search downloads its title and full-source term index on demand; each article loads only when selected.

The readable article text currently uses the API's extract, while the complete imported source markup is available in an escaped expandable section. The API parse route returned a Cloudflare challenge to the current Node fetch context on 2026-09-26, so a complete formatted article renderer is still open work.

The implementation tracks the required per-surface completeness inventory in `docs/guide/completeness.md`. Any limitation must identify the exact contract, observed blocker, and shipped equivalent.

The inspected desktop and emulated mobile screenshots are [embedded beside the project overview](../../README.md#current-built-experience), with viewport tuples, capture times, and SHA-256 values in [`evidence/site/current-build.json`](../../evidence/site/current-build.json). The 1280×900 desktop and 390×844 mobile English/dark tuples show zero runtime errors and no page-width overflow. The wider 200% scale, alternate themes and language modes, and several interactive paths remain unverified.

The inspected desktop screenshot is [embedded beside the project overview](../../README.md#current-built-experience), with dimensions and SHA-256 in [`evidence/site/desktop-initial.json`](../../evidence/site/desktop-initial.json). Its capture timestamp is unavailable from validated provenance. A mobile screenshot is not retained: the isolated browser stopped before a mobile-sized capture could be proven, so the build remains runtime-unverified for mobile layouts.
