begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);

select is(
  freshsave_private.pickup_deadline(
    '{"from":"09:00","to":"17:00","until":"2026-05-22"}',
    '2026-05-18T19:00+08:00'::timestamptz
  ),
  '2026-05-19T17:00+08:00'::timestamptz,
  'pickup deadline ends inside Kuala Lumpur shop hours'
);
select is(
  freshsave_private.pickup_deadline(
    '{"from":"09:00","to":"17:00","until":"2026-05-18"}',
    '2026-05-18T19:00+08:00'::timestamptz
  ),
  null::timestamptz,
  'acceptance after the final closing time has no valid pickup window'
);

insert into public.reservations(id,listing_id,seller_id,buyer_id,buyer_name,request_id,ref,quantity,terms,respond_by)
values (
  '04000000-0000-4000-8000-000000000001','03000000-0000-4000-8000-000000000001',
  '01000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000001',
  'Expiry Test Buyer','05000000-0000-4000-8000-000000000001','FS-EXP-TEST',1,
  jsonb_build_object('name','Expiry test','expiry',freshsave_private.shop_day(now())+3,'expiryType','best-before'),
  clock_timestamp()-interval '1 minute'
);
select lives_ok('select freshsave_private.expire_due()', 'the scheduler can expire a pending reservation');
select lives_ok('select freshsave_private.expire_due()', 'running the scheduler again is safe');
select is(
  (select status::text from public.reservations where id='04000000-0000-4000-8000-000000000001'),
  'expired', 'the overdue request expired without a browser'
);
select is(
  (select count(*) from public.reservation_events where reservation_id='04000000-0000-4000-8000-000000000001' and event='expired'),
  1::bigint, 'there is one expiry event after two runs'
);
select is(
  (select available from public.listings l cross join lateral freshsave_private.ledger(l) where l.id='03000000-0000-4000-8000-000000000001'),
  1, 'the held unit was released once'
);

update public.reservations set status = 'completed', confirmed_at = now(),
  collect_by = now() + interval '1 hour', collected_at = now()
  where id = '04000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub" = '01000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select public.freshsave_save_collected_food('{"reservationId":"04000000-0000-4000-8000-000000000001"}')$$,
  'FS002', 'This handover cannot be added to My food.', 'unrelated buyer cannot save collected food'
);

set local "request.jwt.claim.sub" = '01000000-0000-4000-8000-000000000001';
select lives_ok(format(
  'select public.freshsave_save_collected_food(%L)',
  jsonb_build_object('reservationId','04000000-0000-4000-8000-000000000001','name','Expiry test',
    'cat','pantry','qty',1,'expiry',current_date+3,'expiryType','best-before','date',current_date,'confirmed',true)
), 'buyer can save the completed pickup');
select is(
  public.freshsave_save_collected_food('{"reservationId":"04000000-0000-4000-8000-000000000001"}'),
  (select id from public.inventory where details->>'reservationId' = '04000000-0000-4000-8000-000000000001'),
  'retry returns the saved item'
);
select is(
  (select count(*) from public.inventory where details->>'reservationId' = '04000000-0000-4000-8000-000000000001'),
  1::bigint, 'only one inventory item is linked to the reservation'
);
set local "request.jwt.claim.sub" = '01000000-0000-4000-8000-000000000003';
select is(
  (select count(*) from public.inventory where details->>'reservationId' = '04000000-0000-4000-8000-000000000001'),
  0::bigint, 'unrelated buyer cannot see the linked item'
);
reset role;

select * from finish();
rollback;
