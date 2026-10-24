-- =============================================================================
-- Security baseline — "รั้วกลาง" ที่ทุก migration หลังจากนี้ได้ไปฟรีๆ
-- ดู docs/SYSTEM_DESIGN.md หัวข้อ 4 และ docs/DATABASE.md หัวข้อ 3
--
-- ปัญหาเดิม: Supabase ตั้ง default privileges ให้ทุก function / table ใหม่ใน public
-- ถูก grant ให้ anon + authenticated อัตโนมัติ → ลืม revoke ครั้งเดียว = คนที่ไม่ได้ login เรียกได้
-- หลัง migration นี้: ของใหม่ "ปิด" เป็นค่าเริ่มต้น ต้อง grant เองทีละตัว
-- (supabase/tests/database/security_invariants.test.sql คอยเช็คว่าไม่มีใครเปิดช่องเพิ่ม)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) ของใหม่ที่ role postgres (คนรัน migration) สร้าง → ไม่ grant ให้ใครอัตโนมัติ
-- ---------------------------------------------------------------------------
-- Postgres ให้ EXECUTE กับ PUBLIC (= ทุก role รวม anon) ทุก function เป็นค่า default ระดับ global
-- การ revoke แบบ "in schema" ลบค่า global นี้ไม่ได้ → ต้อง revoke แบบไม่ระบุ schema
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema private revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema private revoke all on sequences from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) ของที่มีอยู่แล้ว → ปิดทั้งหมด แล้วเปิดเฉพาะที่ตั้งใจ
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;
revoke all on all sequences in schema private from anon, authenticated;
revoke all on schema private from public, anon, authenticated;

-- API สาธารณะที่ตั้งใจเปิดให้ anon (allowlist เดียวกับใน security_invariants.test.sql)
grant execute on function public.health() to anon, authenticated;
grant execute on function public.join_waitlist(text, text, text, text, text[], text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) สถานะบัญชี (ระงับ / แบน) — อ่านใน private.assert_active_user()
-- ---------------------------------------------------------------------------
create table private.user_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state text not null default 'active' check (state in ('active', 'suspended', 'banned')),
  until timestamptz,
  reason text check (char_length(reason) <= 500),
  updated_at timestamptz not null default now()
);
alter table private.user_status enable row level security;

create trigger user_status_set_updated_at
  before update on private.user_status
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) helper functions (ใช้ภายใน RPC เท่านั้น — ไม่ grant ให้ client)
-- ---------------------------------------------------------------------------

-- id ของคนที่เรียก (null ถ้าไม่ได้ login)
create function private.uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select auth.uid();
$$;

-- active / suspended / banned (หมดเวลาระงับแล้ว = active)
create function private.user_state(p_user uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (
      select s.state
      from private.user_status s
      where s.user_id = p_user
        and s.state <> 'active'
        and (s.until is null or s.until > now())
    ),
    'active'
  );
$$;

-- ต้อง login — คืน user id
create function private.assert_signed_in()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;

-- moderator = ตั้งใน app_metadata (แก้ได้เฉพาะ service role / Dashboard ผู้ใช้แก้เองไม่ได้)
create function private.is_moderator()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator', false);
$$;

-- อายุเป็นปีเต็ม (ไม่ส่งวันเกิดออกไปให้คนอื่น ส่งแค่อายุ)
create function private.age_years(p_birthdate date)
returns int
language sql
stable
set search_path = ''
as $$
  select extract(year from age(current_date, p_birthdate))::int;
$$;

comment on table private.user_status is 'สถานะการระงับ/แบนบัญชี — ไม่มีแถว = active';
