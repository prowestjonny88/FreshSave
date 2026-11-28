create extension if not exists pgcrypto with schema extensions;

-- Retailer access is provisioned by an operator, including when an authenticated caller uses RPC directly.
create function freshsave_private.guard_retailer_role() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role = 'retailer' and auth.uid() is not null then
    perform freshsave_private.fail('Retailer accounts are set up by FreshSave.', 'FS002');
  end if;
  return new;
end;
$$;

create trigger guard_retailer_role before insert or update of role on public.profiles
for each row execute function freshsave_private.guard_retailer_role();

-- Reference products are shared across environments. Accounts and sample listings remain in the local seed.
insert into public.catalogue(barcode,name,category,kind) values
  ('9556041610018','Dutch Lady Full Cream Milk 1L','dairy','milk'),
  ('9556001062048','Milo Activ-Go Chocolate Malt Powder 1kg','pantry','milo'),
  ('9556570310120','Gardenia Original Classic Bread 400g','bakery','bread')
on conflict (owner,barcode) do nothing;
