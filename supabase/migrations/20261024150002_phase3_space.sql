-- =============================================================================
-- เฟส 3: Space (โพสต์ไม่ระบุตัวตน, ตอบกลับ, ถูกใจ, เช็กอินอารมณ์, กรองข้อมูลติดต่อ)
-- ดู docs/SYSTEM_DESIGN.md หัวข้อ 5.3, 6.2, 10, 11 และ docs/POLICY.md หัวข้อ 4.2, 4.4
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) ตารางใน schema private (ไม่มี user_id ออกไปถึง client เด็ดขาด)
-- ---------------------------------------------------------------------------

create table private.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  alias text not null,
  alias_color text not null,
  body text not null check (char_length(trim(body)) between 1 and 500),
  area_id text references public.areas (id),
  age_band text check (age_band is null or age_band in ('18-21', '22-25', '26-30', '30+')),
  mood text check (mood is null or mood in ('happy', 'calm', 'tired', 'lonely', 'excited', 'overthinking')),
  status text not null default 'published' check (status in ('pending', 'published', 'hidden', 'removed')),
  like_count int not null default 0 check (like_count >= 0),
  reply_count int not null default 0 check (reply_count >= 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index posts_status_created_idx on private.posts (status, created_at desc, id desc);
create index posts_area_created_idx on private.posts (area_id, created_at desc);
create index posts_age_band_created_idx on private.posts (age_band, created_at desc);
create index posts_author_idx on private.posts (author_id);
alter table private.posts enable row level security;

create table private.post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references private.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  alias text not null,
  alias_color text not null,
  is_op boolean not null default false,
  body text not null check (char_length(trim(body)) between 1 and 300),
  status text not null default 'published' check (status in ('pending', 'published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index post_replies_post_created_idx on private.post_replies (post_id, created_at asc);
create index post_replies_author_idx on private.post_replies (author_id);
alter table private.post_replies enable row level security;

create table private.post_likes (
  post_id uuid not null references private.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on private.post_likes (user_id);
alter table private.post_likes enable row level security;

create table private.mood_checkins (
  user_id uuid not null references public.profiles (id) on delete cascade,
  checkin_date date not null default current_date,
  mood text not null check (mood in ('happy', 'calm', 'tired', 'lonely', 'excited', 'overthinking')),
  created_at timestamptz not null default now(),
  primary key (user_id, checkin_date)
);
alter table private.mood_checkins enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Helper functions + Triggers ใน private
-- ---------------------------------------------------------------------------

-- แปลงวันเกิดเป็นช่วงอายุสำหรับแท็บ "วัยเดียวกัน" (ไม่เปิดเผยวันเกิดและอายุจริง)
create function private.age_band_for(p_birthdate date)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_age int;
begin
  if p_birthdate is null then
    return null;
  end if;
  v_age := private.age_years(p_birthdate);
  if v_age <= 21 then
    return '18-21';
  elsif v_age <= 25 then
    return '22-25';
  elsif v_age <= 30 then
    return '26-30';
  else
    return '30+';
  end if;
end;
$$;

-- ตรวจจับเบอร์โทร / ลิงก์ / อีเมล / LINE ID / IG ในข้อความ Space (ตาม POLICY.md 4.2 และ SYSTEM_DESIGN.md 6.2)
create function private.contains_contact_or_pii(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_text ~* '(\+?66|0)[689][0-9 -]{7,11}'
    or p_text ~* '(https?://|www\.[a-z0-9])'
    or p_text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
    or p_text ~* '(line\s*id|ไอดีไลน์|แอดไลน์|ig\s*:|@[a-z0-9_.]{3,})',
    false
  );
$$;

-- ตรวจสัญญาณทำร้ายตัวเอง เพื่อแนบ care_notice (สายด่วนสุขภาพจิต 1323) โดยไม่ลงโทษผู้โพสต์ (POLICY.md 4.4)
create function private.contains_self_harm_signal(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_text ~* '(อยากตาย|ไม่อยากอยู่แล้ว|ฆ่าตัวตาย|ทำร้ายตัวเอง|suicide|kill myself|end my life)',
    false
  );
$$;

-- Trigger อัปเดต like_count และ reply_count บน private.posts อัตโนมัติ
create function private.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id uuid := coalesce(new.post_id, old.post_id);
begin
  update private.posts po
  set like_count = (select count(*)::int from private.post_likes pl where pl.post_id = v_post_id)
  where po.id = v_post_id;
  return null;
end;
$$;

create trigger post_likes_sync_count
  after insert or delete on private.post_likes
  for each row execute function private.sync_post_like_count();

create function private.sync_post_reply_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id uuid := coalesce(new.post_id, old.post_id);
begin
  update private.posts po
  set reply_count = (
    select count(*)::int
    from private.post_replies pr
    where pr.post_id = v_post_id
      and pr.status = 'published'
      and pr.deleted_at is null
  )
  where po.id = v_post_id;
  return null;
end;
$$;

create trigger post_replies_sync_count
  after insert or update or delete on private.post_replies
  for each row execute function private.sync_post_reply_count();

-- ---------------------------------------------------------------------------
-- 3) RPC สำหรับ Space
-- ---------------------------------------------------------------------------

-- โพสต์ใน Space (ต้องยืนยัน selfie แล้ว + จำกัด 5/ชม., 20/วัน)
create function public.create_post(
  p_body text,
  p_mood text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_alias text;
  v_alias_color text;
  v_area_id text;
  v_birthdate date;
  v_post private.posts%rowtype;
begin
  perform private.check_rate('post_hour', v_uid::text, 5, interval '1 hour');
  perform private.check_rate('post_day', v_uid::text, 20, interval '1 day');

  if v_body is null or char_length(v_body) > 500 then
    raise exception 'invalid_post_body' using errcode = '22023';
  end if;

  if p_mood is not null and p_mood not in ('happy', 'calm', 'tired', 'lonely', 'excited', 'overthinking') then
    raise exception 'invalid_mood' using errcode = '22023';
  end if;

  if private.contains_contact_or_pii(v_body) then
    raise exception 'contains_prohibited_contact' using errcode = '22023';
  end if;

  select a.alias, a.color, p.area_id, pp.birthdate
  into v_alias, v_alias_color, v_area_id, v_birthdate
  from public.profiles p
  join private.aliases a on a.user_id = p.id
  join private.profile_private pp on pp.user_id = p.id
  where p.id = v_uid;

  insert into private.posts (
    author_id, alias, alias_color, body, area_id, age_band, mood, status
  )
  values (
    v_uid, v_alias, v_alias_color, v_body, v_area_id, private.age_band_for(v_birthdate), p_mood, 'published'
  )
  returning * into v_post;

  return json_build_object(
    'id', v_post.id,
    'alias', v_post.alias,
    'alias_color', v_post.alias_color,
    'body', v_post.body,
    'mood', v_post.mood,
    'like_count', v_post.like_count,
    'reply_count', v_post.reply_count,
    'liked_by_me', false,
    'is_mine', true,
    'care_notice', private.contains_self_harm_signal(v_body),
    'created_at', v_post.created_at
  );
end;
$$;

-- อ่าน Feed ใน Space (ไม่มี author_id / user_id ในผลลัพธ์เด็ดขาด)
create function public.get_feed(
  p_tab text default 'all',
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit int default 20
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_tab text := coalesce(p_tab, 'all');
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 50));
  v_my_area text;
  v_my_age_band text;
begin
  if v_tab not in ('all', 'nearby', 'same_age') then
    raise exception 'invalid_feed_tab' using errcode = '22023';
  end if;

  select p.area_id, private.age_band_for(pp.birthdate)
  into v_my_area, v_my_age_band
  from public.profiles p
  join private.profile_private pp on pp.user_id = p.id
  where p.id = v_uid;

  return coalesce(
    (
      select json_agg(row_to_json(t))
      from (
        select
          po.id,
          po.alias,
          po.alias_color,
          po.body,
          po.mood,
          po.like_count,
          po.reply_count,
          exists (
            select 1 from private.post_likes pl
            where pl.post_id = po.id and pl.user_id = v_uid
          ) as liked_by_me,
          (po.author_id = v_uid) as is_mine,
          po.created_at
        from private.posts po
        where po.status = 'published'
          and po.deleted_at is null
          and not private.is_blocked(v_uid, po.author_id)
          and private.user_state(po.author_id) = 'active'
          and (v_tab <> 'nearby' or (v_my_area is not null and po.area_id = v_my_area))
          and (v_tab <> 'same_age' or (v_my_age_band is not null and po.age_band = v_my_age_band))
          and (
            p_before_created_at is null
            or (po.created_at, po.id) < (
              p_before_created_at,
              coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
            )
          )
        order by po.created_at desc, po.id desc
        limit v_limit
      ) t
    ),
    '[]'::json
  );
end;
$$;

-- ลบโพสต์ของตัวเอง (ซ่อนทันทีตาม POLICY.md 6.4)
create function public.delete_my_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_updated int;
begin
  update private.posts
  set status = 'removed', deleted_at = now()
  where id = p_post_id and author_id = v_uid and deleted_at is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'post_not_found' using errcode = '22023';
  end if;
end;
$$;

-- กดถูกใจโพสต์
create function public.like_post(p_post_id uuid)
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
end;
$$;

-- ยกเลิกถูกใจโพสต์
create function public.unlike_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
begin
  delete from private.post_likes
  where post_id = p_post_id and user_id = v_uid;
end;
$$;

-- ตอบกลับโพสต์ใน Space แบบไม่ระบุตัวตน (จำกัด 30/ชม. ตาม SYSTEM_DESIGN.md หัวข้อ 10)
create function public.reply_post(p_post_id uuid, p_body text)
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
    -- เจ้าของโพสต์ตอบกลับโพสต์ตัวเอง → ใช้นามแฝงเดียวกับโพสต์ + ป้าย is_op
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

-- ดูคอมเมนต์ของโพสต์ (ไม่มี author_id ออกไปเด็ดขาด)
create function public.get_replies(p_post_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_post private.posts%rowtype;
begin
  select * into v_post
  from private.posts po
  where po.id = p_post_id and po.status = 'published' and po.deleted_at is null;

  if v_post.id is null or private.is_blocked(v_uid, v_post.author_id) then
    raise exception 'post_not_found' using errcode = '22023';
  end if;

  return coalesce(
    (
      select json_agg(
        json_build_object(
          'id', pr.id,
          'post_id', pr.post_id,
          'alias', pr.alias,
          'alias_color', pr.alias_color,
          'is_op', pr.is_op,
          'is_mine', (pr.author_id = v_uid),
          'body', pr.body,
          'created_at', pr.created_at
        )
        order by pr.created_at asc, pr.id asc
      )
      from private.post_replies pr
      where pr.post_id = p_post_id
        and pr.status = 'published'
        and pr.deleted_at is null
        and not private.is_blocked(v_uid, pr.author_id)
        and private.user_state(pr.author_id) = 'active'
    ),
    '[]'::json
  );
end;
$$;

-- ลบคอมเมนต์ของตัวเอง
create function public.delete_my_reply(p_reply_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_updated int;
begin
  update private.post_replies
  set status = 'removed', deleted_at = now()
  where id = p_reply_id and author_id = v_uid and deleted_at is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'reply_not_found' using errcode = '22023';
  end if;
end;
$$;

-- เช็กอินอารมณ์ประจำวัน (วันละ 1 รายการ อัปเดตทับได้)
create function public.checkin_mood(p_mood text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
begin
  perform private.check_rate('checkin_mood', v_uid::text, 20, interval '1 day');

  if p_mood is null or p_mood not in ('happy', 'calm', 'tired', 'lonely', 'excited', 'overthinking') then
    raise exception 'invalid_mood' using errcode = '22023';
  end if;

  insert into private.mood_checkins (user_id, checkin_date, mood)
  values (v_uid, current_date, p_mood)
  on conflict (user_id, checkin_date) do update
    set mood = excluded.mood, created_at = now();

  return json_build_object(
    'checkin_date', current_date,
    'mood', p_mood
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Grant สิทธิ์ให้ authenticated
-- ---------------------------------------------------------------------------
grant execute on function public.create_post(text, text) to authenticated;
grant execute on function public.get_feed(text, timestamptz, uuid, int) to authenticated;
grant execute on function public.delete_my_post(uuid) to authenticated;
grant execute on function public.like_post(uuid) to authenticated;
grant execute on function public.unlike_post(uuid) to authenticated;
grant execute on function public.reply_post(uuid, text) to authenticated;
grant execute on function public.get_replies(uuid) to authenticated;
grant execute on function public.delete_my_reply(uuid) to authenticated;
grant execute on function public.checkin_mood(text) to authenticated;
