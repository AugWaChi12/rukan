-- =============================================================================
-- Migration: 20261026180000_topup_orders_and_web_portal.sql
-- Description:
-- 1. ตารางคำสั่งเติมเงิน private.topup_orders (สำหรับ PromptPay / โอนเงินผ่านเว็บ)
-- 2. Storage bucket slips (private สำหรับเก็บสลิปการโอนเงิน)
-- 3. RPC get_user_topup_info(p_user_id) สำหรับหน้าเว็บดึงข้อมูลผู้รับเหรียญอัตโนมัติ
-- 4. RPC create_topup_order(...) สำหรับสร้างรายการสั่งซื้อและแจ้งโอน
-- 5. RPC mod_approve_topup_order(p_order_id) สำหรับผู้ดูแลอนุมัติและเติมเหรียญเข้ากระเป๋า
-- =============================================================================

-- 1. Storage bucket slips
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slips', 'slips', false, 10 * 1024 * 1024, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false;

create policy "slips: ทุกคนอัปโหลดสลิปได้"
  on storage.objects for insert
  to authenticated, anon
  with check (bucket_id = 'slips');

create policy "slips: ผู้ใช้และผู้ดูแลอ่านสลิปได้"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'slips'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (coalesce(auth.jwt()->'app_metadata'->>'role', '') in ('moderator', 'admin'))
    )
  );

-- 2. ตารางคำสั่งเติมเงิน private.topup_orders
create table if not exists private.topup_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_id text not null,
  package_name text not null,
  coin_amount int not null check (coin_amount > 0),
  bonus_coins int not null default 0 check (bonus_coins >= 0),
  price_thb numeric(10, 2) not null check (price_thb > 0),
  payment_method text not null default 'promptpay' check (payment_method in ('promptpay', 'bank_transfer')),
  slip_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles (id)
);

create index if not exists topup_orders_user_created_idx 
  on private.topup_orders (user_id, created_at desc);

create index if not exists topup_orders_status_idx 
  on private.topup_orders (status, created_at desc);

alter table private.topup_orders enable row level security;

