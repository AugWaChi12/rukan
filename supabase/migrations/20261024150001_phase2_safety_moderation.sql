-- =============================================================================
-- เฟส 2: ความปลอดภัย + ดูแลชุมชน (Blocks, Reports, Moderation, Appeals, Audit Log)
-- ดู docs/SYSTEM_DESIGN.md หัวข้อ 5.7, 6.7 และ docs/POLICY.md หัวข้อ 5
-- =============================================================================

set local check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 1) ตารางใน schema private (เปิด RLS ทุกตาราง ไม่มี policy = เข้าผ่าน RPC เท่านั้น)
-- ---------------------------------------------------------------------------

-- การบล็อก — เก็บ is_anonymous_block เพื่อกันคนใช้ฟีเจอร์บล็อกโพสต์ใน Space แล้วไปเปิดดูรายชื่อที่บล็อกเพื่อหาตัวตนจริง
create table private.blocks (
  id uuid not null default gen_random_uuid() unique,
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  is_anonymous_block boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_id_idx on private.blocks (blocked_id);
alter table private.blocks enable row level security;

-- รายงานความผิดปกติ — ระบบเติม target_user_id ให้ฝั่ง server (client ไม่ต้องรู้ user_id ของเป้าหมาย)
create table private.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'reply', 'message', 'profile', 'conversation')),
  target_id uuid not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  reason text not null check (
    reason in (
      'harassment',
      'doxxing',
      'scam',
      'nsfw',
      'spam',
      'impersonation',
      'underage',
      'self_harm',
      'threat',
      'other'
    )
  ),
  details text check (details is null or char_length(details) <= 500),
  severity smallint not null default 1 check (severity between 1 and 4),
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  assigned_to uuid references public.profiles (id) on delete set null,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_status_severity_idx on private.reports (status, severity desc, created_at asc);
create index reports_target_user_idx on private.reports (target_user_id);
alter table private.reports enable row level security;

create trigger reports_set_updated_at
  before update on private.reports
  for each row execute function public.set_updated_at();

-- ประวัติการลงโทษ + การยื่นอุทธรณ์ (ตาม POLICY.md หัวข้อ 5)
create table private.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('warn', 'hide_content', 'suspend', 'ban', 'unban')),
  level smallint not null check (level between 1 and 4),
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  until timestamptz,
  report_id uuid references private.reports (id) on delete set null,
  target_type text check (target_type is null or target_type in ('post', 'reply', 'message', 'profile', 'conversation')),
  target_id uuid,
  moderator_id uuid references public.profiles (id) on delete set null,
  appeal_text text check (appeal_text is null or char_length(appeal_text) <= 500),
  appealed_at timestamptz,
  appeal_status text check (appeal_status is null or appeal_status in ('pending', 'accepted', 'rejected')),
  appeal_reviewed_by uuid references public.profiles (id) on delete set null,
  appeal_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index moderation_actions_user_id_idx on private.moderation_actions (user_id, created_at desc);
alter table private.moderation_actions enable row level security;

-- บันทึกทุกครั้งที่ moderator เปิดดูตัวตนจริงของเนื้อหาไม่ระบุตัวตน (ตาม POLICY.md หัวข้อ 6.2)
create table private.identity_reveals_log (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'reply', 'bubble', 'conversation')),
  target_id uuid not null,
  revealed_user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now()
);
create index identity_reveals_log_target_idx on private.identity_reveals_log (target_type, target_id);
alter table private.identity_reveals_log enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Helper functions ใน private
-- ---------------------------------------------------------------------------

-- บล็อกกันทางใดทางหนึ่ง = ห้ามเห็นกันทุกที่
create function private.is_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from private.blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

-- ต้องเป็น moderator เท่านั้น
create function private.assert_moderator()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_signed_in();
begin
  if not private.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- หา user_id เป้าหมายจาก target_type + target_id และบอกด้วยว่าเป็นการบล็อกจากบริบทไม่ระบุตัวตนหรือไม่
