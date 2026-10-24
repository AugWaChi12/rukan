-- =============================================================================
-- เฟส 5: Daily Drop + ปัด + Match 1:1 + จบอย่างสุภาพ + ดูการ์ดโปรไฟล์ตามขั้นเปิดรูป
-- ดู docs/SYSTEM_DESIGN.md หัวข้อ 5.4, 6.4, 6.5, 6.6, 8, 9
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) ตารางใน schema private
-- ---------------------------------------------------------------------------

create table private.daily_drops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  drop_date date not null default current_date,
  mode text not null check (mode in ('friend', 'date')),
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  rank smallint not null check (rank between 1 and 10),
  score numeric(6, 2) not null default 0,
  action text check (action is null or action in ('like', 'skip')),
  acted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, drop_date, mode, candidate_id),
  check (user_id <> candidate_id)
);
create index daily_drops_user_date_mode_idx on private.daily_drops (user_id, drop_date, mode, rank);
create index daily_drops_candidate_date_idx on private.daily_drops (candidate_id, drop_date);
alter table private.daily_drops enable row level security;

create table private.swipes (
  swiper_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('friend', 'date')),
  direction text not null check (direction in ('like', 'skip')),
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id, mode),
  check (swiper_id <> target_id)
);
create index swipes_target_mode_idx on private.swipes (target_id, mode, direction);
alter table private.swipes enable row level security;

create table private.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('friend', 'date')),
  source text not null check (source in ('drop', 'bubble_reveal')),
  status text not null default 'active' check (status in ('active', 'expired', 'closed', 'unmatched')),
  expires_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  closed_reason text,
  conversation_id uuid references private.conversations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b, mode)
);
create index matches_user_a_status_idx on private.matches (user_a, status);
create index matches_user_b_status_idx on private.matches (user_b, status);
create index matches_expires_at_idx on private.matches (expires_at) where status = 'active' and expires_at is not null;
alter table private.matches enable row level security;

create trigger matches_set_updated_at
  before update on private.matches
  for each row execute function public.set_updated_at();

alter table private.conversations
  add constraint conversations_match_id_fkey
  foreign key (match_id) references private.matches (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2) Helper functions + Cron maintenance ใน private
-- ---------------------------------------------------------------------------

