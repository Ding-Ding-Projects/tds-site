# Local GitHub Pages export

The normal `npm run build` remains the Sites/Cloudflare Worker build. It is not
an uploadable GitHub Pages directory. No workflow or hosting setting is changed
by this export work, and publication remains pending.

With Node 22.13 or newer and the locked dependencies installed, run:

```sh
npm run test:pages
npm run test:wiki
npm run lint
npm run build:pages
npm run verify:pages
```

`build:pages` runs the pinned portable Vinext compiler with a Pages-only build
configuration, then copies its actual `dist/client` export into `dist/pages`.
Only `dist/pages` is the static artifact; do not upload the whole `dist` directory.
Both `/tds-site/` and `/tds-site/encyclopedia/` have real HTML, with prefixed
JavaScript, CSS, public images, the regex worker, and all imported article data.
The final verification reports file/byte counts and a content-manifest hash.
It checks every copied public file byte-for-byte, both route documents and their
local references, and all article/rendered revision pairs. A failed verification
removes the candidate Pages directory.

## Why the separate build path exists

The pinned Vinext version's prerender requests do not apply `basePath`, and its
`trailingSlash` redirects can skip or fail the encyclopedia route. The Pages
build keeps prerender routes at root, uses Vite's base for compiled asset URLs,
and prefixes public-resource URLs explicitly. The encyclopedia client has a
server route wrapper with explicit static classification. After successful
rendering, the exporter moves `encyclopedia.html` to `encyclopedia/index.html`.
Normal document navigation avoids relying on a server-side RSC endpoint on
static hosting. The `.nojekyll` marker preserves underscore-prefixed assets.

The checked-in readable article cache is the static reader's source. Maps keep
the imported-source formatter. If a rendered cache entry is missing or stale,
the reader shows the existing local fallback and unavailable message; it does
not request the Worker-only API. The default Worker build retains that API
fallback. No content is fetched from the live wiki during the Pages build.

## Verification limits

Successful export and HTTP checks establish file, route, prefix, and corpus
integrity. They do not prove hydration, article interactions, WebGL, responsive
layout, accessibility, or a deployed URL. Those require current browser evidence
from the exact artifact, followed by separately authorized publication and live
source-parity checks. Existing screenshots are from older source and do not
verify this export. The complete delivery issue remains open.

## Reader and regex callback regression checks

The local follow-on repair restores known article links to the reader callback,
including nested label formatting and same-article section links. Regex imports
now enable the parent-controlled search mode and accept the version 1 JSON
produced by the export control, while retaining legacy unversioned input support.
Unknown fields, unsupported versions, and existing input limits remain rejected.

The repaired source passes 13 focused component regression checks, included in
107 aggregate wiki tests, plus 11 export tests, lint, the Pages build, and artifact
verification. The component checks execute actual TSX and event callbacks using
deterministic hook state and real React elements; they are not browser or
hydration tests. Type checking still reports 82 existing application diagnostics,
down from 84 after removing the two undefined callback references. This does not
establish browser interaction, default Worker runtime, or full delivery acceptance.
