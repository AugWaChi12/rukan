-- =============================================================================
-- Waitlist ของเว็บโปรโมท (rukan.app) — ดู docs/WEBSITE.md หัวข้อ 4
--
-- ใช้รูปแบบ "RPC-first + schema private" ตาม docs/SYSTEM_DESIGN.md หัวข้อ 4:
--   ตารางอยู่ใน private (API ไม่เปิด) → เข้าได้ทางเดียวคือ public.join_waitlist()
--   ซึ่งไม่คืนข้อมูลใดๆ (กันคนเช็คว่าอีเมลไหนเคยลงชื่อแล้ว)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- schema private (ครั้งแรก) — ไม่อยู่ใน API exposed schemas ของ Supabase
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- IP ของคนเรียก API (จาก header ที่ Supabase API gateway ส่งมา) — ใช้ทำ rate limit เท่านั้น
create function private.client_ip()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
    'unknown'
  );
$$;

-- บันทึกการกระทำสำหรับ rate limit (ล้างทิ้งได้หลัง 1 วัน)
create table private.rate_events (
  id bigint generated always as identity primary key,
  key text not null,
  action text not null,
  at timestamptz not null default now()
);
create index rate_events_lookup on private.rate_events (action, key, at);
alter table private.rate_events enable row level security;

-- นับว่า key นี้ทำ action นี้ไปกี่ครั้งในช่วงเวลาที่กำหนด ถ้าเกินให้ error, ไม่เกินให้บันทึกเพิ่ม 1 ครั้ง
create function private.check_rate(p_action text, p_key text, p_limit int, p_window interval)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from private.rate_events
    where action = p_action and key = p_key and at > now() - p_window
  ) >= p_limit then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'ลองใหม่ภายหลัง';
  end if;
  insert into private.rate_events (key, action) values (p_key, p_action);
end;
$$;

-- ---------------------------------------------------------------------------
-- ตาราง waitlist
-- ---------------------------------------------------------------------------
create table private.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and email = lower(email)),
  area text not null check (char_length(area) between 1 and 80),
  age_band text check (age_band in ('18-21', '22-25', '26-30', '30+')),
  intents text[] not null default '{}' check (intents <@ array['friend', 'talk', 'date']),
  locale text not null default 'th' check (locale in ('th', 'en')),
  utm jsonb not null default '{}' check (jsonb_typeof(utm) = 'object' and pg_column_size(utm) <= 2048),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.waitlist is 'อีเมลคนที่ลงชื่อรอใช้จากเว็บโปรโมท — ข้อมูลส่วนบุคคลตาม PDPA, ใช้แจ้งข่าวเปิดตัวเท่านั้น';

create trigger waitlist_set_updated_at
  before update on private.waitlist
  for each row execute function public.set_updated_at();

-- RLS เปิดไว้แต่ไม่มี policy = ไม่มีใครอ่าน/เขียนตรงได้ (เผื่อวันหนึ่งมีคนเปิด schema private)
alter table private.waitlist enable row level security;

-- ---------------------------------------------------------------------------
-- RPC: ลงชื่อรอใช้ (anon เรียกได้)
-- ---------------------------------------------------------------------------
create function public.join_waitlist(
  p_email text,
  p_area text,
  p_consent_version text,
  p_age_band text default null,
  p_intents text[] default '{}',
  p_locale text default 'th',
  p_utm jsonb default '{}'
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if p_consent_version is null or trim(p_consent_version) = '' then
    raise exception 'consent_required' using errcode = '22023';
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  -- 10 ครั้ง / ชม. / IP (คนเดียวกรอกผิดแล้วแก้ได้ แต่ bot ยิงรัวไม่ได้)
  perform private.check_rate('waitlist', private.client_ip(), 10, interval '1 hour');

  insert into private.waitlist as w (email, area, age_band, intents, locale, utm, consent_version)
  values (
    v_email,
    trim(p_area),
    p_age_band,
    coalesce(p_intents, '{}'),
    coalesce(p_locale, 'th'),
    coalesce(p_utm, '{}'),
    trim(p_consent_version)
  )
  -- ลงซ้ำ = อัปเดตข้อมูลล่าสุด + ยินยอมใหม่ (ไม่ error เพื่อไม่บอกว่าอีเมลนี้เคยลงแล้ว)
  on conflict (email) do update set
    area = excluded.area,
    age_band = excluded.age_band,
    intents = excluded.intents,
    locale = excluded.locale,
    consent_version = excluded.consent_version,
    consented_at = now(),
    unsubscribed_at = null;

  return json_build_object('ok', true);
end;
$$;

revoke execute on function public.join_waitlist(text, text, text, text, text[], text, jsonb) from public;
grant execute on function public.join_waitlist(text, text, text, text, text[], text, jsonb) to anon, authenticated;

-- helper ใน private ห้าม client เรียก
revoke execute on function private.client_ip() from public, anon, authenticated;
revoke execute on function private.check_rate(text, text, int, interval) from public, anon, authenticated;
