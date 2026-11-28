# FreshSave

FreshSave tracks food dates and lets buyers reserve sealed surplus from local retailers for pickup. The frontend is a React and TypeScript app built with Vite and styled with Tailwind CSS.

See [what FreshSave learned from UM Marketspace](docs/um-marketspace-learnings.md) for the design decisions behind the visual redesign.

## Run the standalone demo on Windows

Install Node.js 22.18 or newer and pnpm. From the project directory, run:

```powershell
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
```

Open [FreshSave](http://127.0.0.1:8443/). The standalone demo is the default, including in Figma Make. Its two sample accounts and records are stored in the browser. The login page has shortcuts for both accounts.

**Add food** and **Add stock** can read a date-label photo in the browser. Check the suggested date and date type against the pack before saving. The camera and upload options sit alongside the deterministic sample scans and manual entry. Barcode lookup also supports camera input, with typed entry as a fallback. Optional device reminders require browser permission and work while FreshSave is open.

## Run the shared local app

1. Start Docker Desktop with Linux containers. Install dependencies with the command above. The repo includes the Supabase CLI.
2. Run `pnpm db:start`. The FreshSave project uses API port `55421`, database port `55422`, and [local mail inbox port 55424](http://127.0.0.1:55424/).
3. Copy `.env.example` to `.env.local` and set `VITE_FRESHSAVE_MODE=supabase`. Set `VITE_SUPABASE_PUBLISHABLE_KEY` to the local publishable key from `pnpm exec supabase status`. Keep administrative keys out of Vite environment variables.
4. Run `pnpm dev --host 127.0.0.1` and open FreshSave in two independent browser profiles. Sign into one with `retailer@freshsave.test` and the other with `buyer@freshsave.test`. The test password is `demo1234` for both.

The retailer has an unchecked **Test Sealed Crackers** batch. Open **Stock**, offer counted units, and confirm the move to the Clearance Basket. The buyer can then reserve the listing and see their pickup code after the retailer accepts. The retailer can enter the code to record handover. These accounts and fixtures are for local testing.

Run `pnpm db:reset` to rebuild the local database from the migrations and seed. This clears the current FreshSave database. Run `pnpm exec supabase stop --project-id freshsave-local` to stop this project.

## How the code is organized

- `src/App.tsx` defines hash routes and role-specific navigation. React screens live in `src/ui`.
- `src/domain` holds typed records, stock calculations, barcode validation, and Malaysian pickup-date rules. Screens use the feature contract in `src/services/contracts.ts`.
- The demo adapter reads the existing browser store. The Supabase adapter uses Auth and calls the database for stock and reservation changes. PostgreSQL keeps booked terms and reservation events and enforces permissions and stock limits.

## Verify changes

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Run browser tests with the demo server open. To try another port or browser, set `E2E_BASE_URL` or `CHROME_PATH`. See [the test instructions](tests/README.md) for the shared-mode and database checks.
