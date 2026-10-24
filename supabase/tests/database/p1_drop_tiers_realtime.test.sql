-- ทดสอบ P1 (docs/AUDIT.md หัวข้อ 4):
--   1) Daily Drop ตามเวลาไทย (Asia/Bangkok) + เปิดให้เห็นหลัง 19:00 น. (หรือ 12:00 น. สำหรับ Noon Drop)
--   2) Tier ต่อผู้ใช้ (private.subscriptions + private.user_limits) บังคับโควตาใน get_my_drop / send_bubble / swipe
--   3) Realtime แชทแบบ Private Broadcast (D36) + RLS บน realtime.messages + ไม่มี sender_id หลุด
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- 1) ตรวจว่าตาราง private.subscriptions และ realtime.messages เปิด RLS
select ok(
  (select relrowsecurity from pg_class where oid = 'private.subscriptions'::regclass),
  'private.subscriptions เปิด RLS'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'realtime.messages'::regclass),
  'realtime.messages เปิด RLS'
);

-- เตรียมให้ demo3 ยืนยันครบระดับ selfie และมีอายุ/โหมดเพื่อใช้ทดสอบโควตาหลายใบและหลายโพสต์
update public.profiles
set verification_level = 'selfie',
    modes = array['friend', 'date'],
    area_id = 'ari',
    last_active_at = now()
where id = '33333333-3333-3333-3333-333333333333';

update private.profile_private
set birthdate = '2002-05-10',
    age_min = 18,
    age_max = 35
where user_id = '33333333-3333-3333-3333-333333333333';

-- ---------------------------------------------------------------------------
-- ส่วนที่ 1: Daily Drop ตามเวลาไทย (Asia/Bangkok) & เปิดหลัง 19:00 น.
-- ---------------------------------------------------------------------------

-- แม้ว่าจะมีงาน cron สร้าง daily_drops ล่วงหน้าไว้ตอน 18:50 เวลาไทย
set local rukan.test_bangkok_now = '2026-10-25 18:50:00';
select ok(
  private.generate_daily_drops() > 0,
  'generate_daily_drops สร้างการ์ดล่วงหน้าตามวันที่เวลาไทย (2026-10-25)'
);

-- ตอน 18:59 น. เวลาไทย: ผู้ใช้ Free (demo) เรียก get_my_drop ต้องได้ [] และปัดหรือดูการ์ดผ่าน Drop ไม่ได้
set local rukan.test_bangkok_now = '2026-10-25 18:59:00';
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  json_array_length(public.get_my_drop('friend')),
  0,
  'ก่อน 19:00 เวลาไทย (18:59) → ผู้ใช้ Free ยังไม่เห็น Daily Drop ของวันนี้'
);

select throws_ok(
  $$ select public.swipe('22222222-2222-2222-2222-222222222222', 'friend', 'like') $$,
  '42501', 'candidate_not_in_drop',
  'ก่อน 19:00 เวลาไทย → ปัดการ์ดใน Drop ของวันนี้ไม่ได้แม้ระบบสร้างล่วงหน้าไว้แล้ว'
);

select throws_ok(
  $$ select public.get_profile_card('22222222-2222-2222-2222-222222222222') $$,
  '42501', 'profile_not_accessible',
  'ก่อน 19:00 เวลาไทย → แอบเรียก get_profile_card ของคนใน Drop ล่วงหน้าไม่ได้'
);

-- ตอน 19:00 น. เวลาไทย: เปิดให้เห็น Daily Drop ทันที
set local rukan.test_bangkok_now = '2026-10-25 19:00:00';

select is(
  json_array_length(public.get_my_drop('friend')),
  2,
  'ตั้งแต่ 19:00 เวลาไทย → ผู้ใช้เห็นการ์ดใน Daily Drop ของวันนี้ (demo2 และ demo3)'
);

-- ---------------------------------------------------------------------------
-- ส่วนที่ 2: Tier ต่อผู้ใช้ (private.subscriptions + private.user_limits)
-- ---------------------------------------------------------------------------

-- ค่าเริ่มต้นของผู้ใช้ที่ยังไม่มีแถวใน subscriptions คือ tier = 'free'
select is(
  public.get_my_subscription() ->> 'tier',
  'free',
  'ผู้ใช้เริ่มต้นเป็น tier = free'
);

select is(
  (public.get_my_subscription() -> 'limits' ->> 'daily_bubble_limit')::int,
  3,
  'tier = free ได้โควตา daily_bubble_limit = 3 จาก private.tier_configs'
);

