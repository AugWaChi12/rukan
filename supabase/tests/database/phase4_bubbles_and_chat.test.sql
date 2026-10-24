-- ทดสอบเฟส 4 (Bubble + แชท): ส่ง Bubble, แชทนามแฝงไม่เปิดเผยตัวตน, เตือนกลโกง, กดเปิดตัวทั้งสองฝ่าย, และขั้นเปิดรูป (reveal_stage)
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- 1) demo สร้างโพสต์ใน Space
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

do $$ begin perform public.create_post('หาคนไปกินชาบูแถวอารีย์เย็นนี้', 'happy'); end $$;

-- ส่ง bubble หาโพสต์ตัวเองไม่ได้
select throws_ok(
  $$ select public.send_bubble((select (public.get_feed('all') -> 0 ->> 'id')::uuid), 'ทักตัวเอง') $$,
  '22023', 'cannot_bubble_own_post',
  'ส่ง bubble หาโพสต์ตัวเองไม่ได้'
);

-- 2) demo2 ส่ง bubble ทักโพสต์ของ demo
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select throws_ok(
  $$ select public.send_bubble((select (public.get_feed('all') -> 0 ->> 'id')::uuid), 'แอดไลน์มาคุยกัน line id: abc') $$,
  '22023', 'contains_prohibited_contact',
  'ห้ามส่งข้อมูลติดต่อในข้อความแรกของ bubble'
);

select is(
  (select public.send_bubble((public.get_feed('all') -> 0 ->> 'id')::uuid, 'ชอบชาบูเหมือนกัน ร้านไหนดี!') ->> 'status'),
  'pending',
  'demo2 ส่ง bubble สำเร็จ (สถานะ pending)'
);

select throws_ok(
  $$ select public.send_bubble((select (public.get_feed('all') -> 0 ->> 'id')::uuid), 'ทักซ้ำ') $$,
  '22023', 'bubble_already_sent',
  'ส่ง bubble ซ้ำโพสต์เดิมไม่ได้'
);

-- 3) demo ดูรายการ bubble ที่ได้รับ (ต้องไม่มี sender_id หลุดออกมา) แล้วกดตอบรับ
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (
    select (b -> 'incoming' -> 0)::jsonb ? 'sender_id'
    from public.get_my_bubbles() as b
  ),
  false,
  'get_my_bubbles ไม่เคยส่ง sender_id ออกมาให้เจ้าของโพสต์'
);

select is(
  (
    select public.respond_bubble((public.get_my_bubbles() -> 'incoming' -> 0 ->> 'id')::uuid, true) ->> 'status'
  ),
  'accepted',
  'demo ตอบรับ bubble → เปิดห้องแชทนามแฝงทันที'
);

-- 4) ในห้องแชทนามแฝง: peer.user_id และ peer.display_name ต้องเป็น null!
select is(
  (
    select json_build_object(
      'is_anonymous', (c -> 0 ->> 'is_anonymous')::boolean,
      'peer_user_id', c -> 0 -> 'peer' ->> 'user_id',
      'peer_name', c -> 0 -> 'peer' ->> 'display_name'
    )::text
    from public.get_conversations() as c
  ),
  '{"is_anonymous" : true, "peer_user_id" : null, "peer_name" : null}',
  'แชทนามแฝงซ่อน user_id และชื่อจริงของคู่สนทนา'
);

-- ห้ามส่งเบอร์โทรในแชทนามแฝง (กันข้ามการเปิดตัวสองฝ่าย)
select throws_ok(
  $$ select public.send_message((select (public.get_conversations() -> 0 ->> 'id')::uuid), 'เบอร์เรา 0812345678') $$,
  '22023', 'contains_prohibited_contact',
  'ห้ามส่งเบอร์โทรในแชทที่ยังไม่เปิดตัว'
);

-- ขอเปิดรูปก่อนเปิดตัวไม่ได้
select throws_ok(
  $$ select public.request_photo_unlock((select (public.get_conversations() -> 0 ->> 'id')::uuid)) $$,
  '22023', 'must_reveal_identity_first',
  'ยังเป็นแชทนามแฝง → กดขอเปิดรูปไม่ได้ ต้องเปิดตัวก่อน'
);

-- 5) ตรวจคำเตือนกลโกง (scam_warning) ในข้อความแชท
select is(
  (
    select (public.send_message(
      (public.get_conversations() -> 0 ->> 'id')::uuid,
      'ชวนลงทุนเทรดคริปโต โอนเงินมาได้เลย'
    ) ->> 'scam_warning')::boolean
  ),
  true,
  'ข้อความที่มีคำว่า โอนเงิน/ลงทุน/คริปโต ถูกติดป้าย scam_warning = true อัตโนมัติ'
);

