-- =============================================================================
-- Migration: Admin & Moderation Console APIs (admin.rukan.app)
-- =============================================================================

-- ปรับปรุง is_moderator ให้ยืดหยุ่น: รองรับทั้ง app_metadata.role, email บัญชีผู้ดูแล, หรืออีเมล @rukan.app
create or replace function private.is_moderator()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('moderator', 'admin')
    or (auth.jwt() ->> 'email') in ('demo@rukan.dev', 'admin@rukan.app', 'namno@rukan.app')
    or (auth.jwt() ->> 'email') like '%@rukan.app',
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- 1) RPC: สถิติรวมของ Admin Dashboard
-- ---------------------------------------------------------------------------
create or replace function public.mod_get_dashboard_counts()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_res jsonb;
begin
  select jsonb_build_object(
    'reports_pending', (select count(*) from private.reports where status = 'pending'),
    'appeals_pending', (select count(*) from private.appeals where status = 'pending'),
    'waitlist_total', (select count(*) from private.waitlist),
    'active_suspensions', (
      select count(*)
      from private.moderation_actions
      where action in ('suspend', 'ban') and (until is null or until > now())
    )
  ) into v_res;

  return v_res;
end;
$$;
grant execute on function public.mod_get_dashboard_counts() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) RPC: สถิติ Waitlist Insights
-- ---------------------------------------------------------------------------
create or replace function public.mod_get_waitlist_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_res jsonb;
begin
  select jsonb_build_object(
    'total_count', (select count(*) from private.waitlist),
    'today_count', (
      select count(*)
      from private.waitlist
      where created_at >= date_trunc('day', now())
    ),
    'by_area', (
      select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
      from (
        select area, count(*)::int as count
        from private.waitlist
        group by area
        order by count desc
        limit 25
      ) r
    ),
    'by_age_band', (
      select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
      from (
        select coalesce(age_band, 'unspecified') as age_band, count(*)::int as count
        from private.waitlist
        group by age_band
        order by count desc
      ) r
    ),
    'by_locale', (
      select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
      from (
        select locale, count(*)::int as count
        from private.waitlist
        group by locale
        order by count desc
      ) r
    )
  ) into v_res;

  return v_res;
end;
$$;
grant execute on function public.mod_get_waitlist_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- 3) RPC: รายการ Waitlist สำหรับตาราง Admin
-- ---------------------------------------------------------------------------
create or replace function public.mod_list_waitlist(
  p_limit int default 50,
  p_offset int default 0,
  p_search text default null
)
returns table (
  id uuid,
  email text,
  area text,
  age_band text,
  intents text[],
  locale text,
  consented_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
begin
  return query
  select
    w.id,
    w.email,
    w.area,
    w.age_band,
    w.intents,
    w.locale,
    w.consented_at,
    w.created_at
  from private.waitlist w
  where (
    p_search is null
    or p_search = ''
    or w.email ilike '%' || p_search || '%'
    or w.area ilike '%' || p_search || '%'
  )
  order by w.created_at desc
  limit least(coalesce(p_limit, 50), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
grant execute on function public.mod_list_waitlist(int, int, text) to authenticated;
