-- =============================================================================
-- เฟส 4: Bubble + แชท (แชทนามแฝง, เปิดตัวสองฝ่าย, แชท Match, เปิดรูปทีละขั้น, เตือนกลโกง)
-- ดู docs/SYSTEM_DESIGN.md หัวข้อ 5.3, 5.5, 6.3, 6.5
-- =============================================================================

set local check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 1) ตารางใน schema private
-- ---------------------------------------------------------------------------

create table private.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('anon', 'match')),
  match_id uuid,
  bubble_id uuid,
  reveal_stage smallint not null default 0 check (reveal_stage between 0 and 3),
  is_anonymous boolean not null default true,
  last_message_at timestamptz,
  closed_at timestamptz,
  closed_reason text,
  created_at timestamptz not null default now()
);
create index conversations_last_message_idx on private.conversations (last_message_at desc);
alter table private.conversations enable row level security;

create table private.conversation_members (
  conversation_id uuid not null references private.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  alias text not null,
  alias_color text not null,
  message_count int not null default 0 check (message_count >= 0),
  last_read_at timestamptz,
  wants_reveal boolean not null default false,
  wants_photo_unlock boolean not null default false,
  muted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on private.conversation_members (user_id);
alter table private.conversation_members enable row level security;

create table private.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references private.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  kind text not null default 'text' check (kind in ('text', 'system', 'polite_close')),
  scam_warning boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);
create index messages_conversation_created_idx on private.messages (conversation_id, created_at desc, id desc);
alter table private.messages enable row level security;

create table private.bubbles (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references private.posts (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  sender_alias text not null,
  sender_alias_color text not null,
  recipient_alias text not null,
  recipient_alias_color text not null,
  message text not null check (char_length(trim(message)) between 1 and 200),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  conversation_id uuid references private.conversations (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (post_id, sender_id),
  check (sender_id <> recipient_id)
);
create index bubbles_recipient_status_idx on private.bubbles (recipient_id, status, created_at desc);
create index bubbles_sender_idx on private.bubbles (sender_id, created_at desc);
alter table private.bubbles enable row level security;

alter table private.conversations
  add constraint conversations_bubble_id_fkey
  foreign key (bubble_id) references private.bubbles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2) Helper functions ใน private
-- ---------------------------------------------------------------------------

-- ตรวจคำเสี่ยงกลโกงในแชท (โอนเงิน, ยืมเงิน, ลงทุน, crypto, พนัน — ตาม POLICY.md 7 และ SYSTEM_DESIGN.md 6.5)
create function private.contains_scam_keywords(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_text ~* '(โอนเงิน|ยืมเงิน|ขอเลขบัญชี|พร้อมเพย์|promptpay|ลงทุน|เทรดหุ้น|เทรดทอง|คริปโต|crypto|usdt|forex|ปั่นสล็อต|พนันออนไลน์|เว็บพนัน)',
    false
  );
$$;

-- คำนวณขั้นเปิดรูป (reveal_stage 0..3) จากจำนวนข้อความที่ "ต่างคนต่างส่ง" (คนเดียวพิมพ์รัวไม่ได้ผล)
-- Stage 0: เริ่มต้น (หรือยังเป็นแชทนามแฝง)
-- Stage 1: ต่างคนต่างส่ง >= 5 ข้อความ (เห็นรูปที่ 1)
-- Stage 2: ต่างคนต่างส่ง >= 15 ข้อความ (เห็นรูปที่ 1-3)
-- Stage 3: ต่างคนต่างส่ง >= 30 ข้อความ หรือทั้งคู่กดเปิดรูปทั้งหมด (เห็นทุกรูป)
create function private.recompute_reveal_stage(p_conversation_id uuid)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_anon boolean;
  v_current_stage smallint;
  v_min_msgs int;
  v_both_unlock boolean;
  v_member_count int;
  v_target_stage smallint := 0;
begin
  select c.is_anonymous, c.reveal_stage
  into v_is_anon, v_current_stage
  from private.conversations c
  where c.id = p_conversation_id;

  if v_is_anon is null or v_is_anon then
    return 0;
  end if;

  select
    count(*)::int,
    coalesce(min(cm.message_count), 0),
    coalesce(bool_and(cm.wants_photo_unlock), false)
  into v_member_count, v_min_msgs, v_both_unlock
  from private.conversation_members cm
  where cm.conversation_id = p_conversation_id;

  if v_member_count < 2 then
    return v_current_stage;
  end if;

  if v_both_unlock or v_min_msgs >= 30 then
    v_target_stage := 3;
  elsif v_min_msgs >= 15 then
    v_target_stage := 2;
  elsif v_min_msgs >= 5 then
    v_target_stage := 1;
  else
    v_target_stage := 0;
  end if;

  v_target_stage := greatest(v_current_stage, v_target_stage);

  if v_target_stage <> v_current_stage then
    update private.conversations
    set reveal_stage = v_target_stage
    where id = p_conversation_id;
  end if;

  return v_target_stage;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) RPC สำหรับ Bubble (ทักเจ้าของโพสต์แบบไม่ระบุตัวตน)
