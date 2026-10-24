-- =============================================================================
-- Swipe deck แทน Daily Drop 19:00 (แทน D59):
--   - ปัดได้ต่อเนื่อง ไม่ผูกเวลา 19:00 และรวมโหมด friend / date เป็นกองเดียว
--   - โควตาต่อรอบ (Free 20 / Gold 40) เริ่มนับตอนปัดใบแรก ครบ swipe_window_hours (6 ชม.) แล้วรีเต็ม
--   - ผู้ใช้ปัดได้เฉพาะคนที่ server แจกเข้า private.swipe_deck (กัน scrape / bot)
-- ดู docs/DECISIONS.md D60
-- =============================================================================

set local check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 1) tier_configs: daily_drop_limit -> swipe_batch_size, เพิ่ม swipe_window_hours, เลิก has_noon_drop
-- ---------------------------------------------------------------------------
alter table private.tier_configs drop constraint if exists tier_configs_daily_drop_limit_check;
alter table private.tier_configs rename column daily_drop_limit to swipe_batch_size;
alter table private.tier_configs
  add constraint tier_configs_swipe_batch_size_check check (swipe_batch_size between 1 and 200);
alter table private.tier_configs
  add column swipe_window_hours int not null default 6
    check (swipe_window_hours between 1 and 48);
alter table private.tier_configs drop column has_noon_drop;

update private.tier_configs set swipe_batch_size = 20 where tier = 'free';
update private.tier_configs set swipe_batch_size = 40 where tier = 'premium';

-- ---------------------------------------------------------------------------
-- 2) ตารางกองการ์ด + หน้าต่างโควตา (RLS เปิด ไม่มี policy = เข้าผ่าน RPC เท่านั้น)
-- ---------------------------------------------------------------------------
create table private.swipe_deck (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  score numeric(6, 2) not null default 0,
  action text check (action is null or action in ('like', 'skip')),
  acted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, candidate_id),
  check (user_id <> candidate_id)
);
create index swipe_deck_pending_idx on private.swipe_deck (user_id, created_at) where action is null;
create index swipe_deck_candidate_idx on private.swipe_deck (candidate_id, created_at);
alter table private.swipe_deck enable row level security;

create table private.swipe_windows (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  window_started_at timestamptz not null,
  used int not null default 0 check (used >= 0)
);
alter table private.swipe_windows enable row level security;

-- ---------------------------------------------------------------------------
-- 3) user_limits / get_tier_configs / mod_update_tier_config / get_my_subscription ใช้คอลัมน์ใหม่
-- ---------------------------------------------------------------------------
drop function private.is_daily_drop_open(uuid);

create or replace function private.user_limits(p_user_id uuid)
returns private.tier_configs
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tier text := private.user_tier(p_user_id);
  v_cfg private.tier_configs%rowtype;
begin
  select * into v_cfg from private.tier_configs tc where tc.tier = v_tier;

  if v_cfg.tier is null then
    select * into v_cfg from private.tier_configs tc where tc.tier = 'free';
  end if;

  if v_cfg.tier is null then
    v_cfg.tier := 'free';
    v_cfg.display_name := 'ผู้ใช้ทั่วไป (Free Tier)';
    v_cfg.swipe_batch_size := 20;
    v_cfg.swipe_window_hours := 6;
    v_cfg.daily_bubble_limit := 3;
    v_cfg.daily_golden_bubbles := 0;
    v_cfg.allow_rewind := false;
    v_cfg.match_expiry_hours := 48;
    v_cfg.allow_see_likes := false;
    v_cfg.allow_spotlight_post := false;
    v_cfg.allow_advanced_filters := false;
    v_cfg.price_thb_monthly := 0.00;
  end if;

  return v_cfg;
end;
$$;

