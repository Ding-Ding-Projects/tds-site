# Capture diagnostics

These two original captures are retained for the audit trail and are excluded from success evidence.

- `unverified-viewport-crop.png`: captured after a desktop viewport had replaced the intended mobile emulation. Its visible content was cropped, so it is not mobile layout evidence.
- `unverified-desktop-session.png`: the new capture session did not reapply the recorded desktop viewport. Its pixels do not establish the claimed desktop tuple.

The valid current captures and their exact viewport receipts are listed in [`../current-build.json`](../current-build.json).
