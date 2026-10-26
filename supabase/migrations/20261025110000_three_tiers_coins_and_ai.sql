-- =============================================================================
-- Migration: 3-Tier Pass System (Free | Gold | Premium) + Rukan Coin + AI Wingman
--   1) ขยาย private.tier_configs และ private.subscriptions เป็น 3 ระดับ:
--      - 'free'    : 🌱 ผู้ใช้ทั่วไป (Free) — 0 🪙 (ปัด 20 ใบ/6 ชม., Bubble 3/วัน)
--      - 'gold'    : 🥇 Gold Pass (สายป๊อป โอกาสแมตช์สูง) — 890 🪙 (7 วัน) / 2,490 🪙 (30 วัน, ~249฿)
--      - 'premium' : 💎 Premium Pass (VIP + ผู้ช่วย AI ส่วนตัว) — 1,790 🪙 (7 วัน) / 5,900 🪙 (30 วัน, ~590฿)
--   2) เพิ่มคอลัมน์ใน private.tier_configs:
--      - allow_ai_assistant (ใช้ผู้ช่วย AI ฟรีไม่อั้นสำหรับ Premium)
--      - ai_coin_cost_per_use (ค่าเหรียญต่อการใช้ AI 1 ครั้งสำหรับระดับที่ไม่ได้ฟรี: Free 30 🪙, Gold 15 🪙, Premium 0 🪙)
--      - price_coins_weekly, price_coins_monthly (ราคาแลก Pass ด้วยเหรียญ Rukan Coin)
--   3) กระเป๋าเหรียญ Rukan Coin (private.coin_wallets + private.coin_ledger):
--      - RPC public.exchange_coins_for_pass(p_tier, p_duration) สำหรับใช้เหรียญแลก Gold / Premium Pass
--      - RPC public.mod_grant_user_coins(p_user_id, p_amount, p_note) สำหรับ Admin เติม/ปรับเหรียญให้ผู้ใช้
--      - อัปเดต public.get_my_subscription() ให้คืน coin_balance และฟิลด์ใหม่ครบทั้งหมด
-- =============================================================================

set local check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 1) ขยาย private.tier_configs ให้รองรับ 3 ระดับ ('free', 'gold', 'premium') + คอลัมน์เหรียญ & AI
-- ---------------------------------------------------------------------------
alter table private.tier_configs
  drop constraint if exists tier_configs_tier_check;

alter table private.tier_configs
  add constraint tier_configs_tier_check check (tier in ('free', 'gold', 'premium'));

alter table private.tier_configs
  add column if not exists allow_ai_assistant boolean not null default false,
  add column if not exists ai_coin_cost_per_use int not null default 30
    check (ai_coin_cost_per_use between 0 and 10000),
  add column if not exists price_coins_weekly int not null default 0
    check (price_coins_weekly between 0 and 1000000),
  add column if not exists price_coins_monthly int not null default 0
    check (price_coins_monthly between 0 and 1000000);

-- อัปเดตข้อมูลเริ่มต้นของทั้ง 3 ระดับตามโครงสร้างการตลาดที่เคาะแล้ว
insert into private.tier_configs (
  tier, display_name,
  swipe_batch_size, swipe_window_hours,
  daily_bubble_limit, daily_golden_bubbles,
  allow_rewind, match_expiry_hours,
  allow_see_likes, allow_spotlight_post, allow_advanced_filters,
  allow_ai_assistant, ai_coin_cost_per_use,
  price_coins_weekly, price_coins_monthly, price_thb_monthly
)
values
  (
    'free', '🌱 ผู้ใช้ทั่วไป (Free)',
    20, 6,
    3, 0,
    false, 48,
    false, false, false,
    false, 30,
    0, 0, 0.00
  ),
  (
    'gold', '🥇 Gold Pass (สายป๊อป โอกาสแมตช์สูง)',
    40, 6,
    20, 1,
    true, 96,
    true, true, true,
    false, 15,
    890, 2490, 249.00
  ),
  (
    'premium', '💎 Premium Pass (VIP + ผู้ช่วย AI ส่วนตัว)',
    80, 6,
    50, 3,
    true, 168,
    true, true, true,
    true, 0,
    1790, 5900, 590.00
  )
