-- =============================================================================
-- P1-1 & P1-2:
--   1) Tier ต่อผู้ใช้: private.subscriptions + private.user_tier() + private.user_limits()
--      - อ่าน limit จาก private.tier_configs ไปใช้ใน get_my_drop / send_bubble / swipe
--      - รองรับ RevenueCat IAP (revenuecat_ios / revenuecat_android) + manual / promo
--   2) Daily Drop ตามเวลาไทย (Asia/Bangkok):
--      - ใช้วันที่ (now() at time zone 'Asia/Bangkok')::date
--      - เปิดให้เห็นหลัง 19:00 น. (หรือ 12:00 น. สำหรับ tier ที่เปิด has_noon_drop)
--      - ตั้งเวลา pg_cron สำหรับสร้าง Drop (18:50 ไทย) และแจ้งเตือน (19:00 / 12:00 ไทย)
-- ดู docs/AUDIT.md หัวข้อ 4 และ docs/SYSTEM_DESIGN.md หัวข้อ 6.4, 9
-- =============================================================================

set local check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 1) ตาราง private.subscriptions (เก็บสถานะสมาชิก Free / Rukan Gold ต่อผู้ใช้)
-- ---------------------------------------------------------------------------
create table if not exists private.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  tier text not null default 'premium' check (tier in ('free', 'premium')),
  source text not null check (source in ('revenuecat_ios', 'revenuecat_android', 'manual', 'promo')),
  external_id text,
  status text not null default 'active' check (status in ('active', 'canceled', 'expired', 'grace_period')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index if not exists subscriptions_tier_status_idx
  on private.subscriptions (tier, status, expires_at);

alter table private.subscriptions enable row level security;

create trigger subscriptions_set_updated_at
  before update on private.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Helpers: เวลาไทย (Asia/Bangkok) + การอ่าน Tier และ Limits ของผู้ใช้
-- ---------------------------------------------------------------------------

-- คืนเวลาปัจจุบันในโซน Asia/Bangkok (รองรับการจำลองเวลาใน pgTAP ผ่าน rukan.test_bangkok_now)
create or replace function private.bangkok_now()
returns timestamp
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('rukan.test_bangkok_now', true), '')::timestamp,
    (now() at time zone 'Asia/Bangkok')
  );
$$;

-- คืนวันที่ปัจจุบันตามเวลาไทย: (now() at time zone 'Asia/Bangkok')::date
create or replace function private.bangkok_date()
returns date
language sql
stable
set search_path = ''
as $$
  select (private.bangkok_now())::date;
$$;

-- คืน tier ปัจจุบันของผู้ใช้ ('free' หรือ 'premium') โดยเช็ควันหมดอายุและสถานะ
create or replace function private.user_tier(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select s.tier
      from private.subscriptions s
      where s.user_id = p_user_id
        and s.tier = 'premium'
        and s.status in ('active', 'grace_period')
        and (s.expires_at is null or s.expires_at > now())
      limit 1
    ),
    'free'
  );
$$;

-- คืนค่าขีดจำกัดและสิทธิ์ฟีเจอร์ของผู้ใช้จาก private.tier_configs
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
  select * into v_cfg
  from private.tier_configs tc
  where tc.tier = v_tier;

  if v_cfg.tier is null then
    select * into v_cfg
    from private.tier_configs tc
    where tc.tier = 'free';
  end if;

  if v_cfg.tier is null then
    v_cfg.tier := 'free';
    v_cfg.display_name := 'ผู้ใช้ทั่วไป (Free Tier)';
    v_cfg.daily_drop_limit := 5;
    v_cfg.has_noon_drop := false;
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

