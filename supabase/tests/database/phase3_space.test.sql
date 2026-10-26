-- ทดสอบเฟส 3 (Space): โพสต์ไม่ระบุตัวตน, กรองข้อมูลติดต่อ, ห้ามมี user_id/author_id หลุดใน JSON, ถูกใจ, ตอบกลับ, บล็อกแล้วไม่เห็นกัน
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- 1) ผู้ใช้ที่ยังไม่ยืนยัน selfie (demo3) โพสต์ไม่ได้
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select throws_ok(
  $$ select public.create_post('สวัสดี') $$,
  '42501', 'verification_required',
  'ยังไม่ยืนยันตัวตน → โพสต์ใน Space ไม่ได้'
);

-- 2) ผู้ใช้ที่ยืนยัน selfie แล้ว (demo) โพสต์ได้ แต่ห้ามใส่เบอร์โทร / ลิงก์ / LINE ID / IG
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select throws_ok(
  $$ select public.create_post('ทักมาที่เบอร์ 081-234-5678 ได้เลย') $$,
  '22023', 'contains_prohibited_contact',
  'ห้ามโพสต์เบอร์โทรใน Space'
);

select throws_ok(
  $$ select public.create_post('แอดไลน์มาคุยกัน line id: mysecret') $$,
  '22023', 'contains_prohibited_contact',
  'ห้ามโพสต์ LINE ID ใน Space'
);

select throws_ok(
  $$ select public.create_post('ดูเว็บนี้ https://example.com') $$,
  '22023', 'contains_prohibited_contact',
  'ห้ามโพสต์ลิงก์ใน Space'
);

-- 3) โพสต์ปกติสำเร็จ และ JSON ที่คืนมาต้องไม่มี author_id หรือ user_id เด็ดขาด
select lives_ok(
  $$ select set_config('test.space_post_id', public.create_post('เลิกงานกลับห้องคนเดียว เงียบจนได้ยินเสียงตู้เย็น', 'lonely') ->> 'id', true) $$,
  'demo สร้างโพสต์ใน Space สำเร็จ'
);

select is(
  (
    select (p::jsonb ? 'author_id') or (p::jsonb ? 'user_id')
    from public.get_feed('all') as f,
         json_array_elements(f) as p
    limit 1
  ),
  false,
  'get_feed ไม่เคยส่ง author_id หรือ user_id ออกมาให้ client'
);

select is(
  (select (public.get_feed('all') -> 0 ->> 'is_mine')::boolean),
  true,
  'เจ้าของโพสต์เห็น is_mine = true'
);

-- 4) สลับเป็น demo2: เห็นโพสต์ของ demo โดย is_mine = false, กดถูกใจ + ตอบกลับได้
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select (public.get_feed('all') -> 0 ->> 'is_mine')::boolean),
  false,
  'คนอื่นเห็นโพสต์เดียวกันโดย is_mine = false'
);

do $$
declare
  v_post_id uuid;
begin
  select (public.get_feed('all') -> 0 ->> 'id')::uuid into v_post_id;
  perform public.like_post(v_post_id);
  perform public.reply_post(v_post_id, 'เข้าใจเลย ห้องเราก็เงียบเหมือนกัน');
end $$;

select is(
  (
    select json_build_object(
      'likes', (public.get_feed('all') -> 0 ->> 'like_count')::int,
      'replies', (public.get_feed('all') -> 0 ->> 'reply_count')::int,
      'liked_by_me', (public.get_feed('all') -> 0 ->> 'liked_by_me')::boolean
    )::text
  ),
  '{"likes" : 1, "replies" : 1, "liked_by_me" : true}',
  'กดถูกใจและตอบกลับ → trigger อัปเดต like_count = 1, reply_count = 1 ทันที'
);

-- ตอบกลับใส่เบอร์โทรไม่ได้
select throws_ok(
  $$ select public.reply_post((select (public.get_feed('all') -> 0 ->> 'id')::uuid), 'โทรมา 0891234567') $$,
  '22023', 'contains_prohibited_contact',
  'ห้ามใส่เบอร์โทรในคอมเมนต์ Space'
);

-- 5) เจ้าของโพสต์ (demo) มาตอบกลับโพสต์ตัวเอง → ได้ป้าย is_op = true และใช้นามแฝงเดียวกับโพสต์
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (
    select (public.reply_post((public.get_feed('all') -> 0 ->> 'id')::uuid, 'ขอบคุณที่แวะมาคุยนะ') ->> 'is_op')::boolean
  ),
  true,
  'เจ้าของโพสต์ตอบกลับโพสต์ตัวเอง → is_op = true'
);

select is(
  (
    select bool_or((r::jsonb ? 'author_id') or (r::jsonb ? 'user_id'))
    from json_array_elements(public.get_replies((public.get_feed('all') -> 0 ->> 'id')::uuid)) as r
  ),
  false,
  'get_replies ไม่มี author_id หรือ user_id ในทุกแถว'
);

