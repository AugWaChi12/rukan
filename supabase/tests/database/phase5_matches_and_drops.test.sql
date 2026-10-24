-- ทดสอบ Swipe deck + Match 1:1 + โควตา rolling window + หมดอายุ 48 ชม. + จบอย่างสุภาพ + ดูการ์ดตามขั้นเปิดรูป
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- เตรียมรูปโปรไฟล์ 4 รูปให้ demo2 (position 0, 1, 2, 3) เพื่อทดสอบการเปิดรูปตาม reveal_stage
insert into public.photos (user_id, storage_path, position, moderation_status)
values
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/00000000-0000-4000-8000-000000000000.webp', 0, 'approved'),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/00000000-0000-4000-8000-000000000001.webp', 1, 'approved'),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/00000000-0000-4000-8000-000000000002.webp', 2, 'approved'),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/00000000-0000-4000-8000-000000000003.webp', 3, 'approved');

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- 1) ก่อนมีชื่ออยู่ในกอง: ดูโปรไฟล์ของคนอื่นที่ยังไม่ Match ไม่ได้ (กัน scrape)
select throws_ok(
  $$ select public.get_profile_card('22222222-2222-2222-2222-222222222222') $$,
  '42501', 'profile_not_accessible',
  'ยังไม่อยู่ในกองการ์ดหรือ Match → เรียก get_profile_card ของคนอื่นไม่ได้ (กัน scrape)'
);

-- 2) ปัดคนที่ server ไม่ได้แจกให้ไม่ได้
select throws_ok(
  $$ select public.swipe('22222222-2222-2222-2222-222222222222', 'like') $$,
  '42501', 'candidate_not_in_deck',
  'ปัดคนที่ไม่ได้อยู่ในกองการ์ดของตัวเองไม่ได้'
);

-- 3) get_my_deck แจกการ์ด demo2 ให้ demo (ไม่ผูกเวลา 19:00)
select is(
  (select public.get_my_deck() -> 'cards' -> 0 ->> 'candidate_id'),
  '22222222-2222-2222-2222-222222222222',
  'get_my_deck แจก demo2 ให้ demo ทันที'
);

select is(
  (select (public.get_my_deck() -> 'cards' -> 0)::jsonb ? 'birthdate'),
  false,
  'get_my_deck ไม่ส่งวันเกิด (birthdate) ออกไป ส่งเฉพาะอายุ'
);

-- 4) อยู่ในกองแล้ว → ดูการ์ดได้ แต่ reveal_stage = 0 จึงยังไม่เห็นรูป
select is(
  json_array_length(public.get_profile_card('22222222-2222-2222-2222-222222222222') -> 'unlocked_photo_paths'),
  0,
  'อยู่ในกอง (Stage 0) → ดูข้อมูลการ์ดได้ แต่ unlocked_photo_paths ยังเป็น [] (0 รูป)'
);

-- 5) demo ปัดขวาฝ่ายเดียว → ยังไม่ Match และหักโควตา 1 ใบ
select is(
  (select (public.swipe('22222222-2222-2222-2222-222222222222', 'like') ->> 'matched')::boolean),
  false,
  'demo ปัด like ฝ่ายเดียว → matched = false'
);

select is(
  (select (public.get_my_deck() -> 'quota' ->> 'used')::int),
  1,
  'ปัดแล้วโควตาในรอบใช้ไป 1 ใบ'
);

select throws_ok(
  $$ select public.swipe('22222222-2222-2222-2222-222222222222', 'skip') $$,
  '42501', 'candidate_not_in_deck',
  'ปัดคนเดิมซ้ำไม่ได้'
);

-- 6) demo2 ปัดขวากลับ → Match ทันที
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

do $$ begin perform public.get_my_deck(); end $$;

select is(
  (select (public.swipe('11111111-1111-1111-1111-111111111111', 'like') ->> 'matched')::boolean),
  true,
  'demo2 ปัด like กลับ → เกิด Match ทันที (matched = true)'
);

select is(
  (select (public.get_my_matches() -> 0 ->> 'expires_at') is not null),
  true,
  'Match ใหม่มีเวลาหมดอายุ 48 ชม. (expires_at ไม่เป็น null)'
);

-- 7) เมื่อส่งข้อความแรกในห้องแชทของ Match → ล้าง expires_at เป็น null ทันที
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
  'หลังส่งข้อความแรก → expires_at ถูกล้างเป็น null (ไม่ถูกตัดหมดอายุ)'
);

-- 8) จำนวนรูปที่เปิดใน get_profile_card ตาม reveal_stage (1 → 1 รูป, 2 → 3 รูป, 3 → ครบ 4 รูป)
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

-- 9) ปุ่ม "จบอย่างสุภาพ" (polite_close)
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

-- 10) Match ใหม่กับ demo3 แล้วจำลองเวลาผ่านไปเกิน 48 ชม. โดยไม่มีใครทัก
reset role;
update public.profiles
set verification_level = 'selfie', modes = array['friend'], last_active_at = now()
where id = '33333333-3333-3333-3333-333333333333';
update private.profile_private
set birthdate = '2002-05-10', age_min = 18, age_max = 35
where user_id = '33333333-3333-3333-3333-333333333333';

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
do $$ begin perform public.get_my_deck(); end $$;
do $$ begin perform public.swipe('33333333-3333-3333-3333-333333333333', 'like'); end $$;

set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
do $$ begin perform public.get_my_deck(); end $$;

select is(
  (select (public.swipe('11111111-1111-1111-1111-111111111111', 'like') ->> 'matched')::boolean),
  true,
  'demo3 ปัด like กลับ → เกิด Match ใหม่'
);

reset role;
update private.matches set expires_at = now() - interval '1 minute'
where '33333333-3333-3333-3333-333333333333' in (user_a, user_b);
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  json_array_length(public.get_my_matches()),
  0,
  'Match ที่เกิน 48 ชม. โดยไม่มีข้อความแรก ถูกปรับเป็น expired อัตโนมัติเมื่อเรียก get_my_matches'
);

reset role;
select is(
  (select status from private.matches where '33333333-3333-3333-3333-333333333333' in (user_a, user_b)),
  'expired',
  'สถานะในตาราง private.matches เปลี่ยนเป็น expired'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok('select * from private.swipe_deck', '42501', null, 'อ่าน private.swipe_deck ตรงไม่ได้');
select throws_ok('select * from private.matches', '42501', null, 'อ่าน private.matches ตรงไม่ได้');

select * from finish();
rollback;
