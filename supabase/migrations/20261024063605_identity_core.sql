-- =============================================================================
-- Identity core (เฟส 1) — โปรไฟล์, ข้อมูลส่วนตัว, การยืนยันตัวตน, นามแฝง, consent, ข้อมูลอ้างอิง
-- ดู docs/SYSTEM_DESIGN.md หัวข้อ 5.2, 6.1, 8 และ docs/POLICY.md
--
-- หลักการ:
--   - เขียนข้อมูลผู้ใช้ผ่าน RPC เท่านั้น (validate + rate limit ที่ server) — client ไม่มีสิทธิ์ insert/update ตารางตรง
--   - profiles: อ่านตรงได้แค่ของตัวเอง (กัน scrape) — คนอื่นจะดูผ่าน RPC ที่เช็คสิทธิ์ในเฟส Match
--   - verification_level / org_badge เปลี่ยนได้เฉพาะ server (trigger / Edge Function)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ข้อมูลอ้างอิง (อ่านได้ทุกคน แก้ผ่าน migration เท่านั้น)
-- ---------------------------------------------------------------------------
create table public.areas (
  id text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  name_th text not null check (char_length(name_th) between 1 and 80),
  name_en text not null check (char_length(name_en) between 1 and 80),
  city text not null default 'bangkok',
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.interests (
  id text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  name_th text not null check (char_length(name_th) between 1 and 40),
  name_en text not null check (char_length(name_en) between 1 and 40),
  category text not null default 'general',
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.prompts (
  id text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  text_th text not null check (char_length(text_th) between 1 and 120),
  text_en text not null check (char_length(text_en) between 1 and 120),
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.areas enable row level security;
alter table public.interests enable row level security;
alter table public.prompts enable row level security;

grant select on public.areas, public.interests, public.prompts to anon, authenticated;

create policy "areas: ทุกคนอ่านรายการที่เปิดใช้" on public.areas
  for select to anon, authenticated using (active);
create policy "interests: ทุกคนอ่านรายการที่เปิดใช้" on public.interests
  for select to anon, authenticated using (active);
create policy "prompts: ทุกคนอ่านรายการที่เปิดใช้" on public.prompts
  for select to anon, authenticated using (active);

-- ค่าเริ่มต้น — ย่านชุดเดียวกับฟอร์ม waitlist บนเว็บ (ยังรอทีมยืนยัน Q17)
insert into public.areas (id, name_th, name_en, sort) values
  ('siam', 'สยาม / ปทุมวัน', 'Siam / Pathum Wan', 10),
  ('ari', 'อารีย์ / พหลโยธิน', 'Ari / Phahon Yothin', 20),
  ('asok', 'อโศก / สุขุมวิท', 'Asok / Sukhumvit', 30),
  ('silom', 'สีลม / สาทร', 'Silom / Sathorn', 40),
  ('bangkhen', 'บางเขน / เกษตร', 'Bang Khen / Kaset', 50),
  ('rangsit', 'รังสิต', 'Rangsit', 60),
  ('salaya', 'ศาลายา', 'Salaya', 70),
  ('bangna', 'บางนา', 'Bang Na', 80);

insert into public.interests (id, name_th, name_en, category, sort) values
  ('cafe', 'คาเฟ่', 'Cafés', 'food', 10),
  ('street_food', 'สตรีทฟู้ด', 'Street food', 'food', 20),
  ('cooking', 'ทำอาหาร', 'Cooking', 'food', 30),
  ('badminton', 'ตีแบด', 'Badminton', 'sport', 40),
  ('running', 'วิ่ง', 'Running', 'sport', 50),
  ('gym', 'ฟิตเนส', 'Gym', 'sport', 60),
  ('board_games', 'บอร์ดเกม', 'Board games', 'play', 70),
  ('gaming', 'เล่นเกม', 'Gaming', 'play', 80),
  ('movies', 'ดูหนัง', 'Movies', 'culture', 90),
  ('music', 'ฟังเพลง / คอนเสิร์ต', 'Music & gigs', 'culture', 100),
  ('books', 'อ่านหนังสือ', 'Books', 'culture', 110),
  ('art', 'งานศิลปะ / มิวเซียม', 'Art & museums', 'culture', 120),
  ('photography', 'ถ่ายรูป', 'Photography', 'culture', 130),
  ('travel', 'เที่ยว', 'Travel', 'outdoor', 140),
  ('pets', 'สัตว์เลี้ยง', 'Pets', 'life', 150),
  ('tech', 'เทค / โค้ด', 'Tech & code', 'life', 160);

insert into public.prompts (id, text_th, text_en, sort) values
  ('perfect_weekend', 'วันหยุดในฝันของฉันคือ…', 'My perfect weekend is…', 10),
  ('go_to_food', 'ร้านที่ไปซ้ำบ่อยที่สุด', 'The place I keep going back to', 20),
  ('small_joy', 'เรื่องเล็กๆ ที่ทำให้ยิ้มได้ทั้งวัน', 'A small thing that makes my day', 30),
  ('learning', 'ตอนนี้กำลังหัด…', 'Lately I''m learning…', 40),
  ('talk_about', 'คุยเรื่องนี้ได้ไม่เบื่อ', 'I could talk for hours about', 50),
  ('green_flag', 'green flag ที่ชอบในคนอื่น', 'A green flag I love', 60);

-- ---------------------------------------------------------------------------
-- profiles (ปรับจากเฟสแรก)
-- ---------------------------------------------------------------------------
create type public.verification_level as enum ('none', 'phone', 'selfie');

alter table public.profiles
  drop column avatar_url,
  add column occupation text check (char_length(occupation) <= 60),
  add column area_id text references public.areas (id),
  add column modes text[] not null default '{}' check (modes <@ array['friend', 'date']::text[]),
  add column org_badge text check (char_length(org_badge) <= 80),
  add column verification_level public.verification_level not null default 'none',
  add column onboarded_at timestamptz,
  add column locale text not null default 'th' check (locale in ('th', 'en')),
  add column theme text not null default 'light' check (theme in ('light', 'gold', 'system')),
  add column last_active_at timestamptz;

create index profiles_area_id on public.profiles (area_id);

comment on column public.profiles.verification_level is 'เปลี่ยนได้เฉพาะ server (trigger ยืนยันเบอร์ / Edge Function liveness)';
comment on column public.profiles.org_badge is 'เปลี่ยนได้เฉพาะ server (Edge Function ยืนยันอีเมลองค์กร)';

-- เดิม: authenticated อ่านทุกแถว + แก้ของตัวเองตรงๆ → ปิดทั้งคู่
drop policy "profiles: ผู้ใช้ที่ login แล้วอ่านได้ทุกโปรไฟล์" on public.profiles;
drop policy "profiles: แก้ได้เฉพาะโปรไฟล์ตัวเอง" on public.profiles;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "profiles: เจ้าของอ่านของตัวเองได้" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
-- ไม่มี policy insert/update/delete: insert = trigger ตอนสมัคร, update = update_my_profile(), delete = cascade จาก auth.users

-- ---------------------------------------------------------------------------
-- ข้อมูลส่วนตัว / ยืนยันตัวตน / นามแฝง / consent — schema private (ไม่มี API)
-- ---------------------------------------------------------------------------
create table private.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birthdate date check (birthdate between date '1900-01-01' and current_date),
  -- โหมดเดท: ยังไม่ตัดสินใจตัวเลือก (Q16) — ยังไม่มี RPC ที่เขียนคอลัมน์นี้
  gender text check (char_length(gender) <= 30),
  interested_in text[],
  age_min int not null default 18 check (age_min between 18 and 99),
  age_max int not null default 35 check (age_max between 18 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (age_min <= age_max)
);

create table private.verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone_verified_at timestamptz,
  liveness_status text not null default 'none' check (liveness_status in ('none', 'pending', 'passed', 'failed')),
  liveness_passed_at timestamptz,
  liveness_vendor_ref text,
  -- ไม่เก็บ face hash จนกว่าจะได้คำตอบเรื่อง PDPA (Q15)
  org_type text check (org_type in ('university', 'company')),
  org_domain text check (char_length(org_domain) <= 253),
  org_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.aliases (
  user_id uuid primary key references auth.users (id) on delete cascade,
  alias text not null unique check (char_length(alias) between 2 and 40),
  color text not null check (color in ('rose', 'lilac', 'sage', 'sky', 'peach', 'sand')),
  changed_at timestamptz not null default now()
);

create table private.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  doc text not null check (doc in ('terms', 'privacy', 'rules', 'biometric', 'location')),
  version text not null check (char_length(version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  unique (user_id, doc, version)
);

alter table private.profile_private enable row level security;
alter table private.verifications enable row level security;
alter table private.aliases enable row level security;
alter table private.consents enable row level security;

create trigger profile_private_set_updated_at before update on private.profile_private
  for each row execute function public.set_updated_at();
create trigger verifications_set_updated_at before update on private.verifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ความสนใจ + คำถามในโปรไฟล์ (อ่านตรงได้แค่ของตัวเอง เขียนผ่าน RPC)
-- ---------------------------------------------------------------------------
create table public.profile_interests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  interest_id text not null references public.interests (id),
  created_at timestamptz not null default now(),
  primary key (user_id, interest_id)
);

create table public.profile_prompts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt_id text not null references public.prompts (id),
  answer text not null check (char_length(answer) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, prompt_id)
);

alter table public.profile_interests enable row level security;
alter table public.profile_prompts enable row level security;
grant select on public.profile_interests, public.profile_prompts to authenticated;

create policy "profile_interests: เจ้าของอ่านของตัวเอง" on public.profile_interests
  for select to authenticated using (user_id = (select auth.uid()));
create policy "profile_prompts: เจ้าของอ่านของตัวเอง" on public.profile_prompts
  for select to authenticated using (user_id = (select auth.uid()));

create trigger profile_prompts_set_updated_at before update on public.profile_prompts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

-- เวอร์ชันปัจจุบันของเอกสารที่ผู้ใช้ต้องยอมรับ (ต้องตรงกับ CONSENT_VERSIONS ใน packages/shared)
create function private.current_consent_version(p_doc text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_doc
    when 'terms' then 'v1'
    when 'privacy' then 'v1'
    when 'rules' then 'v1'
    when 'biometric' then 'v1'
    when 'location' then 'v1'
  end;
$$;

-- ยอมรับเอกสารเวอร์ชันปัจจุบันแล้วและยังไม่ถอน
create function private.has_consent(p_user uuid, p_doc text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from private.consents c
    where c.user_id = p_user
      and c.doc = p_doc
      and c.version = private.current_consent_version(p_doc)
      and c.withdrawn_at is null
  );
$$;

-- นามแฝงใน Space: คำนาม + คำขยาย (เช่น "ส้มโอขี้เซา") ถ้าชนกันเติมตัวเลข
create function private.generate_alias()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_nouns text[] := array['ส้มโอ', 'กาแฟเย็น', 'ชาไทย', 'มะม่วง', 'ขนมปัง', 'เมฆ', 'ดาว', 'จันทร์', 'ลมเย็น', 'ทะเล',
                          'แมวส้ม', 'นกฮูก', 'กระต่าย', 'แพนด้า', 'เพนกวิน', 'ต้นกล้า', 'ใบไม้', 'ดอกไม้', 'ฝนพรำ', 'หมอก',
                          'โมจิ', 'บิงซู', 'ทองหยอด', 'ลูกชุบ', 'มัทฉะ', 'โกโก้', 'น้ำผึ้ง', 'ส้มจี๊ด', 'ลำไย', 'ขนุน'];
  v_adjs text[] := array['ขี้เซา', 'ใจดี', 'อารมณ์ดี', 'ช่างฝัน', 'ขี้อาย', 'ร่าเริง', 'สายชิล', 'นอนดึก', 'ตื่นเช้า', 'ขี้สงสัย',
                         'ใจเย็น', 'ยิ้มง่าย', 'สายกิน', 'สายเที่ยว', 'สายอ่าน', 'เงียบๆ', 'ขี้เล่น', 'อบอุ่น', 'ลอยๆ', 'สดใส'];
  v_alias text;
begin
  for i in 1..20 loop
    v_alias := v_nouns[1 + floor(random() * array_length(v_nouns, 1))::int]
            || v_adjs[1 + floor(random() * array_length(v_adjs, 1))::int];
    if i > 5 then
      v_alias := v_alias || (10 + floor(random() * 990)::int)::text;
    end if;
    if not exists (select 1 from private.aliases a where a.alias = v_alias) then
      return v_alias;
    end if;
  end loop;
  raise exception 'alias_generation_failed';
end;
$$;

-- ต้อง login + บัญชีไม่ถูกระงับ + ยืนยันตัวตนถึงระดับที่กำหนด — คืน user id
create function private.assert_active_user(p_min_level public.verification_level default 'selfie')
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_signed_in();
  v_level public.verification_level;
begin
  if private.user_state(v_uid) <> 'active' then
    raise exception 'account_restricted' using errcode = '42501';
  end if;
  select p.verification_level into v_level from public.profiles p where p.id = v_uid;
  if v_level is null or v_level < p_min_level then
    raise exception 'verification_required' using errcode = '42501', detail = p_min_level::text;
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- trigger ตอนสมัคร: สร้างทุกแถวที่ผู้ใช้ต้องมีในครั้งเดียว (แทนของเฟสแรก)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'user'
      ),
      50
    )
  );
  insert into private.profile_private (user_id) values (new.id);
  insert into private.verifications (user_id) values (new.id);
  insert into private.aliases (user_id, alias, color)
  values (
    new.id,
    private.generate_alias(),
    (array['rose', 'lilac', 'sage', 'sky', 'peach', 'sand'])[1 + floor(random() * 6)::int]
  );
  return new;
