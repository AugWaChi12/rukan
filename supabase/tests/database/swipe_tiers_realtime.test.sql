-- ทดสอบ swipe deck แบบ rolling window, Tier ต่อผู้ใช้ (private.subscriptions + user_limits) และ Realtime private broadcast (D36)
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.subscriptions'::regclass),
  'private.subscriptions เปิด RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.coin_wallets'::regclass),
  'private.coin_wallets เปิด RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.coin_ledger'::regclass),
  'private.coin_ledger เปิด RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'realtime.messages'::regclass),
  'realtime.messages เปิด RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.swipe_windows'::regclass),
  'private.swipe_windows เปิด RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.swipe_deck'::regclass),
  'private.swipe_deck เปิด RLS'
);

-- demo3 ยืนยันครบ เพื่อให้มีผู้สมัครในกองของ demo อย่างน้อย 2 คน (demo2 + demo3)
update public.profiles
set verification_level = 'selfie', modes = array['friend', 'date'], area_id = 'ari', last_active_at = now()
where id = '33333333-3333-3333-3333-333333333333';

update private.profile_private
set birthdate = '2002-05-10', age_min = 18, age_max = 35
where user_id = '33333333-3333-3333-3333-333333333333';

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- ---------------------------------------------------------------------------
-- ส่วนที่ 1: Tier + โควตาปัดแบบ rolling window
-- ---------------------------------------------------------------------------
select is(
  public.get_my_subscription() ->> 'tier',
  'free',
  'ผู้ใช้เริ่มต้นเป็น tier = free'
);

select is(
  (public.get_my_subscription() -> 'limits' ->> 'swipe_batch_size')::int,
  20,
  'tier = free ปัดได้ 20 ใบต่อรอบ (จาก private.tier_configs)'
);

select is(
  (public.get_my_deck() -> 'quota' ->> 'used')::int,
  0,
  'ยังไม่ปัด → โควตาในรอบใช้ไป 0 ใบ และยังไม่เริ่มนับเวลา'
);

select throws_ok(
  $$ select public.mod_set_user_subscription('11111111-1111-1111-1111-111111111111', 'premium', 'manual', null) $$,
  '42501', 'forbidden',
  'ผู้ใช้ทั่วไปตั้ง tier ให้ตัวเองไม่ได้'
);

select is(
  json_array_length(public.get_my_deck() -> 'cards'),
  2,
  'get_my_deck แจกการ์ด demo2 และ demo3 ทันที ไม่ผูกเวลา 19:00'
);

do $$
begin
  perform set_config('test.c1', (public.get_my_deck() -> 'cards' -> 0 ->> 'candidate_id'), true);
  perform set_config('test.c2', (public.get_my_deck() -> 'cards' -> 1 ->> 'candidate_id'), true);
end $$;

-- ลดโควตา Free เหลือ 1 ใบต่อรอบ แล้วปัดใบแรก → โควตาเต็ม
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "app_metadata": {"role": "moderator"}}';
do $$
begin
  perform public.mod_update_tier_config('free', '{"swipe_batch_size": 1}'::jsonb);
end $$;

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select (public.swipe(current_setting('test.c1')::uuid, 'like') ->> 'matched')::boolean),
  false,
  'ปัดใบแรกในรอบสำเร็จ (ยังไม่ match เพราะอีกฝ่ายยังไม่ปัด)'
);

select is(
  json_array_length(public.get_my_deck() -> 'cards'),
  0,
  'โควตาในรอบเต็ม → get_my_deck ไม่แจกการ์ดเพิ่ม'
);

select throws_ok(
  $$ select public.swipe(current_setting('test.c2')::uuid, 'skip') $$,
  'P0001', 'swipe_limit_reached',
  'ปัดเกินโควตาในรอบ → swipe_limit_reached'
);

-- ครบ 6 ชม. นับจากใบแรก → รีโควตาเต็มอีกครั้ง
reset role;
update private.swipe_windows
set window_started_at = now() - interval '7 hours'
where user_id = '11111111-1111-1111-1111-111111111111';

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (public.get_my_deck() -> 'quota' ->> 'used')::int,
  0,
  'ผ่าน 6 ชม. หลังปัดใบแรก → โควตารีเป็น 0 ที่ใช้'
);

select lives_ok(
  $$ select public.swipe(current_setting('test.c2')::uuid, 'skip') $$,
  'หลังรีโควตา ปัดได้อีกครั้ง'
);

-- Moderator เปิดสิทธิ์ Gold Pass (promo) ให้ demo → โควตา 40 ใบต่อรอบ
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "app_metadata": {"role": "moderator"}}';
select is(
  public.mod_set_user_subscription(
    '11111111-1111-1111-1111-111111111111',
    'gold',
    'promo',
    now() + interval '30 days'
  ) ->> 'tier',
  'gold',
  'moderator ตั้งสิทธิ์ Gold Pass (gold) ให้ผู้ใช้สำเร็จ'
);

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  (public.get_my_subscription() -> 'limits' ->> 'swipe_batch_size')::int,
  40,
  'Gold Pass ปัดได้ 40 ใบต่อรอบ'
);

select is(
  (public.get_my_deck() -> 'quota' ->> 'remaining')::int,
  39,
  'Gold Pass ปัดไปแล้ว 1 ใบในรอบ → เหลือ 39'
);

