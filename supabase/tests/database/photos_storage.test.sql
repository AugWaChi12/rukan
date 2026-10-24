-- ทดสอบรูปโปรไฟล์: bucket photos เป็น private, อัปโหลดได้แค่โฟลเดอร์ตัวเอง, คนอื่นมองไม่เห็นทั้งไฟล์และ metadata
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select is((select public from storage.buckets where id = 'photos'), false, 'bucket photos เป็น private');
select is((select public from storage.buckets where id = 'avatars'), false, 'bucket avatars เดิมถูกปิดเป็น private');

-- ===========================================================================
-- demo อัปโหลด
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('photos', '11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp', '11111111-1111-1111-1111-111111111111') $$,
  'อัปโหลดเข้าโฟลเดอร์ตัวเองได้'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('photos', '22222222-2222-2222-2222-222222222222/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.webp', '11111111-1111-1111-1111-111111111111') $$,
  '42501', null,
  'อัปโหลดเข้าโฟลเดอร์คนอื่นไม่ได้'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('photos', '11111111-1111-1111-1111-111111111111/evil.svg', '11111111-1111-1111-1111-111111111111') $$,
  '42501', null,
  'ชื่อไฟล์ผิดรูปแบบอัปโหลดไม่ได้'
);

select throws_ok(
  $$ select public.add_photo('11111111-1111-1111-1111-111111111111/cccccccc-cccc-cccc-cccc-cccccccccccc.webp', 1::smallint) $$,
  '22023', 'photo_not_uploaded',
  'บันทึกรูปที่ยังไม่ได้อัปโหลดไม่ได้'
);
select throws_ok(
  $$ select public.add_photo('22222222-2222-2222-2222-222222222222/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.webp', 1::smallint) $$,
  '22023', 'invalid_photo_path',
  'บันทึก path ของคนอื่นไม่ได้'
);
select lives_ok(
  $$ select public.add_photo('11111111-1111-1111-1111-111111111111/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp', 0::smallint) $$,
  'บันทึกรูปที่อัปโหลดแล้วได้'
);

-- ===========================================================================
-- demo2 มองไม่เห็นรูปของ demo
-- ===========================================================================
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is((select count(*)::int from public.photos), 0, 'คนอื่นไม่เห็น metadata รูปของ demo');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'photos'),
  0,
  'คนอื่นไม่เห็นไฟล์ใน bucket photos'
);
select throws_ok(
  $$ select public.remove_photo((select id from public.photos limit 1)) $$,
  '22023', 'photo_not_found',
  'ลบรูปของคนอื่นไม่ได้'
);

-- anon
reset role;
set local role anon;
select is(
  (select count(*)::int from storage.objects where bucket_id = 'photos'),
  0,
  'anon ไม่เห็นไฟล์ใน bucket photos'
);

select * from finish();
rollback;
