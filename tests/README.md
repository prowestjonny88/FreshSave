# FreshSave tests

No test framework or extra dependency is needed.

- `pnpm test` – logic and regression tests. Runs the demo state and typed operations in Node with an in-memory
  `localStorage` stub: unit ledger, reservation lifecycle and expiry, handover rules, eligibility, expiry
  filters, reminders, barcode check digits and the data migration.
- `pnpm test:e2e` – standalone demo browser journeys. They drive headless Chromium through a tiny
  DevTools-protocol client (`tests/cdp.mjs`) against the **already running dev server** (default
  `http://127.0.0.1:8443/`; override with `E2E_BASE_URL`): buyer, retailer, cross-account handover, Track flows, timers, auth/onboarding,
  simplification checks (`e2e-simplify.mjs`: progressive disclosure, "More" menus, collapsed-but-working fields), responsive overflow + accessibility sweep (1440/1024/768/390 px) and an automated text-contrast audit.
  On Windows it detects Chrome or Edge. On other platforms it uses `chromium` from PATH. Set `CHROME_PATH` to override either choice. The demo clock starts at noon in Kuala Lumpur for repeatable test fixtures.

Each e2e script starts a fresh browser profile and prints PASS/FAIL lines; a non-zero exit code means a failure.

## Shared-mode checks

- `pnpm test:db` runs PostgreSQL tests against the local stack, including the pickup-window calculation and repeated reservation expiry.
- `pnpm test:e2e:supabase` verifies a last-unit race, a replayed request, reservation privacy, and a pickup across independent browser sessions. Start Vite in Supabase mode, reset the disposable FreshSave database, and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the test shell to match the running app. This suite writes and closes test listings, so use the local fixtures.