-- สร้าง Daily Drop สำหรับผู้ใช้ 1 คน + 1 โหมด ในวันที่กำหนด (ถ้ายังไม่มีของวันนั้น)
-- คะแนนตาม SYSTEM_DESIGN.md หัวข้อ 6.4:
--   3.0 * (เขาชอบเรามาก่อนในโหมดนี้)
-- + 1.0 * (จำนวนความสนใจที่ตรงกัน)
-- + 0.5 * (ย่านเดียวกัน)
-- + 0.5 * (active ใน 24 ชม.)
-- + สุ่มเล็กน้อย 0..0.40
create function private.ensure_user_daily_drop(
  p_user_id uuid,
  p_mode text,
  p_date date default current_date
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_my_area text;
  v_my_modes text[];
  v_my_age int;
  v_my_age_min int;
  v_my_age_max int;
  v_inserted int := 0;
begin
  if exists (
    select 1 from private.daily_drops dd
    where dd.user_id = p_user_id and dd.drop_date = p_date and dd.mode = p_mode
  ) then
    return 0;
  end if;

  select
    p.area_id,
    p.modes,
    private.age_years(pp.birthdate),
    coalesce(pp.age_min, 18),
    coalesce(pp.age_max, 35)
  into v_my_area, v_my_modes, v_my_age, v_my_age_min, v_my_age_max
  from public.profiles p
  join private.profile_private pp on pp.user_id = p.id
  where p.id = p_user_id;

  if v_my_modes is null or not (p_mode = any (v_my_modes)) then
    return 0;
  end if;

  with candidates as (
    select
      c.id as candidate_id,
      round(
        (
          case when exists (
            select 1 from private.swipes s
            where s.swiper_id = c.id and s.target_id = p_user_id and s.mode = p_mode and s.direction = 'like'
          ) then 3.0 else 0.0 end
          + (
            select count(*)::numeric
            from public.profile_interests pi1
            join public.profile_interests pi2 on pi2.interest_id = pi1.interest_id
            where pi1.user_id = p_user_id and pi2.user_id = c.id
          )
          + case when v_my_area is not null and c.area_id = v_my_area then 0.5 else 0.0 end
          + case when c.last_active_at >= now() - interval '24 hours' then 0.5 else 0.0 end
          + (random() * 0.4)::numeric
        ),
        2
      ) as score
    from public.profiles c
    join private.profile_private cpp on cpp.user_id = c.id
    where c.id <> p_user_id
      and c.verification_level = 'selfie'
      and private.user_state(c.id) = 'active'
      and p_mode = any (c.modes)
      and not private.is_blocked(p_user_id, c.id)
      and not exists (
        select 1 from private.swipes s
        where s.swiper_id = p_user_id and s.target_id = c.id and s.mode = p_mode
      )
      and not exists (
        select 1 from private.matches m
        where m.user_a = least(p_user_id, c.id)
          and m.user_b = greatest(p_user_id, c.id)
          and m.mode = p_mode
      )
      and (
        cpp.birthdate is null
        or private.age_years(cpp.birthdate) between v_my_age_min and v_my_age_max
      )
      and (
        v_my_age is null
        or v_my_age between coalesce(cpp.age_min, 18) and coalesce(cpp.age_max, 35)
      )
      -- จำกัดไม่ให้คนหนึ่งไปโผล่ใน Drop ของคนอื่นเกิน 25 ครั้งต่อวัน (กันคนดังกิน match หมด)
      and (
        select count(*) from private.daily_drops d2
        where d2.candidate_id = c.id and d2.drop_date = p_date
      ) < 25
    order by score desc, c.id asc
    limit 5
  ),
  ranked as (
    select
      candidate_id,
      score,
      row_number() over (order by score desc, candidate_id asc)::smallint as rank
    from candidates
  )
  insert into private.daily_drops (user_id, drop_date, mode, candidate_id, rank, score)
  select p_user_id, p_date, p_mode, candidate_id, rank, score
  from ranked
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- งานรอบ 18:50 เวลาไทย (เรียกจาก pg_cron ได้): สร้าง Daily Drop ให้ผู้ใช้ที่ยืนยัน selfie แล้วทุกคน
create function private.generate_daily_drops(p_date date default current_date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_total int := 0;
begin
  for r in
    select p.id as user_id, unnest(p.modes) as mode
    from public.profiles p
    where p.verification_level = 'selfie'
      and private.user_state(p.id) = 'active'
      and p.last_active_at >= now() - interval '14 days'
  loop
    v_total := v_total + private.ensure_user_daily_drop(r.user_id, r.mode, p_date);
  end loop;
  return v_total;
end;
$$;

-- งานหมดอายุ Match ที่เกิน 48 ชม. โดยยังไม่มีข้อความแรก
create function private.expire_stale_matches()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
begin
  with expired as (
    update private.matches m
    set status = 'expired',
        closed_reason = 'expired_48h'
    where m.status = 'active'
      and m.expires_at is not null
      and m.expires_at <= now()
    returning m.conversation_id
  )
  update private.conversations c
  set closed_at = coalesce(c.closed_at, now()),
      closed_reason = coalesce(c.closed_reason, 'expired_48h')
  where c.id in (select conversation_id from expired where conversation_id is not null);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ปิดแชทนามแฝงที่เงียบเกิน 7 วัน (SYSTEM_DESIGN.md หัวข้อ 6.3, 9)
create function private.close_stale_anon_chats()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
begin
  update private.conversations c
  set closed_at = now(),
      closed_reason = 'stale_7d'
  where c.is_anonymous
    and c.closed_at is null
    and coalesce(c.last_message_at, c.created_at) < now() - interval '7 days';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ล้าง rate_events ที่เก่ากว่า 1 วัน
create function private.purge_old_rate_events()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
begin
  delete from private.rate_events where at < now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) RPC สำหรับ Daily Drop + Swipe + Match + Profile Card
-- ---------------------------------------------------------------------------

-- ดูการ์ดใน Daily Drop ของวันนี้ (ถ้ายังไม่มีของวันนี้จะสร้างให้อัตโนมัติ, ยังไม่เห็นรูป: photo_stage = 0)
create function public.get_my_drop(p_mode text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
begin
  if p_mode is null or p_mode not in ('friend', 'date') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;

  perform private.ensure_user_daily_drop(v_uid, p_mode, current_date);

  return coalesce(
    (
      select json_agg(row_to_json(t))
      from (
        select
          dd.candidate_id,
          dd.mode,
          dd.rank,
          dd.action,
          p.display_name,
          private.age_years(pp.birthdate) as age,
          p.bio,
          p.occupation,
          p.area_id,
          p.org_badge,
          coalesce(
            (
              select json_agg(pi.interest_id order by pi.created_at)
              from public.profile_interests pi
              where pi.user_id = p.id
            ),
            '[]'::json
          ) as interests,
          coalesce(
            (
              select json_agg(
                json_build_object('prompt_id', pr.prompt_id, 'answer', pr.answer)
                order by pr.created_at
              )
              from public.profile_prompts pr
              where pr.user_id = p.id
            ),
            '[]'::json
          ) as prompts,
          0 as photo_stage
        from private.daily_drops dd
        join public.profiles p on p.id = dd.candidate_id
        join private.profile_private pp on pp.user_id = p.id
        where dd.user_id = v_uid
          and dd.drop_date = current_date
          and dd.mode = p_mode
          and not private.is_blocked(v_uid, dd.candidate_id)
          and private.user_state(dd.candidate_id) = 'active'
        order by dd.rank asc
      ) t
    ),
    '[]'::json
  );
end;
$$;

-- ปัดการ์ดใน Daily Drop (ปัดได้เฉพาะคนที่มีชื่ออยู่ใน Drop ของตัวเองวันนี้เท่านั้น — กัน bot / scrape)
create function public.swipe(
  p_candidate_id uuid,
  p_mode text,
  p_direction text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_drop private.daily_drops%rowtype;
  v_mutual boolean := false;
  v_pair_a uuid;
  v_pair_b uuid;
  v_conv_id uuid;
  v_match_id uuid;
  v_my_alias text;
  v_my_color text;
  v_peer_alias text;
  v_peer_color text;
begin
  perform private.check_rate('swipe', v_uid::text, 30, interval '1 day');

  if p_mode is null or p_mode not in ('friend', 'date') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;

  if p_direction is null or p_direction not in ('like', 'skip') then
    raise exception 'invalid_swipe_direction' using errcode = '22023';
  end if;

  if p_candidate_id is null or p_candidate_id = v_uid then
    raise exception 'cannot_target_self' using errcode = '22023';
  end if;

  -- ต้องอยู่ใน Daily Drop ของวันนี้เท่านั้น
  select * into v_drop
  from private.daily_drops dd
  where dd.user_id = v_uid
    and dd.drop_date = current_date
    and dd.mode = p_mode
    and dd.candidate_id = p_candidate_id;

  if v_drop.id is null then
    raise exception 'candidate_not_in_drop' using errcode = '42501';
  end if;

  if private.is_blocked(v_uid, p_candidate_id) or private.user_state(p_candidate_id) <> 'active' then
    raise exception 'target_not_found' using errcode = '22023';
  end if;

  insert into private.swipes (swiper_id, target_id, mode, direction)
  values (v_uid, p_candidate_id, p_mode, p_direction)
  on conflict (swiper_id, target_id, mode) do update
    set direction = excluded.direction, created_at = now();

  update private.daily_drops
  set action = p_direction, acted_at = now()
  where id = v_drop.id;

  if p_direction = 'like' then
    select exists (
      select 1 from private.swipes s
      where s.swiper_id = p_candidate_id
        and s.target_id = v_uid
        and s.mode = p_mode
        and s.direction = 'like'
    ) into v_mutual;
  end if;

  if not v_mutual then
    return json_build_object(
      'matched', false,
      'match_id', null,
      'conversation_id', null
    );
  end if;

  v_pair_a := least(v_uid, p_candidate_id);
  v_pair_b := greatest(v_uid, p_candidate_id);

  -- ถ้ามี match เดิมอยู่แล้ว คืนค่าเดิม
  select m.id, m.conversation_id into v_match_id, v_conv_id
  from private.matches m
  where m.user_a = v_pair_a and m.user_b = v_pair_b and m.mode = p_mode;

  if v_match_id is null then
    select a.alias, a.color into v_my_alias, v_my_color from private.aliases a where a.user_id = v_uid;
    select a.alias, a.color into v_peer_alias, v_peer_color from private.aliases a where a.user_id = p_candidate_id;

    insert into private.conversations (
      kind, reveal_stage, is_anonymous
    )
    values ('match', 0, false)
    returning id into v_conv_id;

    insert into private.conversation_members (
      conversation_id, user_id, alias, alias_color, message_count
    )
    values
      (v_conv_id, v_uid, v_my_alias, v_my_color, 0),
      (v_conv_id, p_candidate_id, v_peer_alias, v_peer_color, 0);

    insert into private.matches (
      user_a, user_b, mode, source, status, expires_at, conversation_id
    )
    values (
      v_pair_a, v_pair_b, p_mode, 'drop', 'active', now() + interval '48 hours', v_conv_id
    )
    returning id into v_match_id;

    update private.conversations
    set match_id = v_match_id
    where id = v_conv_id;
  end if;

  return json_build_object(
    'matched', true,
    'match_id', v_match_id,
    'conversation_id', v_conv_id
  );
end;
$$;

-- ดูรายการ Match ของตัวเอง
create function public.get_my_matches()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
begin
  perform private.expire_stale_matches();

  return coalesce(
    (
      select json_agg(row_to_json(t))
      from (
        select
          m.id,
          m.mode,
          m.source,
          m.status,
          m.expires_at,
          m.conversation_id,
          coalesce(c.reveal_stage, 0) as reveal_stage,
          json_build_object(
            'user_id', p.id,
            'display_name', p.display_name,
            'age', private.age_years(pp.birthdate),
            'occupation', p.occupation,
            'area_id', p.area_id,
            'org_badge', p.org_badge
          ) as peer,
          m.created_at
        from private.matches m
        join public.profiles p on p.id = (case when m.user_a = v_uid then m.user_b else m.user_a end)
        join private.profile_private pp on pp.user_id = p.id
        left join private.conversations c on c.id = m.conversation_id
        where (m.user_a = v_uid or m.user_b = v_uid)
          and m.status = 'active'
          and not private.is_blocked(v_uid, p.id)
        order by m.created_at desc
      ) t
    ),
    '[]'::json
  );
end;
$$;

-- ปุ่ม "จบอย่างสุภาพ" (ส่งข้อความอำลาด้วยไมตรีแล้วปิดการสนทนา — SYSTEM_DESIGN.md หัวข้อ 6.6)
create function public.polite_close(
  p_match_id uuid,
  p_template_id text default 'thanks'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_match private.matches%rowtype;
  v_text text;
begin
  v_text := case coalesce(p_template_id, 'thanks')
    when 'thanks' then 'ขอบคุณที่คุยกันนะ ขอให้เจอคนที่เข้ากันได้ดีนะ :)'
    when 'busy' then 'ช่วงนี้ยุ่งมากเลย อาจไม่ค่อยได้เข้ามาคุย ขอบคุณที่ทักกันนะ'
    when 'found_someone' then 'ตอนนี้มีคนที่กำลังคุยอยู่แล้ว ขอบคุณสำหรับบทสนทนาดีๆ นะ'
    when 'take_care' then 'ดีใจที่ได้คุยกันนะ ขอให้ทุกวันเป็นวันที่ดีนะ'
    else null
  end;

  if v_text is null then
    raise exception 'invalid_polite_template' using errcode = '22023';
  end if;

  select * into v_match
  from private.matches m
  where m.id = p_match_id and (m.user_a = v_uid or m.user_b = v_uid);

  if v_match.id is null or v_match.status <> 'active' then
    raise exception 'match_not_found' using errcode = '22023';
  end if;

  if v_match.conversation_id is not null then
    insert into private.messages (conversation_id, sender_id, body, kind)
    values (v_match.conversation_id, v_uid, v_text, 'polite_close');

    update private.conversations
    set closed_at = now(),
        closed_reason = 'polite_close',
        last_message_at = now()
    where id = v_match.conversation_id;
  end if;

  update private.matches
  set status = 'closed',
      closed_by = v_uid,
      closed_reason = 'polite:' || coalesce(p_template_id, 'thanks')
  where id = p_match_id;
end;
$$;

-- ยกเลิก Match แบบเงียบๆ
create function public.unmatch(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_match private.matches%rowtype;
begin
  select * into v_match
  from private.matches m
  where m.id = p_match_id and (m.user_a = v_uid or m.user_b = v_uid);

  if v_match.id is null or v_match.status <> 'active' then
    raise exception 'match_not_found' using errcode = '22023';
  end if;

  if v_match.conversation_id is not null then
    update private.conversations
    set closed_at = now(),
        closed_reason = 'unmatched'
    where id = v_match.conversation_id;
  end if;

  update private.matches
  set status = 'unmatched',
      closed_by = v_uid,
      closed_reason = 'unmatched'
  where id = p_match_id;
end;
$$;

-- ดูการ์ดโปรไฟล์ของผู้ใช้อื่น (เช็คสิทธิ์ว่าต้องอยู่ใน Drop วันนี้ หรือ Match/เปิดตัวกันแล้วเท่านั้น — กัน scrape)
-- และคืนเฉพาะรูปตามจำนวนที่ reveal_stage อนุญาต (0=0 รูป, 1=1 รูป, 2=3 รูป, 3=6 รูป)
create function public.get_profile_card(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_profile public.profiles%rowtype;
  v_birthdate date;
  v_stage smallint := null;
  v_max_position smallint;
begin
  if p_user_id is null or private.is_blocked(v_uid, p_user_id) or private.user_state(p_user_id) <> 'active' then
    raise exception 'profile_not_accessible' using errcode = '42501';
  end if;

  if p_user_id = v_uid then
    v_stage := 3;
  else
    -- 1) มีห้องแชทที่เปิดตัวแล้วร่วมกันไหม?
    select max(c.reveal_stage) into v_stage
    from private.conversations c
    join private.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = v_uid
    join private.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = p_user_id
    where not c.is_anonymous and c.closed_at is null;

    -- 2) ถ้ายังไม่มีแชท ต้องอยู่ใน Daily Drop วันนี้
    if v_stage is null and exists (
      select 1 from private.daily_drops dd
      where dd.user_id = v_uid
        and dd.candidate_id = p_user_id
        and dd.drop_date = current_date
    ) then
      v_stage := 0;
    end if;
  end if;

  if v_stage is null then
    raise exception 'profile_not_accessible' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = p_user_id;
  if v_profile.id is null then
    raise exception 'profile_not_accessible' using errcode = '42501';
  end if;

  select pp.birthdate into v_birthdate from private.profile_private pp where pp.user_id = p_user_id;

  v_max_position := case v_stage
    when 0 then -1
    when 1 then 0
    when 2 then 2
    else 5
  end;

  return json_build_object(
    'id', v_profile.id,
    'display_name', v_profile.display_name,
    'age', case when v_birthdate is null then null else private.age_years(v_birthdate) end,
    'bio', v_profile.bio,
    'occupation', v_profile.occupation,
    'area_id', v_profile.area_id,
    'modes', v_profile.modes,
    'org_badge', v_profile.org_badge,
    'verification_level', v_profile.verification_level,
    'reveal_stage', v_stage,
    'interests', coalesce(
      (
        select json_agg(pi.interest_id order by pi.created_at)
        from public.profile_interests pi
        where pi.user_id = p_user_id
      ),
      '[]'::json
    ),
    'prompts', coalesce(
      (
        select json_agg(
          json_build_object('prompt_id', pr.prompt_id, 'answer', pr.answer)
          order by pr.created_at
        )
        from public.profile_prompts pr
        where pr.user_id = p_user_id
      ),
      '[]'::json
    ),
    'unlocked_photo_paths', coalesce(
      (
        select json_agg(ph.storage_path order by ph.position asc)
        from public.photos ph
        where ph.user_id = p_user_id
          and ph.position <= v_max_position
          and (p_user_id = v_uid or ph.moderation_status <> 'rejected')
      ),
      '[]'::json
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Grant สิทธิ์ให้ authenticated
-- ---------------------------------------------------------------------------
grant execute on function public.get_my_drop(text) to authenticated;
grant execute on function public.swipe(uuid, text, text) to authenticated;
grant execute on function public.get_my_matches() to authenticated;
grant execute on function public.polite_close(uuid, text) to authenticated;
grant execute on function public.unmatch(uuid) to authenticated;
grant execute on function public.get_profile_card(uuid) to authenticated;
