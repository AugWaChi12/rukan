-- ทดสอบเฟส 2: บล็อก (รวมการไม่เปิดเผยตัวตนเมื่อบล็อกจาก Space), รายงาน, สิทธิ์ Moderator, การระงับ/แบน และการอุทธรณ์
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- สร้างโพสต์ของ demo2 ไว้ทดสอบการบล็อกและรายงานจาก Space
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select lives_ok(
  $$ select set_config('test.post_id', public.create_post('วันนี้เหนื่อยจัง อยากหาเพื่อนคุย', 'tired') ->> 'id', true) $$,
  'demo2 สร้างโพสต์ใน Space ได้'
);

-- สลับเป็น demo (1111...)
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- 1) บล็อกตัวเองไม่ได้
select throws_ok(
  $$ select public.block_user_from('profile', '11111111-1111-1111-1111-111111111111') $$,
  '22023', 'cannot_target_self',
  'บล็อกตัวเองไม่ได้'
);

-- 2) รายงานตัวเองไม่ได้
select throws_ok(
  $$ select public.report_target('profile', '11111111-1111-1111-1111-111111111111', 'spam', null) $$,
  '22023', 'cannot_target_self',
  'รายงานตัวเองไม่ได้'
);

-- 3) รายงานโพสต์ใน Space ได้ และถ้าเป็น self_harm จะคืน care_notice = true
select is(
  (public.report_target('post', current_setting('test.post_id')::uuid, 'self_harm', 'น่าเป็นห่วง') ->> 'care_notice')::boolean,
  true,
  'รายงานโพสต์ self_harm สำเร็จและได้ care_notice = true'
);

-- 4) บล็อกจากโพสต์ไม่ระบุตัวตนใน Space → get_my_blocks ต้องไม่หลุด user_id หรือชื่อจริงของเจ้าของโพสต์!
do $$
begin
  perform public.block_user_from('post', current_setting('test.post_id')::uuid);
end $$;

select is(
  (
    select json_build_object(
      'is_anonymous', (b -> 0 ->> 'is_anonymous')::boolean,
      'blocked_user_id', b -> 0 ->> 'blocked_user_id',
      'display_name', b -> 0 ->> 'display_name'
    )::text
    from public.get_my_blocks() as b
  ),
  '{"is_anonymous" : true, "blocked_user_id" : null, "display_name" : null}',
  'บล็อกจากโพสต์ใน Space → get_my_blocks ซ่อน user_id และชื่อจริง (กันใช้ปุ่มบล็อกแอบดูตัวตนคนโพสต์)'
);

-- ปลดบล็อกด้วย block id ได้
do $$
declare
  v_block_id uuid;
begin
  select (b -> 0 ->> 'id')::uuid into v_block_id from public.get_my_blocks() as b;
  perform public.unblock_user(v_block_id);
end $$;

select is(
  json_array_length(public.get_my_blocks()),
  0,
  'ปลดบล็อกด้วย block id สำเร็จ'
);

-- 5) ผู้ใช้ทั่วไปเรียก RPC ของ moderator ไม่ได้
select throws_ok(
  $$ select public.mod_list_reports() $$,
  '42501', 'forbidden',
  'ผู้ใช้ทั่วไปเรียก mod_list_reports ไม่ได้'
);
select throws_ok(
  $$ select public.mod_take_action('22222222-2222-2222-2222-222222222222', 'ban', 3::smallint, 'scam') $$,
  '42501', 'forbidden',
  'ผู้ใช้ทั่วไปสั่งแบนคนอื่นไม่ได้'
);

-- 6) Moderator ตรวจรายงาน + เปิดดูตัวตนผู้โพสต์ (บันทึก audit log) + สั่งระงับบัญชี
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "app_metadata": {"role": "moderator"}}';

select is(
  json_array_length(public.mod_list_reports('open', 10)),
  1,
  'moderator ดูรายการรายงานที่เปิดอยู่ได้'
);

-- เปิดดูตัวตนผู้โพสต์ด้วยเหตุผลสั้นเกินไปไม่ได้
select throws_ok(
  $$ select public.mod_reveal_author('post', current_setting('test.post_id')::uuid, 'x') $$,
  '22023', 'invalid_reveal_reason',
  'mod_reveal_author ต้องระบุเหตุผลอย่างน้อย 3 ตัวอักษร'
);

