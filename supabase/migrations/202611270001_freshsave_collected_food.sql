create unique index inventory_collected_reservation
  on public.inventory (owner, (details->>'reservationId'))
  where details ? 'reservationId';

create function public.freshsave_save_collected_food(input jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  reservation_id uuid := (input->>'reservationId')::uuid;
  buyer public.profiles;
  saved_id uuid;
begin
  select * into buyer from public.profiles where id = actor and role = 'individual';
  if not found or input->>'id' is not null then
    perform freshsave_private.fail('This handover cannot be added to My food.', 'FS002');
  end if;

  perform 1 from public.reservations where id = reservation_id and buyer_id = actor
    and status = 'completed' and disputed_at is null for update;
  if not found then
    perform freshsave_private.fail('This handover cannot be added to My food.', 'FS002');
  end if;

  select id into saved_id from public.inventory
    where owner = actor and details->>'reservationId' = reservation_id::text;
  if found then return saved_id; end if;

  saved_id := (freshsave_private.save_food(input, buyer) #>> '{}')::uuid;
  update public.inventory set details = details || jsonb_build_object('reservationId', reservation_id)
    where id = saved_id and owner = actor;
  return saved_id;
end;
$$;

revoke all on function public.freshsave_save_collected_food(jsonb) from public, anon;
grant execute on function public.freshsave_save_collected_food(jsonb) to authenticated;
