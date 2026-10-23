-- ทดสอบ RLS ของ profiles และฟังก์ชัน health() — รันด้วย `pnpm db:test` (ใช้ข้อมูลจาก seed.sql)
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- ---------------------------------------------------------------------------
-- trigger สร้าง profile ให้ผู้ใช้ใหม่
-- ---------------------------------------------------------------------------
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Demo User',
  'trigger สร้าง profile พร้อม display_name จาก metadata'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles เปิด RLS อยู่'
);

-- ---------------------------------------------------------------------------
-- anon (ยังไม่ login)
-- ---------------------------------------------------------------------------
set local role anon;

select throws_ok(
  'select * from public.profiles',
  '42501',
  null,
  'anon อ่าน profiles ไม่ได้'
);

select is(
  (public.health() ->> 'status'),
  'ok',
  'anon เรียก health() ได้'
);

-- ---------------------------------------------------------------------------
-- authenticated เป็น demo user
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.profiles),
  2,
  'ผู้ใช้ที่ login แล้วเห็นทุกโปรไฟล์'
);

update public.profiles set bio = 'แก้ของตัวเอง' where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select bio from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'แก้ของตัวเอง',
  'แก้โปรไฟล์ตัวเองได้'
);

update public.profiles set bio = 'แอบแก้' where id = '22222222-2222-2222-2222-222222222222';
select isnt(
  (select bio from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'แอบแก้',
  'แก้โปรไฟล์คนอื่นไม่ได้ (RLS กรองทิ้ง)'
);

select throws_ok(
  $$ insert into public.profiles (id, display_name) values (gen_random_uuid(), 'x') $$,
  '42501',
  null,
  'insert profile เองไม่ได้ (ต้องผ่าน trigger)'
);

select throws_ok(
  'select public.handle_new_user()',
  '42501',
  null,
  'เรียก handle_new_user() ตรงๆ ไม่ได้'
);

select * from finish();
rollback;