end;
$$;

-- ยืนยันเบอร์ผ่าน Supabase Auth (updateUser({ phone }) + verifyOtp) → ระดับ 'phone'
create function private.handle_phone_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phone_confirmed_at is not null
     and (tg_op = 'INSERT' or old.phone_confirmed_at is null) then
    update private.verifications
      set phone_verified_at = new.phone_confirmed_at
      where user_id = new.id;
    update public.profiles
      set verification_level = 'phone'
      where id = new.id and verification_level = 'none';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_phone_confirmed
  after insert or update of phone_confirmed_at on auth.users
  for each row execute function private.handle_phone_confirmed();

-- Edge Function (liveness webhook) จะเรียกตัวนี้หลังผู้ให้บริการยืนยันผ่าน — ยังไม่ grant ใคร (รอ Q14)
create function private.mark_liveness_passed(p_user uuid, p_vendor_ref text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_consent(p_user, 'biometric') then
    raise exception 'consent_required' using errcode = '22023', detail = 'biometric';
  end if;
  update private.verifications
    set liveness_status = 'passed', liveness_passed_at = now(), liveness_vendor_ref = p_vendor_ref
    where user_id = p_user;
  update public.profiles
    set verification_level = 'selfie'
    where id = p_user and verification_level = 'phone';
  if not found then
    raise exception 'phone_required' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC (API ของแอป) — ทุกตัว security definer, เช็คสิทธิ์ก่อนทำอะไร
-- ---------------------------------------------------------------------------

-- สถานะของฉัน + ขั้นต่อไปที่ต้องทำ (แอปใช้ตัดสินว่าจะพาไปหน้าไหน)
create function public.get_my_status()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_signed_in();
  v_state text := private.user_state(v_uid);
  v_profile public.profiles;
  v_missing text[];
  v_next text;
begin
  select * into v_profile from public.profiles p where p.id = v_uid;

  select coalesce(array_agg(d), '{}') into v_missing
  from unnest(array['terms', 'privacy', 'rules']) as d
  where not private.has_consent(v_uid, d);

  v_next := case
    when v_state <> 'active' then 'restricted'
    when cardinality(v_missing) > 0 then 'consents'
    when v_profile.verification_level = 'none' then 'phone'
    when v_profile.onboarded_at is null then 'profile'
    when v_profile.verification_level < 'selfie' then 'selfie'
    else 'done'
  end;

  return json_build_object(
    'user_id', v_uid,
    'state', v_state,
    'verification_level', v_profile.verification_level,
    'onboarded', v_profile.onboarded_at is not null,
    'missing_consents', v_missing,
    'next_step', v_next
  );
end;
$$;

-- โปรไฟล์ของฉันทั้งหมด (รวมข้อมูลส่วนตัวที่เห็นได้แค่ตัวเอง)
create function public.get_my_profile()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_signed_in();
  v_result json;
begin
  select json_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'bio', p.bio,
    'occupation', p.occupation,
    'area_id', p.area_id,
    'modes', p.modes,
    'org_badge', p.org_badge,
    'verification_level', p.verification_level,
    'locale', p.locale,
    'theme', p.theme,
    'onboarded_at', p.onboarded_at,
    'birthdate', pp.birthdate,
    'age', case when pp.birthdate is null then null else private.age_years(pp.birthdate) end,
    'alias', a.alias,
    'alias_color', a.color,
    'interests', coalesce(
      (select json_agg(pi.interest_id order by pi.created_at) from public.profile_interests pi where pi.user_id = p.id),
      '[]'::json
    ),
    'prompts', coalesce(
      (
        select json_agg(json_build_object('prompt_id', pr.prompt_id, 'answer', pr.answer) order by pr.created_at)
        from public.profile_prompts pr where pr.user_id = p.id
      ),
      '[]'::json
    )
  )
  into v_result
  from public.profiles p
  join private.profile_private pp on pp.user_id = p.id
  join private.aliases a on a.user_id = p.id
  where p.id = v_uid;

  return v_result;