-- ผู้ใช้ทั่วไปเรียก mod_set_user_subscription ไม่ได้
select throws_ok(
  $$ select public.mod_set_user_subscription('11111111-1111-1111-1111-111111111111', 'premium', 'manual', null) $$,
  '42501', 'forbidden',
  'ผู้ใช้ทั่วไปตั้ง tier ให้ตัวเองไม่ได้'
);

-- ทดสอบโควตา daily_drop_limit จาก tier_configs:
-- ถ้าปรับ Free tier ให้ daily_drop_limit = 1 → demo (Free) จะเห็นแค่ 1 ใบ ในขณะที่ Premium เห็นครบ 2 ใบ
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "app_metadata": {"role": "moderator"}}';
do $$
begin
  perform public.mod_update_tier_config('free', '{"daily_drop_limit": 1}'::jsonb);
end $$;

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  json_array_length(public.get_my_drop('friend')),
  1,
  'เมื่อ Free tier ตั้ง daily_drop_limit = 1 → get_my_drop คืนการ์ดเพียง 1 ใบตามโควตา'
);

-- ทดสอบ Noon Drop (12:00 น. เวลาไทย): Free ยังไม่เห็น แต่เมื่ออัปเกรดเป็น Premium (has_noon_drop = true) เห็นตั้งแต่ 12:00 น.!
set local rukan.test_bangkok_now = '2026-10-25 12:30:00';
select is(
  json_array_length(public.get_my_drop('friend')),
  0,
  'ตอน 12:30 น. เวลาไทย → ผู้ใช้ Free ยังไม่เห็น Drop'
);

-- Moderator เปิดสิทธิ์ Premium (promo) ให้ demo
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "app_metadata": {"role": "moderator"}}';
select is(
  public.mod_set_user_subscription(
    '11111111-1111-1111-1111-111111111111',
    'premium',
    'promo',
    now() + interval '30 days'
  ) ->> 'tier',
  'premium',
  'moderator ตั้งสิทธิ์ Rukan Gold (premium) ให้ผู้ใช้สำเร็จ'
);

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  json_array_length(public.get_my_drop('friend')),
  2,
  'ตอน 12:30 น. เวลาไทย → สมาชิก Premium (has_noon_drop = true) เห็น Noon Drop และได้โควตาครบ 2 ใบ'
);

-- ทดสอบเมื่อสมาชิกหมดอายุ (expires_at อยู่ในอดีต) → กลับเป็น Free ทันที
reset role;
update private.subscriptions
set expires_at = now() - interval '1 minute'
where user_id = '11111111-1111-1111-1111-111111111111';

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  public.get_my_subscription() ->> 'tier',
  'free',
  'เมื่อ expires_at หมดอายุ → get_my_subscription คืน tier = free อัตโนมัติ'
);

-- ทดสอบโควตา send_bubble ตาม Tier:
-- สร้างโพสต์ 4 โพสต์จาก demo2 เพื่อให้ demo (Free: daily_bubble_limit = 3) ทักได้แค่ 3 ครั้ง
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
do $$
begin
  perform set_config('test.p1', public.create_post('โพสต์ที่ 1 ชวนคุยเรื่องหนัง', 'lonely') ->> 'id', true);
  perform set_config('test.p2', public.create_post('โพสต์ที่ 2 ชวนคุยเรื่องเพลง', 'happy') ->> 'id', true);
  perform set_config('test.p3', public.create_post('โพสต์ที่ 3 ชวนคุยเรื่องกาแฟ', 'tired') ->> 'id', true);
  perform set_config('test.p4', public.create_post('โพสต์ที่ 4 ชวนคุยเรื่องแมว', 'happy') ->> 'id', true);
end $$;

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
do $$
begin
  perform public.send_bubble(current_setting('test.p1')::uuid, 'ทักโพสต์ 1 ครับ');
  perform public.send_bubble(current_setting('test.p2')::uuid, 'ทักโพสต์ 2 ครับ');
  perform public.send_bubble(current_setting('test.p3')::uuid, 'ทักโพสต์ 3 ครับ');
end $$;

-- ฟองที่ 4 ของ Free user ต้องติด rate_limited
select throws_ok(
  $$ select public.send_bubble(current_setting('test.p4')::uuid, 'ทักโพสต์ 4 เกินโควตา Free') $$,
  'P0001', 'rate_limited',
  'ผู้ใช้ Free ส่ง bubble เกิน daily_bubble_limit (3 ฟอง/วัน) ไม่ได้'
);

