-- Disposable local fixtures. Shared data starts here, independent of browser demo storage.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select fixture.id, '00000000-0000-0000-0000-000000000000', 'authenticated','authenticated',
  fixture.email, extensions.crypt('demo1234',extensions.gen_salt('bf')), now(),'','','','',
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
from (values
  ('01000000-0000-4000-8000-000000000001'::uuid,'buyer@freshsave.test'),
  ('01000000-0000-4000-8000-000000000002'::uuid,'retailer@freshsave.test'),
  ('01000000-0000-4000-8000-000000000003'::uuid,'second-buyer@freshsave.test')
) as fixture(id,email) on conflict (id) do nothing;

insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
select id,id,id::text,jsonb_build_object('sub',id,'email',email,'email_verified',true),'email',now(),now(),now()
from auth.users where id in ('01000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000003')
on conflict (provider_id,provider) do nothing;

insert into public.profiles(id,role,name,loc,onboard) values
  ('01000000-0000-4000-8000-000000000001','individual','Test Buyer','bangsar',false),
  ('01000000-0000-4000-8000-000000000002','retailer','Test Retailer','bangsar',false),
  ('01000000-0000-4000-8000-000000000003','individual','Second Test Buyer','bangsar',false)
on conflict (id) do nothing;

insert into public.stores(id,name,address,x,y) values
  ('01000000-0000-4000-8000-000000000002','FreshSave Test Pantry','100 Local Test Lane, Bangsar',0.4,0.3)
on conflict (id) do nothing;

insert into public.catalogue(barcode,name,category,kind) values
  ('9556041610018','Dutch Lady Full Cream Milk 1L','dairy','milk'),
  ('9556001062048','Milo Activ-Go Chocolate Malt Powder 1kg','pantry','milo'),
  ('9556570310120','Gardenia Original Classic Bread 400g','bakery','bread')
on conflict (owner,barcode) do nothing;

insert into public.batches(id,owner,quantity,expiry,date_type,recorded,verification,counted,details) values
  ('02000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000002',1,
    freshsave_private.shop_day(now())+5,'best-before',freshsave_private.shop_day(now()),'listed',1,
    '{"name":"Single Test Cracker Pack","cat":"pantry","kind":"crackers","history":[]}'),
  ('02000000-0000-4000-8000-000000000002','01000000-0000-4000-8000-000000000002',12,
    freshsave_private.shop_day(now())+6,'best-before',freshsave_private.shop_day(now()),'unverified',null,
    '{"name":"Test Sealed Crackers","cat":"pantry","kind":"crackers","history":[]}')
on conflict (id) do nothing;

insert into public.listings(id,batch_id,seller_id,product_name,category,total,price_sen,original_sen,expiry,date_type,pickup_until,opens_at,closes_at,status,moved,details)
values ('03000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000001','01000000-0000-4000-8000-000000000002',
  'Single Test Cracker Pack','pantry',1,350,690,freshsave_private.shop_day(now())+5,'best-before',freshsave_private.shop_day(now())+4,
  '00:00','23:59','active',true,
  '{"kind":"crackers","pack":"sealed","desc":"Sealed pantry stock for local tests.","instr":"Meet at the test pickup counter.","photos":[],"declared":true}')
on conflict (id) do nothing;