create or replace function public.get_tier_configs()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'tier', tier,
      'display_name', display_name,
      'swipe_batch_size', swipe_batch_size,
      'swipe_window_hours', swipe_window_hours,
      'daily_bubble_limit', daily_bubble_limit,
      'daily_golden_bubbles', daily_golden_bubbles,
      'allow_rewind', allow_rewind,
      'match_expiry_hours', match_expiry_hours,
      'allow_see_likes', allow_see_likes,
      'allow_spotlight_post', allow_spotlight_post,
      'allow_advanced_filters', allow_advanced_filters,
      'price_thb_monthly', price_thb_monthly,
      'updated_at', updated_at
    ) order by price_thb_monthly asc
  ) into v_res
  from private.tier_configs;

  return coalesce(v_res, '[]'::jsonb);
end;
$$;

create or replace function public.mod_update_tier_config(
  p_tier text,
  p_config jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_updated jsonb;
begin
  if p_tier not in ('free', 'premium') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;

  update private.tier_configs
  set
    display_name = coalesce((p_config ->> 'display_name'), display_name),
    swipe_batch_size = coalesce((p_config ->> 'swipe_batch_size')::int, swipe_batch_size),
    swipe_window_hours = coalesce((p_config ->> 'swipe_window_hours')::int, swipe_window_hours),
    daily_bubble_limit = coalesce((p_config ->> 'daily_bubble_limit')::int, daily_bubble_limit),
    daily_golden_bubbles = coalesce((p_config ->> 'daily_golden_bubbles')::int, daily_golden_bubbles),
    allow_rewind = coalesce((p_config ->> 'allow_rewind')::boolean, allow_rewind),
    match_expiry_hours = coalesce((p_config ->> 'match_expiry_hours')::int, match_expiry_hours),
    allow_see_likes = coalesce((p_config ->> 'allow_see_likes')::boolean, allow_see_likes),
    allow_spotlight_post = coalesce((p_config ->> 'allow_spotlight_post')::boolean, allow_spotlight_post),
    allow_advanced_filters = coalesce((p_config ->> 'allow_advanced_filters')::boolean, allow_advanced_filters),
    price_thb_monthly = coalesce((p_config ->> 'price_thb_monthly')::numeric, price_thb_monthly),
    updated_at = now(),
    updated_by = v_mod
  where tier = p_tier;

  select jsonb_build_object(
    'tier', tier,
    'display_name', display_name,
    'swipe_batch_size', swipe_batch_size,
    'swipe_window_hours', swipe_window_hours,
    'daily_bubble_limit', daily_bubble_limit,
    'daily_golden_bubbles', daily_golden_bubbles,
    'allow_rewind', allow_rewind,
    'match_expiry_hours', match_expiry_hours,
    'allow_see_likes', allow_see_likes,
    'allow_spotlight_post', allow_spotlight_post,
    'allow_advanced_filters', allow_advanced_filters,
    'price_thb_monthly', price_thb_monthly,
    'updated_at', updated_at
  ) into v_updated
  from private.tier_configs
  where tier = p_tier;

  return v_updated;
end;
$$;

create or replace function public.get_my_subscription()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_signed_in();
  v_sub private.subscriptions%rowtype;
  v_eff_tier text := private.user_tier(v_uid);
  v_limits private.tier_configs%rowtype := private.user_limits(v_uid);
begin
  select * into v_sub from private.subscriptions s where s.user_id = v_uid;

  return jsonb_build_object(
    'tier', v_eff_tier,
    'source', v_sub.source,
    'status', coalesce(v_sub.status, 'active'),
    'expires_at', v_sub.expires_at,
    'limits', jsonb_build_object(
      'swipe_batch_size', v_limits.swipe_batch_size,
      'swipe_window_hours', v_limits.swipe_window_hours,
      'daily_bubble_limit', v_limits.daily_bubble_limit,
      'daily_golden_bubbles', v_limits.daily_golden_bubbles,
      'allow_rewind', v_limits.allow_rewind,
      'match_expiry_hours', v_limits.match_expiry_hours,
      'allow_see_likes', v_limits.allow_see_likes,
      'allow_spotlight_post', v_limits.allow_spotlight_post,
      'allow_advanced_filters', v_limits.allow_advanced_filters
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) โควตาแบบ rolling window: เริ่มนับตอนปัดใบแรก ครบ swipe_window_hours แล้วรีเต็ม
-- ---------------------------------------------------------------------------
create function private.swipe_quota_state(p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limits private.tier_configs%rowtype := private.user_limits(p_user_id);
  v_w private.swipe_windows%rowtype;
  v_used int := 0;
  v_started timestamptz;
begin
  select * into v_w from private.swipe_windows w where w.user_id = p_user_id;

  if v_w.user_id is not null
     and v_w.window_started_at + make_interval(hours => v_limits.swipe_window_hours) > now() then
    v_used := v_w.used;
    v_started := v_w.window_started_at;
  end if;

  return json_build_object(
    'batch_size', v_limits.swipe_batch_size,
    'window_hours', v_limits.swipe_window_hours,
    'used', v_used,
    'remaining', greatest(v_limits.swipe_batch_size - v_used, 0),
    'window_started_at', v_started,
    'resets_at', case
      when v_started is null then null
      else v_started + make_interval(hours => v_limits.swipe_window_hours)
    end
  );
end;
$$;

-- หักโควตา 1 ใบ (ล็อกแถวกันปัดซ้อน) — เต็มแล้ว raise swipe_limit_reached พร้อมเวลารีใน detail
create function private.consume_swipe(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limits private.tier_configs%rowtype := private.user_limits(p_user_id);
  v_w private.swipe_windows%rowtype;
  v_window interval := make_interval(hours => v_limits.swipe_window_hours);
begin
  insert into private.swipe_windows (user_id, window_started_at, used)
  values (p_user_id, now(), 0)
  on conflict (user_id) do nothing;

  select * into v_w from private.swipe_windows w where w.user_id = p_user_id for update;

  if v_w.window_started_at + v_window <= now() then
    update private.swipe_windows
    set window_started_at = now(), used = 0
    where user_id = p_user_id
    returning * into v_w;
  end if;

  if v_w.used >= v_limits.swipe_batch_size then
    raise exception 'swipe_limit_reached'
      using errcode = 'P0001', detail = (v_w.window_started_at + v_window)::text;
  end if;

  update private.swipe_windows set used = used + 1 where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) แจกการ์ดเข้ากอง (คะแนนเดิม: เขาชอบเรามาก่อน + ความสนใจตรงกัน + ย่าน + active)
-- ---------------------------------------------------------------------------
create function private.fill_swipe_deck(p_user_id uuid, p_want int)
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
  v_pending int;
  v_needed int;
  v_inserted int := 0;
begin
  select count(*)::int into v_pending
  from private.swipe_deck sd
  where sd.user_id = p_user_id
    and sd.action is null
    and not private.is_blocked(p_user_id, sd.candidate_id)
    and private.user_state(sd.candidate_id) = 'active';

  v_needed := p_want - v_pending;
  if v_needed <= 0 then
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

  if v_my_modes is null or cardinality(v_my_modes) = 0 then
    return 0;
  end if;

  insert into private.swipe_deck (user_id, candidate_id, score)
  select p_user_id, cand.candidate_id, cand.score
  from (
    select
      c.id as candidate_id,
      round(
        (
          case when exists (
            select 1 from private.swipes s
            where s.swiper_id = c.id and s.target_id = p_user_id and s.direction = 'like'
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
      and c.modes && v_my_modes
      and not private.is_blocked(p_user_id, c.id)
      and not exists (
        select 1 from private.swipe_deck sd
        where sd.user_id = p_user_id and sd.candidate_id = c.id
      )
      and not exists (
        select 1 from private.swipes s
        where s.swiper_id = p_user_id and s.target_id = c.id
      )
      and not exists (
        select 1 from private.matches m
        where m.user_a = least(p_user_id, c.id) and m.user_b = greatest(p_user_id, c.id)
      )
      and (
        cpp.birthdate is null
        or private.age_years(cpp.birthdate) between v_my_age_min and v_my_age_max
      )
      and (
        v_my_age is null
        or v_my_age between coalesce(cpp.age_min, 18) and coalesce(cpp.age_max, 35)
      )
      -- กันคนดังกินคิวทั้งแอป: โผล่ในกองของคนอื่นไม่เกิน 100 ครั้ง / 24 ชม.
      and (
        select count(*) from private.swipe_deck d2
        where d2.candidate_id = c.id and d2.created_at > now() - interval '24 hours'
      ) < 100
    order by score desc, c.id asc
    limit v_needed
  ) cand
  on conflict (user_id, candidate_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create function private.purge_stale_swipe_deck()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
begin
  delete from private.swipe_deck where created_at < now() - interval '7 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) RPC: get_my_deck / swipe / get_profile_card
-- ---------------------------------------------------------------------------
create function public.get_my_deck()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_quota json := private.swipe_quota_state(v_uid);
  v_show int := least((v_quota ->> 'remaining')::int, 10);
begin
  if v_show > 0 then
    perform private.fill_swipe_deck(v_uid, v_show);
  end if;

  return json_build_object(
    'quota', v_quota,
    'cards', coalesce(
      (
        select json_agg(row_to_json(t))
        from (
          select
            sd.candidate_id,
            p.display_name,
            private.age_years(pp.birthdate) as age,
            p.bio,
            p.occupation,
            p.area_id,
            p.org_badge,
            p.modes,
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
          from private.swipe_deck sd
          join public.profiles p on p.id = sd.candidate_id
          join private.profile_private pp on pp.user_id = p.id
          where sd.user_id = v_uid
            and sd.action is null
            and not private.is_blocked(v_uid, sd.candidate_id)
            and private.user_state(sd.candidate_id) = 'active'
          order by sd.score desc, sd.created_at asc, sd.candidate_id asc
          limit v_show
        ) t
      ),
      '[]'::json
    )
  );
end;
$$;

-- โหมด match ตัดสินที่ server: ทั้งคู่เปิดโหมดเดท = date ไม่งั้น friend
create function public.swipe(p_candidate_id uuid, p_direction text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_my_limits private.tier_configs%rowtype := private.user_limits(v_uid);
  v_peer_limits private.tier_configs%rowtype;
  v_expiry_hours int;
  v_deck private.swipe_deck%rowtype;
  v_my_modes text[];
  v_peer_modes text[];
  v_mode text;
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
  perform private.check_rate('swipe', v_uid::text, 400, interval '1 day');

  if p_direction is null or p_direction not in ('like', 'skip') then
    raise exception 'invalid_swipe_direction' using errcode = '22023';
  end if;

  if p_candidate_id is null or p_candidate_id = v_uid then
    raise exception 'cannot_target_self' using errcode = '22023';
  end if;

  select * into v_deck
  from private.swipe_deck sd
  where sd.user_id = v_uid and sd.candidate_id = p_candidate_id and sd.action is null;

  if v_deck.id is null then
    raise exception 'candidate_not_in_deck' using errcode = '42501';
  end if;

  if private.is_blocked(v_uid, p_candidate_id) or private.user_state(p_candidate_id) <> 'active' then
    raise exception 'target_not_found' using errcode = '22023';
  end if;

  perform private.consume_swipe(v_uid);

  select p.modes into v_my_modes from public.profiles p where p.id = v_uid;
  select p.modes into v_peer_modes from public.profiles p where p.id = p_candidate_id;
  v_mode := case
    when 'date' = any (coalesce(v_my_modes, '{}')) and 'date' = any (coalesce(v_peer_modes, '{}'))
      then 'date'
    else 'friend'
  end;

  insert into private.swipes (swiper_id, target_id, mode, direction)
  values (v_uid, p_candidate_id, v_mode, p_direction)
  on conflict (swiper_id, target_id, mode) do update
    set direction = excluded.direction, created_at = now();

  update private.swipe_deck
  set action = p_direction, acted_at = now()
  where id = v_deck.id;

  if p_direction = 'like' then
    select exists (
      select 1 from private.swipes s
      where s.swiper_id = p_candidate_id and s.target_id = v_uid and s.direction = 'like'
    ) into v_mutual;
  end if;

  if not v_mutual then
    return json_build_object(
      'matched', false,
      'match_id', null,
      'conversation_id', null,
      'quota', private.swipe_quota_state(v_uid)
    );
  end if;

  v_pair_a := least(v_uid, p_candidate_id);
  v_pair_b := greatest(v_uid, p_candidate_id);

  select m.id, m.conversation_id into v_match_id, v_conv_id
  from private.matches m
  where m.user_a = v_pair_a and m.user_b = v_pair_b and m.mode = v_mode;

  if v_match_id is null then
    v_peer_limits := private.user_limits(p_candidate_id);
    v_expiry_hours := greatest(
      coalesce(v_my_limits.match_expiry_hours, 48),
      coalesce(v_peer_limits.match_expiry_hours, 48)
    );

    select a.alias, a.color into v_my_alias, v_my_color from private.aliases a where a.user_id = v_uid;
    select a.alias, a.color into v_peer_alias, v_peer_color from private.aliases a where a.user_id = p_candidate_id;

    insert into private.conversations (kind, reveal_stage, is_anonymous)
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
      v_pair_a, v_pair_b, v_mode, 'drop', 'active',
      now() + make_interval(hours => v_expiry_hours),
      v_conv_id
    )
    returning id into v_match_id;

    update private.conversations set match_id = v_match_id where id = v_conv_id;
  end if;

  return json_build_object(
    'matched', true,
    'match_id', v_match_id,
    'conversation_id', v_conv_id,
    'quota', private.swipe_quota_state(v_uid)
  );
end;
$$;

-- ดูการ์ดได้เฉพาะคนที่อยู่ในกองของเรา (ยังไม่ปัด หรือเพิ่งปัดใน 24 ชม.) หรือห้องแชทที่เปิดตัวแล้ว
create or replace function public.get_profile_card(p_user_id uuid)
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
    select max(c.reveal_stage) into v_stage
    from private.conversations c
    join private.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = v_uid
    join private.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = p_user_id
    where not c.is_anonymous and c.closed_at is null;

    if v_stage is null and exists (
      select 1 from private.swipe_deck sd
      where sd.user_id = v_uid
        and sd.candidate_id = p_user_id
        and (sd.action is null or sd.acted_at > now() - interval '24 hours')
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

grant execute on function public.get_my_deck() to authenticated;
grant execute on function public.swipe(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) เลิก Daily Drop 19:00: ถอด cron / function / ตารางเดิม + ตั้งงานล้างกองเก่า
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in (
      'rukan-generate-daily-drops',
      'rukan-notify-daily-drop-evening',
      'rukan-notify-daily-drop-noon',
      'rukan-purge-stale-swipe-deck'
    );

    -- 03:30 เวลาไทย (20:30 UTC)
    perform cron.schedule(
      'rukan-purge-stale-swipe-deck',
      '30 20 * * *',
      $cron$select private.purge_stale_swipe_deck();$cron$
    );
  end if;
end;
$$;

drop function public.get_my_drop(text);
drop function public.swipe(uuid, text, text);
drop function private.generate_daily_drops(date);
drop function private.ensure_user_daily_drop(uuid, text, date);
drop function private.notify_daily_drop(text);
drop function private.bangkok_date();
drop function private.bangkok_now();
drop table private.daily_drops;
