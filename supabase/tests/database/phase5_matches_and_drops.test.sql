-- ทดสอบเฟส 5 (Daily Drop + Swipe + Match + Profile Card + หมดอายุ 48 ชม. + จบอย่างสุภาพ)
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- เตรียมรูปโปรไฟล์ 4 รูปให้ demo2 (position 0, 1, 2, 3) เพื่อทดสอบการเปิดรูปตาม reveal_stage
insert into public.photos (user_id, storage_path, position, moderation_status)
values
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/00000000-0000-4000-8000-000000000000.webp', 0, 'approved'),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/00000000-0000-4000-8000-000000000001.webp', 1, 'approved'),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/00000000-0000-4000-8000-000000000002.webp', 2, 'approved'),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/00000000-0000-4000-8000-000000000003.webp', 3, 'approved');

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- 1) ก่อนมี Drop วันนี้: ดูโปรไฟล์ของคนอื่นที่ไม่ได้อยู่ใน Drop และยังไม่ได้ Match ไม่ได้ (กัน scrape)
select throws_ok(
  $$ select public.get_profile_card('22222222-2222-2222-2222-222222222222') $$,
  '42501', 'profile_not_accessible',
  'ยังไม่อยู่ใน Drop หรือ Match → เรียก get_profile_card ของคนอื่นไม่ได้ (กัน scrape)'
);

-- ปัดคนที่ไม่อยู่ใน Drop ไม่ได้
select throws_ok(
  $$ select public.swipe('22222222-2222-2222-2222-222222222222', 'friend', 'like') $$,
  '42501', 'candidate_not_in_drop',
  'ปัดคนที่ไม่ได้อยู่ใน Daily Drop ของวันนี้ไม่ได้'
);

-- 2) เรียก get_my_drop('friend') → สร้าง Drop ของวันนี้ให้อัตโนมัติ มี demo2 อยู่ และ photo_stage = 0
select is(
  (select public.get_my_drop('friend') -> 0 ->> 'candidate_id'),
  '22222222-2222-2222-2222-222222222222',
  'get_my_drop คัด demo2 เข้า Daily Drop โหมด friend ของ demo'
);

select is(
  (select (public.get_my_drop('friend') -> 0)::jsonb ? 'birthdate'),
  false,
  'get_my_drop ไม่ส่งวันเกิด (birthdate) ออกไป ส่งเฉพาะอายุ'
);

-- ตอนนี้อยู่ใน Drop แล้ว → ดูการ์ดโปรไฟล์ได้ แต่ reveal_stage = 0 จึงยังไม่เห็นรูปสักรูป!
select is(
  json_array_length(public.get_profile_card('22222222-2222-2222-2222-222222222222') -> 'unlocked_photo_paths'),
  0,
  'อยู่ใน Drop (Stage 0) → ดูข้อมูลการ์ดได้ แต่ unlocked_photo_paths ยังเป็น [] (0 รูป)'
);

-- 3) demo ปัดขวา (like) demo2 ฝ่ายเดียว → ยังไม่ Match
select is(
  (select (public.swipe('22222222-2222-2222-2222-222222222222', 'friend', 'like') ->> 'matched')::boolean),
  false,
  'demo ปัด like ฝ่ายเดียว → matched = false'
);

-- 4) สลับเป็น demo2: เรียก get_my_drop('friend') แล้วปัด like กลับ → Match ทันที!
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

do $$ begin perform public.get_my_drop('friend'); end $$;

select is(
  (select (public.swipe('11111111-1111-1111-1111-111111111111', 'friend', 'like') ->> 'matched')::boolean),
  true,
  'demo2 ปัด like กลับ → เกิด Match ทันที (matched = true)'
);

select is(
  (select (public.get_my_matches() -> 0 ->> 'expires_at') is not null),
  true,
  'Match ใหม่มีเวลาหมดอายุ 48 ชม. (expires_at ไม่เป็น null)'
);