on conflict (tier) do update set
  display_name = excluded.display_name,
  swipe_batch_size = excluded.swipe_batch_size,
  swipe_window_hours = excluded.swipe_window_hours,
  daily_bubble_limit = excluded.daily_bubble_limit,
  daily_golden_bubbles = excluded.daily_golden_bubbles,
  allow_rewind = excluded.allow_rewind,
  match_expiry_hours = excluded.match_expiry_hours,
  allow_see_likes = excluded.allow_see_likes,
  allow_spotlight_post = excluded.allow_spotlight_post,
  allow_advanced_filters = excluded.allow_advanced_filters,
  allow_ai_assistant = excluded.allow_ai_assistant,
  ai_coin_cost_per_use = excluded.ai_coin_cost_per_use,
  price_coins_weekly = excluded.price_coins_weekly,
  price_coins_monthly = excluded.price_coins_monthly,
  price_thb_monthly = excluded.price_thb_monthly,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2) ขยาย private.subscriptions ให้รองรับ 'free' | 'gold' | 'premium' และ source 'coins' | 'web_topup'
-- ---------------------------------------------------------------------------
alter table private.subscriptions
  drop constraint if exists subscriptions_tier_check,
  drop constraint if exists subscriptions_source_check;

alter table private.subscriptions
  add constraint subscriptions_tier_check check (tier in ('free', 'gold', 'premium')),
  add constraint subscriptions_source_check check (
    source in ('revenuecat_ios', 'revenuecat_android', 'coins', 'web_topup', 'manual', 'promo')
  );

-- ---------------------------------------------------------------------------
-- 3) ตารางกระเป๋าเหรียญ Rukan Coin (private.coin_wallets) + ประวัติธุรกรรม (private.coin_ledger)
-- ---------------------------------------------------------------------------
create table if not exists private.coin_wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  lifetime_earned int not null default 0 check (lifetime_earned >= 0),
  lifetime_spent int not null default 0 check (lifetime_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.coin_wallets enable row level security;

create trigger coin_wallets_set_updated_at
  before update on private.coin_wallets
  for each row execute function public.set_updated_at();

create table if not exists private.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta int not null check (delta <> 0),
  balance_after int not null check (balance_after >= 0),
  kind text not null check (
    kind in (
      'topup_iap',
      'topup_web',
      'admin_grant',
      'promo_bonus',
      'pass_exchange',
      'ai_assistant',
      'golden_bubble',
      'spotlight',
      'swipe_refill'
    )
  ),
  reference_id text,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists coin_ledger_user_created_idx
  on private.coin_ledger (user_id, created_at desc);

alter table private.coin_ledger enable row level security;

-- ---------------------------------------------------------------------------
-- 4) อัปเดต Helper Functions: user_tier, user_limits, user_coin_balance, sync_revenuecat_subscription
-- ---------------------------------------------------------------------------
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
        and s.tier in ('gold', 'premium')
        and s.status in ('active', 'grace_period')
        and (s.expires_at is null or s.expires_at > now())
      limit 1
    ),
    'free'
  );
$$;

create or replace function private.user_coin_balance(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select w.balance from private.coin_wallets w where w.user_id = p_user_id),
    0
  );
$$;

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
    v_cfg.display_name := '🌱 ผู้ใช้ทั่วไป (Free)';
    v_cfg.swipe_batch_size := 20;
    v_cfg.swipe_window_hours := 6;
    v_cfg.daily_bubble_limit := 3;
    v_cfg.daily_golden_bubbles := 0;
    v_cfg.allow_rewind := false;
    v_cfg.match_expiry_hours := 48;
    v_cfg.allow_see_likes := false;
    v_cfg.allow_spotlight_post := false;
    v_cfg.allow_advanced_filters := false;
    v_cfg.allow_ai_assistant := false;
    v_cfg.ai_coin_cost_per_use := 30;
    v_cfg.price_coins_weekly := 0;
    v_cfg.price_coins_monthly := 0;
    v_cfg.price_thb_monthly := 0.00;
  end if;

  return v_cfg;
