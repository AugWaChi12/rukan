-- =============================================================================
-- Migration: Plan Tiers & Feature Flags Master (Free vs Premium)
-- =============================================================================

create table if not exists private.tier_configs (
  tier text primary key check (tier in ('free', 'premium')),
  display_name text not null,
  daily_drop_limit int not null check (daily_drop_limit >= 1 and daily_drop_limit <= 100),
  has_noon_drop boolean not null default false,
  daily_bubble_limit int not null check (daily_bubble_limit >= 0 and daily_bubble_limit <= 9999),
  daily_golden_bubbles int not null check (daily_golden_bubbles >= 0 and daily_golden_bubbles <= 100),
  allow_rewind boolean not null default false,
  match_expiry_hours int not null check (match_expiry_hours >= 1 and match_expiry_hours <= 720),
  allow_see_likes boolean not null default false,
  allow_spotlight_post boolean not null default false,
  allow_advanced_filters boolean not null default false,
  price_thb_monthly numeric(10,2) not null default 0 check (price_thb_monthly >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Seed initial configs
insert into private.tier_configs (
  tier, display_name, daily_drop_limit, has_noon_drop, daily_bubble_limit,
  daily_golden_bubbles, allow_rewind, match_expiry_hours, allow_see_likes,
  allow_spotlight_post, allow_advanced_filters, price_thb_monthly
)
values
  (
    'free', 'ผู้ใช้ทั่วไป (Free Tier)',
    5, false, 3, 0, false, 48, false, false, false, 0.00
  ),
  (
    'premium', 'รู้กัน โกลด์ (Rukan Gold / Premium)',
    10, true, 30, 1, true, 96, true, true, true, 199.00
  )
on conflict (tier) do nothing;

-- ---------------------------------------------------------------------------
-- 1) RPC: อ่าน Master Config ของทั้ง Free และ Premium
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
      'daily_drop_limit', daily_drop_limit,
      'has_noon_drop', has_noon_drop,
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

grant execute on function public.get_tier_configs() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) RPC: Admin แก้ไข Master Config ของ Tier
-- ---------------------------------------------------------------------------
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
    daily_drop_limit = coalesce((p_config ->> 'daily_drop_limit')::int, daily_drop_limit),
    has_noon_drop = coalesce((p_config ->> 'has_noon_drop')::boolean, has_noon_drop),
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
    'daily_drop_limit', daily_drop_limit,
    'has_noon_drop', has_noon_drop,
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

grant execute on function public.mod_update_tier_config(text, jsonb) to authenticated;