-- 6) แท็บ nearby และ same_age
-- demo อยู่ย่าน ari (อายุ 25 → 22-25), demo2 อยู่ย่าน siam (อายุ 21 → 18-21)
select is(
  json_array_length(public.get_feed('nearby')),
  1,
  'demo เห็นโพสต์ย่าน ari ของตัวเองในแท็บ nearby'
);

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is(
  json_array_length(public.get_feed('nearby')),
  0,
  'demo2 (อยู่ siam) ไม่เห็นโพสต์ย่าน ari ในแท็บ nearby'
);
select is(
  json_array_length(public.get_feed('same_age')),
  0,
  'demo2 (ช่วงอายุ 18-21) ไม่เห็นโพสต์ช่วงอายุ 22-25 ในแท็บ same_age'
);

-- 7) เช็กอินอารมณ์ประจำวัน
select is(
  public.checkin_mood('calm') ->> 'mood',
  'calm',
  'เช็กอินอารมณ์ประจำวันสำเร็จ'
);

-- 8) เมื่อ demo2 บล็อกโพสต์นั้น → โพสต์หายไปจาก feed ของ demo2 ทันที
do $$
declare
  v_post_id uuid;
begin
  select (public.get_feed('all') -> 0 ->> 'id')::uuid into v_post_id;
  perform public.block_user_from('post', v_post_id);
end $$;

select is(
  json_array_length(public.get_feed('all')),
  0,
  'หลังบล็อกเจ้าของโพสต์ → ไม่เห็นโพสต์ของกันและกันใน Space อีก'
);

-- 9) ลบโพสต์ของคนอื่นไม่ได้ แต่เจ้าของลบของตัวเองได้
select throws_ok(
  $$ select public.delete_my_post(current_setting('test.space_post_id')::uuid) $$,
  '22023', 'post_not_found',
  'ลบโพสต์ของคนอื่นไม่ได้'
);

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok(
  $$ select public.delete_my_post(current_setting('test.space_post_id')::uuid) $$,
  'เจ้าของลบโพสต์ของตัวเองได้'
);

select throws_ok('select * from private.posts', '42501', null, 'อ่าน private.posts ตรงไม่ได้');

-- 10) ระบบ #Hashtag + Trending + Hot Feed (สไตล์ X)
select is(
  (
    select (
      public.create_post(
        'คืนนี้ฝนตก #เหงาๆ อยากหาเพื่อนคุย #Dek69 #เหงาๆ #แท็ก3 #แท็ก4 #แท็ก5 #แท็ก6เกินลิมิต',
        'anxious'
      ) -> 'hashtags'
    )::jsonb
  ),
  '["เหงาๆ", "dek69", "แท็ก3", "แท็ก4", "แท็ก5"]'::jsonb,
  'create_post สกัด #แท็ก ไทย/อังกฤษ แปลงตัวพิมพ์เล็ก ลบซ้ำ และจำกัดสูงสุด 5 แท็ก'
);

select is(
  json_array_length(public.get_feed('all', null, null, 20, '#เหงาๆ', 'latest')),
  1,
  'get_feed กรองตาม #เหงาๆ ได้ถูกต้อง (ส่งทั้งมี # หรือไม่มี # ก็ได้)'
);

select is(
  json_array_length(public.get_feed('all', null, null, 20, 'ไม่มีแท็กนี้แน่นอน', 'latest')),
  0,
  'get_feed กรองแท็กที่ไม่มีโพสต์ คืนรายการว่าง'
);

select is(
  (
    select (t ->> 'post_count')::int
    from json_array_elements(public.get_trending_hashtags(24, 10)) as t
    where t ->> 'tag' = 'เหงาๆ'
  ),
  1,
  'get_trending_hashtags นับจำนวนโพสต์ของ #เหงาๆ ในชั่วโมงปัจจุบันทันที'
);

-- สร้างอีกโพสต์แล้วกดถูกใจ เพื่อให้คะแนน Hot สูงกว่าโพสต์แรก
do $$
declare
  v_hot_id uuid;
begin
  select (public.create_post('โพสต์มาแรง #เหงาๆ คนคุยกันเยอะ', 'excited') ->> 'id')::uuid into v_hot_id;
  perform public.like_post(v_hot_id);
  perform set_config('test.hot_post_id', v_hot_id::text, true);
end $$;

select is(
  (public.get_feed('all', null, null, 20, 'เหงาๆ', 'hot') -> 0 ->> 'id'),
  current_setting('test.hot_post_id'),
  'get_feed แบบ p_sort = hot เรียงโพสต์ที่มี engagement สูงขึ้นก่อน'
);

select throws_ok(
  $$ select public.get_feed('all', null, null, 20, 'invalid tag with spaces!', 'latest') $$,
  '22023', 'invalid_hashtag',
  'get_feed ปฏิเสธชื่อ hashtag ที่ผิดรูปแบบ'
);

select throws_ok(
  'select * from private.hashtag_hourly_stats',
  '42501', null,
  'อ่าน private.hashtag_hourly_stats ตรงไม่ได้'
);

select * from finish();
rollback;
