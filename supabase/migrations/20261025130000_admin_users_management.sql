-- =============================================================================
-- Migration: Admin User Directory & Management RPCs (mod_list_users, mod_set_user_verification)
--   1) public.mod_list_users(p_search, p_filter_tier, p_filter_state, p_limit, p_offset):
--      แสดงรายชื่อผู้ใช้ทั้งหมดในระบบสำหรับหน้า Admin Console (ค้นหาด้วยชื่อ, นามแฝง, อีเมล, หรือ UUID)
--      พร้อมข้อมูลระดับ Pass, ยอดเหรียญ Rukan Coin, ระดับยืนยันตัวตน, และสถานะบัญชี
--   2) public.mod_set_user_verification(p_user_id, p_level):
--      ให้ Admin ปรับระดับการยืนยันตัวตน ('none' | 'phone' | 'selfie') สำหรับช่วยลูกค้าหรือปลดล็อกบัญชีทดสอบ
-- =============================================================================

set local check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 1) RPC: รายชื่อผู้ใช้สำหรับหน้า Admin Console
-- ---------------------------------------------------------------------------
create or replace function public.mod_list_users(
  p_search text default null,
  p_filter_tier text default null,
  p_filter_state text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_res jsonb;
begin
  select coalesce(
    jsonb_agg(row_to_json(t)),
    '[]'::jsonb
  ) into v_res
  from (
    select
      p.id as user_id,
      u.email,
      p.display_name,
      coalesce(al.alias, '—') as alias,
      coalesce(al.color, 'rose') as alias_color,
      p.area_id,
      p.modes,
      p.verification_level::text as verification_level,
      private.user_state(p.id) as state,
      private.user_tier(p.id) as tier,
      private.user_coin_balance(p.id) as coin_balance,
      sub.expires_at as tier_expires_at,
      coalesce((u.raw_app_meta_data ->> 'role') in ('moderator', 'admin'), false) as is_moderator,
      p.onboarded_at,
      p.last_active_at,
      p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    left join private.aliases al on al.user_id = p.id
    left join private.subscriptions sub on sub.user_id = p.id
    where (
      v_search is null
      or p.display_name ilike '%' || v_search || '%'
      or u.email ilike '%' || v_search || '%'
      or coalesce(al.alias, '') ilike '%' || v_search || '%'
      or p.id::text ilike '%' || v_search || '%'
    )
    and (
      p_filter_tier is null
      or p_filter_tier = ''
      or p_filter_tier = 'all'
      or private.user_tier(p.id) = p_filter_tier
    )
    and (
      p_filter_state is null
      or p_filter_state = ''
      or p_filter_state = 'all'
      or private.user_state(p.id) = p_filter_state
    )
    order by p.created_at desc
    limit v_limit
    offset v_offset
  ) t;

  return v_res;
end;
$$;

grant execute on function public.mod_list_users(text, text, text, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) RPC: ปรับระดับการยืนยันตัวตนของผู้ใช้โดย Admin (เช่น ปลดล็อก selfie ให้บัญชีทดสอบ/ทีมงาน)
-- ---------------------------------------------------------------------------
create or replace function public.mod_set_user_verification(
  p_user_id uuid,
  p_level public.verification_level
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_profile public.profiles%rowtype;
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'target_not_found' using errcode = '22023';
  end if;

  if p_level is null then
    raise exception 'invalid_verification_level' using errcode = '22023';
  end if;

  update public.profiles
  set
    verification_level = p_level,
    onboarded_at = case
      when p_level = 'selfie' then coalesce(onboarded_at, now())
      else onboarded_at
    end,
    updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  insert into private.verifications (user_id, phone_verified_at, liveness_status, liveness_passed_at, liveness_vendor_ref)
  values (
    p_user_id,
    case when p_level in ('phone', 'selfie') then now() else null end,
    case when p_level = 'selfie' then 'passed' else 'none' end,
    case when p_level = 'selfie' then now() else null end,
    case when p_level = 'selfie' then 'admin_manual:' || v_mod::text else null end
  )
  on conflict (user_id) do update set
    phone_verified_at = case
      when p_level in ('phone', 'selfie') then coalesce(private.verifications.phone_verified_at, now())
      else null
    end,
    liveness_status = case
      when p_level = 'selfie' then 'passed'
      else 'none'
    end,
    liveness_passed_at = case
      when p_level = 'selfie' then coalesce(private.verifications.liveness_passed_at, now())
      else null
    end,
    liveness_vendor_ref = case
      when p_level = 'selfie' then coalesce(private.verifications.liveness_vendor_ref, 'admin_manual:' || v_mod::text)
      else null
    end,
    updated_at = now();

  -- หากปรับเป็น selfie ให้แน่ใจว่ามี consents พื้นฐานครบเพื่อเข้าแอปได้ทันที
  if p_level = 'selfie' then
    insert into private.consents (user_id, doc, version)
    values
      (p_user_id, 'terms', private.current_consent_version('terms')),
      (p_user_id, 'privacy', private.current_consent_version('privacy')),
      (p_user_id, 'rules', private.current_consent_version('rules')),
      (p_user_id, 'biometric', private.current_consent_version('biometric'))
    on conflict (user_id, doc, version) do nothing;
  end if;

  return jsonb_build_object(
    'user_id', v_profile.id,
    'verification_level', v_profile.verification_level::text,
    'onboarded_at', v_profile.onboarded_at
  );
end;
$$;

grant execute on function public.mod_set_user_verification(uuid, public.verification_level) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) RPC: ปรับโหมดของผู้ใช้ (modes: array['friend', 'date']) โดย Admin
-- ---------------------------------------------------------------------------
create or replace function public.mod_set_user_modes(
  p_user_id uuid,
  p_modes text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_profile public.profiles%rowtype;
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'target_not_found' using errcode = '22023';
  end if;

  if p_modes is null or cardinality(p_modes) = 0 or not (p_modes <@ array['friend', 'date']::text[]) then
    raise exception 'modes_required' using errcode = '22023';
  end if;

  update public.profiles
  set
    modes = p_modes,
    updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  return jsonb_build_object(
    'user_id', v_profile.id,
    'modes', v_profile.modes
  );
end;
$$;

grant execute on function public.mod_set_user_modes(uuid, text[]) to authenticated;