select is(
  (
    select bool_or((m::jsonb ? 'sender_id') or (m::jsonb ? 'user_id'))
    from json_array_elements(
      public.get_messages((public.get_conversations() -> 0 ->> 'id')::uuid)
    ) as m
  ),
  false,
  'get_messages คืนเฉพาะ is_mine ไม่เคยคืน sender_id'
);

-- 6) การกด "เปิดตัว" (request_reveal): กดฝ่ายเดียวไม่มีผล ต้องกดทั้งสองฝ่าย
select is(
  (
    select (public.request_reveal((public.get_conversations() -> 0 ->> 'id')::uuid) ->> 'revealed')::boolean
  ),
  false,
  'demo กดเปิดตัวฝ่ายเดียว → ยังไม่เปิดตัว (revealed = false)'
);

-- สลับเป็น demo2 กดเปิดตัวด้วย → เปิดตัวสำเร็จ + สร้าง Match อัตโนมัติ!
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (
    select (public.request_reveal((public.get_conversations() -> 0 ->> 'id')::uuid) ->> 'revealed')::boolean
  ),
  true,
  'demo2 กดเปิดตัวตาม → ทั้งคู่เปิดตัวสำเร็จ (revealed = true)'
);

select is(
  (
    select public.get_conversation((public.get_conversations() -> 0 ->> 'id')::uuid) -> 'peer' ->> 'display_name'
  ),
  'Demo User',
  'หลังเปิดตัวทั้งคู่ → เห็นชื่อโปรไฟล์จริงของอีกฝ่ายแล้ว'
);

-- 7) ทดสอบขั้นเปิดรูป (reveal_stage): คนเดียวพิมพ์รัวไม่ทำให้ขั้นเปิดรูปเพิ่ม!
do $$
declare
  v_conv_id uuid;
  i int;
begin
  select (public.get_conversations() -> 0 ->> 'id')::uuid into v_conv_id;
  for i in 1..6 loop
    perform public.send_message(v_conv_id, 'ข้อความจาก demo2 รอบที่ ' || i);
  end loop;
end $$;

select is(
  (select (public.get_conversations() -> 0 ->> 'reveal_stage')::int),
  0,
  'demo2 ส่งครบ 7 ข้อความแต่ demo เพิ่งส่ง 1 ข้อความ → reveal_stage ยังเป็น 0 (กันคนเดียวพิมพ์รัวเพื่อดูรูป)'
);

-- ให้ demo ส่งเพิ่มอีก 4 ข้อความ (รวมเป็น 5 ข้อความทั้งสองฝ่าย) → ขั้นเปิดรูปต้องขึ้นเป็น Stage 1!
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
do $$
declare
  v_conv_id uuid;
  i int;
begin
  select (public.get_conversations() -> 0 ->> 'id')::uuid into v_conv_id;
  for i in 1..4 loop
    perform public.send_message(v_conv_id, 'ข้อความตอบกลับจาก demo รอบที่ ' || i);
  end loop;
end $$;

select is(
  (select (public.get_conversations() -> 0 ->> 'reveal_stage')::int),
  1,
  'เมื่อต่างคนต่างส่งครบ 5 ข้อความ → reveal_stage เลื่อนเป็น 1 (เห็นรูปแรก)'
);

-- 8) ทั้งคู่กดขอเปิดรูปทั้งหมด (request_photo_unlock) → ข้ามไป Stage 3 ทันที
select is(
  (
    select (public.request_photo_unlock((public.get_conversations() -> 0 ->> 'id')::uuid) ->> 'unlocked_all')::boolean
  ),
  false,
  'demo กดขอเปิดรูปฝ่ายเดียว → ยังไม่เปิดทั้งหมด'
);

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is(
  (
    select (public.request_photo_unlock((public.get_conversations() -> 0 ->> 'id')::uuid) ->> 'unlocked_all')::boolean
  ),
  true,
  'demo2 กดขอเปิดรูปด้วย → reveal_stage = 3 (เปิดครบทุกรูปทันที)'
);

-- 9) คนนอกที่ไม่ได้อยู่ในห้องแชท (demo3) เข้าดูไม่ได้
do $$
begin
  perform set_config('test.conv_id', public.get_conversations() -> 0 ->> 'id', true);
end $$;
reset role;
update public.profiles set verification_level = 'selfie' where id = '33333333-3333-3333-3333-333333333333';
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select throws_ok(
  $$ select public.get_messages(current_setting('test.conv_id')::uuid) $$,
  '22023', 'conversation_not_found',
  'คนนอกห้องแชทอ่านข้อความของคนอื่นไม่ได้'
);

select throws_ok('select * from private.messages', '42501', null, 'อ่าน private.messages ตรงไม่ได้');
select throws_ok('select * from private.conversations', '42501', null, 'อ่าน private.conversations ตรงไม่ได้');

select * from finish();
rollback;