end;
$$;

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
  if p_tier not in ('free', 'gold', 'premium') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;
  if p_source not in ('revenuecat_ios', 'revenuecat_android', 'coins', 'web_topup', 'manual', 'promo') then
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
-- 5) อัปเดต RPC: get_tier_configs, mod_update_tier_config, get_my_subscription, mod_set_user_subscription
-- ---------------------------------------------------------------------------
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
      'allow_ai_assistant', allow_ai_assistant,
      'ai_coin_cost_per_use', ai_coin_cost_per_use,
      'price_coins_weekly', price_coins_weekly,
      'price_coins_monthly', price_coins_monthly,
      'price_thb_monthly', price_thb_monthly,
      'updated_at', updated_at
    ) order by price_thb_monthly asc, tier asc
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
  if p_tier is null or p_tier not in ('free', 'gold', 'premium') then
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
    allow_ai_assistant = coalesce((p_config ->> 'allow_ai_assistant')::boolean, allow_ai_assistant),
    ai_coin_cost_per_use = coalesce((p_config ->> 'ai_coin_cost_per_use')::int, ai_coin_cost_per_use),
    price_coins_weekly = coalesce((p_config ->> 'price_coins_weekly')::int, price_coins_weekly),
    price_coins_monthly = coalesce((p_config ->> 'price_coins_monthly')::int, price_coins_monthly),
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
    'allow_ai_assistant', allow_ai_assistant,
    'ai_coin_cost_per_use', ai_coin_cost_per_use,
    'price_coins_weekly', price_coins_weekly,
    'price_coins_monthly', price_coins_monthly,
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
  v_coins int := private.user_coin_balance(v_uid);
begin
  select * into v_sub from private.subscriptions s where s.user_id = v_uid;

  return jsonb_build_object(
    'tier', v_eff_tier,
    'source', v_sub.source,
    'status', coalesce(v_sub.status, 'active'),
    'expires_at', v_sub.expires_at,
    'coin_balance', v_coins,
    'limits', jsonb_build_object(
      'swipe_batch_size', v_limits.swipe_batch_size,
      'swipe_window_hours', v_limits.swipe_window_hours,
      'daily_bubble_limit', v_limits.daily_bubble_limit,
      'daily_golden_bubbles', v_limits.daily_golden_bubbles,
      'allow_rewind', v_limits.allow_rewind,
      'match_expiry_hours', v_limits.match_expiry_hours,
      'allow_see_likes', v_limits.allow_see_likes,
      'allow_spotlight_post', v_limits.allow_spotlight_post,
      'allow_advanced_filters', v_limits.allow_advanced_filters,
      'allow_ai_assistant', v_limits.allow_ai_assistant,
      'ai_coin_cost_per_use', v_limits.ai_coin_cost_per_use,
      'price_coins_weekly', v_limits.price_coins_weekly,
      'price_coins_monthly', v_limits.price_coins_monthly
    )
  );
end;
$$;

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

  if p_tier is null or p_tier not in ('free', 'gold', 'premium') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;

  if p_source is null or p_source not in ('manual', 'promo', 'coins', 'web_topup', 'revenuecat_ios', 'revenuecat_android') then
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

