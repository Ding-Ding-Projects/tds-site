# Settings search and regex workbench

Settings search runs locally over the visible setting labels and current values. Plain-text matching is the default. The optional regular-expression mode uses a dedicated browser worker and evaluates a bounded copy of the query, sample, expected-match cases, and Settings labels. Patterns and samples are not uploaded or persisted.

## Behavior

The advanced builder is attached directly beneath Settings search. It supports guided pattern insertion, explicit JavaScript regular-expression flags, Unicode code-point insertion, match and capture inspection, zero-width match navigation, replacement previews, expected-positive and expected-negative cases, session-only snippets, copy, JSON export, and bounded text import. Search results link to their matching controls.

The browser worker enforces a 512-character pattern limit, 4,096-character per-value limit, 24 KiB combined evaluation limit, 12 expected-case limit, and 32 Settings-item limit. It stops evaluation after 120 ms. The UI reports the active JavaScript engine and supported flags. A heuristic warns about a few nested-repeat or broad-wildcard patterns; it is not a proof of safety. Internal engine backtracking traces are not available. Constructs unsupported by JavaScript regular expressions are identified in the capability panel rather than emulated.

## Failure behavior

Invalid patterns return the engine error without changing Settings. Invalid imports leave the current pattern unchanged. A worker timeout terminates the worker and reports that the evaluation was stopped. If worker creation or clipboard access is unavailable, the UI reports the limitation. Unicode `u` and `v` flags cannot be combined.

## Privacy and local handling

Queries, samples, replacement text, expected cases, and snippets stay in component memory. Import accepts pasted JSON text only, rejects unknown fields and oversized values, and does not write the imported data to browser storage. Export creates a user-initiated local download. Settings search data is bounded to the five labels and values described in the component.

## Verification

`npm run test:regex-workbench` exercises matching, named captures, replacement, zero-width behavior, Settings filtering, token classification, invalid syntax, input bounds, and risk notices in a Node worker simulation. `npm run test:wiki` includes this focused suite and also runs the hand-written completeness inventory's missing-family negative regression. Built interaction captures and the full responsive layout matrix remain separate evidence requirements.
