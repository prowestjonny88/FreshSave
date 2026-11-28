begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(7);

insert into public.notifications (owner, category, title, href, unread, dedupe_key)
values
  ('01000000-0000-4000-8000-000000000001', 'expiry', 'Read fixture', '/inventory', false, 'dismiss:test'),
  ('01000000-0000-4000-8000-000000000001', 'expiry', 'Unread fixture', '/inventory', true, 'keep:test'),
  ('01000000-0000-4000-8000-000000000002', 'expiry', 'Other account fixture', '/batches', false, 'other:test');

set local role authenticated;
set local "request.jwt.claim.sub" = '01000000-0000-4000-8000-000000000001';
select is(
  public.freshsave_view('notifications', '{"offset":100}')->'notificationCounts',
  '{"read":1,"unread":1}'::jsonb,
  'bulk action counts cover the current account across pages'
);
select lives_ok('select public.freshsave_clear_read_notifications()', 'a buyer can clear read notifications');
select lives_ok('select public.freshsave_clear_read_notifications()', 'repeating the operation succeeds');
select is(
  public.freshsave_view('notifications')->'notificationCounts',
  '{"read":0,"unread":1}'::jsonb,
  'cleared notifications are excluded from the counts'
);
select results_eq(
  $$select entry->>'text' from jsonb_array_elements(public.freshsave_view('notifications')->'notifs') as entry
    where entry->>'text' in ('Read fixture', 'Unread fixture', 'Other account fixture')$$,
  $$values ('Unread fixture'::text)$$,
  'the notification feed retains only the current buyer’s unread fixture'
);
reset role;
select results_eq(
  $$select title from public.notifications where dedupe_key in ('dismiss:test', 'keep:test', 'other:test')
    and cleared_at is null order by title$$,
  $$values ('Other account fixture'::text), ('Unread fixture'::text)$$,
  'unread notifications and notifications owned by other accounts are untouched'
);
select ok(
  exists(select 1 from public.notifications where dedupe_key = 'dismiss:test' and cleared_at is not null),
  'cleared notifications retain their deduplication key'
);
select * from finish();
rollback;
