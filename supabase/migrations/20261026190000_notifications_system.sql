-- ===========================================================================
-- Migration: 20261026190000_notifications_system.sql
-- คำอธิบาย: ระบบการแจ้งเตือนส่วนตัว (Personal Notification System)
-- - ตาราง private.notifications เก็บประวัติการแจ้งเตือนของผู้ใช้
-- - Helper: private.create_notification(user_id, type, title, body, data)
-- - RPCs: get_my_notifications, get_unread_notification_count, mark_notification_read, mark_all_notifications_read
-- - ผูกการแจ้งเตือนอัตโนมัติเข้ากับ Space (like, reply), Bubble (receive, accept),
--   Chat & Match (new match, new message, reveal request, photo unlock request),
--   และการเติมเหรียญ (mod_approve_topup_order)
-- ===========================================================================

-- 1) ตาราง private.notifications
create table if not exists private.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- 'post_reply', 'post_like', 'bubble_received', 'bubble_accepted', 'new_match', 'new_message', 'reveal_request', 'photo_unlock_request', 'coin_credited', 'system'
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table private.notifications enable row level security;

create index if not exists idx_notifications_user_created
  on private.notifications(user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on private.notifications(user_id) where not read;

-- 2) Helper ภายใน: สร้างการแจ้งเตือน + ส่งสัญญาณ Realtime ไปยัง Inbox ของผู้ใช้
create or replace function private.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  insert into private.notifications (user_id, type, title, body, data, read, created_at)
  values (p_user_id, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb), false, now())
  returning id into v_id;

  -- ส่งสัญญาณ realtime broadcast เพื่อให้แอปอัปเดต badge และแจ้งเตือนทันที
  perform private.emit_user_inbox_signal(p_user_id, 'notification_created', null);

  return v_id;
end;
$$;

-- 3) Client RPCs
create or replace function public.get_my_notifications(
  p_limit int default 50,
  p_offset int default 0
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_res json;
begin
  perform private.assert_signed_in();

  select coalesce(json_agg(
    json_build_object(
      'id', n.id,
      'type', n.type,
      'title', n.title,
      'body', n.body,
      'data', n.data,
      'read', n.read,
      'created_at', n.created_at
    ) order by n.created_at desc
  ), '[]'::json)
  into v_res
  from (
    select id, type, title, body, data, read, created_at
    from private.notifications
    where user_id = v_uid
    order by created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0)
  ) n;

  return v_res;
end;
$$;

create or replace function public.get_unread_notification_count()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  perform private.assert_signed_in();

  select count(*)::integer
  into v_count
  from private.notifications
  where user_id = v_uid and not read;

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform private.assert_signed_in();

  update private.notifications
  set read = true
  where id = p_notification_id and user_id = v_uid;

  return found;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  perform private.assert_signed_in();

  with updated as (
    update private.notifications
    set read = true
    where user_id = v_uid and not read
    returning id
  )
  select count(*)::integer into v_count from updated;

  return coalesce(v_count, 0);
end;
$$;

-- 4) สิทธิ์การเรียก RPC
grant execute on function public.get_my_notifications(int, int) to authenticated;
grant execute on function public.get_unread_notification_count() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- 5) เชื่อม Notification เข้ากับระบบต่าง ๆ
-- 5.1 Space: like_post
create or replace function public.like_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_author uuid;
begin
  perform private.check_rate('like_post', v_uid::text, 120, interval '1 hour');

  select po.author_id into v_author
  from private.posts po
  where po.id = p_post_id and po.status = 'published' and po.deleted_at is null;

  if v_author is null or private.is_blocked(v_uid, v_author) then
    raise exception 'post_not_found' using errcode = '22023';
  end if;

  insert into private.post_likes (post_id, user_id)
  values (p_post_id, v_uid)
  on conflict do nothing;

  if v_author <> v_uid then
    perform private.create_notification(
      v_author,
      'post_like',
      'มีคนถูกใจโพสต์ของคุณ ❤️',
      'มีคนส่งใจให้โพสต์ของคุณใน Space',
      jsonb_build_object('post_id', p_post_id)
    );
  end if;
end;
$$;

