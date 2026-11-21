create function freshsave_private.fail(message text, code text default 'FS001', field text default '') returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using message = message, errcode = code, detail = field;
end;
$$;

create function freshsave_private.epoch(value timestamptz) returns bigint
language sql immutable strict set search_path = '' as $$
  select (extract(epoch from value) * 1000)::bigint
$$;

create function freshsave_private.shop_time(day date, hour time) returns timestamptz
language sql immutable strict set search_path = '' as $$
  select (day + hour) at time zone 'Asia/Kuala_Lumpur'
$$;

create function freshsave_private.shop_day(at_time timestamptz) returns date
language sql immutable strict set search_path = '' as $$
  select (at_time at time zone 'Asia/Kuala_Lumpur')::date
$$;

create function freshsave_private.last_pickup(expiry date, date_type public.printed_date_type) returns date
language sql immutable strict set search_path = '' as $$
  select expiry - case when date_type = 'use-by' then 1 else 0 end
$$;

create function freshsave_private.pickup_deadline(pickup jsonb, accepted_at timestamptz) returns timestamptz
language sql immutable strict set search_path = '' as $$
  with cap as (
    select least(accepted_at + interval '24 hours',
      freshsave_private.shop_time((pickup->>'until')::date, (pickup->>'to')::time)) as deadline
  )
  select max(least(deadline, freshsave_private.shop_time(day, (pickup->>'to')::time)))
  from cap, lateral (values (freshsave_private.shop_day(deadline)), (freshsave_private.shop_day(deadline) - 1)) as days(day)
  where least(deadline, freshsave_private.shop_time(day, (pickup->>'to')::time))
      > greatest(accepted_at, freshsave_private.shop_time(day, (pickup->>'from')::time))
$$;

create function freshsave_private.ledger(listing public.listings) returns table(held integer, handed integer, available integer)
language sql stable set search_path = '' as $$
  with totals as (
    select coalesce(sum(quantity) filter (where status in ('pending', 'confirmed')), 0)::integer as held,
           coalesce(sum(quantity) filter (where status = 'completed'), 0)::integer as handed
    from public.reservations where listing_id = listing.id
  )
  select held, handed, listing.total - listing.withdrawn - held - handed from totals
$$;

create function freshsave_private.batch_allocated(batch uuid, excluding uuid default null) returns integer
language sql stable set search_path = '' as $$
  select coalesce(sum(u.handed + l.removed_qty + case when l.status in ('active', 'pending') and l.id is distinct from excluding
              then u.held + u.available else 0 end), 0)::integer
  from public.listings l cross join lateral freshsave_private.ledger(l) u where l.batch_id = batch
$$;

create function freshsave_private.tell(recipient uuid, label text, body text, reservation uuid) returns void
language sql set search_path = '' as $$
  insert into public.notifications(owner, category, title, subtitle, href)
  select recipient, 'resv', label, body, '/reservation/' || reservation
  from public.profiles where id = recipient and coalesce((prefs->>'resv')::boolean, true)
$$;

create function freshsave_private.activity(owner_id uuid, glyph text, description text) returns void
language sql set search_path = '' as $$
  insert into public.activity(owner, icon, detail) values (owner_id, glyph, description)
$$;

create function freshsave_private.record_event(reservation public.reservations, event_name text, extra jsonb default '{}') returns void
language sql set search_path = '' as $$
  insert into public.reservation_events(reservation_id, event, detail) values (reservation.id, event_name, extra)
  on conflict (reservation_id, event) do nothing
$$;

create function freshsave_private.expire_listing(listing uuid, at_time timestamptz) returns void
language plpgsql set search_path = '' as $$
declare
  request public.reservations;
  cause text;
begin
  -- The caller has locked the batch and listing before taking reservation locks.
  for request in select * from public.reservations r
    where r.listing_id = listing and r.status in ('pending', 'confirmed') order by r.id for update
  loop
    cause := case
      when request.status = 'pending' and request.respond_by < at_time then 'no-response'
      when freshsave_private.shop_day(at_time) > freshsave_private.last_pickup(
        (request.terms->>'expiry')::date, (request.terms->>'expiryType')::public.printed_date_type) then 'food-expired'
      when request.status = 'confirmed' and request.collect_by < at_time then 'not-collected'
    end;
    if cause is not null then
      update public.reservations set status = 'expired', reason = cause, decided_at = at_time where id = request.id;
      perform freshsave_private.record_event(request, 'expired', jsonb_build_object('reason', cause));
      perform freshsave_private.tell(request.buyer_id, 'Reservation expired', request.terms->>'name', request.id);
      perform freshsave_private.tell(request.seller_id, 'Reservation expired', request.terms->>'name', request.id);
    end if;
  end loop;
