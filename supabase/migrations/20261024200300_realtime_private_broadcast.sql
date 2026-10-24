-- =============================================================================
-- P1-3 & P1-4:
--   1) Realtime แชทแบบ Private Broadcast (ตาม D36 — ห้ามใช้ postgres_changes):
--      - เปิด RLS บน realtime.messages + policy ให้เฉพาะสมาชิกห้องแชท subscribe ได้
--      - ห้าม client broadcast เอง (ไม่มี policy insert สำหรับ anon/authenticated)
--      - ส่งเฉพาะสัญญาณ { type, conversation_id, message_id, reveal_stage } ไม่มี sender_id/user_id หลุด
--   2) ปรับปรุง RPC ฝั่ง Moderator ให้รองรับการจัดการรายงานโพสต์ไม่ระบุตัวตนและคำอุทธรณ์ผ่าน @rukan/api
-- ดู docs/SYSTEM_DESIGN.md หัวข้อ 0, 3, 6.5 และ docs/AUDIT.md หัวข้อ 4
-- =============================================================================

set local check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 1) ตรวจสอบสิทธิ์การ Subscribe Private Broadcast Channel
--    (ต้องอยู่ใน public เพื่อให้ RLS policy บน realtime.messages เรียกในบริบท authenticated ได้)
-- ---------------------------------------------------------------------------

create or replace function public.can_access_realtime_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_conv_id uuid;
begin
  if v_uid is null or p_topic is null then
    return false;
  end if;

  if private.user_state(v_uid) <> 'active' then
    return false;
  end if;

  -- ช่องส่วนตัวของผู้ใช้เอง: user:<uid>
  if p_topic = ('user:' || v_uid::text) then
    return true;
  end if;

  -- ช่องห้องแชท: conversation:<uuid>
  if p_topic ~* '^conversation:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_conv_id := substring(p_topic from 14)::uuid;

    return exists (
      select 1
      from private.conversation_members me
      where me.conversation_id = v_conv_id
        and me.user_id = v_uid
    )
    and not exists (
      select 1
      from private.conversation_members peer
      where peer.conversation_id = v_conv_id
        and peer.user_id <> v_uid
        and private.is_blocked(v_uid, peer.user_id)
    );
  end if;

  return false;
end;
$$;

grant execute on function public.can_access_realtime_topic(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) RLS Policy บน realtime.messages (อนุญาตเฉพาะ SELECT สำหรับสมาชิกช่องแชทเท่านั้น)
--    หมายเหตุ: realtime.messages เปิด RLS มาตั้งต้นโดย supabase_realtime_admin แล้ว
-- ---------------------------------------------------------------------------
drop policy if exists "realtime_messages: สมาชิกห้องแชทรับสัญญาณ broadcast เท่านั้น" on realtime.messages;

create policy "realtime_messages: สมาชิกห้องแชทรับสัญญาณ broadcast เท่านั้น"
  on realtime.messages
  for select
  to authenticated
  using (
    extension = 'broadcast'
    and public.can_access_realtime_topic((select realtime.topic()))
  );

-- ไม่มี policy FOR INSERT สำหรับ anon/authenticated → client ส่ง broadcast ปลอมเองไม่ได้
-- การส่งสัญญาณเกิดจาก RPC (security definer, owner = postgres) เท่านั้น

-- ---------------------------------------------------------------------------
-- 3) Internal Helpers สำหรับส่งสัญญาณ Broadcast (ไม่ส่ง sender_id / user_id ออกไปเด็ดขาด)
-- ---------------------------------------------------------------------------

create or replace function private.emit_user_inbox_signal(
  p_user_id uuid,
  p_type text,
  p_conversation_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'type', p_type,
      'conversation_id', p_conversation_id
    ),
    'inbox_event',
    'user:' || p_user_id::text,
    true
  );
end;
$$;

create or replace function private.emit_conversation_signal(
  p_conversation_id uuid,
  p_type text,
  p_message_id uuid default null,
  p_reveal_stage smallint default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if p_conversation_id is null then
    return;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'type', p_type,
      'conversation_id', p_conversation_id,
      'message_id', p_message_id,
      'reveal_stage', p_reveal_stage
    ),
    'chat_event',
    'conversation:' || p_conversation_id::text,
    true
  );

  for r in
    select cm.user_id
    from private.conversation_members cm
    where cm.conversation_id = p_conversation_id
  loop
    perform private.emit_user_inbox_signal(r.user_id, p_type, p_conversation_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) อัปเดต RPC แชท & Bubble ให้ส่งสัญญาณ Private Broadcast อัตโนมัติ
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

  -- ส่งสัญญาณเข้า inbox ของเจ้าของโพสต์โดยไม่มี sender_id
  perform private.emit_user_inbox_signal(v_post.author_id, 'bubble_received', null);

  return json_build_object(
    'id', v_bubble.id,
    'post_id', v_bubble.post_id,
    'status', v_bubble.status,
    'created_at', v_bubble.created_at
  );
