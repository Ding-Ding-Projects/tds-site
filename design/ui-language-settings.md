# Language and local vocabulary settings

## Design route and status

External design authoring tools were unavailable in the implementation environment. This checked-in design note is the source handoff for the first settings slice and uses the existing application palette, type scale, focus treatment, and responsive spacing.

## Screen and states

- A persistent Settings control is available from the shared shell on the planner and encyclopedia routes.
- The settings panel opens as a labeled region, closes with its close button or Escape, and returns focus to the opener.
- Language selector choices are English, Cantonese, and bilingual. The chosen mode persists locally and updates the document language metadata.
- A separate checkbox controls non-semantic emoji decoration in future dialogs and message boxes. It is not part of action or field labels.
- A local JSON file picker always appears in Settings. Its states are no file, valid file loaded, invalid file, replacement, and clear/reset.
- Imported vocabulary stays in per-visitor local browser storage. File names, mappings, and paths are not sent over the network or placed in diagnostics.

## Supported verification tuples

- Minimum narrow viewport: 320 CSS pixels.
- Normal viewport: 1280 by 900 CSS pixels.
- Language modes: English, Cantonese, and bilingual.
- Appearance: current dark theme; light appearance parity remains unverified.
- Display scales: 100%, 125%, 150%, and 200%; built captures remain outstanding.

## Intentional scope limit

This slice localizes the Settings surface only. The planner and encyclopedia copy do not yet switch language, and the uploaded replacements are not yet applied outside Settings. A full site-wide localization and replacement boundary needs separate implementation and built-surface evidence.
