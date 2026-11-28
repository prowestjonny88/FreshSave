-- Retain dismissed rows so they keep claiming their reminder deduplication keys.
alter table public.notifications add column cleared_at timestamptz;

alter policy notification_owner on public.notifications
  using (owner = (select auth.uid()) and cleared_at is null);

create function public.freshsave_clear_read_notifications() returns void
language sql security definer set search_path = '' as $$
  update public.notifications set cleared_at = now()
  where owner = (select auth.uid()) and not unread and cleared_at is null;
$$;
revoke all on function public.freshsave_clear_read_notifications() from public, anon;
grant execute on function public.freshsave_clear_read_notifications() to authenticated;

create or replace function public.freshsave_view(page text, options jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  person public.profiles;
  session_value jsonb;
  own_store jsonb;
  reservations jsonb := '[]';
  inventory jsonb := '[]';
  batches jsonb := '[]';
  listings jsonb := '[]';
  stores jsonb := '{}';
  notices jsonb := '[]';
  notice_counts jsonb;
  activities jsonb := '[]';
  area_value text;
  skip integer := least(greatest(coalesce((options->>'offset')::integer,0),0),100000);
  row_id uuid;
  source_id uuid;
  current_seller uuid;
  current_category text;
  current_batch uuid;
  may_read boolean;
  greater_count boolean := false;
  page_size integer := 100;
  inventory_total integer;
begin
  select * into person from public.profiles where id = actor;
  if not found then return jsonb_build_object('session',null); end if;
  if options->>'id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then row_id := (options->>'id')::uuid; end if;
  if options->>'from' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then source_id := (options->>'from')::uuid; end if;
  area_value := coalesce(options->>'area',person.loc);
  select freshsave_private.store_json(s) into own_store from public.stores s where s.id = actor;
  session_value := jsonb_build_object(
    'user',jsonb_build_object('id',actor,'sellerId',actor,'role',person.role,'name',person.name,'email',coalesce(auth.jwt()->>'email',''),
      'loc',person.loc,'joined',freshsave_private.epoch(person.joined),'onboard',person.onboard,'prefs',person.prefs),
    'store',coalesce(own_store,jsonb_build_object('id',actor,'role','individual','name',person.name,'area','Private area',
      'kind','Individual','hours','n/a','x',0,'y',0,'hue','#4f6f55'))
  );
  perform freshsave_private.reminders(person);

  if page = 'reservation' and row_id is not null then
    select l.id, r.seller_id into source_id,current_seller
    from public.reservations r join public.listings l on r.listing_id = l.id
    where r.id = row_id and actor in (r.buyer_id,r.seller_id);
  elsif page = 'item' then
    select l.seller_id,l.category into current_seller,current_category from public.listings l
    where l.id = row_id and (l.status = 'active' and l.moved or l.seller_id = actor or exists (
      select 1 from public.reservations r where r.listing_id = l.id and r.buyer_id = actor
    ));
  elsif page = 'seller' then current_seller := row_id;
  elsif page in ('sell','basket') then
    select batch_id into current_batch from public.listings where id = coalesce(row_id,source_id) and seller_id = actor;
  end if;

  select coalesce(jsonb_agg(value order by priority, sort_key desc,id),'[]') into reservations
  from (
    select r.id, freshsave_private.reservation_json(r,actor) value,
      case when r.status in ('pending','confirmed') then 0 else 1 end priority, r.created_at sort_key
    from public.reservations r
    where actor in (r.buyer_id,r.seller_id) and (
      (page = 'reservation' and r.id = row_id) or (page = 'item' and r.listing_id = row_id)
      or page in ('reservations','impact','dashboard') or (page not in ('reservation','item') and r.status in ('pending','confirmed'))
    )
    order by priority, sort_key desc,id
    limit 100 offset case when page = 'reservations' then skip else 0 end
  ) q;

  if page in ('inventory','item','dashboard','impact') then
    select coalesce(jsonb_agg(details || jsonb_build_object('id',id,'owner',owner,'qty',quantity,'expiry',expiry,
      'expiryType',date_type,'purchased',purchased,'addedAt',freshsave_private.epoch(added_at)) order by expiry,id),'[]')
    into inventory from (select * from public.inventory where owner = actor order by expiry,id limit 100
      offset case when page = 'inventory' then skip else 0 end) q;
  end if;
  if person.role = 'retailer' and page in ('batches','batch','sell','basket','listings','dashboard','impact') then
    select coalesce(jsonb_agg(details || jsonb_build_object('id',id,'owner',owner,'qty',quantity,'expiry',expiry,'expiryType',date_type,
      'recorded',recorded,'addedAt',freshsave_private.epoch(added_at),'verify',verification,'counted',counted,
      'verifiedAt',freshsave_private.epoch(verified_at)) order by expiry,id),'[]') into batches
    from (select * from public.batches where owner = actor and (page <> 'batch' or id = row_id)
      and (current_batch is null or id = current_batch) order by expiry,id limit 100) q;
  end if;

  if page in ('market','seller') or (page = 'dashboard' and person.role = 'individual') then
    with near as (
      select l, l.id as id, l.posted_at, l.price_sen, l.original_sen, l.expiry,
        freshsave_private.shop_time(l.pickup_until,l.closes_at) as cutoff,
        greatest(0.3, round((sqrt(power(a.x - s.x,2) + power(a.y - s.y,2)) * 7)::numeric) / 10) as distance
      from public.listings l join public.stores s on l.seller_id = s.id cross join freshsave_private.area(area_value) a
      where l.status = 'active' and l.moved and freshsave_private.shop_time(l.pickup_until,l.closes_at) >= now()
      and (page <> 'seller' or l.seller_id = row_id) and (options->>'cat' is null or l.category = options->>'cat')
      and (coalesce(options->>'search','') = '' or concat_ws(' ',l.product_name,l.category,s.name,l.details->>'desc') ilike '%' || (options->>'search') || '%')
      and l.price_sen >= case when options->>'min' ~ '^[0-9]+(\.[0-9]+)?$' then (options->>'min')::numeric * 100 else 0 end
      and l.price_sen <= case when options->>'max' ~ '^[0-9]+(\.[0-9]+)?$' then (options->>'max')::numeric * 100 else l.price_sen end
      and coalesce(nullif(options->>'dateType','all'),l.date_type::text) = l.date_type::text
      and l.expiry <= case when options->>'expiry' in ('3','7') then freshsave_private.shop_day(now()) + (options->>'expiry')::integer else l.expiry end
      and l.pickup_until <= case when options->>'collect' in ('0','2') then freshsave_private.shop_day(now()) + (options->>'collect')::integer else l.pickup_until end
      and (select available from freshsave_private.ledger(l)) > 0
    ), ranked as (
      select *, row_number() over (order by
        case when options->>'sort' = 'collect' then cutoff end,
        case when options->>'sort' = 'low' then price_sen end,
        case when options->>'sort' = 'disc' then price_sen::numeric / original_sen end,
        case when options->>'sort' = 'exp' then expiry end,
        case when options->>'sort' = 'new' then posted_at end desc,
        distance,posted_at desc,id) as ordinal from near
      where distance <= coalesce(nullif(options->>'distance','all')::numeric, 1000)
    ), windowed as (
      select * from ranked order by ordinal limit 25 offset skip
    )
    select coalesce(jsonb_agg(freshsave_private.listing_json(l) order by ordinal) filter(where ordinal <= skip + 24),'[]'),
      count(*) > 24 into listings,greater_count from windowed;
  elsif page in ('item','reservation','listings','sell','basket','batch','batches','dashboard','impact') then
    select coalesce(jsonb_agg(freshsave_private.listing_json(l) order by (l).posted_at desc,(l).id),'[]')
    into listings from (
      select l from public.listings l where
        (page = 'item' and current_seller is not null and (
          l.id = row_id or (l.status = 'active' and l.moved
            and (l.seller_id = current_seller or l.category = current_category)
            and freshsave_private.shop_time(l.pickup_until,l.closes_at) >= now()
            and (select available from freshsave_private.ledger(l)) > 0)
        ))
        or (page = 'reservation' and l.id = source_id)
        or (l.seller_id = actor and (
          page in ('listings','batches','dashboard','impact') or (page = 'basket' and (row_id is null or l.id = row_id))
          or (page = 'batch' and l.batch_id = row_id) or (page = 'sell' and (row_id is null and source_id is null or l.id in (row_id,source_id) or l.batch_id = current_batch))
        ))
      order by case when page = 'item' and l.id = row_id then 0 else 1 end, l.posted_at desc,l.id
      limit case when page = 'item' then 13 else 100 end offset case when page = 'listings' then skip else 0 end
    ) q;
  end if;
  select coalesce(jsonb_object_agg(s.id::text,freshsave_private.store_json(s)),'{}') into stores
  from public.stores s where s.id = actor or s.id = current_seller or exists (
    select 1 from jsonb_array_elements(listings) entry where entry->>'seller' = s.id::text
  );
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'user',owner,'type',category,'text',title,'sub',subtitle,
    'href',href,'at',freshsave_private.epoch(created_at),'unread',unread) order by created_at desc,id),'[]') into notices
  from (select * from public.notifications where owner = actor and cleared_at is null order by created_at desc,id
    limit case when page = 'notifications' then 100 else 20 end
    offset case when page = 'notifications' then skip else 0 end) q;
  if page in ('dashboard','impact') then
    select coalesce(jsonb_agg(jsonb_build_object('user',owner,'icon',icon,'text',detail,'at',freshsave_private.epoch(created_at)) order by created_at desc,id),'[]')
    into activities from (select * from public.activity where owner = actor order by created_at desc,id limit 25) q;
  end if;
  case page
    when 'market' then page_size := 24;
    when 'reservations' then greater_count := exists(select 1 from public.reservations where actor in (buyer_id,seller_id) limit 1 offset skip + page_size);
    when 'inventory' then
      greater_count := exists(select 1 from public.inventory where owner = actor limit 1 offset skip + page_size);
      select count(*) into inventory_total from public.inventory where owner = actor and details->>'status' = 'active';
    when 'listings' then greater_count := exists(select 1 from public.listings where seller_id = actor limit 1 offset skip + page_size);
    when 'notifications' then
      greater_count := exists(select 1 from public.notifications where owner = actor and cleared_at is null limit 1 offset skip + page_size);
      select jsonb_build_object('read', count(*) filter (where not unread), 'unread', count(*) filter (where unread))
        into notice_counts from public.notifications where owner = actor and cleared_at is null;
    else null;
  end case;
  return jsonb_build_object('session',session_value,'reservations',reservations,'inventory',inventory,'inventoryTotal',inventory_total,'batches',batches,
    'listings',listings,'stores',stores,'notifs',notices,'notificationCounts',notice_counts,
    'activity',activities,'more',greater_count,'pageSize',page_size,'area',options->>'area');
end;
$$;
revoke all on function public.freshsave_view(text,jsonb) from public, anon;
grant execute on function public.freshsave_view(text,jsonb) to authenticated;