-- ---------------------------------------------------------------------------

create function public.send_bubble(p_post_id uuid, p_message text)
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
begin
  perform private.check_rate('send_bubble', v_uid::text, 20, interval '1 day');

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

-- ดู Bubble ที่ได้รับและที่ส่งไป (ไม่คืน sender_id / recipient_id เด็ดขาด)
create function public.get_my_bubbles()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_incoming json;
  v_outgoing json;
begin
  select coalesce(
    json_agg(
      json_build_object(
        'id', b.id,
        'post_id', b.post_id,
        'post_body_preview', left(po.body, 100),
        'sender_alias', b.sender_alias,
        'sender_alias_color', b.sender_alias_color,
        'message', b.message,
        'status', b.status,
        'conversation_id', b.conversation_id,
        'created_at', b.created_at
      )
      order by b.created_at desc
    ),
    '[]'::json
  ) into v_incoming
  from private.bubbles b
  join private.posts po on po.id = b.post_id
  where b.recipient_id = v_uid
    and not private.is_blocked(v_uid, b.sender_id)
    and private.user_state(b.sender_id) = 'active';

  select coalesce(
    json_agg(
      json_build_object(
        'id', b.id,
        'post_id', b.post_id,
        'post_body_preview', left(po.body, 100),
        'recipient_alias', b.recipient_alias,
        'recipient_alias_color', b.recipient_alias_color,
        'message', b.message,
        'status', b.status,
        'conversation_id', b.conversation_id,
        'created_at', b.created_at
      )
      order by b.created_at desc
    ),
    '[]'::json
  ) into v_outgoing
  from private.bubbles b
  join private.posts po on po.id = b.post_id
  where b.sender_id = v_uid
    and not private.is_blocked(v_uid, b.recipient_id)
    and private.user_state(b.recipient_id) = 'active';

  return json_build_object(
    'incoming', v_incoming,
    'outgoing', v_outgoing
  );
end;
$$;

-- ตอบรับหรือปฏิเสธ Bubble (ถ้าตอบรับ → สร้างห้องแชทนามแฝงทันที)
create function public.respond_bubble(p_bubble_id uuid, p_accept boolean)
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

    return json_build_object(
      'id', p_bubble_id,
      'status', 'declined',
      'conversation_id', null
    );
  end if;

  -- สร้างห้องแชทนามแฝง
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

  -- นำข้อความแรกจาก bubble เข้าเป็นข้อความแรกในห้องแชท
  insert into private.messages (
    conversation_id, sender_id, body, kind, scam_warning
  )
  values (
    v_conv_id, v_bubble.sender_id, v_bubble.message, 'text', private.contains_scam_keywords(v_bubble.message)
  );

  update private.bubbles
  set status = 'accepted', conversation_id = v_conv_id, responded_at = now()
  where id = p_bubble_id;

  return json_build_object(
    'id', p_bubble_id,
    'status', 'accepted',
    'conversation_id', v_conv_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) RPC สำหรับแชท (ทั้งแชทนามแฝงและแชท Match)
-- ---------------------------------------------------------------------------

