-- =============================================================================
-- Migration: 20261025120000_ai_wingman_and_coin_packages.sql
-- Purpose  : Add `public.use_ai_wingman` RPC for AI Wingman conversation/bubble
--            helper (free & unlimited on Premium Pass, or coin-per-use on
--            Free / Gold Pass with atomic wallet deduction & ledger logging).
-- =============================================================================

create or replace function public.use_ai_wingman(
  p_context_type text default 'bubble',
  p_context_text text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_limits record;
  v_cost int;
  v_balance int;
  v_clean text := pg_catalog.btrim(coalesce(p_context_text, ''));
  v_snippet text;
  v_tags text[];
  v_tag_hint text := '';
  v_suggestions jsonb;
begin
  perform private.check_rate('ai_wingman', v_uid::text, 30, interval '1 hour');

  if p_context_type not in ('bubble', 'chat') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if pg_catalog.char_length(v_clean) > 500 then
    v_clean := pg_catalog.left(v_clean, 500);
  end if;

  select * into v_limits from private.user_limits(v_uid);

  insert into private.coin_wallets (user_id, balance, lifetime_earned, lifetime_spent)
  values (v_uid, 0, 0, 0)
  on conflict (user_id) do nothing;

  select w.balance into v_balance
  from private.coin_wallets w
  where w.user_id = v_uid
  for update;

  if coalesce(v_limits.allow_ai_assistant, false) then
    v_cost := 0;
  else
    v_cost := greatest(coalesce(v_limits.ai_coin_cost_per_use, 30), 0);
  end if;

  if v_cost > 0 then
    if v_balance < v_cost then
      raise exception 'insufficient_coins' using errcode = 'P0001';
    end if;

    update private.coin_wallets
       set balance = balance - v_cost,
           lifetime_spent = lifetime_spent + v_cost,
           updated_at = pg_catalog.now()
     where user_id = v_uid
     returning balance into v_balance;

    insert into private.coin_ledger (
      user_id, delta, balance_after, kind, reference_id, note, created_by
    )
    values (
      v_uid,
      -v_cost,
      v_balance,
      'ai_assistant',
      p_context_type,
      case
        when p_context_type = 'bubble' then 'ใช้ผู้ช่วย AI คิดประโยคส่งฟองทัก'
        else 'ใช้ผู้ช่วย AI คิดประโยคชวนคุยในแชท'
      end,
      v_uid
    );
  end if;

  -- สกัดคำสำคัญ / แท็กจากบริบทเพื่อสร้างประโยคชวนคุยที่อบอุ่นและเป็นธรรมชาติ
  v_tags := private.extract_hashtags(v_clean);
  if coalesce(pg_catalog.array_length(v_tags, 1), 0) > 0 then
    v_tag_hint := ' #' || v_tags[1];
  end if;

  v_snippet := pg_catalog.regexp_replace(v_clean, '#[[:alnum:]_\u0E00-\u0E7F]+', '', 'g');
  v_snippet := pg_catalog.btrim(pg_catalog.regexp_replace(v_snippet, '\s+', ' ', 'g'));
  if pg_catalog.char_length(v_snippet) > 36 then
    v_snippet := pg_catalog.left(v_snippet, 36) || '…';
  end if;

  if p_context_type = 'bubble' then
    if v_snippet <> '' then
      v_suggestions := pg_catalog.jsonb_build_array(
        pg_catalog.format('อ่านที่เขียนว่า "%s" แล้วเข้าใจฟีลเลยครับ วันนี้เหนื่อยมากไหม มาคุยเล่นกันได้นะ ✨', v_snippet),
        pg_catalog.format('แอบเห็นโพสต์%s แล้วอยากส่งกำลังใจให้เลย ปกติเวลาแบบนี้ชอบทำอะไรให้สบายใจขึ้นหรอ?', v_tag_hint),
        'ทักทายนะครับ ชอบไวบ์ของโพสต์นี้จัง ถ้าไม่รังเกียจมาค่อยๆ ทำความรู้จักกันนะ 🫧'
      );
    else
      v_suggestions := pg_catalog.jsonb_build_array(
        'แวะมาส่งฟองทักทายครับ วันนี้เป็นยังไงบ้าง มีเรื่องอะไรอยากเล่าให้ฟังไหม ✨',
        'เห็นโพสต์ใน Space แล้วรู้สึกถูกชะตา เลยอยากลองทักมาคุยด้วยครับ 🫧',
        'สวัสดีครับ ถ้าคืนนี้ยังไม่รู้จะคุยกับใคร มาคุยเรื่องสบายๆ กันได้นะ'
      );
    end if;
  else
    if v_snippet <> '' then
      v_suggestions := pg_catalog.jsonb_build_array(
        pg_catalog.format('เรื่อง "%s" น่าสนใจมากเลย เล่าให้ฟังเพิ่มอีกนิดได้ไหมครับ 😊', v_snippet),
        'คุยด้วยแล้วสบายใจจัง ปกติวันหยุดชอบออกไปคาเฟ่หรือชอบนอนพักอยู่ห้องมากกว่ากันหรอ?',
        'ถ้าเราแลกเพลงโปรดกันคนละเพลงตอนนี้ เพลงแรกที่นึกถึงคือเพลงอะไรครับ 🎧'
      );
    else
      v_suggestions := pg_catalog.jsonb_build_array(
        'ดีใจที่ได้แมตช์กันนะครับ ช่วงนี้มีเรื่องอะไรที่ทำแล้วยิ้มได้บ้างไหม ✨',
        'สวัสดีครับ ปกติหลังเลิกเรียน/เลิกงานชอบทำอะไรผ่อนคลายหรอ?',
        'ถ้าให้เลือกที่เที่ยวที่อยากไปที่สุดตอนนี้ อยากไปทะเลหรือภูเขามากกว่ากันครับ 🌊⛰️'
      );
    end if;
  end if;

  return pg_catalog.jsonb_build_object(
    'suggestions', v_suggestions,
    'coins_charged', v_cost,
    'coin_balance', v_balance,
    'tier', coalesce(v_limits.tier, 'free'),
    'is_free_vip', coalesce(v_limits.allow_ai_assistant, false)
  );
end;
$$;

revoke all on function public.use_ai_wingman(text, text) from public, anon;
grant execute on function public.use_ai_wingman(text, text) to authenticated;
