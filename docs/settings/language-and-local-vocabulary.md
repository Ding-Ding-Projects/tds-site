# Language and local vocabulary settings

## Behavior

The shared settings panel is available on the planner and encyclopedia routes. It stores a language mode and dialog-emoji preference in local storage. The current slice translates the settings panel into English, Cantonese, and bilingual copy and updates the document language metadata. It does not yet localize the planner or imported encyclopedia articles.

The panel accepts a user-selected JSON object with exactly `schemaVersion` and `entries` fields. `schemaVersion` is `1`; `entries` is a string-to-string object. The parser rejects duplicate keys, unsafe keys, invalid control characters, extra fields, nesting deeper than the schema allows, more than 4,096 entries, keys longer than 160 characters, values longer than 1,000 characters, total key text over 64 KiB, and payloads larger than 1 MiB. A complete payload is validated before any value is cached.

Only a validated vocabulary payload is stored in the per-visitor browser cache. File names and local paths are never persisted. The browser does not upload the file or make a network request during parsing or caching. The current slice exposes the control and keeps its state local; replacements are not yet applied to planner or encyclopedia text.

## Recovery and privacy

An invalid replacement leaves the prior valid local cache unchanged. A storage error is reported separately from invalid JSON. Clear removes that cache and restores original wording. A missing or invalid cache is ignored on load. No imported values appear in logs, exports, documentation, or public source.

## Verification

`npm run test:settings` checks mode persistence helpers and invalid preference fallback, then checks valid, duplicate-key, oversize, malformed, unsafe-key, extra-field, excessive-depth, and invalid-value cases without any real vocabulary payload. `npm run test:wiki` includes the same suite.

Keyboard, screen-reader, persistence, and responsive source checks are included. Real built-surface interactions, current screenshots, the light theme, localization beyond Settings, command launch integration, settings search, and regex builder interactions remain unverified or unimplemented.