-- รายการแชททั้งหมดของตัวเอง (ถ้า is_anonymous = true จะไม่ส่ง user_id และ display_name ของคู่สนทนาออกไป)
create function public.get_conversations()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
begin
  return coalesce(
    (
      select json_agg(row_to_json(t))
      from (
        select
          c.id,
          c.kind,
          c.is_anonymous,
          c.reveal_stage,
          c.match_id,
          c.closed_at,
          c.closed_reason,
          c.last_message_at,
          json_build_object(
            'user_id', case when c.is_anonymous then null else other.user_id end,
            'display_name', case when c.is_anonymous then null else p.display_name end,
            'alias', other.alias,
            'alias_color', other.alias_color
          ) as peer,
          me.message_count as my_message_count,
          other.message_count as peer_message_count,
          me.wants_reveal as my_wants_reveal,
          other.wants_reveal as peer_wants_reveal,
          (
            select left(m.body, 100)
            from private.messages m
            where m.conversation_id = c.id and m.deleted_at is null
            order by m.created_at desc, m.id desc
            limit 1
          ) as last_message_preview,
          (
            select count(*)::int
            from private.messages m
            where m.conversation_id = c.id
              and m.deleted_at is null
              and m.sender_id <> v_uid
              and (me.last_read_at is null or m.created_at > me.last_read_at)
          ) as unread_count
        from private.conversations c
        join private.conversation_members me on me.conversation_id = c.id and me.user_id = v_uid
        join private.conversation_members other on other.conversation_id = c.id and other.user_id <> v_uid
        join public.profiles p on p.id = other.user_id
        where not private.is_blocked(v_uid, other.user_id)
        order by coalesce(c.last_message_at, c.created_at) desc, c.id desc
      ) t
    ),
    '[]'::json
  );
end;
$$;

