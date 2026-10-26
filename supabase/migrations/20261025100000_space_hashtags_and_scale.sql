-- =============================================================================
-- Space Hashtags (#แท็ก) + Trending + High-Scale Feed Optimization
-- ดู docs/SYSTEM_DESIGN.md หัวข้อ 5.3, 6.2 และ docs/DATABASE.md หัวข้อ 3–4
--
-- สิ่งที่เพิ่มและปรับปรุงใน migration นี้:
-- 1. ระบบ #Hashtag แบบ X: สกัด #แท็ก (ไทย/อังกฤษ/ตัวเลข สูงสุด 5 แท็ก/โพสต์) อัตโนมัติตอนโพสต์
--    เก็บใน private.posts.hashtags (text[]) พร้อม Partial GIN Index ค้นหาเร็วระดับมิลลิวินาที
-- 2. ตาราง private.hashtag_hourly_stats เก็บสถิติรายชั่วโมงด้วย Trigger อัตโนมัติ
--    สำหรับดึงเทรนด์มาแรง (get_trending_hashtags) โดยไม่ต้องสแกนตาราง posts
-- 3. โหมดเรียง Feed (p_sort: 'latest' | 'hot') คำนวณคะแนนความฮอต (Gravity decay)
--    และกรองตาม #แท็ก (p_hashtag) ใน get_feed()
-- 4. แก้คอขวดเมื่อผู้ใช้มหาศาล:
--    - เปลี่ยน Trigger นับ like_count / reply_count จาก SELECT COUNT(*) เป็น Delta (+1 / -1)
--    - เปลี่ยนการเช็กบล็อกและสถานะบัญชีใน get_feed / get_replies จากการเรียกฟังก์ชันรายแถว
--      เป็น Pre-fetched Array + Anti-Join (NOT EXISTS)
-- 5. ปรับรายการ mood ใน DB ให้ตรงกับ @rukan/shared ครบทั้ง 9 อารมณ์
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) ปรับปรุงตาราง private.posts และ private.mood_checkins + สร้างตารางสถิติเทรนด์
-- ---------------------------------------------------------------------------

alter table private.posts
  drop constraint if exists posts_mood_check;

alter table private.posts
  add constraint posts_mood_check check (
    mood is null or mood in (
      'lonely', 'tired', 'happy', 'anxious', 'bored',
      'hopeful', 'calm', 'excited', 'overthinking'
    )
  );

alter table private.mood_checkins
  drop constraint if exists mood_checkins_mood_check;

alter table private.mood_checkins
  add constraint mood_checkins_mood_check check (
    mood in (
      'lonely', 'tired', 'happy', 'anxious', 'bored',
      'hopeful', 'calm', 'excited', 'overthinking'
    )
  );

alter table private.posts
  add column if not exists hashtags text[] not null default '{}';

alter table private.posts
  drop constraint if exists posts_hashtags_limit_check;

alter table private.posts
  add constraint posts_hashtags_limit_check check (cardinality(hashtags) <= 5);

-- Partial GIN Index เฉพาะโพสต์ที่เผยแพร่อยู่ เพื่อให้ค้นหา #แท็ก เร็วและประหยัด RAM
create index if not exists posts_hashtags_gin_idx
  on private.posts using gin (hashtags)
  where status = 'published' and deleted_at is null;

-- Partial B-tree Indexes สำหรับการดึง Feed แต่ละแท็บโดยสแกนเฉพาะโพสต์ที่เผยแพร่อยู่
create index if not exists posts_published_created_idx
  on private.posts (created_at desc, id desc)
  where status = 'published' and deleted_at is null;

create index if not exists posts_published_area_created_idx
  on private.posts (area_id, created_at desc, id desc)
  where status = 'published' and deleted_at is null and area_id is not null;

create index if not exists posts_published_age_created_idx
  on private.posts (age_band, created_at desc, id desc)
  where status = 'published' and deleted_at is null and age_band is not null;

-- ตารางเก็บสถิติ #แท็ก รายชั่วโมง สำหรับคำนวณ Trending โดยไม่ต้องสแกน private.posts
create table if not exists private.hashtag_hourly_stats (
  tag text not null check (char_length(tag) between 1 and 40),
  hour_bucket timestamptz not null,
  post_count int not null default 0 check (post_count >= 0),
  primary key (tag, hour_bucket)
);

create index if not exists hashtag_hourly_stats_bucket_idx
  on private.hashtag_hourly_stats (hour_bucket desc, post_count desc);