-- 3. RPC ดึงข้อมูลผู้ใช้สำหรับแสดงในหน้าเว็บเติมเงิน (ดึงด้วย user_id จาก URL หรือ session)
create or replace function public.get_user_topup_info(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid := p_user_id;
  v_profile public.profiles%rowtype;
  v_alias text;
  v_alias_color text;
  v_tier text := 'free';
  v_balance int := 0;
begin
  if v_target is null then
    v_target := auth.uid();
  end if;

  if v_target is null then
    raise exception 'user_not_found' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_target and status <> 'banned';

  if v_profile.id is null then
    raise exception 'user_not_found' using errcode = '22023';
  end if;

  select a.alias, a.color into v_alias, v_alias_color
  from private.aliases a
  where a.user_id = v_target;

  select coalesce(tier, 'free') into v_tier
  from private.subscriptions
  where user_id = v_target and status = 'active' and (expires_at is null or expires_at > now())
  order by starts_at desc limit 1;

  select coalesce(w.balance, 0) into v_balance
  from private.coin_wallets w
  where w.user_id = v_target;

  return jsonb_build_object(
    'user_id', v_profile.id,
    'alias', coalesce(v_alias, v_profile.display_name),
    'alias_color', coalesce(v_alias_color, '#C7BEE3'),
    'display_name', v_profile.display_name,
    'tier', coalesce(v_tier, 'free'),
    'coin_balance', v_balance
  );
end;
$$;

-- 4. RPC สร้างคำสั่งเติมเงิน / แจ้งโอนเงิน
create or replace function public.create_topup_order(
  p_package_id text,
  p_slip_url text default null,
  p_target_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := coalesce(p_target_user_id, auth.uid());
  v_pkg_name text;
  v_coins int;
  v_bonus int := 0;
  v_price numeric(10, 2);
  v_order private.topup_orders%rowtype;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and status <> 'banned') then
    raise exception 'user_not_found' using errcode = '22023';
  end if;

  -- รายการแพ็กเกจมาตรฐานพร้อมโปรโมชั่นเว็บ (+โบนัสพิเศษ)
  case p_package_id
    when 'starter' then
      v_pkg_name := 'เริ่มต้น (Starter)';
      v_coins := 500;
      v_bonus := 0;
      v_price := 59.00;
    when 'popular' then
      v_pkg_name := 'ยอดนิยม (Popular)';
      v_coins := 1200;
      v_bonus := 150;
      v_price := 129.00;
    when 'best_value' then
      v_pkg_name := 'สุดคุ้ม (Best Value)';
      v_coins := 2500;
      v_bonus := 450;
      v_price := 249.00;
    when 'vip_pro' then
      v_pkg_name := 'โปรพิเศษ (VIP Pro)';
      v_coins := 6500;
      v_bonus := 1500;
      v_price := 590.00;
    else
      raise exception 'invalid_package' using errcode = '22023';
  end case;

  insert into private.topup_orders (
    user_id, package_id, package_name, coin_amount, bonus_coins, price_thb, slip_url, status
  )
  values (
    v_uid, p_package_id, v_pkg_name, v_coins, v_bonus, v_price, nullif(trim(p_slip_url), ''), 'pending'
  )
  returning * into v_order;

  return jsonb_build_object(
    'order_id', v_order.id,
    'user_id', v_order.user_id,
    'package_id', v_order.package_id,
    'package_name', v_order.package_name,
    'coin_amount', v_order.coin_amount,
    'bonus_coins', v_order.bonus_coins,
    'total_coins', v_order.coin_amount + v_order.bonus_coins,
    'price_thb', v_order.price_thb,
    'slip_url', v_order.slip_url,
    'status', v_order.status,
    'created_at', v_order.created_at
  );
end;
$$;

-- 5. RPC ดึงรายการคำสั่งเติมเงินของตัวเอง
create or replace function public.get_my_topup_orders()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t))
      from (
        select
          o.id,
          o.package_id,
          o.package_name,
          o.coin_amount,
          o.bonus_coins,
          (o.coin_amount + o.bonus_coins) as total_coins,
          o.price_thb,
          o.slip_url,
          o.status,
          o.created_at,
          o.approved_at
        from private.topup_orders o
        where o.user_id = v_uid
        order by o.created_at desc
        limit 20
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

-- 6. RPC ผู้ดูแลอนุมัติคำสั่งเติมเงินและโอนเหรียญเข้ากระเป๋าจริง
create or replace function public.mod_approve_topup_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_order private.topup_orders%rowtype;
  v_total_coins int;
  v_new_balance int;
begin
  select * into v_order
  from private.topup_orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'order_not_found' using errcode = '22023';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order_already_processed' using errcode = '22023';
  end if;

  v_total_coins := v_order.coin_amount + v_order.bonus_coins;

  -- เติมเหรียญเข้ากระเป๋าผู้ใช้แบบ atomic
  insert into private.coin_wallets (user_id, balance, lifetime_earned, lifetime_spent)
  values (v_order.user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  update private.coin_wallets
  set
    balance = balance + v_total_coins,
    lifetime_earned = lifetime_earned + v_total_coins,
    updated_at = now()
  where user_id = v_order.user_id
  returning balance into v_new_balance;

  insert into private.coin_ledger (
    user_id, delta, balance_after, kind, reference_id, note, created_by
  )
  values (
    v_order.user_id,
    v_total_coins,
    v_new_balance,
    'topup_promptpay',
    v_order.id::text,
    'เติมเงินผ่านเว็บสโตร์ (' || v_order.package_name || ')',
    v_mod
  );

  update private.topup_orders
  set
    status = 'approved',
    approved_at = now(),
    approved_by = v_mod,
    updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object(
    'order_id', v_order.id,
    'status', v_order.status,
    'approved_at', v_order.approved_at,
    'credited_coins', v_total_coins,
    'new_balance', v_new_balance
  );
end;
$$;

-- Grant สิทธิ์
grant execute on function public.get_user_topup_info(uuid) to anon, authenticated;
grant execute on function public.create_topup_order(text, text, uuid) to anon, authenticated;
grant execute on function public.get_my_topup_orders() to authenticated;
grant execute on function public.mod_approve_topup_order(uuid) to authenticated;