end;
$$;

create function freshsave_private.expire_due() returns void
language plpgsql set search_path = '' as $$
declare
  l record;
  at_time timestamptz := clock_timestamp();
begin
  for l in select distinct listing.id, listing.batch_id from public.listings listing
    join public.reservations r on r.listing_id = listing.id
    where (r.status = 'pending' and r.respond_by < at_time)
       or (r.status = 'confirmed' and r.collect_by < at_time)
    order by listing.batch_id, listing.id
  loop
    perform 1 from public.batches where id = l.batch_id for update;
    perform 1 from public.listings where id = l.id for update;
    perform freshsave_private.expire_listing(l.id, at_time);
  end loop;
end;
$$;

create function freshsave_private.reservation_command(action text, input jsonb, actor uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare
  l public.listings;
  r public.reservations;
  s public.stores;
  request_key uuid;
  record_id uuid := (input->>'id')::uuid;
  count_requested integer;
  capacity integer;
  at_time timestamptz;
  pickup_by timestamptz;
  cutoff timestamptz;
  handover_code text;
  other uuid;
  actor_label text;
  notice text;
begin
  if action = 'reserveListing' then
    request_key := (input->>'requestId')::uuid;
    count_requested := (input->>'qty')::integer;
    if request_key is null or count_requested is null or count_requested < 1 then
      perform freshsave_private.fail('Choose a quantity of at least 1.');
    end if;
    perform pg_advisory_xact_lock(hashtextextended(actor::text || request_key::text, 0));
    select * into r from public.reservations where buyer_id = actor and request_id = request_key;
    if found then
      if r.listing_id <> record_id or r.quantity <> count_requested then
        perform freshsave_private.fail('This request ID already belongs to a different reservation.');
      end if;
      return to_jsonb(r.id);
    end if;
    select * into l from public.listings where id = record_id;
    if not found or l.seller_id = actor or l.status <> 'active' or not l.moved then
      perform freshsave_private.fail('This listing is unavailable for your account.', 'FS002');
    end if;
  else
    select * into r from public.reservations where id = record_id and actor in (buyer_id, seller_id);
    if not found or (action in ('acceptReservation', 'declineReservation', 'completeHandover') and r.seller_id <> actor)
       or (action = 'disputeReservation' and r.buyer_id <> actor) then
      perform freshsave_private.fail('This action is unavailable for your account.', 'FS002');
    end if;
    select * into l from public.listings where id = r.listing_id;
  end if;

  perform 1 from public.batches where id = l.batch_id for update;
  select * into l from public.listings where id = l.id for update;
  at_time := clock_timestamp();
  perform freshsave_private.expire_listing(l.id, at_time);
  if action = 'reserveListing' then
    cutoff := freshsave_private.shop_time(l.pickup_until, l.closes_at);
    if l.status <> 'active' or not l.moved
       or at_time > cutoff - interval '30 minutes'
       or freshsave_private.shop_day(at_time) > freshsave_private.last_pickup(l.expiry, l.date_type) then
      perform freshsave_private.fail('The collection window has ended or closes too soon to reserve.', 'FS005');
    end if;
    select available into capacity from freshsave_private.ledger(l);
    if capacity < count_requested then perform freshsave_private.fail('There are not enough units available.', 'FS004'); end if;
    select * into s from public.stores where id = l.seller_id;
    insert into public.reservations(listing_id, buyer_id, seller_id, buyer_name, request_id, ref, quantity, terms, created_at, respond_by)
    select l.id, actor, l.seller_id, p.name, request_key, 'FS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
      count_requested, jsonb_build_object(
        'name', l.product_name, 'cat', l.category, 'kind', l.details->>'kind', 'price', l.price_sen::numeric / 100,
        'orig', l.original_sen::numeric / 100, 'expiry', l.expiry, 'expiryType', l.date_type, 'pack', l.details->>'pack',
        'instr', l.details->>'instr', 'sellerId', s.id, 'sellerName', s.name, 'sellerRole', 'retailer', 'sellerArea', s.address,
        'sellerHours', 'See agreed collection hours', 'batchId', l.batch_id,
        'window', jsonb_build_object('until', l.pickup_until, 'from', to_char(l.opens_at, 'HH24:MI'), 'to', to_char(l.closes_at, 'HH24:MI'))
      ), at_time, least(cutoff, at_time + interval '2 hours')
    from public.profiles p where p.id = actor returning * into r;
    perform freshsave_private.record_event(r, 'requested');
    perform freshsave_private.tell(r.seller_id, 'New reservation request', r.terms->>'name', r.id);
    perform freshsave_private.activity(actor, 'receipt', 'Requested ' || r.quantity || ' × ' || (r.terms->>'name'));
    return to_jsonb(r.id);
  end if;

  select * into r from public.reservations where id = record_id for update;
  actor_label := case when actor = r.seller_id then 'seller' else 'buyer' end;
  other := case when actor = r.seller_id then r.buyer_id else r.seller_id end;
  if r.status = 'expired' and action <> 'cancelReservation' then
    return jsonb_build_object('error', 'expired', 'message', 'This reservation has expired.');
  end if;
  case action
    when 'acceptReservation' then
      if r.status = 'confirmed' then return null; end if;
      if r.status <> 'pending' then perform freshsave_private.fail('This request is no longer pending.', 'FS003'); end if;
      pickup_by := freshsave_private.pickup_deadline(r.terms->'window', at_time);
      if pickup_by is null then perform freshsave_private.fail('There is no pickup window in the next 24 hours.', 'FS003'); end if;
      handover_code := lpad(((('x' || encode(extensions.gen_random_bytes(2), 'hex'))::bit(16)::integer % 9000) + 1000)::text, 4, '0');
      insert into freshsave_private.pickup_codes values (r.id, handover_code);
      update public.reservations set status = 'confirmed', confirmed_at = at_time, collect_by = pickup_by, decided_at = at_time where id = r.id;
      perform freshsave_private.record_event(r, 'confirmed');
      notice := 'Ready for pickup';
    when 'declineReservation' then
      if r.status = 'declined' then return null; end if;
      if r.status <> 'pending' then perform freshsave_private.fail('This request is no longer pending.', 'FS003'); end if;
      update public.reservations set status = 'declined', decided_at = at_time, decided_by = 'seller' where id = r.id;
      perform freshsave_private.record_event(r, 'declined', '{"by":"seller"}');
      notice := 'Reservation declined';
    when 'cancelReservation' then
      if r.status in ('cancelled', 'expired', 'declined') then return null; end if;
      if r.status not in ('confirmed', 'pending') then perform freshsave_private.fail('The handover was already recorded.', 'FS003'); end if;
      update public.reservations set status = 'cancelled', reason = left(input->>'reason', 300), decided_at = at_time, decided_by = actor_label where id = r.id;
      perform freshsave_private.record_event(r, 'cancelled', jsonb_build_object('by', actor_label));
      notice := 'Reservation cancelled';
    when 'completeHandover' then
      if r.status = 'completed' then return null; end if;
      if r.status <> 'confirmed' then perform freshsave_private.fail('Only a confirmed reservation can be handed over.', 'FS003'); end if;
      if (input->>'item')::boolean is not true or (input->>'paid')::boolean is not true then
        perform freshsave_private.fail('Tick both boxes to confirm the handover.');
      end if;
      if at_time < freshsave_private.shop_time(freshsave_private.shop_day(at_time), (r.terms->'window'->>'from')::time)
         or at_time > freshsave_private.shop_time(freshsave_private.shop_day(at_time), (r.terms->'window'->>'to')::time) then
        perform freshsave_private.fail('The shop is outside the agreed pickup hours.', 'FS003');
      end if;
      select code into handover_code from freshsave_private.pickup_codes where reservation_id = r.id;
      if handover_code is null or trim(input->>'code') is distinct from handover_code then
        perform freshsave_private.fail('That code doesn''t match this reservation.');
      end if;
      update public.reservations set status = 'completed', collected_at = at_time where id = r.id;
      perform freshsave_private.record_event(r, 'handover', '{"method":"code"}');
      perform freshsave_private.activity(actor, 'check2', 'Handover recorded: ' || r.quantity || ' × ' || (r.terms->>'name'));
      notice := 'Handover recorded';
    when 'disputeReservation' then
      if r.disputed_at is not null then return null; end if;
      if r.status <> 'completed' then perform freshsave_private.fail('There is no completed handover to dispute.', 'FS003'); end if;
      update public.reservations set disputed_at = at_time where id = r.id;
      perform freshsave_private.record_event(r, 'disputed', '{"by":"buyer"}');
      notice := 'Handover disputed';
    else perform freshsave_private.fail('Unknown reservation operation.');
  end case;
  perform freshsave_private.tell(other, notice, r.terms->>'name', r.id);
  return null;
end;
$$;

create extension if not exists pg_cron;
select cron.schedule('freshsave-reservation-expiry', '* * * * *', 'select freshsave_private.expire_due()');