-- เมื่อซิงก์สมาชิกจาก RevenueCat IAP (revenuecat_ios) เป็น Premium → ส่งฟองที่ 4 ได้ทันที!
reset role;
select lives_ok(
  $$
    select private.sync_revenuecat_subscription(
      '11111111-1111-1111-1111-111111111111',
      'premium',
      'revenuecat_ios',
      'active',
      now() + interval '30 days',
      'rc_txn_001'
    )
  $$,
  'sync_revenuecat_subscription บันทึกสมาชิกจาก RevenueCat IAP สำเร็จ'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  public.send_bubble(current_setting('test.p4')::uuid, 'ทักโพสต์ 4 หลังอัปเกรดเป็น Gold') ->> 'status',
  'pending',
  'หลังอัปเกรดเป็น Rukan Gold (daily_bubble_limit = 30) → ส่ง bubble ฟองที่ 4 ได้ทันที'
);

-- ---------------------------------------------------------------------------
-- ส่วนที่ 3: Realtime แชทแบบ Private Broadcast (D36) + RLS บน realtime.messages
-- ---------------------------------------------------------------------------

-- ให้ demo2 ตอบรับ bubble แรกเพื่อสร้างห้องแชทนามแฝง
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
do $$
declare
  v_conv_id text;
begin
  v_conv_id := public.respond_bubble(
    (public.get_my_bubbles() -> 'incoming' -> 0 ->> 'id')::uuid,
    true
  ) ->> 'conversation_id';
  perform set_config('test.rt_conv_id', v_conv_id, true);
end $$;

-- สมาชิกห้องแชท (demo และ demo2) มีสิทธิ์ subscribe ช่อง conversation:<id>
select is(
  public.can_access_realtime_topic('conversation:' || current_setting('test.rt_conv_id')),
  true,
  'สมาชิกห้องแชท (demo2) มีสิทธิ์ subscribe ช่อง conversation:<id>'
);

-- คนนอกห้องแชท (demo3) ไม่มีสิทธิ์ subscribe ช่อง conversation:<id> และช่อง user:<คนอื่น>
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select is(
  public.can_access_realtime_topic('conversation:' || current_setting('test.rt_conv_id')),
  false,
  'คนนอกห้องแชท (demo3) subscribe ช่อง conversation:<id> ไม่ได้'
);

select is(
  public.can_access_realtime_topic('user:11111111-1111-1111-1111-111111111111'),
  false,
  'ผู้ใช้คนอื่น subscribe ช่อง user:<uid ของคนอื่น> ไม่ได้'
);

-- client พยายาม insert เข้า realtime.messages ตรงๆ ไม่ได้ (กันปลอมสัญญาณ broadcast)
select throws_ok(
  $$
    insert into realtime.messages (topic, extension, event, payload, private)
    values ('conversation:' || current_setting('test.rt_conv_id'), 'broadcast', 'chat_event', '{}'::jsonb, true)
  $$,
  '42501', null,
  'authenticated เขียน realtime.messages ตรงๆ เพื่อปลอม broadcast ไม่ได้'
);

-- เมื่อส่งข้อความผ่าน send_message → ระบบส่งสัญญาณ private broadcast โดยไม่มี sender_id / user_id / body
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
do $$
begin
  perform public.send_message(current_setting('test.rt_conv_id')::uuid, 'สวัสดีจากแชทนามแฝงครับ');
end $$;

reset role;
select is(
  (
    select jsonb_build_object(
      'event', rm.event,
      'private', rm.private,
      'type', rm.payload ->> 'type',
      'has_sender_id', (rm.payload ? 'sender_id') or (rm.payload ? 'user_id'),
      'has_body', (rm.payload ? 'body')
    )
    from realtime.messages rm
    where rm.topic = 'conversation:' || current_setting('test.rt_conv_id')
      and rm.payload ->> 'type' = 'new_message'
    order by rm.inserted_at desc
    limit 1
  ),
  '{"event": "chat_event", "has_body": false, "has_sender_id": false, "private": true, "type": "new_message"}'::jsonb,
  'send_message ส่งสัญญาณ private broadcast ที่ไม่มี sender_id, user_id หรือ body หลุดออกไป (ตาม D36)'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok('select * from private.subscriptions', '42501', null, 'อ่าน private.subscriptions ตรงไม่ได้');

select * from finish();
rollback;