end;
$$;

-- แก้โปรไฟล์ — null = ไม่เปลี่ยน, '' = ล้างค่า (เฉพาะ bio / occupation / area)
create function public.update_my_profile(
  p_display_name text default null,
  p_bio text default null,
  p_occupation text default null,
  p_area_id text default null,
  p_modes text[] default null,
  p_locale text default null,
  p_theme text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('none');
begin
  perform private.check_rate('update_profile', v_uid::text, 30, interval '1 hour');

  if p_display_name is not null and char_length(trim(p_display_name)) = 0 then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;
  if p_modes is not null and cardinality(p_modes) = 0 then
    raise exception 'modes_required' using errcode = '22023';
  end if;
  if nullif(p_area_id, '') is not null
     and not exists (select 1 from public.areas a where a.id = p_area_id and a.active) then
    raise exception 'invalid_area' using errcode = '22023';
  end if;

  update public.profiles set
    display_name = coalesce(trim(p_display_name), display_name),
    bio = case when p_bio is null then bio else nullif(trim(p_bio), '') end,
    occupation = case when p_occupation is null then occupation else nullif(trim(p_occupation), '') end,
    area_id = case when p_area_id is null then area_id else nullif(p_area_id, '') end,
    modes = coalesce(p_modes, modes),
    locale = coalesce(p_locale, locale),
    theme = coalesce(p_theme, theme)
  where id = v_uid;
end;
$$;

-- ขั้น "ข้อมูลพื้นฐาน" ของ onboarding (ต้องยืนยันเบอร์ก่อน) — ตั้งวันเกิดได้ครั้งเดียว
create function public.complete_onboarding(
  p_display_name text,
  p_birthdate date,
  p_modes text[],
  p_area_id text default null,
  p_occupation text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_existing date;
begin
  perform private.check_rate('complete_onboarding', v_uid::text, 10, interval '1 hour');

  if p_birthdate is null or private.age_years(p_birthdate) < 18 then
    raise exception 'underage' using errcode = '22023';
  end if;
  if private.age_years(p_birthdate) > 100 then
    raise exception 'invalid_birthdate' using errcode = '22023';
  end if;

  select pp.birthdate into v_existing from private.profile_private pp where pp.user_id = v_uid;
  if v_existing is not null and v_existing <> p_birthdate then
    raise exception 'birthdate_locked' using errcode = '22023';
  end if;

  update private.profile_private set birthdate = p_birthdate where user_id = v_uid;

  perform public.update_my_profile(
    p_display_name => p_display_name,
    p_modes => coalesce(p_modes, '{}'),
    p_area_id => p_area_id,
    p_occupation => p_occupation
  );

  update public.profiles set onboarded_at = coalesce(onboarded_at, now()) where id = v_uid;
end;
$$;

-- ยอมรับเอกสาร (ต้องเป็นเวอร์ชันปัจจุบันเท่านั้น)
create function public.record_consent(p_doc text, p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('none');
begin
  if private.current_consent_version(p_doc) is null or p_version is distinct from private.current_consent_version(p_doc) then
    raise exception 'invalid_consent_version' using errcode = '22023';
  end if;
  insert into private.consents (user_id, doc, version)
  values (v_uid, p_doc, p_version)
  on conflict (user_id, doc, version) do update set withdrawn_at = null;
end;
$$;

-- ตั้งความสนใจทั้งชุด (สูงสุด 10)
create function public.set_interests(p_interest_ids text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_ids text[] := array(select distinct unnest(coalesce(p_interest_ids, '{}')));
begin
  perform private.check_rate('set_interests', v_uid::text, 30, interval '1 hour');
  if cardinality(v_ids) > 10 then
    raise exception 'too_many_interests' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_ids) as x(id)
    where not exists (select 1 from public.interests i where i.id = x.id and i.active)
  ) then
    raise exception 'invalid_interest' using errcode = '22023';
  end if;

  delete from public.profile_interests where user_id = v_uid and interest_id <> all (v_ids);
  insert into public.profile_interests (user_id, interest_id)
  select v_uid, x from unnest(v_ids) as x
  on conflict do nothing;
end;
$$;

-- ตอบ / แก้ / ลบ (answer ว่าง) คำถามในโปรไฟล์ (สูงสุด 3 ข้อ)
create function public.set_prompt_answer(p_prompt_id text, p_answer text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_answer text := nullif(trim(p_answer), '');
begin
  perform private.check_rate('set_prompt_answer', v_uid::text, 60, interval '1 hour');

  if v_answer is null then
    delete from public.profile_prompts where user_id = v_uid and prompt_id = p_prompt_id;
    return;
  end if;
  if not exists (select 1 from public.prompts p where p.id = p_prompt_id and p.active) then
    raise exception 'invalid_prompt' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profile_prompts where user_id = v_uid and prompt_id = p_prompt_id)
     and (select count(*) from public.profile_prompts where user_id = v_uid) >= 3 then
    raise exception 'too_many_prompts' using errcode = '22023';
  end if;

  insert into public.profile_prompts (user_id, prompt_id, answer)
  values (v_uid, p_prompt_id, v_answer)
  on conflict (user_id, prompt_id) do update set answer = excluded.answer;
end;
$$;

-- ---------------------------------------------------------------------------
-- สิทธิ์: เปิดเฉพาะ RPC ที่แอปเรียก ให้ authenticated (ของอื่นปิดอยู่แล้วจาก security_baseline)
-- ---------------------------------------------------------------------------
grant execute on function public.get_my_status() to authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.update_my_profile(text, text, text, text, text[], text, text) to authenticated;
grant execute on function public.complete_onboarding(text, date, text[], text, text) to authenticated;
grant execute on function public.record_consent(text, text) to authenticated;
grant execute on function public.set_interests(text[]) to authenticated;
grant execute on function public.set_prompt_answer(text, text) to authenticated;

-- ผู้ใช้ที่สมัครก่อน migration นี้ (local / seed) → เติมแถวที่ขาด
insert into private.profile_private (user_id) select id from auth.users on conflict do nothing;
insert into private.verifications (user_id) select id from auth.users on conflict do nothing;
insert into private.aliases (user_id, alias, color)
select u.id, private.generate_alias(), 'rose' from auth.users u
where not exists (select 1 from private.aliases a where a.user_id = u.id);