-- ทดสอบ Rukan Coin: เหรียญเริ่มต้น = 0 → แลก Premium Pass ไม่ได้ (insufficient_coins)
select is(
  (public.get_my_subscription() ->> 'coin_balance')::int,
  0,
  'ผู้ใช้เริ่มต้นมี Rukan Coin = 0 เหรียญ'
);

select throws_ok(
  $$ select public.exchange_coins_for_pass('premium', 'monthly') $$,
  'P0001', 'insufficient_coins',
  'เหรียญไม่พอแลก Premium Pass → insufficient_coins'
);

-- Moderator เติมเหรียญ 6,000 🪙 ให้ demo → แลก Premium Pass รายเดือน (5,900 🪙) ได้สำเร็จ
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "app_metadata": {"role": "moderator"}}';
select is(
  (public.mod_grant_user_coins('11111111-1111-1111-1111-111111111111', 6000, 'เติมเหรียญทดสอบ') ->> 'coin_balance')::int,
  6000,
  'moderator เติม Rukan Coin 6,000 เหรียญให้ผู้ใช้สำเร็จ'
);

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  public.exchange_coins_for_pass('premium', 'monthly') ->> 'tier',
  'premium',
  'ผู้ใช้แลกเหรียญ 5,900 🪙 เป็น Premium Pass (30 วัน) สำเร็จ'
);

select is(
  (public.get_my_subscription() ->> 'coin_balance')::int,
  100,
  'หักเหรียญ 5,900 🪙 จาก 6,000 🪙 → เหลือ 100 🪙'
);

select is(
  (public.get_my_subscription() -> 'limits' ->> 'swipe_batch_size')::int,
  80,
  'Premium Pass ปัดได้ 80 ใบต่อรอบ'
);

select is(
  (public.get_my_subscription() -> 'limits' ->> 'allow_ai_assistant')::boolean,
  true,
  'Premium Pass เปิดสิทธิ์ผู้ช่วย AI ส่วนตัว (allow_ai_assistant = true)'
);

-- สมาชิกหมดอายุ → กลับเป็น Free ทันที
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

-- โควตา send_bubble ตาม Tier: Free = 3 ฟอง/วัน
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

select throws_ok(
  $$ select public.send_bubble(current_setting('test.p4')::uuid, 'ทักโพสต์ 4 เกินโควตา Free') $$,
  'P0001', 'rate_limited',
  'ผู้ใช้ Free ส่ง bubble เกิน daily_bubble_limit (3 ฟอง/วัน) ไม่ได้'
);

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
-- ส่วนที่ 2: Realtime แชทแบบ Private Broadcast (D36) + RLS บน realtime.messages
-- ---------------------------------------------------------------------------
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

select is(
  public.can_access_realtime_topic('conversation:' || current_setting('test.rt_conv_id')),
  true,
  'สมาชิกห้องแชท (demo2) มีสิทธิ์ subscribe ช่อง conversation:<id>'
);

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

select throws_ok(
  $$
    insert into realtime.messages (topic, extension, event, payload, private)
    values ('conversation:' || current_setting('test.rt_conv_id'), 'broadcast', 'chat_event', '{}'::jsonb, true)
  $$,
  '42501', null,
  'authenticated เขียน realtime.messages ตรงๆ เพื่อปลอม broadcast ไม่ได้'
);

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
select throws_ok('select * from private.coin_wallets', '42501', null, 'อ่าน private.coin_wallets ตรงไม่ได้');

-- ทดสอบ use_ai_wingman: ผู้ใช้ Premium Pass (user 1111...) ใช้ฟรี 0 เหรียญ และได้ประโยคแนะนำ 3 ข้อ
select is(
  (
    select jsonb_build_object(
      'coins_charged', (r ->> 'coins_charged')::int,
      'is_free_vip', (r ->> 'is_free_vip')::boolean,
      'count', jsonb_array_length(r -> 'suggestions')
    )
    from (select public.use_ai_wingman('bubble', 'คืนนี้เหงาจัง #เหงาๆ') as r) s
  ),
  '{"coins_charged": 0, "count": 3, "is_free_vip": true}'::jsonb,
  'Premium Pass ใช้ AI Wingman ได้ฟรี (0 เหรียญ) และได้ 3 ประโยคทักทาย'
);

-- ผู้ใช้ทั่วไป (user 2222...) ที่ไม่มีเหรียญ เรียก use_ai_wingman ต้องขึ้น insufficient_coins
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select throws_ok(
  $$ select public.use_ai_wingman('chat', 'สวัสดีครับ') $$,
  'P0001', 'insufficient_coins',
  'ผู้ใช้ Free ที่เหรียญไม่พอเรียก AI Wingman จะได้ insufficient_coins'
);

-- ผู้ใช้ทั่วไปเรียก mod_list_users ไม่ได้
select throws_ok(
  $$ select public.mod_list_users() $$,
  '42501', 'forbidden',
  'ผู้ใช้ทั่วไปเรียก mod_list_users ไม่ได้'
);

-- Moderator เรียก mod_list_users และ mod_set_user_verification ได้
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "app_metadata": {"role": "moderator"}}';
select ok(
  jsonb_array_length(public.mod_list_users('demo', 'all', 'all', 10, 0)) >= 2,
  'Moderator ค้นหารายชื่อผู้ใช้ผ่าน mod_list_users ได้'
);

select is(
  public.mod_set_user_verification('33333333-3333-3333-3333-333333333333'::uuid, 'selfie') ->> 'verification_level',
  'selfie',
  'Moderator ปรับระดับยืนยันตัวตนผ่าน mod_set_user_verification ได้'
);

select * from finish();
rollback;