select is(
  (select public.mod_reveal_author('post', current_setting('test.post_id')::uuid, 'ตรวจสอบรายงานระดับ 3') ->> 'user_id'),
  '22222222-2222-2222-2222-222222222222',
  'moderator เปิดดูตัวตนผู้โพสต์เมื่อมีเหตุผลได้'
);

reset role;
select is(
  (select count(*)::int from private.identity_reveals_log where revealed_user_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'ทุกครั้งที่ moderator เปิดดูตัวตน ต้องถูกบันทึกใน private.identity_reveals_log'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "app_metadata": {"role": "moderator"}}';

-- suspend โดยไม่ใส่วันหมดอายุไม่ได้
select throws_ok(
  $$ select public.mod_take_action('22222222-2222-2222-2222-222222222222', 'suspend', 2::smallint, 'ทำผิดซ้ำ') $$,
  '22023', 'invalid_suspend_until',
  'สั่ง suspend ต้องระบุเวลา until ในอนาคต'
);

-- สั่งระงับชั่วคราวพร้อมผูกกับ report
do $$
declare
  v_res json;
begin
  v_res := public.mod_take_action(
    '22222222-2222-2222-2222-222222222222',
    'suspend',
    2::smallint,
    'คุกคามผู้อื่นใน Space',
    now() + interval '7 days',
    (public.mod_list_reports('open', 10) -> 0 ->> 'id')::uuid,
    'post',
    current_setting('test.post_id')::uuid
  );
  perform set_config('test.action_id', v_res ->> 'action_id', true);
  perform set_config('test.action_state', v_res ->> 'state', true);
end $$;

select is(
  current_setting('test.action_state'),
  'suspended',
  'moderator สั่งระงับชั่วคราวสำเร็จ'
);

-- 7) ผู้ใช้ที่ถูกระงับ (demo2) ดูประวัติการลงโทษและยื่นอุทธรณ์ได้
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  public.get_my_status() ->> 'next_step',
  'restricted',
  'demo2 ถูกระงับ → get_my_status().next_step = restricted'
);

select is(
  json_array_length(public.get_my_moderation_history()),
  1,
  'demo2 ดูประวัติการลงโทษของตัวเองได้แม้ถูกระงับอยู่'
);

select lives_ok(
  $$
    select public.submit_appeal(
      (select (public.get_my_moderation_history() -> 0 ->> 'id')::uuid),
      'ขออภัยครับ เข้าใจผิดกัน ขอโอกาสอีกครั้ง'
    )
  $$,
  'demo2 ยื่นอุทธรณ์ได้ภายใน 14 วัน'
);

select throws_ok(
  $$
    select public.submit_appeal(
      (select (public.get_my_moderation_history() -> 0 ->> 'id')::uuid),
      'ส่งซ้ำ'
    )
  $$,
  '22023', 'appeal_already_submitted',
  'ยื่นอุทธรณ์ซ้ำในรายการเดิมไม่ได้'
);

-- 8) กฎ POLICY.md หัวข้อ 5: moderator คนเดิมที่สั่งลงโทษ ห้ามเป็นคนตรวจอุทธรณ์เอง!
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "app_metadata": {"role": "moderator"}}';
select throws_ok(
  $$
    select public.mod_review_appeal(
      current_setting('test.action_id')::uuid,
      'accepted'
    )
  $$,
  '42501', 'same_moderator_cannot_review_appeal',
  'moderator คนเดียวกับที่สั่งลงโทษ ตรวจอุทธรณ์ของเคสตัวเองไม่ได้'
);

-- Moderator คนที่สอง (demo3 ที่ได้รับสิทธิ์ moderator) ตรวจอุทธรณ์และอนุมัติได้ → ปลดระงับอัตโนมัติ
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "app_metadata": {"role": "moderator"}}';
select lives_ok(
  $$
    select public.mod_review_appeal(
      current_setting('test.action_id')::uuid,
      'accepted'
    )
  $$,
  'moderator อีกคนอนุมัติคำอุทธรณ์ได้'
);

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is(
  public.get_my_status() ->> 'state',
  'active',
  'เมื่อคำอุทธรณ์ผ่าน สถานะของ demo2 กลับมาเป็น active ทันที'
);

-- ทดสอบเข้าตารางตรงไม่ได้
select throws_ok('select * from private.blocks', '42501', null, 'อ่าน private.blocks ตรงไม่ได้');

select * from finish();
rollback;