-- ---------------------------------------------------------------------------
-- 6) RPC สำหรับ Rukan Coin:
--    - exchange_coins_for_pass(p_tier, p_duration): ผู้ใช้แลกเหรียญเป็น Gold / Premium Pass (7 วัน หรือ 30 วัน)
--    - mod_grant_user_coins(p_user_id, p_amount, p_note): Admin เติมเหรียญให้ผู้ใช้
-- ---------------------------------------------------------------------------
create or replace function public.exchange_coins_for_pass(
  p_tier text,
  p_duration text default 'monthly'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('none');
  v_cfg private.tier_configs%rowtype;
  v_cost int;
  v_interval interval;
  v_wallet private.coin_wallets%rowtype;
  v_new_balance int;
  v_cur_sub private.subscriptions%rowtype;
  v_base_time timestamptz := now();
  v_new_expires timestamptz;
begin
  perform private.check_rate('exchange_coins_for_pass', v_uid::text, 10, interval '1 hour');

  if p_tier is null or p_tier not in ('gold', 'premium') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;

  if p_duration is null or p_duration not in ('weekly', 'monthly') then
    raise exception 'invalid_pass_duration' using errcode = '22023';
  end if;

  select * into v_cfg from private.tier_configs where tier = p_tier;
  if v_cfg.tier is null then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;

  if p_duration = 'weekly' then
    v_cost := v_cfg.price_coins_weekly;
    v_interval := interval '7 days';
  else
    v_cost := v_cfg.price_coins_monthly;
    v_interval := interval '30 days';
  end if;

  if v_cost <= 0 then
    raise exception 'pass_exchange_unavailable' using errcode = '22023';
  end if;

  -- สร้างแถวกระเป๋าเหรียญถ้ายังไม่มี แล้วล็อกแถวเพื่อตัดเหรียญแบบ atomic
  insert into private.coin_wallets (user_id, balance, lifetime_earned, lifetime_spent)
  values (v_uid, 0, 0, 0)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from private.coin_wallets
  where user_id = v_uid
  for update;

  if v_wallet.balance < v_cost then
    raise exception 'insufficient_coins' using errcode = 'P0001';
  end if;

  update private.coin_wallets
  set
    balance = balance - v_cost,
    lifetime_spent = lifetime_spent + v_cost,
    updated_at = now()
  where user_id = v_uid
  returning balance into v_new_balance;

  insert into private.coin_ledger (
    user_id, delta, balance_after, kind, reference_id, note, created_by
  )
  values (
    v_uid,
    -v_cost,
    v_new_balance,
    'pass_exchange',
    p_tier || ':' || p_duration,
    'แลก ' || v_cfg.display_name || ' (' || p_duration || ')',
    v_uid
  );

  -- ถ้ามี Pass ระดับเดียวกันที่ยังไม่หมดอายุ ให้บวกเวลาต่อท้ายจากวันหมดอายุเดิม
  select * into v_cur_sub from private.subscriptions where user_id = v_uid;
  if v_cur_sub.user_id is not null
     and v_cur_sub.tier = p_tier
     and v_cur_sub.status in ('active', 'grace_period')
     and v_cur_sub.expires_at is not null
     and v_cur_sub.expires_at > now() then
    v_base_time := v_cur_sub.expires_at;
  end if;

  v_new_expires := v_base_time + v_interval;

  insert into private.subscriptions (
    user_id, tier, source, status, starts_at, expires_at, updated_by
  )
  values (
    v_uid, p_tier, 'coins', 'active', now(), v_new_expires, v_uid
  )
  on conflict (user_id) do update set
    tier = excluded.tier,
    source = 'coins',
    status = 'active',
    expires_at = excluded.expires_at,
    updated_by = v_uid,
    updated_at = now();

  return public.get_my_subscription();
end;
$$;

grant execute on function public.exchange_coins_for_pass(text, text) to authenticated;

create or replace function public.mod_grant_user_coins(
  p_user_id uuid,
  p_amount int,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_new_balance int;
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'target_not_found' using errcode = '22023';
  end if;

  if p_amount is null or p_amount = 0 or p_amount < -1000000 or p_amount > 1000000 then
    raise exception 'invalid_coin_amount' using errcode = '22023';
  end if;

  insert into private.coin_wallets (user_id, balance, lifetime_earned, lifetime_spent)
  values (p_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  if p_amount < 0 and (select balance from private.coin_wallets where user_id = p_user_id for update) + p_amount < 0 then
    raise exception 'insufficient_coins' using errcode = 'P0001';
  end if;

  update private.coin_wallets
  set
    balance = balance + p_amount,
    lifetime_earned = lifetime_earned + greatest(p_amount, 0),
    lifetime_spent = lifetime_spent + greatest(-p_amount, 0),
    updated_at = now()
  where user_id = p_user_id
  returning balance into v_new_balance;

  insert into private.coin_ledger (
    user_id, delta, balance_after, kind, note, created_by
  )
  values (
    p_user_id,
    p_amount,
    v_new_balance,
    'admin_grant',
    coalesce(v_note, 'ปรับยอดเหรียญโดยผู้ดูแลระบบ'),
    v_mod
  );

  return jsonb_build_object(
    'user_id', p_user_id,
    'coin_balance', v_new_balance,
    'delta', p_amount
  );
end;
$$;

grant execute on function public.mod_grant_user_coins(uuid, int, text) to authenticated;