-- 5) เมื่อส่งข้อความแรกในห้องแชทของ Match → ล้าง expires_at เป็น null ทันที (ไม่หมดอายุแล้ว)
do $$
declare
  v_conv_id uuid;
begin
  select (public.get_my_matches() -> 0 ->> 'conversation_id')::uuid into v_conv_id;
  perform public.send_message(v_conv_id, 'สวัสดีครับ ยินดีที่ได้รู้จักนะ!');
end $$;

select is(
  (select (public.get_my_matches() -> 0 ->> 'expires_at') is null),
  true,
  'หลังส่งข้อความแรก → expires_at ถูกล้างเป็น null (ไม่ถูกตัดหมดอายุ 48 ชม.)'
);

-- 6) ทดสอบจำนวนรูปที่เปิดใน get_profile_card ตาม reveal_stage (1 → 1 รูป, 2 → 3 รูป, 3 → ครบ 4 รูป)
reset role;
update private.conversations set reveal_stage = 1;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  json_array_length(public.get_profile_card('22222222-2222-2222-2222-222222222222') -> 'unlocked_photo_paths'),
  1,
  'Stage 1 → get_profile_card คืนรูปแค่ 1 รูปแรก (position 0)'
);

reset role;
update private.conversations set reveal_stage = 2;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  json_array_length(public.get_profile_card('22222222-2222-2222-2222-222222222222') -> 'unlocked_photo_paths'),
  3,
  'Stage 2 → get_profile_card คืนรูป 3 รูปแรก (position 0..2)'
);

reset role;
update private.conversations set reveal_stage = 3;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  json_array_length(public.get_profile_card('22222222-2222-2222-2222-222222222222') -> 'unlocked_photo_paths'),
  4,
  'Stage 3 → get_profile_card คืนรูปทั้งหมดที่มี (4 รูป)'
);

-- 7) ทดสอบปุ่ม "จบอย่างสุภาพ" (polite_close)
select lives_ok(
  $$ select public.polite_close((select (public.get_my_matches() -> 0 ->> 'id')::uuid), 'thanks') $$,
  'กดปุ่มจบอย่างสุภาพ (polite_close) สำเร็จ'
);

select is(
  json_array_length(public.get_my_matches()),
  0,
  'หลัง polite_close → Match ไม่อยู่ในรายการ active อีก'
);

select is(
  (
    select public.get_messages((public.get_conversations() -> 0 ->> 'id')::uuid) -> 0 ->> 'kind'
  ),
  'polite_close',
  'polite_close ส่งข้อความชนิด polite_close เข้าห้องแชทก่อนปิด'
);

-- 8) ทดสอบ Match โหมด date + การหมดอายุ 48 ชม. อัตโนมัติ (expire_stale_matches)
do $$ begin perform public.get_my_drop('date'); end $$;
do $$ begin perform public.swipe('22222222-2222-2222-2222-222222222222', 'date', 'like'); end $$;

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
do $$ begin perform public.get_my_drop('date'); end $$;
do $$ begin perform public.swipe('11111111-1111-1111-1111-111111111111', 'date', 'like'); end $$;

-- จำลองว่าเวลาผ่านไปเกิน 48 ชม. โดยไม่มีใครทัก
reset role;
update private.matches set expires_at = now() - interval '1 minute' where mode = 'date';
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  json_array_length(public.get_my_matches()),
  0,
  'Match ที่เกิน 48 ชม. โดยไม่มีข้อความแรก ถูกปรับเป็น expired อัตโนมัติเมื่อเรียก get_my_matches'
);

reset role;
select is(
  (select status from private.matches where mode = 'date'),
  'expired',
  'สถานะในตาราง private.matches เปลี่ยนเป็น expired'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok('select * from private.daily_drops', '42501', null, 'อ่าน private.daily_drops ตรงไม่ได้');
select throws_ok('select * from private.matches', '42501', null, 'อ่าน private.matches ตรงไม่ได้');

select * from finish();
rollback;
