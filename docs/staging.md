# Private FreshSave staging

Staging uses an isolated hosted Supabase project and a Vercel Preview with Vercel Authentication. Demo mode remains the build default.

## Access and setup

1. Sign in to the Supabase and Vercel teams that should own staging with `pnpm exec supabase login` and `npx.cmd vercel login`. Have an account owner select the organization and project if either team has more than one candidate.
2. Create or select a dedicated FreshSave staging Supabase project. Link to that project's reference with `pnpm exec supabase link --project-ref <staging-ref>`. Run `pnpm exec supabase db push --remote=<staging-ref> --dry-run`, verify the target in the output, then run `pnpm exec supabase db push --remote=<staging-ref>`. The migrations create the private photo bucket, the expiry job, and the shared barcode catalogue. The local seed contains test accounts and listings and is for `db:reset` on disposable local data.
3. Link the repository directory to a Vercel project with `npx.cmd vercel link`. Enable **Settings → Deployment Protection → Vercel Authentication → Standard Protection**. Use **Preview** for the staging deployment and environment variables. The repository's `vercel.json` sets the Vite build and the `dist` output directory.
4. In the Vercel project's Preview environment, set `VITE_FRESHSAVE_MODE=supabase`, `VITE_SUPABASE_URL` to the staging project's HTTPS API URL, and `VITE_SUPABASE_PUBLISHABLE_KEY` to its publishable key. Keep server-side credentials out of frontend environment variables.
5. Run `npx.cmd vercel deploy --environment preview`. Verify the target is Preview, then open its URL in a signed-out browser to confirm Vercel blocks access before sharing it. In Supabase Auth URL Configuration, set the Site URL and exact Redirect URL to the staging preview origin, including the trailing slash. Update these settings if the staging origin changes.
6. Enable email confirmation. Configure custom SMTP for test inboxes outside Supabase's allowed built-in recipients. Start with Auth sign-ups disabled for the invite-only staging run. To test registration against hosted Auth, enable it only during a controlled test with a dedicated tester inbox, then disable it again.

Vercel can require an initial Production deployment for a new project. With the owner's approval, use a blank static placeholder with `--prod --skip-domain`. Verify that its generated URL requires Vercel Authentication and the Production domain is unassigned before uploading FreshSave as a Preview. A shareable demo belongs in a separate Vercel project configured only for `VITE_FRESHSAVE_MODE=demo`.

## Provision staging testers

Create a buyer, retailer, and unrelated buyer in Supabase Auth using unique test emails and strong unique passwords. Confirm those test users and provision their FreshSave profiles in the staging SQL editor. Replace the three emails with the actual test emails first.

```sql
begin;

insert into public.profiles (id, role, name, loc, onboard)
select u.id, v.role::public.account_role, v.name, 'bangsar', false
from auth.users u
join (values
  ('buyer@example.test', 'individual', 'Staging Buyer'),
  ('retailer@example.test', 'retailer', 'Staging Retailer'),
  ('second-buyer@example.test', 'individual', 'Second Staging Buyer')
) v(email, role, name) on lower(u.email) = v.email
on conflict (id) do nothing;

insert into public.stores (id, name, address, x, y)
select p.id, 'Staging Test Pantry', 'Staging pickup counter, Bangsar', 0.4, 0.3
from public.profiles p join auth.users u on u.id = p.id
where lower(u.email) = 'retailer@example.test' and p.role = 'retailer'
on conflict (id) do nothing;

commit;
```

## Test gate

- Sign in to the protected preview, then use separate browser profiles for the FreshSave buyer and retailer. As the retailer, record, count, publish, and put aside sealed test stock. As the buyer, reserve a unit. Accept as the retailer, retrieve the pickup code as the buyer, and complete handover as the retailer. Confirm the ledger and add the collected food to the buyer's inventory.
- Check that the unrelated buyer cannot read or modify the reservation and that the retailer cannot read the buyer's pickup code. Verify a last-unit race and a retried reservation against staging test stock. Check private photo access and the `freshsave-reservation-expiry` run in Supabase Cron.
- On the hosted URL, verify email confirmation and password reset in the initiating browser. Verify uploading and scanning a label on a physical phone as part of staging sign-off.

The script `pnpm test:e2e:supabase` writes local fixtures and expects their fixed IDs. Use it with the disposable local test stack. Use the provisioned users and staging stock for the hosted test gate.

[Vercel Preview deployment](https://vercel.com/docs/projects/deploy-from-cli) · [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) · [Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations) · [Supabase Auth redirects](https://supabase.com/docs/guides/auth/redirect-urls)