-- ตรวจว่า Daily Drop ของวันนี้เปิดให้ผู้ใช้คนนี้เห็นหรือยัง:
--   - ผู้ใช้ทั่วไป (has_noon_drop = false): เปิดหลัง 19:00 น. เวลาไทย
--   - สมาชิกที่เปิด has_noon_drop = true (Rukan Gold): เปิดตั้งแต่ 12:00 น. เวลาไทย
create or replace function private.is_daily_drop_open(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limits private.tier_configs%rowtype := private.user_limits(p_user_id);
  v_bkk_time time := (private.bangkok_now())::time;
begin
  if coalesce(v_limits.has_noon_drop, false) then
    return v_bkk_time >= time '12:00:00';
  end if;
  return v_bkk_time >= time '19:00:00';
end;
$$;

-- Helper สำหรับ Edge Function (RevenueCat webhook) อัปเดตสถานะสมาชิก (client เรียกไม่ได้)
create or replace function private.sync_revenuecat_subscription(
  p_user_id uuid,
  p_tier text,
  p_source text,
  p_status text,
  p_expires_at timestamptz default null,
  p_external_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_tier not in ('free', 'premium') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;
  if p_source not in ('revenuecat_ios', 'revenuecat_android', 'manual', 'promo') then
    raise exception 'invalid_subscription_source' using errcode = '22023';
  end if;
  if p_status not in ('active', 'canceled', 'expired', 'grace_period') then
    raise exception 'invalid_subscription_status' using errcode = '22023';
  end if;

  insert into private.subscriptions (
    user_id, tier, source, external_id, status, starts_at, expires_at
  )
  values (
    p_user_id, p_tier, p_source, p_external_id, p_status, now(), p_expires_at
  )
  on conflict (user_id) do update set
    tier = excluded.tier,
    source = excluded.source,
    external_id = coalesce(excluded.external_id, private.subscriptions.external_id),
    status = excluded.status,
    expires_at = excluded.expires_at,
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) RPC สำหรับอ่านสถานะสมาชิกของตัวเอง & Moderator จัดการสมาชิก
-- ---------------------------------------------------------------------------

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
  select * into v_sub
  from private.subscriptions s
  where s.user_id = v_uid;

  return jsonb_build_object(
    'tier', v_eff_tier,
    'source', v_sub.source,
    'status', coalesce(v_sub.status, 'active'),
    'expires_at', v_sub.expires_at,
    'limits', jsonb_build_object(
      'daily_drop_limit', v_limits.daily_drop_limit,
      'has_noon_drop', v_limits.has_noon_drop,
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

grant execute on function public.get_my_subscription() to authenticated;

create or replace function public.mod_set_user_subscription(
  p_user_id uuid,
  p_tier text,
  p_source text default 'manual',
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_status text;
  v_sub private.subscriptions%rowtype;
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'target_not_found' using errcode = '22023';
  end if;

  if p_tier is null or p_tier not in ('free', 'premium') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;

  if p_source is null or p_source not in ('manual', 'promo', 'revenuecat_ios', 'revenuecat_android') then
    raise exception 'invalid_subscription_source' using errcode = '22023';
  end if;

  v_status := case when p_tier = 'free' then 'expired' else 'active' end;

  insert into private.subscriptions (
    user_id, tier, source, status, starts_at, expires_at, updated_by
  )
  values (
    p_user_id, p_tier, p_source, v_status, now(), p_expires_at, v_mod
  )
  on conflict (user_id) do update set
    tier = excluded.tier,
    source = excluded.source,
    status = excluded.status,
    expires_at = excluded.expires_at,
    updated_by = v_mod,
    updated_at = now()
  returning * into v_sub;

  return jsonb_build_object(
    'user_id', v_sub.user_id,
    'tier', private.user_tier(v_sub.user_id),
    'source', v_sub.source,
    'status', v_sub.status,
    'expires_at', v_sub.expires_at
  );
end;
$$;

grant execute on function public.mod_set_user_subscription(uuid, text, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) ปรับตาราง private.daily_drops ให้รองรับ rank สูงสุด 100 (ตาม tier_configs)
--    และค่าเริ่มต้นของ drop_date เป็นวันที่ตามเวลาไทย
-- ---------------------------------------------------------------------------
alter table private.daily_drops
  drop constraint if exists daily_drops_rank_check;

alter table private.daily_drops
  add constraint daily_drops_rank_check check (rank between 1 and 100),
  alter column drop_date set default (now() at time zone 'Asia/Bangkok')::date;

-- ---------------------------------------------------------------------------
-- 5) ปรับ send_bubble ให้อ่าน daily_bubble_limit จาก private.user_limits()
-- ---------------------------------------------------------------------------
create or replace function public.send_bubble(p_post_id uuid, p_message text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_limits private.tier_configs%rowtype := private.user_limits(v_uid);
  v_msg text := nullif(trim(coalesce(p_message, '')), '');
  v_post private.posts%rowtype;
  v_my_alias text;
  v_my_color text;
  v_bubble private.bubbles%rowtype;
begin
  if v_msg is null or char_length(v_msg) > 200 then
    raise exception 'invalid_bubble_message' using errcode = '22023';
  end if;

  if private.contains_contact_or_pii(v_msg) then
    raise exception 'contains_prohibited_contact' using errcode = '22023';
  end if;

  select * into v_post
  from private.posts po
  where po.id = p_post_id and po.status = 'published' and po.deleted_at is null;

  if v_post.id is null or private.is_blocked(v_uid, v_post.author_id) or private.user_state(v_post.author_id) <> 'active' then
    raise exception 'post_not_found' using errcode = '22023';
  end if;

  if v_post.author_id = v_uid then
    raise exception 'cannot_bubble_own_post' using errcode = '22023';
  end if;

  if exists (select 1 from private.bubbles b where b.post_id = p_post_id and b.sender_id = v_uid) then
    raise exception 'bubble_already_sent' using errcode = '22023';
  end if;

  -- ใช้โควตาส่ง Bubble ต่อวันตาม Tier ของผู้ใช้ (Free = 3, Premium = 30 หรือตามที่ตั้งใน tier_configs)
  perform private.check_rate('send_bubble', v_uid::text, v_limits.daily_bubble_limit, interval '1 day');

  select a.alias, a.color into v_my_alias, v_my_color
  from private.aliases a
  where a.user_id = v_uid;

  insert into private.bubbles (
    post_id, sender_id, recipient_id,
    sender_alias, sender_alias_color,
    recipient_alias, recipient_alias_color,
    message, status
  )
  values (
    p_post_id, v_uid, v_post.author_id,
    v_my_alias, v_my_color,
    v_post.alias, v_post.alias_color,
    v_msg, 'pending'
  )
  returning * into v_bubble;

  return json_build_object(
    'id', v_bubble.id,
    'post_id', v_bubble.post_id,
    'status', v_bubble.status,
    'created_at', v_bubble.created_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) ปรับ Daily Drop functions ให้ใช้วันที่เวลาไทย + เปิดหลัง 19:00 (หรือ 12:00)
--    + ใช้ daily_drop_limit และ match_expiry_hours จาก private.user_limits()
-- ---------------------------------------------------------------------------

create or replace function private.ensure_user_daily_drop(
  p_user_id uuid,
  p_mode text,
  p_date date default private.bangkok_date()
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date date := coalesce(p_date, private.bangkok_date());
  v_limits private.tier_configs%rowtype := private.user_limits(p_user_id);
  v_existing_count int := 0;
  v_needed int := 0;
  v_my_area text;
  v_my_modes text[];
  v_my_age int;
  v_my_age_min int;
  v_my_age_max int;
  v_inserted int := 0;
begin
  select count(*)::int into v_existing_count
  from private.daily_drops dd
  where dd.user_id = p_user_id
    and dd.drop_date = v_date
    and dd.mode = p_mode;

  v_needed := v_limits.daily_drop_limit - v_existing_count;
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
        select 1 from private.daily_drops dd_existing
        where dd_existing.user_id = p_user_id
          and dd_existing.drop_date = v_date
          and dd_existing.mode = p_mode
          and dd_existing.candidate_id = c.id
      )
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
      and (
        select count(*) from private.daily_drops d2
        where d2.candidate_id = c.id and d2.drop_date = v_date
      ) < 25
    order by score desc, c.id asc
    limit v_needed
  ),
  ranked as (
    select
      candidate_id,
      score,
      (v_existing_count + row_number() over (order by score desc, candidate_id asc))::smallint as rank
    from candidates
  )
  insert into private.daily_drops (user_id, drop_date, mode, candidate_id, rank, score)
  select p_user_id, v_date, p_mode, candidate_id, rank, score
  from ranked
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function private.generate_daily_drops(
  p_date date default private.bangkok_date()
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date date := coalesce(p_date, private.bangkok_date());
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
    v_total := v_total + private.ensure_user_daily_drop(r.user_id, r.mode, v_date);
  end loop;
  return v_total;
end;
$$;

create or replace function public.get_my_drop(p_mode text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_today date := private.bangkok_date();
  v_limits private.tier_configs%rowtype := private.user_limits(v_uid);
begin
  if p_mode is null or p_mode not in ('friend', 'date') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;

  -- เปิดให้เห็นหลัง 19:00 น. เวลาไทย (หรือ 12:00 น. ถ้ามีสิทธิ์ has_noon_drop)
  if not private.is_daily_drop_open(v_uid) then
    return '[]'::json;
  end if;

  perform private.ensure_user_daily_drop(v_uid, p_mode, v_today);

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
          and dd.drop_date = v_today
          and dd.mode = p_mode
          and dd.rank <= v_limits.daily_drop_limit
          and not private.is_blocked(v_uid, dd.candidate_id)
          and private.user_state(dd.candidate_id) = 'active'
        order by dd.rank asc
      ) t
    ),
    '[]'::json
  );
end;
$$;

create or replace function public.swipe(
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
  v_today date := private.bangkok_date();
  v_my_limits private.tier_configs%rowtype := private.user_limits(v_uid);
  v_peer_limits private.tier_configs%rowtype;
  v_expiry_hours int;
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
  perform private.check_rate('swipe', v_uid::text, 100, interval '1 day');

  if p_mode is null or p_mode not in ('friend', 'date') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;

  if p_direction is null or p_direction not in ('like', 'skip') then
    raise exception 'invalid_swipe_direction' using errcode = '22023';
  end if;

  if p_candidate_id is null or p_candidate_id = v_uid then
    raise exception 'cannot_target_self' using errcode = '22023';
  end if;

  if not private.is_daily_drop_open(v_uid) then
    raise exception 'candidate_not_in_drop' using errcode = '42501';
  end if;

  -- ต้องอยู่ใน Daily Drop ของวันนี้ (ตามเวลาไทย) และไม่เกินโควตาของ tier ปัจจุบัน
  select * into v_drop
  from private.daily_drops dd
  where dd.user_id = v_uid
    and dd.drop_date = v_today
    and dd.mode = p_mode
    and dd.candidate_id = p_candidate_id
    and dd.rank <= v_my_limits.daily_drop_limit;

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

  select m.id, m.conversation_id into v_match_id, v_conv_id
  from private.matches m
  where m.user_a = v_pair_a and m.user_b = v_pair_b and m.mode = p_mode;

  if v_match_id is null then
    v_peer_limits := private.user_limits(p_candidate_id);
    v_expiry_hours := greatest(
      coalesce(v_my_limits.match_expiry_hours, 48),
      coalesce(v_peer_limits.match_expiry_hours, 48)
    );

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
      v_pair_a, v_pair_b, p_mode, 'drop', 'active',
      now() + make_interval(hours => v_expiry_hours),
      v_conv_id
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

create or replace function public.get_profile_card(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_today date := private.bangkok_date();
  v_my_limits private.tier_configs%rowtype := private.user_limits(v_uid);
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

    if v_stage is null
       and private.is_daily_drop_open(v_uid)
       and exists (
         select 1 from private.daily_drops dd
         where dd.user_id = v_uid
           and dd.candidate_id = p_user_id
           and dd.drop_date = v_today
           and dd.rank <= v_my_limits.daily_drop_limit
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
-- 7) pg_cron: สร้าง Daily Drop (18:50 ไทย), แจ้งเตือน (19:00 / 12:00 ไทย) และงานทำความสะอาด
-- ---------------------------------------------------------------------------

create or replace function private.notify_daily_drop(p_slot text default 'evening')
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := private.bangkok_date();
  r record;
  v_notified int := 0;
begin
  for r in
    select distinct dd.user_id
    from private.daily_drops dd
    where dd.drop_date = v_today
      and (
        p_slot <> 'noon'
        or (private.user_limits(dd.user_id)).has_noon_drop
      )
  loop
    perform realtime.send(
      jsonb_build_object(
        'type', 'daily_drop_ready',
        'drop_date', v_today::text,
        'slot', coalesce(p_slot, 'evening')
      ),
      'inbox_event',
      'user:' || r.user_id::text,
      true
    );
    v_notified := v_notified + 1;
  end loop;

  return v_notified;
end;
$$;

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    -- ลบงานเดิมถ้ามีชื่อซ้ำ เพื่อให้ idempotent ตอน db reset
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in (
      'rukan-generate-daily-drops',
      'rukan-notify-daily-drop-evening',
      'rukan-notify-daily-drop-noon',
      'rukan-expire-stale-matches',
      'rukan-close-stale-anon-chats',
      'rukan-purge-old-rate-events'
    );

    -- 18:50 เวลาไทย (11:50 UTC): สร้าง Daily Drop ล่วงหน้า
    perform cron.schedule(
      'rukan-generate-daily-drops',
      '50 11 * * *',
      $cron$select private.generate_daily_drops();$cron$
    );

    -- 19:00 เวลาไทย (12:00 UTC): แจ้งเตือน Daily Drop รอบค่ำ
    perform cron.schedule(
      'rukan-notify-daily-drop-evening',
      '0 12 * * *',
      $cron$select private.notify_daily_drop('evening');$cron$
    );

    -- 12:00 เวลาไทย (05:00 UTC): แจ้งเตือน Noon Drop สำหรับสมาชิก Rukan Gold
    perform cron.schedule(
      'rukan-notify-daily-drop-noon',
      '0 5 * * *',
      $cron$select private.notify_daily_drop('noon');$cron$
    );

    -- ทุก 15 นาที: ตัดหมดอายุ Match ที่เกินเวลาโดยยังไม่ทัก
    perform cron.schedule(
      'rukan-expire-stale-matches',
      '*/15 * * * *',
      $cron$select private.expire_stale_matches();$cron$
    );

    -- 03:00 เวลาไทย (20:00 UTC): ปิดแชทนามแฝงที่เงียบเกิน 7 วัน
    perform cron.schedule(
      'rukan-close-stale-anon-chats',
      '0 20 * * *',
      $cron$select private.close_stale_anon_chats();$cron$
    );

    -- 03:15 เวลาไทย (20:15 UTC): ล้าง rate_events เก่ากว่า 1 วัน
    perform cron.schedule(
      'rukan-purge-old-rate-events',
      '15 20 * * *',
      $cron$select private.purge_old_rate_events();$cron$
    );
  end if;
end;
$$;