create function private.resolve_target_user(
  p_caller uuid,
  p_target_type text,
  p_target_id uuid,
  out target_user_id uuid,
  out is_anonymous_context boolean
)
returns record
language plpgsql
stable
set search_path = ''
as $$
begin
  is_anonymous_context := false;

  if p_target_type = 'profile' then
    select p.id into target_user_id
    from public.profiles p
    where p.id = p_target_id;
  elsif p_target_type = 'post' then
    is_anonymous_context := true;
    select po.author_id into target_user_id
    from private.posts po
    where po.id = p_target_id and po.deleted_at is null;
  elsif p_target_type = 'reply' then
    is_anonymous_context := true;
    select r.author_id into target_user_id
    from private.post_replies r
    where r.id = p_target_id and r.deleted_at is null;
  elsif p_target_type = 'message' then
    select m.sender_id, c.is_anonymous
    into target_user_id, is_anonymous_context
    from private.messages m
    join private.conversations c on c.id = m.conversation_id
    join private.conversation_members me on me.conversation_id = c.id and me.user_id = p_caller
    where m.id = p_target_id and m.deleted_at is null;
  elsif p_target_type = 'conversation' then
    select other.user_id, c.is_anonymous
    into target_user_id, is_anonymous_context
    from private.conversations c
    join private.conversation_members me on me.conversation_id = c.id and me.user_id = p_caller
    join private.conversation_members other on other.conversation_id = c.id and other.user_id <> p_caller
    where c.id = p_target_id
    limit 1;
  else
    raise exception 'invalid_target_type' using errcode = '22023';
  end if;

  if target_user_id is null then
    raise exception 'target_not_found' using errcode = '22023';
  end if;

  if target_user_id = p_caller then
    raise exception 'cannot_target_self' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) RPC สำหรับผู้ใช้ (บล็อก / รายงาน / ดูประวัติการลงโทษ / อุทธรณ์)
-- ---------------------------------------------------------------------------

