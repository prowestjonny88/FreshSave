create function freshsave_private.area(id text) returns table(x double precision, y double precision)
language sql immutable set search_path = '' as $$
  select a.x::double precision, a.y::double precision
  from (values ('bangsar',0,0), ('montkiara',-1,-6), ('damansara',1,-3), ('ss2',-6,2), ('cheras',7,4), ('subang',-14,6)) a(area,x,y)
  where a.area = id
$$;

create function freshsave_private.kind(category text) returns text
language sql immutable set search_path = '' as $$
  select case category when 'produce' then 'veg' when 'dairy' then 'milk' when 'bakery' then 'bread'
    when 'meat' then 'chicken' when 'frozen' then 'nuggets' when 'drinks' then 'juice' else 'rice' end
$$;

create function freshsave_private.valid_category(category text) returns boolean
language sql immutable set search_path = '' as $$
  select category in ('produce','dairy','bakery','meat','frozen','pantry','drinks','others')
$$;

create function freshsave_private.verify_photo(photo text, owner uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if photo is not null and (split_part(photo, '/', 1) <> owner::text or not exists (
    select 1 from storage.objects where bucket_id = 'food-photos' and name = photo
  )) then perform freshsave_private.fail('The selected photo could not be found.'); end if;
end;
$$;

create function freshsave_private.save_food(input jsonb, person public.profiles) returns jsonb
language plpgsql set search_path = '' as $$
declare
  row_id uuid := (input->>'id')::uuid;
  name_value text := trim(input->>'name');
  category text := input->>'cat';
  qty integer := (input->>'qty')::integer;
  printed date := (input->>'expiry')::date;
  date_kind public.printed_date_type := (input->>'expiryType')::public.printed_date_type;
  recorded_date date := (input->>'date')::date;
  b public.batches;
  i public.inventory;
  prior jsonb := '{}';
  content jsonb;
  previous_date date;
  previous_type public.printed_date_type;
  minimum integer;
begin
  if coalesce(length(name_value), 0) < 2 then perform freshsave_private.fail('Enter the product name.', 'FS001', 'name'); end if;
  if freshsave_private.valid_category(category) is not true then perform freshsave_private.fail('Choose a category.', 'FS001', 'cat'); end if;
  if qty is null or qty < 1 then perform freshsave_private.fail('Enter a whole number of at least 1.', 'FS001', 'qty'); end if;
  if printed is null or date_kind is null then perform freshsave_private.fail('Enter the date printed on the pack.', 'FS001', 'expiry'); end if;
  if recorded_date is null or recorded_date > freshsave_private.shop_day(now()) then
    perform freshsave_private.fail('Enter a date up to today.', 'FS001', 'date');
  end if;
  if row_id is not null and person.role = 'retailer' then
    select * into b from public.batches where id = row_id and owner = person.id for update;
    if not found then perform freshsave_private.fail('This batch is unavailable for your account.', 'FS002'); end if;
    if b.verification <> 'unverified' then perform freshsave_private.fail('Count the batch again before correcting its details.', 'FS003'); end if;
    minimum := freshsave_private.batch_allocated(b.id);
    if qty < minimum then perform freshsave_private.fail('At least ' || minimum || ' units have already been accounted for.', 'FS004', 'qty'); end if;
    prior := b.details;
    previous_date := b.expiry; previous_type := b.date_type;
    if b.expiry <> printed then
      prior := jsonb_set(prior, '{history}', coalesce(prior->'history','[]') || jsonb_build_array(
        jsonb_build_object('at', freshsave_private.epoch(now()), 'field','expiry', 'from', b.expiry, 'to', printed)));
    end if;
  elsif row_id is not null then
    select * into i from public.inventory where id = row_id and owner = person.id for update;
    if not found then perform freshsave_private.fail('This item is unavailable for your account.', 'FS002'); end if;
    if i.details->>'status' <> 'active' then perform freshsave_private.fail('Restore this item before editing it.', 'FS003'); end if;
    prior := i.details;
    previous_date := i.expiry; previous_type := i.date_type;
  end if;
  if (printed is distinct from previous_date or date_kind is distinct from previous_type) and (input->>'confirmed')::boolean is not true then
    perform freshsave_private.fail('Tick the box to confirm you have checked the date against the pack.', 'FS001', 'ok');
  end if;
  perform freshsave_private.verify_photo(input->>'photo', person.id);
  content := prior || jsonb_strip_nulls(jsonb_build_object(
    'name', name_value, 'cat', category, 'kind', coalesce(input->>'kind', prior->>'kind', freshsave_private.kind(category)),
    'barcode', input->>'barcode', 'photo', input->>'photo'
  ));
  if person.role = 'retailer' then
    if row_id is null then
      insert into public.batches(owner, quantity, expiry, date_type, recorded, details)
      values (person.id, qty, printed, date_kind, recorded_date, content || '{"history":[]}') returning id into row_id;
    else update public.batches set quantity = qty, expiry = printed, date_type = date_kind, recorded = recorded_date, details = content where id = row_id;
    end if;
  elsif row_id is null then
    insert into public.inventory(owner, quantity, expiry, date_type, purchased, details)
    values (person.id, qty, printed, date_kind, recorded_date, content || jsonb_build_object('initial',qty,'status','active','log','[]'::jsonb)) returning id into row_id;
  else
    update public.inventory set quantity = qty, expiry = printed, date_type = date_kind, purchased = recorded_date,
      details = content || jsonb_build_object('initial', greatest(qty, (prior->>'initial')::integer)) where id = row_id;
  end if;
  perform freshsave_private.activity(person.id, 'box', name_value || ' saved');
  return to_jsonb(row_id);
end;
$$;

create function freshsave_private.inventory_command(action text, input jsonb, actor uuid) returns void
language plpgsql set search_path = '' as $$
declare
  item public.inventory;
  qty integer := (input->>'qty')::integer;
  use_type text := input->>'type';
  history jsonb;
  previous jsonb;
begin
  select * into item from public.inventory where id = (input->>'id')::uuid and owner = actor for update;
  if not found then perform freshsave_private.fail('This item is unavailable for your account.', 'FS002'); end if;
  history := coalesce(item.details->'log', '[]');
  if action = 'deleteFood' then
    delete from public.inventory where id = item.id;
  elsif action = 'undoFood' then
    previous := history->-1;
    if previous is not null then
      update public.inventory set quantity = quantity + (previous->>'n')::integer,
        details = (details - 'closedAt') || jsonb_build_object('log', history - (jsonb_array_length(history) - 1), 'status', 'active') where id = item.id;
      perform freshsave_private.activity(actor, 'undo', 'Restored ' || (item.details->>'name'));
    end if;
  elsif action = 'useFood' then
    if qty is null or qty < 1 or qty > item.quantity or use_type is null or use_type not in ('consumed','discarded') then
      perform freshsave_private.fail('Choose a quantity that is still available.');
    end if;
    update public.inventory set quantity = quantity - qty,
      details = details || jsonb_build_object('log', history || jsonb_build_array(
        jsonb_build_object('n',qty,'type',use_type,'at',freshsave_private.epoch(now()))))
        || case when quantity = qty then jsonb_build_object('status',use_type,'closedAt',freshsave_private.epoch(now())) else '{}'::jsonb end
      where id = item.id;
    perform freshsave_private.activity(actor, 'check', 'Marked ' || qty || ' × ' || (item.details->>'name') || ' as ' || use_type);
  end if;
end;
$$;

create function freshsave_private.offer_batch(input jsonb, actor uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare
  row_id uuid := (input->>'id')::uuid;
  batch_key uuid := (input->>'batchId')::uuid;
  b public.batches;
  current_listing public.listings;
  product text := trim(input->>'name');
  cat text := input->>'cat';
  description text := trim(input->>'desc');
  instructions text := trim(input->>'instr');
  pack text := input->>'pack';
  printed date := (input->>'expiry')::date;
  date_kind public.printed_date_type := (input->>'expiryType')::public.printed_date_type;
  stop_day date := (input->>'pickupUntil')::date;
  start_hour time := (input->>'pickFrom')::time;
  stop_hour time := (input->>'pickTo')::time;
  qty integer := (input->>'qty')::integer;
  price integer := round((input->>'price')::numeric * 100);
  original integer := round((input->>'orig')::numeric * 100);
  images jsonb := coalesce(input->'photos', '[]');
  file text;
  has_holds boolean := false;
  g record;
  cap integer;
  fields jsonb;
begin
  if row_id is not null then
    select * into current_listing from public.listings where id = row_id and seller_id = actor;
    if not found then perform freshsave_private.fail('This listing is unavailable for your account.', 'FS002'); end if;
    batch_key := current_listing.batch_id;
  end if;
  if batch_key is not null then
    select * into b from public.batches where id = batch_key and owner = actor for update;
    if not found then perform freshsave_private.fail('This batch is unavailable for your account.', 'FS002'); end if;
  end if;
  if row_id is not null then
    select * into current_listing from public.listings where id = row_id for update;
    if current_listing.status not in ('active', 'pending') then perform freshsave_private.fail('This listing is already closed.', 'FS003'); end if;
    perform freshsave_private.expire_listing(row_id, clock_timestamp());
    select * into g from freshsave_private.ledger(current_listing);
    has_holds := g.held > 0;
    if has_holds then
      product := current_listing.product_name; cat := current_listing.category; printed := current_listing.expiry; date_kind := current_listing.date_type;
      pack := current_listing.details->>'pack';
    end if;
    if qty < g.held + g.handed + current_listing.withdrawn then
      perform freshsave_private.fail('At least ' || (g.held + g.handed + current_listing.withdrawn) || ' units are already accounted for.', 'FS004', 'qty');
    end if;
    if qty > current_listing.total and (input->>'countedExtra')::boolean is not true then
      perform freshsave_private.fail('Confirm you counted and set aside the extra units.');
    end if;
  elsif batch_key is not null then
    if b.verification <> 'unverified' then perform freshsave_private.fail('This batch was already counted.', 'FS003'); end if;
    product := b.details->>'name'; cat := b.details->>'cat'; printed := b.expiry; date_kind := b.date_type;
    images := case when b.details->>'photo' is not null then jsonb_build_array(b.details->>'photo') else '[]'::jsonb end;
  end if;
  if qty is null or qty < 1 then perform freshsave_private.fail('Enter a whole number of at least 1.', 'FS001', 'qty'); end if;
  if batch_key is not null then
    cap := b.quantity - freshsave_private.batch_allocated(b.id, row_id);
    if row_id is not null then cap := cap + g.handed + current_listing.withdrawn; end if;
    if qty > cap then perform freshsave_private.fail('At most ' || cap || ' units can be offered from this batch.', 'FS004', 'qty'); end if;
  end if;
  if coalesce(length(product), 0) < 3 or cat is null or cat not in ('pantry','bakery','drinks') then
    perform freshsave_private.fail('Enter the product and choose an eligible category.');
  end if;
  if pack is null or pack not in ('sealed','bakery') or (input->>'c1')::boolean is not true
    or (input->>'c2')::boolean is not true or (input->>'c3')::boolean is not true then
    perform freshsave_private.fail('Only eligible sealed, ambient food with all declarations can be listed.', 'FS001', 'pack');
  end if;
  if printed is null or date_kind is null or stop_day is null or stop_day < freshsave_private.shop_day(now())
    or stop_day > freshsave_private.last_pickup(printed, date_kind) then
    perform freshsave_private.fail('Choose a collection day within the printed-date rule.', 'FS001', 'pickupUntil');
  end if;
  if start_hour is null or stop_hour is null or stop_hour <= start_hour
    or freshsave_private.shop_time(stop_day, stop_hour) < now() + interval '30 minutes' then
    perform freshsave_private.fail('Choose valid opening and closing times with at least 30 minutes to reserve.', 'FS001', 'pickTo');
  end if;
  if price is null or original is null or price <= 0 or price >= original then
    perform freshsave_private.fail('Rescue price must be lower than the original price.', 'FS001', 'price');
  end if;
  if coalesce(instructions, '') = '' then perform freshsave_private.fail('Add pickup instructions for buyers.', 'FS001', 'instr'); end if;
  if coalesce(length(description), 0) < 10 then
    if input->>'batchId' is null then perform freshsave_private.fail('Add a short description.', 'FS001', 'desc'); end if;
    description := product || ', counted on the shelf before listing.';
  end if;
  if jsonb_array_length(images) > 4 then perform freshsave_private.fail('Choose at most four photos.'); end if;
  for file in select jsonb_array_elements_text(images) loop
    perform freshsave_private.verify_photo(file, actor);
  end loop;
  fields := jsonb_build_object('kind', coalesce(b.details->>'kind', freshsave_private.kind(cat)), 'pack', pack,
    'desc', description, 'instr', instructions, 'photos', images, 'declared', true);
  if row_id is not null then
    update public.listings set product_name = product, category = cat, total = qty, price_sen = price, original_sen = original,
      expiry = printed, date_type = date_kind, pickup_until = stop_day, opens_at = start_hour, closes_at = stop_hour, details = fields where id = row_id;
    if not has_holds and g.handed = 0 and not exists (select 1 from public.listings where batch_id = batch_key and id <> row_id) then
      update public.batches set expiry = printed, date_type = date_kind,
        details = details || jsonb_build_object('name', product, 'cat', cat) where id = batch_key;
    end if;
  else
    if batch_key is null then
      insert into public.batches(owner, quantity, expiry, date_type, recorded, details)
      values (actor, qty, printed, date_kind, freshsave_private.shop_day(now()), jsonb_build_object(
        'name',product,'cat',cat,'kind',fields->>'kind','photo',images->>0,'history','[]'::jsonb,'source','direct'))
      returning id into batch_key;
    end if;
    insert into public.listings(batch_id, seller_id, product_name, category, total, price_sen, original_sen, expiry,
      date_type, pickup_until, opens_at, closes_at, details)
    values (batch_key, actor, product, cat, qty, price, original, printed, date_kind, stop_day, start_hour, stop_hour, fields)
    returning id into row_id;
    update public.batches set verification = 'listed', counted = qty, verified_at = now() where id = batch_key;
  end if;
  update public.stores set default_instructions = instructions where id = actor;
  perform freshsave_private.activity(actor, 'basket', 'Saved listing ' || product);
  return to_jsonb(row_id);
exception
  when unique_violation then perform freshsave_private.fail('You already have a live listing of this product with this date.', 'FS003', 'expiry'); return null;
end;
$$;

create function freshsave_private.manage_listing(action text, input jsonb, actor uuid) returns void
language plpgsql set search_path = '' as $$
declare
  l public.listings;
  r public.reservations;
  g record;
  expired boolean;
begin
  select * into l from public.listings where id = (input->>'id')::uuid and seller_id = actor;
  if not found then perform freshsave_private.fail('This listing is unavailable for your account.', 'FS002'); end if;
  perform 1 from public.batches where id = l.batch_id for update;
  select * into l from public.listings where id = l.id for update;
  expired := freshsave_private.shop_day(clock_timestamp()) > freshsave_private.last_pickup(l.expiry, l.date_type);
  if action = 'moveListing' then
    if l.status = 'active' and l.moved then return; end if;
    if l.status <> 'pending' or expired or freshsave_private.shop_time(l.pickup_until, l.closes_at) <= clock_timestamp() then
      perform freshsave_private.fail('This listing can no longer be made visible.', 'FS003');
    end if;
    update public.listings set status = 'active', moved = true where id = l.id;
    perform freshsave_private.activity(actor, 'basket', 'Moved ' || l.product_name || ' to the Clearance Basket');
    return;
  end if;
  if l.status in ('closed', 'removed') then return; end if;
  perform freshsave_private.expire_listing(l.id, clock_timestamp());
  for r in select * from public.reservations where listing_id = l.id and status in ('pending', 'confirmed') order by id for update loop
    if (input->>'cancelOpen')::boolean is not true then perform freshsave_private.fail('Resolve open reservations first.', 'FS003'); end if;
    update public.reservations set status = 'cancelled', decided_by = 'seller', decided_at = now(), reason = 'Listing withdrawn by the seller' where id = r.id;
    perform freshsave_private.record_event(r, 'cancelled', '{"by":"seller"}');
    perform freshsave_private.tell(r.buyer_id, 'Reservation cancelled', l.product_name, r.id);
  end loop;
  select * into g from freshsave_private.ledger(l);
  update public.listings set status = 'closed', closed_at = now(), withdrawn = withdrawn + g.available,
    removed_qty = removed_qty + case when expired then g.available else 0 end where id = l.id;
  perform freshsave_private.activity(actor, 'basket', 'Closed listing ' || l.product_name);
end;
$$;

create function public.freshsave_command(action text, input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  person public.profiles;
  bin public.batches;
  item public.catalogue;
  area record;
  role_value public.account_role;
begin
  if actor is null then perform freshsave_private.fail('Sign in to continue.', 'FS002'); end if;
  select * into person from public.profiles where id = actor;
  if action = 'setupProfile' then
    if person.id is not null then return null; end if;
    role_value := (input->>'role')::public.account_role;
    select * into area from freshsave_private.area(input->>'loc');
    if role_value is null or not found or coalesce(length(trim(input->>'name')),0) < 2
      or (role_value = 'retailer' and (coalesce(length(trim(input->>'store')),0) < 2 or coalesce(length(trim(input->>'address')),0) < 8)) then
      perform freshsave_private.fail('Enter valid profile and pickup details.');
    end if;
    insert into public.profiles(id, role, name, loc) values (actor,role_value,trim(input->>'name'),input->>'loc');
    if role_value = 'retailer' then
      insert into public.stores(id, name, address, x, y) values (actor, trim(input->>'store'), trim(input->>'address'), area.x + 0.3, area.y + 0.2);
    end if;
    return null;
  end if;
  if person.id is null then perform freshsave_private.fail('Complete your profile first.', 'FS002'); end if;
  if action in ('dismissBatch','recountBatch','offerBatch','moveListing','closeListing') and person.role <> 'retailer' then
    perform freshsave_private.fail('This action requires a retailer account.', 'FS002');
  end if;
  if action in ('reserveListing','acceptReservation','declineReservation','cancelReservation','completeHandover','disputeReservation') then
    return freshsave_private.reservation_command(action, input, actor);
  elsif action = 'saveFood' then
    return freshsave_private.save_food(input, person);
  elsif action in ('deleteFood','undoFood','useFood') then
    perform freshsave_private.inventory_command(action, input, actor);
  elsif action = 'offerBatch' then
    return freshsave_private.offer_batch(input, actor);
  elsif action in ('moveListing','closeListing') then
    perform freshsave_private.manage_listing(action,input,actor);
  elsif action in ('dismissBatch','recountBatch') then
    select * into bin from public.batches where id = (input->>'id')::uuid and owner = actor for update;
    if not found then perform freshsave_private.fail('This batch is unavailable for your account.', 'FS002'); end if;
    if action = 'dismissBatch' and bin.verification = 'unverified' then
      update public.batches set verification = 'dismissed', counted = 0, verified_at = now() where id = bin.id;
    elsif action = 'recountBatch' and bin.verification = 'listed' and freshsave_private.shop_day(now()) <= freshsave_private.last_pickup(bin.expiry, bin.date_type)
      and not exists (select 1 from public.listings l cross join lateral freshsave_private.ledger(l) g where l.batch_id = bin.id and l.status in ('active','pending') and g.held + g.available > 0) then
      update public.batches set verification = 'unverified' where id = bin.id;
    else perform freshsave_private.fail('This batch cannot be changed now.', 'FS003');
    end if;
  elsif action = 'profile' then
    select * into area from freshsave_private.area(input->>'loc');
    if not found or coalesce(length(trim(input->>'name')),0) < 2 then perform freshsave_private.fail('Enter your name and choose an area.'); end if;
    if person.role = 'retailer' then
      if coalesce(length(trim(input->>'store')),0) < 2 or coalesce(length(trim(input->>'address')),0) < 8 then
        perform freshsave_private.fail('Enter the store name and full pickup address.');
      end if;
      update public.stores set name = trim(input->>'store'), address = trim(input->>'address'),
        x = case when person.loc <> input->>'loc' then area.x + 0.3 else x end,
        y = case when person.loc <> input->>'loc' then area.y + 0.2 else y end where id = actor;
    end if;
    update public.profiles set name = trim(input->>'name'), loc = input->>'loc' where id = actor;
  elsif action = 'preferences' then
    update public.profiles set prefs = prefs || coalesce((
      select jsonb_object_agg(key,value) from jsonb_each(input) where key in ('d7','d3','d1','expired','stock','resv') and jsonb_typeof(value) = 'boolean'
    ), '{}') where id = actor;
  elsif action = 'hideOnboarding' then
    update public.profiles set onboard = false where id = actor;
  elsif action = 'readNotification' then
    update public.notifications set unread = false where owner = actor and (input->>'id' is null or id = (input->>'id')::uuid);
  elsif action = 'saveBarcode' then
    if coalesce(length(trim(input->>'name')),0) < 2 or freshsave_private.valid_category(input->>'cat') is not true then
      perform freshsave_private.fail('Enter the product name and category.');
    end if;
    insert into public.catalogue(owner, barcode, name, category, kind)
    values (actor, input->>'barcode', trim(input->>'name'), input->>'cat', freshsave_private.kind(input->>'cat'))
    on conflict (owner, barcode) do update set name = excluded.name, category = excluded.category, kind = excluded.kind
    returning * into item;
    return jsonb_build_object('barcode',item.barcode,'name',item.name,'cat',item.category,'kind',item.kind,'src','user','at',freshsave_private.epoch(item.created_at));
  else perform freshsave_private.fail('This operation is unavailable.');
  end if;
  return null;
exception
  when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then
    perform freshsave_private.fail('One of the fields has an invalid value.'); return null;
end;
$$;

revoke all on function public.freshsave_command(text,jsonb) from public, anon;
grant execute on function public.freshsave_command(text,jsonb) to authenticated;