alter table private.hashtag_hourly_stats enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Helper functions & Triggers ใน schema private
-- ---------------------------------------------------------------------------

-- ทำความสะอาดและตรวจสอบชื่อ #แท็ก (ตัด # นำหน้า, แปลงตัวพิมพ์เล็ก, อนุญาตไทย/อังกฤษ/ตัวเลข/_)
create or replace function private.normalize_hashtag(p_tag text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_clean text := regexp_replace(lower(trim(coalesce(p_tag, ''))), '^#+', '');
begin
  if v_clean = '' or v_clean !~ '^[a-z0-9_\u0E01-\u0E5B]{1,40}$' then
    return null;
  end if;
  return v_clean;
end;
$$;

-- สกัด #แท็ก ออกจากข้อความโพสต์ (รักษาลำดับที่พิมพ์, ลบตัวซ้ำ, สูงสุด 5 แท็กต่อโพสต์)
create or replace function private.extract_hashtags(p_body text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    array(
      select tag
      from (
        select lower(m[1]) as tag, min(ord) as first_pos
        from regexp_matches(
          coalesce(p_body, ''),
          '(?<![a-zA-Z0-9_\u0E01-\u0E5B@])#([a-zA-Z0-9_\u0E01-\u0E5B]{1,40})',
          'g'
        ) with ordinality as t(m, ord)
        group by lower(m[1])
        order by min(ord)
        limit 5
      ) sub
    ),
    '{}'::text[]
  );
$$;

-- คำนวณคะแนนความฮอตของโพสต์ (Gravity Decay คล้าย X / Hacker News)
create or replace function private.post_hot_score(
  p_like_count int,
  p_reply_count int,
  p_created_at timestamptz
)
returns double precision
language sql
stable
set search_path = ''
as $$
  select (1.0 + greatest(0, coalesce(p_like_count, 0)) + greatest(0, coalesce(p_reply_count, 0)) * 2.0)
    / power(greatest(0.0, extract(epoch from (now() - p_created_at)) / 3600.0) + 2.0, 1.5);
$$;

-- Trigger O(1) อัปเดต like_count แบบ Delta (+1 / -1) แทนการ COUNT(*) ทั้งตาราง
create or replace function private.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update private.posts
    set like_count = like_count + 1
    where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update private.posts
    set like_count = greatest(0, like_count - 1)
    where id = old.post_id;
  end if;
  return null;
end;
$$;

-- Trigger O(1) อัปเดต reply_count แบบ Delta (+1 / -1) เฉพาะคอมเมนต์ที่เผยแพร่และยังไม่ถูกลบ
create or replace function private.sync_post_reply_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_visible boolean := false;
  v_is_visible boolean := false;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_was_visible := (old.status = 'published' and old.deleted_at is null);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_is_visible := (new.status = 'published' and new.deleted_at is null);
  end if;

  if not v_was_visible and v_is_visible then
    update private.posts
    set reply_count = reply_count + 1
    where id = new.post_id;
  elsif v_was_visible and not v_is_visible then
    update private.posts
    set reply_count = greatest(0, reply_count - 1)
    where id = old.post_id;
  end if;
  return null;
end;
$$;

-- Trigger อัปเดตสถิติ #แท็ก รายชั่วโมงเมื่อสร้างโพสต์ หรือซ่อน/ลบโพสต์
create or replace function private.sync_post_hashtag_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_active boolean := false;
  v_is_active boolean := false;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_was_active := (old.status = 'published' and old.deleted_at is null);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_is_active := (new.status = 'published' and new.deleted_at is null);
  end if;

  if not v_was_active and v_is_active and cardinality(new.hashtags) > 0 then
    insert into private.hashtag_hourly_stats (tag, hour_bucket, post_count)
    select u.tag, date_trunc('hour', new.created_at), 1
    from unnest(new.hashtags) as u(tag)
    on conflict (tag, hour_bucket) do update
      set post_count = private.hashtag_hourly_stats.post_count + 1;
  elsif v_was_active and not v_is_active and cardinality(old.hashtags) > 0 then
    update private.hashtag_hourly_stats h
    set post_count = greatest(0, h.post_count - 1)
    from unnest(old.hashtags) as u(tag)
    where h.tag = u.tag
      and h.hour_bucket = date_trunc('hour', old.created_at);
  end if;

  return null;
end;
$$;

drop trigger if exists posts_sync_hashtag_stats on private.posts;
create trigger posts_sync_hashtag_stats
  after insert or update of status, deleted_at, hashtags or delete on private.posts
  for each row execute function private.sync_post_hashtag_stats();

-- ล้างสถิติ #แท็ก รายชั่วโมงที่เก่าเกิน 14 วัน เพื่อรักษาขนาดตารางให้เล็กเสมอ
create or replace function private.purge_old_hashtag_stats()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted int;
begin
  delete from private.hashtag_hourly_stats
  where hour_bucket < now() - interval '14 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- เติม hashtags ให้โพสต์ที่มีอยู่ก่อนหน้า (ถ้ามี)
update private.posts
set hashtags = private.extract_hashtags(body)
where cardinality(hashtags) = 0
  and body like '%#%';

-- ---------------------------------------------------------------------------
-- 3) RPC สำหรับ Space (สร้างโพสต์พร้อมสกัด #แท็ก, ดึง Feed, ดึงเทรนด์มาแรง)
-- ---------------------------------------------------------------------------

-- โพสต์ใน Space (สกัด #แท็ก อัตโนมัติ + คืน area_id, age_band, hashtags ครบตาม schema)
create or replace function public.create_post(
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
  v_hashtags text[];
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

  if p_mood is not null and p_mood not in (
    'lonely', 'tired', 'happy', 'anxious', 'bored',
    'hopeful', 'calm', 'excited', 'overthinking'
  ) then
    raise exception 'invalid_mood' using errcode = '22023';
  end if;

  if private.contains_contact_or_pii(v_body) then
    raise exception 'contains_prohibited_contact' using errcode = '22023';
  end if;

  v_hashtags := private.extract_hashtags(v_body);

  select a.alias, a.color, p.area_id, pp.birthdate
  into v_alias, v_alias_color, v_area_id, v_birthdate
  from public.profiles p
  join private.aliases a on a.user_id = p.id
  join private.profile_private pp on pp.user_id = p.id
  where p.id = v_uid;

  insert into private.posts (
    author_id, alias, alias_color, body, hashtags, area_id, age_band, mood, status
  )
  values (
    v_uid, v_alias, v_alias_color, v_body, v_hashtags, v_area_id, private.age_band_for(v_birthdate), p_mood, 'published'
  )
  returning * into v_post;

  return json_build_object(
    'id', v_post.id,
    'alias', v_post.alias,
    'alias_color', v_post.alias_color,
    'body', v_post.body,
    'hashtags', v_post.hashtags,
    'mood', v_post.mood,
    'area_id', v_post.area_id,
    'age_band', v_post.age_band,
    'like_count', v_post.like_count,
    'reply_count', v_post.reply_count,
    'liked_by_me', false,
    'is_mine', true,
    'care_notice', private.contains_self_harm_signal(v_body),
    'created_at', v_post.created_at
  );
end;
$$;

-- ลบ signature เดิม (4 arguments) ก่อนสร้าง signature ใหม่ที่รองรับ p_hashtag และ p_sort
drop function if exists public.get_feed(text, timestamptz, uuid, int);

create function public.get_feed(
  p_tab text default 'all',
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit int default 20,
  p_hashtag text default null,
  p_sort text default 'latest'
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_tab text := coalesce(p_tab, 'all');
  v_sort text := coalesce(p_sort, 'latest');
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 50));
  v_raw_tag text := nullif(trim(coalesce(p_hashtag, '')), '');
  v_tag text := null;
  v_my_area text;
  v_my_age_band text;
  v_blocked_ids uuid[];
begin
  if v_tab not in ('all', 'nearby', 'same_age') then
    raise exception 'invalid_feed_tab' using errcode = '22023';
  end if;

  if v_sort not in ('latest', 'hot') then
    raise exception 'invalid_feed_sort' using errcode = '22023';
  end if;

  if v_raw_tag is not null then
    v_tag := private.normalize_hashtag(v_raw_tag);
    if v_tag is null then
      raise exception 'invalid_hashtag' using errcode = '22023';
    end if;
  end if;

  select p.area_id, private.age_band_for(pp.birthdate)
  into v_my_area, v_my_age_band
  from public.profiles p
  join private.profile_private pp on pp.user_id = p.id
  where p.id = v_uid;

  -- ดึงรายการผู้ใช้ที่บล็อกกันไว้ใน Array ครั้งเดียว (หลีกเลี่ยงการรัน subquery ต่อแถว)
  select coalesce(
    array_agg(
      case when b.blocker_id = v_uid then b.blocked_id else b.blocker_id end
    ),
    '{}'::uuid[]
  )
  into v_blocked_ids
  from private.blocks b
  where b.blocker_id = v_uid or b.blocked_id = v_uid;

  return coalesce(
    (
      select json_agg(row_to_json(t))
      from (
        select
          po.id,
          po.alias,
          po.alias_color,
          po.body,
          po.hashtags,
          po.mood,
          po.area_id,
          po.age_band,
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
          and not (po.author_id = any(v_blocked_ids))
          and not exists (
            select 1 from private.user_status us
            where us.user_id = po.author_id
              and us.state <> 'active'
              and (us.until is null or us.until > now())
          )
          and (v_tab <> 'nearby' or (v_my_area is not null and po.area_id = v_my_area))
          and (v_tab <> 'same_age' or (v_my_age_band is not null and po.age_band = v_my_age_band))
          and (v_tag is null or po.hashtags @> array[v_tag])
          and (
            p_before_created_at is null
            or (po.created_at, po.id) < (
              p_before_created_at,
              coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
            )
          )
        order by
          case
            when v_sort = 'hot' then private.post_hot_score(po.like_count, po.reply_count, po.created_at)
            else 0.0
          end desc,
          po.created_at desc,
          po.id desc
        limit v_limit
      ) t
    ),
    '[]'::json
  );
end;
$$;

-- ดูคอมเมนต์ของโพสต์ (ปรับให้ใช้ Pre-fetched blocked array + Anti-Join แทนการเรียกฟังก์ชันรายแถว)
create or replace function public.get_replies(p_post_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_post private.posts%rowtype;
  v_blocked_ids uuid[];
begin
  select * into v_post
  from private.posts po
  where po.id = p_post_id and po.status = 'published' and po.deleted_at is null;

  if v_post.id is null or private.is_blocked(v_uid, v_post.author_id) then
    raise exception 'post_not_found' using errcode = '22023';
  end if;

  select coalesce(
    array_agg(
      case when b.blocker_id = v_uid then b.blocked_id else b.blocker_id end
    ),
    '{}'::uuid[]
  )
  into v_blocked_ids
  from private.blocks b
  where b.blocker_id = v_uid or b.blocked_id = v_uid;

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
        and not (pr.author_id = any(v_blocked_ids))
        and not exists (
          select 1 from private.user_status us
          where us.user_id = pr.author_id
            and us.state <> 'active'
            and (us.until is null or us.until > now())
        )
    ),
    '[]'::json
  );
end;
$$;

-- เช็กอินอารมณ์ประจำวัน (รองรับครบทั้ง 9 อารมณ์)
create or replace function public.checkin_mood(p_mood text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
begin
  perform private.check_rate('checkin_mood', v_uid::text, 20, interval '1 day');

  if p_mood is null or p_mood not in (
    'lonely', 'tired', 'happy', 'anxious', 'bored',
    'hopeful', 'calm', 'excited', 'overthinking'
  ) then
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

-- ดึงรายการ #แท็ก ที่กำลังมาแรงในช่วงเวลาที่กำหนด (ค่าเริ่มต้น 24 ชม. ล่าสุด)
create function public.get_trending_hashtags(
  p_hours int default 24,
  p_limit int default 10
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_hours int := greatest(1, least(coalesce(p_hours, 24), 168));
  v_limit int := greatest(1, least(coalesce(p_limit, 10), 30));
  v_since timestamptz := date_trunc('hour', now() - make_interval(hours => v_hours));
begin
  return coalesce(
    (
      select json_agg(row_to_json(t))
      from (
        select
          h.tag,
          sum(h.post_count)::int as post_count
        from private.hashtag_hourly_stats h
        where h.hour_bucket >= v_since
          and h.post_count > 0
        group by h.tag
        having sum(h.post_count) > 0
        order by sum(h.post_count) desc, max(h.hour_bucket) desc, h.tag asc
        limit v_limit
      ) t
    ),
    '[]'::json
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Grant สิทธิ์ให้ authenticated
-- ---------------------------------------------------------------------------
grant execute on function public.create_post(text, text) to authenticated;
grant execute on function public.get_feed(text, timestamptz, uuid, int, text, text) to authenticated;
grant execute on function public.get_replies(uuid) to authenticated;
grant execute on function public.checkin_mood(text) to authenticated;
grant execute on function public.get_trending_hashtags(int, int) to authenticated;