end;
$$;

create or replace function public.respond_bubble(p_bubble_id uuid, p_accept boolean)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_bubble private.bubbles%rowtype;
  v_conv_id uuid;
begin
  select * into v_bubble
  from private.bubbles b
  where b.id = p_bubble_id and b.recipient_id = v_uid;

  if v_bubble.id is null or private.is_blocked(v_uid, v_bubble.sender_id) then
    raise exception 'bubble_not_found' using errcode = '22023';
  end if;

  if v_bubble.status <> 'pending' then
    raise exception 'bubble_already_responded' using errcode = '22023';
  end if;

  if not coalesce(p_accept, false) then
    update private.bubbles
    set status = 'declined', responded_at = now()
    where id = p_bubble_id;

    perform private.emit_user_inbox_signal(v_bubble.sender_id, 'bubble_declined', null);

    return json_build_object(
      'id', p_bubble_id,
      'status', 'declined',
      'conversation_id', null
    );
  end if;

  insert into private.conversations (
    kind, bubble_id, reveal_stage, is_anonymous, last_message_at
  )
  values ('anon', v_bubble.id, 0, true, now())
  returning id into v_conv_id;

  insert into private.conversation_members (
    conversation_id, user_id, alias, alias_color, message_count, last_read_at
  )
  values
    (v_conv_id, v_bubble.sender_id, v_bubble.sender_alias, v_bubble.sender_alias_color, 1, now()),
    (v_conv_id, v_bubble.recipient_id, v_bubble.recipient_alias, v_bubble.recipient_alias_color, 0, now());

  insert into private.messages (
    conversation_id, sender_id, body, kind, scam_warning
  )
  values (
    v_conv_id, v_bubble.sender_id, v_bubble.message, 'text', private.contains_scam_keywords(v_bubble.message)
  );

  update private.bubbles
  set status = 'accepted', conversation_id = v_conv_id, responded_at = now()
  where id = p_bubble_id;

  perform private.emit_conversation_signal(v_conv_id, 'bubble_accepted', null, 0::smallint);

  return json_build_object(
    'id', p_bubble_id,
    'status', 'accepted',
    'conversation_id', v_conv_id
  );
end;
$$;

create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_conv private.conversations%rowtype;
  v_other_id uuid;
  v_scam boolean;
  v_msg private.messages%rowtype;
  v_stage smallint;
begin
  perform private.check_rate('send_message', v_uid::text, 30, interval '1 minute');

  if v_body is null or char_length(v_body) > 1000 then
    raise exception 'invalid_message_body' using errcode = '22023';
  end if;

  select * into v_conv from private.conversations where id = p_conversation_id;
  if v_conv.id is null then
    raise exception 'conversation_not_found' using errcode = '22023';
  end if;

  if not exists (
    select 1 from private.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = v_uid
  ) then
    raise exception 'conversation_not_found' using errcode = '22023';
  end if;

  if v_conv.closed_at is not null then
    raise exception 'conversation_closed' using errcode = '22023';
  end if;

  select cm.user_id into v_other_id
  from private.conversation_members cm
  where cm.conversation_id = p_conversation_id and cm.user_id <> v_uid
  limit 1;

  if v_other_id is null or private.is_blocked(v_uid, v_other_id) or private.user_state(v_other_id) <> 'active' then
    raise exception 'conversation_closed' using errcode = '22023';
  end if;

  if v_conv.is_anonymous and private.contains_contact_or_pii(v_body) then
    raise exception 'contains_prohibited_contact' using errcode = '22023';
  end if;

  v_scam := private.contains_scam_keywords(v_body);

  insert into private.messages (
    conversation_id, sender_id, body, kind, scam_warning
  )
  values (
    p_conversation_id, v_uid, v_body, 'text', v_scam
  )
  returning * into v_msg;

  update private.conversation_members
  set message_count = message_count + 1,
      last_read_at = now()
  where conversation_id = p_conversation_id and user_id = v_uid;

  update private.conversations
  set last_message_at = v_msg.created_at
  where id = p_conversation_id;

  if v_conv.match_id is not null then
    update private.matches
    set expires_at = null
    where id = v_conv.match_id and expires_at is not null;
  end if;

  v_stage := private.recompute_reveal_stage(p_conversation_id);

  -- ส่งสัญญาณ private broadcast (เฉพาะ conversation_id, message_id, reveal_stage — ไม่ส่ง sender_id หรือเนื้อหา)
  perform private.emit_conversation_signal(p_conversation_id, 'new_message', v_msg.id, v_stage);

  return json_build_object(
    'id', v_msg.id,
    'body', v_msg.body,
    'kind', v_msg.kind,
    'is_mine', true,
    'scam_warning', v_msg.scam_warning,
    'reveal_stage', v_stage,
    'created_at', v_msg.created_at
  );