-- 5.2 Space: reply_post
create or replace function public.reply_post(p_post_id uuid, p_body text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_post private.posts%rowtype;
  v_alias text;
  v_alias_color text;
  v_reply private.post_replies%rowtype;
begin
  perform private.check_rate('reply_hour', v_uid::text, 30, interval '1 hour');

  if v_body is null or char_length(v_body) > 300 then
    raise exception 'invalid_reply_body' using errcode = '22023';
  end if;

  if private.contains_contact_or_pii(v_body) then
    raise exception 'contains_prohibited_contact' using errcode = '22023';
  end if;

  select * into v_post
  from private.posts po
  where po.id = p_post_id and po.status = 'published' and po.deleted_at is null;

  if v_post.id is null or private.is_blocked(v_uid, v_post.author_id) then
    raise exception 'post_not_found' using errcode = '22023';
  end if;

  if v_uid = v_post.author_id then
    v_alias := v_post.alias;
    v_alias_color := v_post.alias_color;
  else
    select a.alias, a.color into v_alias, v_alias_color
    from private.aliases a
    where a.user_id = v_uid;
  end if;

  insert into private.post_replies (
    post_id, author_id, alias, alias_color, is_op, body, status
  )
  values (
    p_post_id, v_uid, v_alias, v_alias_color, (v_uid = v_post.author_id), v_body, 'published'
  )
  returning * into v_reply;

  if v_uid <> v_post.author_id then
    perform private.create_notification(
      v_post.author_id,
      'post_reply',
      'มีคนตอบกลับโพสต์ของคุณ 💭',
      left(v_body, 80),
      jsonb_build_object('post_id', p_post_id, 'reply_id', v_reply.id)
    );
  end if;

  return json_build_object(
    'id', v_reply.id,
    'post_id', v_reply.post_id,
    'alias', v_reply.alias,
    'alias_color', v_reply.alias_color,
    'is_op', v_reply.is_op,
    'is_mine', true,
    'body', v_reply.body,
    'care_notice', private.contains_self_harm_signal(v_body),
    'created_at', v_reply.created_at
  );
end;
$$;

-- 5.3 Bubble: send_bubble
create or replace function public.send_bubble(p_post_id uuid, p_message text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_msg text := nullif(trim(coalesce(p_message, '')), '');
  v_post private.posts%rowtype;
  v_my_alias text;
  v_my_color text;
  v_bubble private.bubbles%rowtype;
  v_limits private.tier_configs%rowtype := private.user_limits(v_uid);
begin
  perform private.check_rate('send_bubble', v_uid::text, v_limits.daily_bubble_limit, interval '1 day');

  if v_msg is null or char_length(v_msg) > 160 then
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

  if exists (
    select 1 from private.bubbles b
    where b.post_id = p_post_id and b.sender_id = v_uid and b.status in ('pending', 'accepted')
  ) then
    raise exception 'bubble_already_sent' using errcode = '22023';
  end if;

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

  -- ส่งสัญญาณ realtime broadcast เข้า inbox
  perform private.emit_user_inbox_signal(v_post.author_id, 'bubble_received', null);

  -- บันทึก notification ให้เจ้าของโพสต์
  perform private.create_notification(
    v_post.author_id,
    'bubble_received',
    'มีคนส่ง Bubble ถึงคุณ 🫧',
    left(v_msg, 80),
    jsonb_build_object('post_id', p_post_id, 'bubble_id', v_bubble.id)
  );

  return json_build_object(
    'id', v_bubble.id,
    'post_id', v_bubble.post_id,
    'status', v_bubble.status,
    'created_at', v_bubble.created_at
  );
end;
$$;

-- 5.4 Bubble: respond_bubble
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
  values (
    'anon', p_bubble_id, 0, true, now()
  )
  returning id into v_conv_id;

  insert into private.conversation_members (
    conversation_id, user_id, alias, alias_color, message_count
  )
  values
    (v_conv_id, v_bubble.sender_id, v_bubble.sender_alias, v_bubble.sender_alias_color, 0),
    (v_conv_id, v_uid, v_bubble.recipient_alias, v_bubble.recipient_alias_color, 0);

  update private.bubbles
  set status = 'accepted', responded_at = now()
  where id = p_bubble_id;

  perform private.emit_user_inbox_signal(v_bubble.sender_id, 'bubble_accepted', v_conv_id);

  -- แจ้งเตือนผู้ส่งว่าฟองได้รับการตอบรับแล้ว
  perform private.create_notification(
    v_bubble.sender_id,
    'bubble_accepted',
    'Bubble ของคุณได้รับการตอบรับแล้ว! 🎉',
    'เริ่มบทสนทนาแบบนิรนามได้ทันที',
    jsonb_build_object('conversation_id', v_conv_id, 'bubble_id', p_bubble_id)
  );

  return json_build_object(
    'id', p_bubble_id,
    'status', 'accepted',
    'conversation_id', v_conv_id
  );
end;
$$;

-- 5.5 Chat: send_message
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

  perform private.emit_conversation_signal(p_conversation_id, 'new_message', v_msg.id, v_stage);

  -- แจ้งเตือนข้อความใหม่
  perform private.create_notification(
    v_other_id,
    'new_message',
    'ข้อความใหม่ 💬',
    case when v_conv.is_anonymous then 'มีข้อความใหม่ในห้องแชทนิรนาม' else left(v_body, 60) end,
    jsonb_build_object('conversation_id', p_conversation_id, 'message_id', v_msg.id)
  );

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

-- 5.6 Reveal: request_reveal
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

    perform private.create_notification(
      v_other_id,
      'reveal_request',
      'คำขอเปิดเผยตัวตน 🔓',
      'คู่สนทนาต้องการเปิดตัวตนร่วมกับคุณ',
      jsonb_build_object('conversation_id', p_conversation_id)
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

  perform private.create_notification(
    v_other_id,
    'reveal_completed',
    'เปิดเผยตัวตนสำเร็จ! 🔓✨',
    'คุณและคู่สนทนาได้เปิดเผยตัวตนร่วมกันแล้ว',
    jsonb_build_object('conversation_id', p_conversation_id)
  );

  return json_build_object(
    'revealed', true,
    'is_anonymous', false,
    'match_id', v_match_id,
    'reveal_stage', v_stage
  );
end;
$$;

-- 5.7 Photo Unlock: request_photo_unlock
create or replace function public.request_photo_unlock(p_conversation_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_conv private.conversations%rowtype;
  v_other_id uuid;
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

  select cm.user_id into v_other_id
  from private.conversation_members cm
  where cm.conversation_id = p_conversation_id and cm.user_id <> v_uid
  limit 1;

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

  if v_other_id is not null then
    perform private.create_notification(
      v_other_id,
      'photo_unlock_request',
      'คำขอปลดล็อกรูปภาพ 📷',
      'คู่สนทนาขอปลดล็อกรูปภาพโปรไฟล์ร่วมกับคุณ',
      jsonb_build_object('conversation_id', p_conversation_id)
    );
  end if;

  return json_build_object(
    'reveal_stage', v_stage,
    'unlocked_all', (v_stage = 3)
  );
end;
$$;

-- 5.8 Matching: swipe
create or replace function public.swipe(p_candidate_id uuid, p_direction text)
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

  update private.swipe_deck
  set action = p_direction, acted_at = now()
  where id = v_deck.id;

  select modes into v_my_modes from public.profiles where id = v_uid;
  select modes into v_peer_modes from public.profiles where id = p_candidate_id;

  if ('date' = any(coalesce(v_my_modes, array[]::text[])))
     and ('date' = any(coalesce(v_peer_modes, array[]::text[]))) then
    v_mode := 'date';
  else
    v_mode := 'friend';
  end if;

  insert into private.swipes (swiper_id, target_id, mode, direction)
  values (v_uid, p_candidate_id, v_mode, p_direction)
  on conflict (swiper_id, target_id, mode) do update
    set direction = excluded.direction, created_at = now();

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

    -- ส่งสัญญาณ Realtime แจ้งเตือน Match
    perform private.emit_user_inbox_signal(v_uid, 'new_match', v_conv_id);
    perform private.emit_user_inbox_signal(p_candidate_id, 'new_match', v_conv_id);

    -- บันทึกการแจ้งเตือนให้กับทั้ง 2 ฝ่าย
    perform private.create_notification(
      v_uid,
      'new_match',
      '✨ It''s a Match! มีคนใจตรงกับคุณ',
      'เริ่มทักทายกันได้แล้ววันนี้',
      jsonb_build_object('match_id', v_match_id, 'conversation_id', v_conv_id)
    );
    perform private.create_notification(
      p_candidate_id,
      'new_match',
      '✨ It''s a Match! มีคนใจตรงกับคุณ',
      'เริ่มทักทายกันได้แล้ววันนี้',
      jsonb_build_object('match_id', v_match_id, 'conversation_id', v_conv_id)
    );
  end if;

  return json_build_object(
    'matched', true,
    'match_id', v_match_id,
    'conversation_id', v_conv_id,
    'quota', private.swipe_quota_state(v_uid)
  );
end;
$$;

-- 5.9 Topup: mod_approve_topup_order
create or replace function public.mod_approve_topup_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod_id uuid := auth.uid();
  v_order private.topup_orders%rowtype;
begin
  perform private.assert_moderator();

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

  -- 1) เพิ่มเหรียญเข้ากระเป๋า coin_wallets
  insert into private.coin_wallets (user_id, balance, updated_at)
  values (v_order.user_id, v_order.total_coins, now())
  on conflict (user_id)
  do update set
    balance = private.coin_wallets.balance + excluded.balance,
    updated_at = now();

  -- 2) บันทึก coin_ledger
  insert into private.coin_ledger (user_id, delta, reason, reference_id)
  values (
    v_order.user_id,
    v_order.total_coins,
    'topup_package_' || v_order.package_id,
    v_order.id
  );

  -- 3) อัปเดตสถานะออเดอร์
  update private.topup_orders
  set status = 'approved',
      approved_at = now(),
      approved_by = v_mod_id
  where id = p_order_id;

  -- 4) ส่ง Notification ถึงผู้ใช้
  perform private.create_notification(
    v_order.user_id,
    'coin_credited',
    'เติมเหรียญสำเร็จ! 🪙',
    'ระบบได้เพิ่ม ' || v_order.total_coins::text || ' เหรียญ เข้ากระเป๋าของคุณเรียบร้อยแล้ว',
    jsonb_build_object('order_id', p_order_id, 'coins', v_order.total_coins)
  );

  return jsonb_build_object(
    'order_id', v_order.id,
    'user_id', v_order.user_id,
    'total_coins', v_order.total_coins,
    'status', 'approved'
  );
end;
$$;
