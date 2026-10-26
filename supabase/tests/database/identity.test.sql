-- ทดสอบเฟส 1 (ตัวตน): trigger ตอนสมัคร, สิทธิ์อ่าน profiles, RPC onboarding / โปรไฟล์ / consent, การระงับบัญชี
-- ผู้ใช้จาก seed.sql: demo (1111…, ยืนยันครบ), demo2 (2222…, ยืนยันครบ), demo3 (3333…, ใหม่)
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

-- ===========================================================================
-- trigger ตอนสมัคร + ยืนยันเบอร์ (ในฐานะระบบ)
-- ===========================================================================
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444',
        'authenticated', 'authenticated', 'new@rukan.dev', '{"display_name":"  "}', now(), now());

select is(
  (select display_name from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  'new',
  'สมัครใหม่ → สร้าง profile (ชื่อว่าง ใช้ชื่อหน้าอีเมล)'
);
select ok(
  exists (select 1 from private.profile_private where user_id = '44444444-4444-4444-4444-444444444444')
  and exists (select 1 from private.verifications where user_id = '44444444-4444-4444-4444-444444444444')
  and exists (select 1 from private.aliases where user_id = '44444444-4444-4444-4444-444444444444'),
  'สมัครใหม่ → สร้าง profile_private + verifications + alias ครบ'
);
select is(
  (select verification_level from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  'none'::public.verification_level,
  'เริ่มต้นที่ระดับ none'
);

update auth.users set phone = '66800000004', phone_confirmed_at = now() where id = '44444444-4444-4444-4444-444444444444';
select is(
  (select verification_level from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  'phone'::public.verification_level,
  'ยืนยันเบอร์ใน Auth → ระดับ phone'
);

select throws_ok(
  $$ select private.mark_liveness_passed('44444444-4444-4444-4444-444444444444', 'x') $$,
  '22023', 'consent_required',
  'ผ่าน liveness ไม่ได้ถ้ายังไม่ยินยอม biometric'
);

-- ===========================================================================
-- anon
-- ===========================================================================
set local role anon;

select throws_ok('select * from public.profiles', '42501', null, 'anon อ่าน profiles ไม่ได้');
select throws_ok('select public.get_my_status()', '42501', null, 'anon เรียก get_my_status ไม่ได้');
select is((public.health() ->> 'status'), 'ok', 'anon เรียก health() ได้');
select cmp_ok((select count(*)::int from public.areas), '>=', 85, 'anon อ่านรายชื่อย่านได้ (ครอบคลุมทั่วประเทศ)');

-- ===========================================================================
-- demo3 — ผู้ใช้ใหม่เดิน onboarding ตามลำดับ
-- ===========================================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select is(public.get_my_status() ->> 'next_step', 'consents', 'ผู้ใช้ใหม่: ขั้นแรกคือยอมรับเอกสาร');

select throws_ok(
  $$ select public.record_consent('terms', 'v0') $$,
  '22023', 'invalid_consent_version',
  'ยอมรับเอกสารเวอร์ชันเก่า/มั่วไม่ได้'
);
select lives_ok(
  $$ select public.record_consent('terms', 'v1'), public.record_consent('privacy', 'v1'), public.record_consent('rules', 'v1') $$,
  'ยอมรับ terms / privacy / rules ได้'
);
select is(public.get_my_status() ->> 'next_step', 'phone', 'ยอมรับครบ → ขั้นต่อไปยืนยันเบอร์');

select throws_ok(
  $$ select public.complete_onboarding('มิว', '2000-01-01', '{friend}') $$,
  '42501', 'verification_required',
  'ยังไม่ยืนยันเบอร์ → กรอกโปรไฟล์ไม่ได้'
);
select throws_ok(
  $$ select public.set_interests('{cafe}') $$,
  '42501', 'verification_required',
  'ยังไม่ยืนยันเบอร์ → ตั้งความสนใจไม่ได้'
);

-- (ระบบ) ยืนยันเบอร์สำเร็จ
reset role;
update auth.users set phone = '66800000003', phone_confirmed_at = now() where id = '33333333-3333-3333-3333-333333333333';
set local role authenticated;

select is(public.get_my_status() ->> 'next_step', 'profile', 'ยืนยันเบอร์แล้ว → ขั้นต่อไปกรอกโปรไฟล์');

select throws_ok(
  $$ select public.complete_onboarding('มิว', (current_date - interval '17 years')::date, '{friend}') $$,
  '22023', 'underage',
  'อายุไม่ถึง 18 สมัครไม่ได้'
);
select throws_ok(
  $$ select public.complete_onboarding('มิว', '2000-01-01', '{}') $$,
  '22023', 'modes_required',
  'ต้องเลือกโหมดอย่างน้อย 1'
);
select throws_ok(
  $$ select public.complete_onboarding('มิว', '2000-01-01', '{friend}', 'mars') $$,
  '22023', 'invalid_area',
  'ย่านที่ไม่มีอยู่จริงใช้ไม่ได้'
);
select lives_ok(
  $$ select public.complete_onboarding('มิว', '2000-01-01', '{friend,date}', 'ari', 'Dev') $$,
  'กรอกโปรไฟล์ครบ'
);
select is(public.get_my_status() ->> 'next_step', 'selfie', 'กรอกเสร็จ → ขั้นต่อไป selfie');
select throws_ok(
  $$ select public.complete_onboarding('มิว', '1999-01-01', '{friend}') $$,
  '22023', 'birthdate_locked',
  'เปลี่ยนวันเกิดหลังตั้งแล้วไม่ได้'
);

select is(
  (select json_build_object('name', p ->> 'display_name', 'age_ok', (p ->> 'age')::int >= 18, 'alias', p ->> 'alias' is not null)::text
   from public.get_my_profile() as p),
  '{"name" : "มิว", "age_ok" : true, "alias" : true}',
  'get_my_profile คืนข้อมูลของตัวเอง (ชื่อ, อายุ, นามแฝง)'
);

-- ความสนใจ / คำถาม
select throws_ok(
  $$ select public.set_interests('{cafe,street_food,cooking,badminton,running,gym,board_games,gaming,movies,music,books}') $$,
  '22023', 'too_many_interests',
  'ความสนใจเกิน 10 ไม่ได้'
);
select throws_ok($$ select public.set_interests('{cafe,hacking}') $$, '22023', 'invalid_interest', 'ความสนใจที่ไม่มีในรายการใช้ไม่ได้');
do $$ begin perform public.set_interests('{cafe,running}'); end $$;
select is((select count(*)::int from public.profile_interests), 2, 'ตั้งความสนใจได้ และเห็นแค่ของตัวเอง');

do $$
begin
  perform public.set_prompt_answer('perfect_weekend', 'นอน');
  perform public.set_prompt_answer('go_to_food', 'ข้าวมันไก่');
  perform public.set_prompt_answer('small_joy', 'แมว');
end $$;
select throws_ok($$ select public.set_prompt_answer('learning', 'ญี่ปุ่น') $$, '22023', 'too_many_prompts', 'คำถามเกิน 3 ข้อไม่ได้');

-- เข้าข้อมูลตรงๆ / ของคนอื่น
select is((select count(*)::int from public.profiles), 1, 'อ่าน profiles ได้แค่แถวของตัวเอง (กัน scrape)');
select throws_ok(
  $$ update public.profiles set verification_level = 'selfie' where id = '33333333-3333-3333-3333-333333333333' $$,
  '42501', null,
  'แก้ verification_level เองไม่ได้'
);
select throws_ok('select * from private.profile_private', '42501', null, 'อ่าน private.profile_private ตรงไม่ได้');
select throws_ok('select private.mark_liveness_passed(''33333333-3333-3333-3333-333333333333'', ''x'')', '42501', null, 'เรียก mark_liveness_passed เองไม่ได้');
select throws_ok('select public.handle_new_user()', '42501', null, 'เรียก handle_new_user() ตรงไม่ได้');

-- ===========================================================================
-- demo — ยืนยันครบแล้ว
-- ===========================================================================
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(public.get_my_status() ->> 'next_step', 'done', 'ผู้ใช้ที่ยืนยันครบ → done');
select lives_ok($$ select public.update_my_profile(p_bio => '', p_theme => 'gold') $$, 'แก้โปรไฟล์ตัวเองได้');
select is(
  (select bio is null and theme = 'gold' from public.profiles),
  true,
  'update_my_profile: '''' = ล้างค่า, ค่าที่ส่ง = เปลี่ยน'
);

-- ===========================================================================
-- บัญชีถูกระงับ
-- ===========================================================================
reset role;
insert into private.user_status (user_id, state, until) values ('22222222-2222-2222-2222-222222222222', 'suspended', now() + interval '1 day');
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(public.get_my_status() ->> 'next_step', 'restricted', 'ถูกระงับ → restricted');
select throws_ok($$ select public.update_my_profile(p_bio => 'x') $$, '42501', 'account_restricted', 'ถูกระงับ → แก้โปรไฟล์ไม่ได้');

select * from finish();
rollback;
