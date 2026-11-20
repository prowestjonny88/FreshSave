# FreshSave tests

No test framework or extra dependency is needed.

- `npm test` – logic tests (`tests/logic.test.mjs`). Runs the real `src/core.js` in Node with an in-memory
  `localStorage` stub: unit ledger, reservation lifecycle and expiry, handover rules, eligibility, expiry
  filters, reminders, barcode check digits and the data migration.
- `npm run test:e2e` – browser journeys (`tests/e2e-*.mjs`). They drive headless Chromium through a tiny
  DevTools-protocol client (`tests/cdp.mjs`) against the **already running dev server** (default
  `http://127.0.0.1:3000/`): buyer, retailer, cross-account handover, Track flows, timers, auth/onboarding,
  simplification checks (`e2e-simplify.mjs`: progressive disclosure, "More" menus, collapsed-but-working fields), responsive overflow + accessibility sweep (1440/1024/768/390 px) and an automated text-contrast audit.
  Requires `chromium` on the PATH. External Unsplash images are blocked in the sandbox and are ignored.

Each e2e script starts a fresh browser profile and prints PASS/FAIL lines; a non-zero exit code means a failure.