-- ดูรายละเอียดห้องแชท + ความคืบหน้าการเปิดรูป
create function public.get_conversation(p_conversation_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_conv private.conversations%rowtype;
  v_me private.conversation_members%rowtype;
  v_other private.conversation_members%rowtype;
  v_peer_name text;
  v_next_threshold int;
begin
  select * into v_conv from private.conversations where id = p_conversation_id;
  if v_conv.id is null then
    raise exception 'conversation_not_found' using errcode = '22023';
  end if;

  select * into v_me
  from private.conversation_members
  where conversation_id = p_conversation_id and user_id = v_uid;

  if v_me.user_id is null then
    raise exception 'conversation_not_found' using errcode = '22023';
  end if;

  select * into v_other
  from private.conversation_members
  where conversation_id = p_conversation_id and user_id <> v_uid
  limit 1;

  if v_other.user_id is null or private.is_blocked(v_uid, v_other.user_id) then
    raise exception 'conversation_not_found' using errcode = '22023';
  end if;

  if not v_conv.is_anonymous then
    select p.display_name into v_peer_name from public.profiles p where p.id = v_other.user_id;
  end if;

  v_next_threshold := case v_conv.reveal_stage
    when 0 then 5
    when 1 then 15
    when 2 then 30
    else null
  end;

  return json_build_object(
    'id', v_conv.id,
    'kind', v_conv.kind,
    'is_anonymous', v_conv.is_anonymous,
    'reveal_stage', v_conv.reveal_stage,
    'match_id', v_conv.match_id,
    'closed_at', v_conv.closed_at,
    'closed_reason', v_conv.closed_reason,
    'peer', json_build_object(
      'user_id', case when v_conv.is_anonymous then null else v_other.user_id end,
      'display_name', v_peer_name,
      'alias', v_other.alias,
      'alias_color', v_other.alias_color
    ),
    'my_message_count', v_me.message_count,
    'peer_message_count', v_other.message_count,
    'my_wants_reveal', v_me.wants_reveal,
    'peer_wants_reveal', v_other.wants_reveal,
    'my_wants_photo_unlock', v_me.wants_photo_unlock,
    'peer_wants_photo_unlock', v_other.wants_photo_unlock,
    'next_stage_target_messages', v_next_threshold,
    'my_messages_needed_for_next_stage', case
      when v_conv.is_anonymous or v_next_threshold is null then null
      else greatest(0, v_next_threshold - v_me.message_count)
    end,
    'peer_messages_needed_for_next_stage', case
      when v_conv.is_anonymous or v_next_threshold is null then null
      else greatest(0, v_next_threshold - v_other.message_count)
    end
  );
end;
$$;

-- อ่านข้อความในแชท (คืนเฉพาะ is_mine ไม่เคยคืน sender_id)
create function public.get_messages(
  p_conversation_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit int default 50
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_other_id uuid;
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if not exists (
    select 1 from private.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = v_uid
  ) then
    raise exception 'conversation_not_found' using errcode = '22023';
  end if;

  select cm.user_id into v_other_id
  from private.conversation_members cm
  where cm.conversation_id = p_conversation_id and cm.user_id <> v_uid
  limit 1;

  if v_other_id is not null and private.is_blocked(v_uid, v_other_id) then
    raise exception 'conversation_not_found' using errcode = '22023';
  end if;

  return coalesce(
    (
      select json_agg(row_to_json(t))
      from (
        select
          m.id,
          m.body,
          m.kind,
          (m.sender_id = v_uid) as is_mine,
          m.scam_warning,
          m.created_at
        from private.messages m
        where m.conversation_id = p_conversation_id
          and m.deleted_at is null
          and (
            p_before_created_at is null
            or (m.created_at, m.id) < (
              p_before_created_at,
              coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
            )
          )
        order by m.created_at desc, m.id desc
        limit v_limit
      ) t
    ),
    '[]'::json
  );
end;
$$;

-- ส่งข้อความในแชท (จำกัด 30 ข้อความ/นาที + อัปเดตขั้นเปิดรูปอัตโนมัติ)
create function public.send_message(p_conversation_id uuid, p_body text)
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

  -- ถ้ายังเป็นแชทนามแฝง ห้ามส่งเบอร์/LINE/ลิงก์ เพื่อไม่ให้ข้ามขั้นตอนการกดเปิดตัวทั้งสองฝ่าย
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

  -- เมื่อมีข้อความแรกของ match → ล้างวันหมดอายุ 48 ชม. (SYSTEM_DESIGN.md หัวข้อ 6.5 ข้อ 4)
  if v_conv.match_id is not null then
    update private.matches
    set expires_at = null
    where id = v_conv.match_id and expires_at is not null;
  end if;

  v_stage := private.recompute_reveal_stage(p_conversation_id);

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

-- อ่านข้อความแล้ว
create function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
begin
  update private.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = v_uid;
end;
$$;

-- กดขอ "เปิดตัว" ในแชทนามแฝง (ต้องกดทั้งสองฝ่ายถึงจะเปิดโปรไฟล์จริงและสร้าง Match)
create function public.request_reveal(p_conversation_id uuid)
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

  -- ถ้าอีกฝ่ายยังไม่กดเปิดตัว → ยังเป็นแชทนามแฝงเหมือนเดิม
  if not coalesce(v_other_wants, false) then
    return json_build_object(
      'revealed', false,
      'is_anonymous', v_conv.is_anonymous,
      'match_id', v_conv.match_id,
      'reveal_stage', v_conv.reveal_stage
    );
  end if;

  -- ทั้งสองฝ่ายกดเปิดตัวแล้ว!
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
    values (p_conversation_id, v_uid, 'ทั้งคู่กดเปิดตัวแล้ว ตอนนี้เห็นโปรไฟล์ของกันและกันได้แล้ว', 'system');
  else
    v_match_id := v_conv.match_id;
  end if;

  v_stage := private.recompute_reveal_stage(p_conversation_id);

  return json_build_object(
    'revealed', true,
    'is_anonymous', false,
    'match_id', v_match_id,
    'reveal_stage', v_stage
  );
end;
$$;

-- กดขอ "เปิดรูปทั้งหมด" (เมื่อทั้งคู่กดในแชทที่เปิดตัวแล้ว → reveal_stage = 3 ทันที)
create function public.request_photo_unlock(p_conversation_id uuid)
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

  return json_build_object(
    'reveal_stage', v_stage,
    'unlocked_all', (v_stage = 3)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Grant สิทธิ์ให้ authenticated
-- ---------------------------------------------------------------------------
grant execute on function public.send_bubble(uuid, text) to authenticated;
grant execute on function public.get_my_bubbles() to authenticated;
grant execute on function public.respond_bubble(uuid, boolean) to authenticated;
grant execute on function public.get_conversations() to authenticated;
grant execute on function public.get_conversation(uuid) to authenticated;
grant execute on function public.get_messages(uuid, timestamptz, uuid, int) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.request_reveal(uuid) to authenticated;
grant execute on function public.request_photo_unlock(uuid) to authenticated;