create function public.block_user_from(p_target_type text, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_resolved record;
  v_pair_a uuid;
  v_pair_b uuid;
begin
  perform private.check_rate('block_user', v_uid::text, 50, interval '1 day');

  v_resolved := private.resolve_target_user(v_uid, p_target_type, p_target_id);

  insert into private.blocks (blocker_id, blocked_id, is_anonymous_block)
  values (v_uid, v_resolved.target_user_id, v_resolved.is_anonymous_context)
  on conflict (blocker_id, blocked_id) do nothing;

  -- ปิด match ที่มีร่วมกัน
  v_pair_a := least(v_uid, v_resolved.target_user_id);
  v_pair_b := greatest(v_uid, v_resolved.target_user_id);

  update private.matches
  set status = 'closed', closed_by = v_uid, closed_reason = 'blocked'
  where user_a = v_pair_a and user_b = v_pair_b and status = 'active';

  -- ปิด conversation ที่มีร่วมกัน
  update private.conversations c
  set closed_at = coalesce(c.closed_at, now()),
      closed_reason = coalesce(c.closed_reason, 'blocked')
  where c.closed_at is null
    and exists (
      select 1 from private.conversation_members cm1
      where cm1.conversation_id = c.id and cm1.user_id = v_uid
    )
    and exists (
      select 1 from private.conversation_members cm2
      where cm2.conversation_id = c.id and cm2.user_id = v_resolved.target_user_id
    );

  -- ปฏิเสธ bubble ที่ค้างอยู่ระหว่างกัน
  update private.bubbles b
  set status = 'declined', responded_at = now()
  where b.status = 'pending'
    and (
      (b.sender_id = v_uid and b.recipient_id = v_resolved.target_user_id)
      or (b.sender_id = v_resolved.target_user_id and b.recipient_id = v_uid)
    );
end;
$$;

-- ปลดบล็อกด้วย id ของรายการบล็อก (ใช้ block id แทน user_id เพื่อไม่ให้รั่วตัวตนกรณีบล็อกจากโพสต์ไม่ระบุตัวตน)
create function public.unblock_user(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
begin
  delete from private.blocks b
  where b.blocker_id = v_uid
    and (b.id = p_block_id or (not b.is_anonymous_block and b.blocked_id = p_block_id));
end;
$$;

-- ดูรายการที่ตัวเองบล็อกไว้ (ถ้าบล็อกจาก Space/แชทนามแฝง จะไม่เปิดเผย user_id และชื่อจริง)
create function public.get_my_blocks()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
begin
  return coalesce(
    (
      select json_agg(
        json_build_object(
          'id', b.id,
          'blocked_user_id', case when b.is_anonymous_block then null else b.blocked_id end,
          'display_name', case when b.is_anonymous_block then null else p.display_name end,
          'is_anonymous', b.is_anonymous_block,
          'created_at', b.created_at
        )
        order by b.created_at desc
      )
      from private.blocks b
      join public.profiles p on p.id = b.blocked_id
      where b.blocker_id = v_uid
    ),
    '[]'::json
  );
end;
$$;

-- รายงานโพสต์ / คอมเมนต์ / ข้อความ / โปรไฟล์ / แชท (จำกัด 10 ครั้ง/วัน ตาม SYSTEM_DESIGN.md หัวข้อ 10)
create function public.report_target(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_resolved record;
  v_details text := nullif(trim(coalesce(p_details, '')), '');
  v_severity smallint;
  v_report_id uuid;
begin
  perform private.check_rate('report', v_uid::text, 10, interval '1 day');

  if p_reason is null or p_reason not in (
    'harassment', 'doxxing', 'scam', 'nsfw', 'spam',
    'impersonation', 'underage', 'self_harm', 'threat', 'other'
  ) then
    raise exception 'invalid_report_reason' using errcode = '22023';
  end if;

  if v_details is not null and char_length(v_details) > 500 then
    raise exception 'report_details_too_long' using errcode = '22023';
  end if;

  v_resolved := private.resolve_target_user(v_uid, p_target_type, p_target_id);

  v_severity := case
    when p_reason in ('underage', 'threat') then 4
    when p_reason in ('scam', 'doxxing', 'nsfw', 'self_harm') then 3
    when p_reason in ('harassment', 'impersonation') then 2
    else 1
  end;

  insert into private.reports (
    reporter_id, target_type, target_id, target_user_id, reason, details, severity
  )
  values (
    v_uid, p_target_type, p_target_id, v_resolved.target_user_id, p_reason, v_details, v_severity
  )
  returning id into v_report_id;

  return json_build_object(
    'id', v_report_id,
    'status', 'open',
    'care_notice', (p_reason = 'self_harm')
  );
end;
$$;

-- ผู้ใช้ดูประวัติการถูกเตือน/ระงับ/แบนของตัวเอง (เรียกได้แม้ถูกระงับอยู่ เพื่อดูเหตุผลและยื่นอุทธรณ์)
create function public.get_my_moderation_history()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_signed_in();
begin
  return coalesce(
    (
      select json_agg(
        json_build_object(
          'id', ma.id,
          'action', ma.action,
          'level', ma.level,
          'reason', ma.reason,
          'until', ma.until,
          'appeal_text', ma.appeal_text,
          'appealed_at', ma.appealed_at,
          'appeal_status', ma.appeal_status,
          'created_at', ma.created_at
        )
        order by ma.created_at desc
      )
      from private.moderation_actions ma
      where ma.user_id = v_uid
    ),
    '[]'::json
  );
end;
$$;

-- ยื่นอุทธรณ์ภายใน 14 วันหลังถูกลงโทษ (POLICY.md หัวข้อ 5)
create function public.submit_appeal(p_action_id uuid, p_appeal_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_signed_in();
  v_text text := nullif(trim(coalesce(p_appeal_text, '')), '');
  v_action private.moderation_actions%rowtype;
begin
  perform private.check_rate('submit_appeal', v_uid::text, 5, interval '1 day');

  if v_text is null or char_length(v_text) > 500 then
    raise exception 'invalid_appeal_text' using errcode = '22023';
  end if;

  select * into v_action
  from private.moderation_actions ma
  where ma.id = p_action_id and ma.user_id = v_uid;

  if v_action.id is null then
    raise exception 'moderation_action_not_found' using errcode = '22023';
  end if;

  if v_action.action = 'unban' then
    raise exception 'cannot_appeal_unban' using errcode = '22023';
  end if;

  if v_action.appeal_status is not null then
    raise exception 'appeal_already_submitted' using errcode = '22023';
  end if;

  if v_action.created_at < now() - interval '14 days' then
    raise exception 'appeal_window_expired' using errcode = '22023';
  end if;

  update private.moderation_actions
  set appeal_text = v_text,
      appealed_at = now(),
      appeal_status = 'pending'
  where id = p_action_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) RPC สำหรับ Moderator (ใช้บนเว็บ /admin เท่านั้น — เช็ค private.assert_moderator())
-- ---------------------------------------------------------------------------

create function public.mod_list_reports(
  p_status text default 'open',
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
          r.id,
          r.target_type,
          r.target_id,
          r.reason,
          r.details,
          r.severity,
          r.status,
          r.assigned_to,
          r.resolved_by,
          r.resolved_at,
          r.created_at
        from private.reports r
        where (p_status is null or r.status = p_status)
        order by r.severity desc, r.created_at asc
        limit v_limit
      ) t
    ),
    '[]'::json
  );
end;
$$;

create function public.mod_get_report(p_report_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report private.reports%rowtype;
  v_content json;
  v_prior_actions int;
begin
  perform private.assert_moderator();

  select * into v_report from private.reports where id = p_report_id;
  if v_report.id is null then
    raise exception 'report_not_found' using errcode = '22023';
  end if;

  if v_report.target_type = 'post' then
    select json_build_object(
      'alias', po.alias,
      'body', po.body,
      'status', po.status,
      'created_at', po.created_at
    ) into v_content
    from private.posts po where po.id = v_report.target_id;
  elsif v_report.target_type = 'reply' then
    select json_build_object(
      'post_id', rp.post_id,
      'alias', rp.alias,
      'body', rp.body,
      'status', rp.status,
      'created_at', rp.created_at
    ) into v_content
    from private.post_replies rp where rp.id = v_report.target_id;
  elsif v_report.target_type = 'message' then
    select json_build_object(
      'conversation_id', m.conversation_id,
      'body', m.body,
      'scam_warning', m.scam_warning,
      'created_at', m.created_at
    ) into v_content
    from private.messages m where m.id = v_report.target_id;
  elsif v_report.target_type = 'profile' then
    select json_build_object(
      'display_name', p.display_name,
      'bio', p.bio,
      'occupation', p.occupation
    ) into v_content
    from public.profiles p where p.id = v_report.target_id;
  end if;

  select count(*)::int into v_prior_actions
  from private.moderation_actions ma
  where ma.user_id = v_report.target_user_id;

  return json_build_object(
    'id', v_report.id,
    'target_type', v_report.target_type,
    'target_id', v_report.target_id,
    'target_user_id', case when v_report.target_type in ('post', 'reply') then null else v_report.target_user_id end,
    'reason', v_report.reason,
    'details', v_report.details,
    'severity', v_report.severity,
    'status', v_report.status,
    'content', v_content,
    'prior_action_count', coalesce(v_prior_actions, 0),
    'created_at', v_report.created_at
  );
end;
$$;

-- เปิดดูตัวตนจริงของคนโพสต์ใน Space/Bubble/แชทนามแฝง (บันทึก audit log ทุกครั้งตาม POLICY.md 6.2)
create function public.mod_reveal_author(
  p_target_type text,
  p_target_id uuid,
  p_reason text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_author_id uuid;
  v_profile public.profiles%rowtype;
begin
  if v_reason is null or char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    raise exception 'invalid_reveal_reason' using errcode = '22023';
  end if;

  if p_target_type = 'post' then
    select po.author_id into v_author_id from private.posts po where po.id = p_target_id;
  elsif p_target_type = 'reply' then
    select rp.author_id into v_author_id from private.post_replies rp where rp.id = p_target_id;
  elsif p_target_type = 'bubble' then
    select b.sender_id into v_author_id from private.bubbles b where b.id = p_target_id;
  elsif p_target_type = 'conversation' then
    select cm.user_id into v_author_id
    from private.conversation_members cm
    where cm.conversation_id = p_target_id
    order by cm.created_at asc
    limit 1;
  else
    raise exception 'invalid_target_type' using errcode = '22023';
  end if;

  if v_author_id is null then
    raise exception 'target_not_found' using errcode = '22023';
  end if;

  insert into private.identity_reveals_log (
    moderator_id, target_type, target_id, revealed_user_id, reason
  )
  values (v_mod, p_target_type, p_target_id, v_author_id, v_reason);

  select * into v_profile from public.profiles where id = v_author_id;

  return json_build_object(
    'user_id', v_author_id,
    'display_name', v_profile.display_name,
    'verification_level', v_profile.verification_level,
    'state', private.user_state(v_author_id)
  );
end;
$$;

-- สั่งลงโทษ / ซ่อนเนื้อหา / ระงับชั่วคราว / แบนถาวร / ปลดแบน
create function public.mod_take_action(
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
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_action_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
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
    p_user_id, p_action, p_level, v_reason,
    case when p_action = 'suspend' then p_until else null end,
    p_report_id, p_target_type, p_target_id, v_mod
  )
  returning id into v_action_id;

  -- ซ่อนเนื้อหาที่ผิดกติกา
  if p_target_type = 'post' and p_target_id is not null and p_action in ('hide_content', 'suspend', 'ban') then
    update private.posts set status = 'hidden' where id = p_target_id;
  elsif p_target_type = 'reply' and p_target_id is not null and p_action in ('hide_content', 'suspend', 'ban') then
    update private.post_replies set status = 'hidden' where id = p_target_id;
  end if;

  -- อัปเดตสถานะบัญชีใน private.user_status
  if p_action = 'suspend' then
    insert into private.user_status (user_id, state, until, reason)
    values (p_user_id, 'suspended', p_until, v_reason)
    on conflict (user_id) do update
      set state = 'suspended', until = excluded.until, reason = excluded.reason;
  elsif p_action = 'ban' then
    insert into private.user_status (user_id, state, until, reason)
    values (p_user_id, 'banned', null, v_reason)
    on conflict (user_id) do update
      set state = 'banned', until = null, reason = excluded.reason;
  elsif p_action = 'unban' then
    insert into private.user_status (user_id, state, until, reason)
    values (p_user_id, 'active', null, null)
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
    'user_id', p_user_id,
    'state', private.user_state(p_user_id)
  );
end;
$$;

-- ตรวจคำอุทธรณ์ (POLICY.md หัวข้อ 5: คนตรวจซ้ำต้องไม่ใช่ moderator คนเดียวกับที่สั่งลงโทษ)
create function public.mod_review_appeal(p_action_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod uuid := private.assert_moderator();
  v_action private.moderation_actions%rowtype;
begin
  if p_decision is null or p_decision not in ('accepted', 'rejected') then
    raise exception 'invalid_appeal_decision' using errcode = '22023';
  end if;

  select * into v_action from private.moderation_actions where id = p_action_id;
  if v_action.id is null then
    raise exception 'moderation_action_not_found' using errcode = '22023';
  end if;

  if v_action.appeal_status is distinct from 'pending' then
    raise exception 'appeal_not_pending' using errcode = '22023';
  end if;

  if v_action.moderator_id = v_mod then
    raise exception 'same_moderator_cannot_review_appeal' using errcode = '42501';
  end if;

  update private.moderation_actions
  set appeal_status = p_decision,
      appeal_reviewed_by = v_mod,
      appeal_reviewed_at = now()
  where id = p_action_id;

  if p_decision = 'accepted' and v_action.action in ('suspend', 'ban') then
    update private.user_status
    set state = 'active', until = null, reason = null
    where user_id = v_action.user_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Grant สิทธิ์ให้ authenticated (moderator ก็เป็น authenticated ที่มี app_metadata.role = 'moderator')
-- ---------------------------------------------------------------------------
grant execute on function public.block_user_from(text, uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.get_my_blocks() to authenticated;
grant execute on function public.report_target(text, uuid, text, text) to authenticated;
grant execute on function public.get_my_moderation_history() to authenticated;
grant execute on function public.submit_appeal(uuid, text) to authenticated;
grant execute on function public.mod_list_reports(text, int) to authenticated;
grant execute on function public.mod_get_report(uuid) to authenticated;
grant execute on function public.mod_reveal_author(text, uuid, text) to authenticated;
grant execute on function public.mod_take_action(uuid, text, smallint, text, timestamptz, uuid, text, uuid) to authenticated;
grant execute on function public.mod_review_appeal(uuid, text) to authenticated;