end;
$$;

create or replace function public.request_reveal(p_conversation_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_conv private.conversations%rowtype;
  v_other_id uuid;
  v_other_wants boolean;
  v_pair_a uuid;
  v_pair_b uuid;
  v_match_id uuid;
  v_sys_msg_id uuid;
  v_stage smallint;
begin
  select * into v_conv from private.conversations where id = p_conversation_id;
  if v_conv.id is null then
    raise exception 'conversation_not_found' using errcode = '22023';
  end if;

  if not exists (
    select 1 from private.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = v_uid
  ) then
    raise exception 'conversation_not_found' using errcode = '22023';
  end if;

  if v_conv.closed_at is not null then
    raise exception 'conversation_closed' using errcode = '22023';
  end if;

  select cm.user_id, cm.wants_reveal
  into v_other_id, v_other_wants
  from private.conversation_members cm
  where cm.conversation_id = p_conversation_id and cm.user_id <> v_uid
  limit 1;

  if v_other_id is null or private.is_blocked(v_uid, v_other_id) then
    raise exception 'conversation_closed' using errcode = '22023';
  end if;

  update private.conversation_members
  set wants_reveal = true
  where conversation_id = p_conversation_id and user_id = v_uid;

  if not coalesce(v_other_wants, false) then
    perform private.emit_conversation_signal(
      p_conversation_id,
      'reveal_requested',
      null,
      v_conv.reveal_stage
    );

    return json_build_object(
      'revealed', false,
      'is_anonymous', v_conv.is_anonymous,
      'match_id', v_conv.match_id,
      'reveal_stage', v_conv.reveal_stage
    );
  end if;

  if v_conv.is_anonymous then
    v_pair_a := least(v_uid, v_other_id);
    v_pair_b := greatest(v_uid, v_other_id);

    insert into private.matches (
      user_a, user_b, mode, source, status, expires_at, conversation_id
    )
    values (
      v_pair_a, v_pair_b, 'friend', 'bubble_reveal', 'active', null, p_conversation_id
    )
    on conflict (user_a, user_b, mode) do update
      set status = 'active',
          expires_at = null,
          conversation_id = coalesce(private.matches.conversation_id, excluded.conversation_id)
    returning id into v_match_id;

    update private.conversations
    set is_anonymous = false,
        match_id = v_match_id
    where id = p_conversation_id;

    insert into private.messages (conversation_id, sender_id, body, kind)
    values (p_conversation_id, v_uid, 'ทั้งคู่กดเปิดตัวแล้ว ตอนนี้เห็นโปรไฟล์ของกันและกันได้แล้ว', 'system')
    returning id into v_sys_msg_id;
  else
    v_match_id := v_conv.match_id;
  end if;

  v_stage := private.recompute_reveal_stage(p_conversation_id);

  perform private.emit_conversation_signal(
    p_conversation_id,
    'identity_revealed',
    v_sys_msg_id,
    v_stage
  );

  return json_build_object(
    'revealed', true,
    'is_anonymous', false,
    'match_id', v_match_id,
    'reveal_stage', v_stage
  );
end;
$$;

create or replace function public.request_photo_unlock(p_conversation_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_conv private.conversations%rowtype;
  v_stage smallint;
begin
  select * into v_conv from private.conversations where id = p_conversation_id;
  if v_conv.id is null or not exists (
    select 1 from private.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = v_uid
  ) then
    raise exception 'conversation_not_found' using errcode = '22023';
  end if;

  if v_conv.closed_at is not null then
    raise exception 'conversation_closed' using errcode = '22023';
  end if;

  if v_conv.is_anonymous then
    raise exception 'must_reveal_identity_first' using errcode = '22023';
  end if;

  update private.conversation_members
  set wants_photo_unlock = true
  where conversation_id = p_conversation_id and user_id = v_uid;

  v_stage := private.recompute_reveal_stage(p_conversation_id);

  perform private.emit_conversation_signal(
    p_conversation_id,
    'photo_unlock_updated',
    null,
    v_stage
  );

  return json_build_object(
    'reveal_stage', v_stage,
    'unlocked_all', (v_stage = 3)
  );
end;
$$;

create or replace function public.polite_close(
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
  v_msg_id uuid;
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
    values (v_match.conversation_id, v_uid, v_text, 'polite_close')
    returning id into v_msg_id;

    update private.conversations
    set closed_at = now(),
        closed_reason = 'polite_close',
        last_message_at = now()
    where id = v_match.conversation_id;

    perform private.emit_conversation_signal(
      v_match.conversation_id,
      'conversation_closed',
      v_msg_id,
      null
    );
  end if;

  update private.matches
  set status = 'closed',
      closed_by = v_uid,
      closed_reason = 'polite:' || coalesce(p_template_id, 'thanks')
  where id = p_match_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) ปรับปรุง mod_take_action ให้หา target_user_id จาก report ได้อัตโนมัติ (กรณีรายงานโพสต์ไม่ระบุตัวตน)
--    และเพิ่ม mod_list_appeals สำหรับหน้า Admin Console
-- ---------------------------------------------------------------------------

create or replace function public.mod_take_action(
  p_user_id uuid,
  p_action text,
  p_level smallint,
  p_reason text,
  p_until timestamptz default null,
  p_report_id uuid default null,
  p_target_type text default null,
  p_target_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_target_uid uuid := p_user_id;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_action_id uuid;
begin
  -- ถ้าส่ง report_id มาและ p_user_id ไม่ใช่ profile id โดยตรง (เช่น ส่ง target_id ของโพสต์มา)
  -- ให้ดึง target_user_id จากรายงานในฝั่ง server โดยไม่เปิดเผยตัวตนออกไปยัง client
  if (v_target_uid is null or not exists (select 1 from public.profiles where id = v_target_uid))
     and p_report_id is not null then
    select r.target_user_id into v_target_uid
    from private.reports r
    where r.id = p_report_id;
  end if;

  if v_target_uid is null or not exists (select 1 from public.profiles where id = v_target_uid) then
    raise exception 'target_not_found' using errcode = '22023';
  end if;

  if p_action is null or p_action not in ('warn', 'hide_content', 'suspend', 'ban', 'unban') then
    raise exception 'invalid_mod_action' using errcode = '22023';
  end if;

  if p_level is null or p_level not between 1 and 4 then
    raise exception 'invalid_mod_level' using errcode = '22023';
  end if;

  if v_reason is null or char_length(v_reason) > 500 then
    raise exception 'invalid_mod_reason' using errcode = '22023';
  end if;

  if p_action = 'suspend' and (p_until is null or p_until <= now()) then
    raise exception 'invalid_suspend_until' using errcode = '22023';
  end if;

  insert into private.moderation_actions (
    user_id, action, level, reason, until, report_id, target_type, target_id, moderator_id
  )
  values (
    v_target_uid, p_action, p_level, v_reason,
    case when p_action = 'suspend' then p_until else null end,
    p_report_id, p_target_type, p_target_id, v_mod
  )
  returning id into v_action_id;

  if p_target_type = 'post' and p_target_id is not null and p_action in ('hide_content', 'suspend', 'ban') then
    update private.posts set status = 'hidden' where id = p_target_id;
  elsif p_target_type = 'reply' and p_target_id is not null and p_action in ('hide_content', 'suspend', 'ban') then
    update private.post_replies set status = 'hidden' where id = p_target_id;
  end if;

  if p_action = 'suspend' then
    insert into private.user_status (user_id, state, until, reason)
    values (v_target_uid, 'suspended', p_until, v_reason)
    on conflict (user_id) do update
      set state = 'suspended', until = excluded.until, reason = excluded.reason;
  elsif p_action = 'ban' then
    insert into private.user_status (user_id, state, until, reason)
    values (v_target_uid, 'banned', null, v_reason)
    on conflict (user_id) do update
      set state = 'banned', until = null, reason = excluded.reason;
  elsif p_action = 'unban' then
    insert into private.user_status (user_id, state, until, reason)
    values (v_target_uid, 'active', null, null)
    on conflict (user_id) do update
      set state = 'active', until = null, reason = null;
  end if;

  if p_report_id is not null then
    update private.reports
    set status = 'actioned', resolved_by = v_mod, resolved_at = now()
    where id = p_report_id;
  end if;

  return json_build_object(
    'action_id', v_action_id,
    'user_id', v_target_uid,
    'state', private.user_state(v_target_uid)
  );
end;
$$;

create or replace function public.mod_list_appeals(
  p_status text default 'pending',
  p_limit int default 50
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  perform private.assert_moderator();

  return coalesce(
    (
      select json_agg(row_to_json(t))
      from (
        select
          ma.id,
          ma.user_id,
          p.display_name,
          ma.action,
          ma.level,
          ma.reason,
          ma.until,
          ma.appeal_text,
          ma.appealed_at,
          ma.appeal_status,
          ma.moderator_id,
          ma.appeal_reviewed_by,
          ma.appeal_reviewed_at,
          ma.created_at
        from private.moderation_actions ma
        join public.profiles p on p.id = ma.user_id
        where ma.appeal_status is not null
          and (p_status is null or ma.appeal_status = p_status)
        order by ma.appealed_at desc nulls last, ma.created_at desc
        limit v_limit
      ) t
    ),
    '[]'::json
  );
end;
$$;

grant execute on function public.mod_list_appeals(text, int) to authenticated;
