-- ทดสอบ waitlist: anon ลงชื่อได้ผ่าน RPC เท่านั้น, อ่านข้อมูลไม่ได้, validate + rate limit ทำงาน
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.waitlist'::regclass),
  'private.waitlist เปิด RLS อยู่'
);

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------
set local role anon;

select is(
  public.join_waitlist('Mango@Example.com ', 'อารีย์', 'waitlist-2026-10', '22-25', array['friend', 'date'], 'th', '{"utm_source":"ig"}')::text,
  '{"ok" : true}',
  'anon ลงชื่อได้ และได้แค่ {ok: true}'
);

select lives_ok(
  $$ select public.join_waitlist('mango@example.com', 'สีลม', 'waitlist-2026-10') $$,
  'ลงซ้ำด้วยอีเมลเดิมไม่ error (ไม่บอกว่าเคยลงแล้ว)'
);

select throws_ok(
  $$ select public.join_waitlist('not-an-email', 'อารีย์', 'waitlist-2026-10') $$,
  '22023', 'invalid_email',
  'อีเมลผิดรูปแบบ → invalid_email'
);

select throws_ok(
  $$ select public.join_waitlist('a@b.co', 'อารีย์', '') $$,
  '22023', 'consent_required',
  'ไม่ยินยอม → consent_required'
);

select throws_ok(
  $$ select public.join_waitlist('c@d.co', 'อารีย์', 'v1', '99-100') $$,
  '23514', null,
  'ช่วงอายุนอกรายการ → ติด check constraint'
);

select throws_ok(
  'select * from private.waitlist',
  '42501', null,
  'anon อ่าน private.waitlist ไม่ได้'
);

select throws_ok(
  $$ select private.check_rate('x', 'y', 1, interval '1 hour') $$,
  '42501', null,
  'anon เรียก helper ใน private ไม่ได้'
);

-- ---------------------------------------------------------------------------
-- ตรวจข้อมูลที่บันทึก (กลับเป็น postgres)
-- ---------------------------------------------------------------------------
reset role;

select is(
  (select count(*)::int from private.waitlist where email = 'mango@example.com'),
  1,
  'อีเมลถูกเก็บเป็นตัวพิมพ์เล็ก และลงซ้ำไม่เพิ่มแถว'
);

select is(
  (select area from private.waitlist where email = 'mango@example.com'),
  'สีลม',
  'ลงซ้ำ = อัปเดตย่านเป็นค่าล่าสุด'
);

-- ---------------------------------------------------------------------------
-- rate limit: 10 ครั้ง / ชม. / IP (ใน test ไม่มี header → key = 'unknown')
-- ---------------------------------------------------------------------------
-- ก่อนหน้านี้นับไปแล้ว 2 ครั้ง (ลงชื่อ + ลงซ้ำ) — เคสที่ error ไม่ถูกนับเพราะทั้ง call ถูก rollback → อีก 8 = ครบ 10
set local role anon;
select public.join_waitlist('r' || n || '@example.com', 'อารีย์', 'v1') from generate_series(1, 8) as n;

select throws_ok(
  $$ select public.join_waitlist('over@example.com', 'อารีย์', 'v1') $$,
  'P0001', 'rate_limited',
  'เกิน 10 ครั้ง/ชม. → rate_limited'
);

select * from finish();
rollback;
