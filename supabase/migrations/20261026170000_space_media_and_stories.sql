-- ============================================================================
-- Migration: 20261026170000_space_media_and_stories.sql
-- Description:
-- 1. เพิ่ม media_url ใน private.posts สำหรับแนบรูปในโพสต์ Space
-- 2. ระบบ Ephemeral Stories (เรื่องราว 24 ชม. สำหรับ Free, 48 ชม. สำหรับ Gold/Premium)
-- 3. Storage bucket space_media (สาธารณะสำหรับอ่าน, authenticated สำหรับอัปโหลด)
-- ============================================================================

-- 1. Storage bucket space_media
insert into storage.buckets (id, name, public)
values ('space_media', 'space_media', false)
on conflict (id) do update set public = false;

-- นโยบาย RLS สำหรับ bucket space_media
create policy "space_media: ทุกคนอ่านรูปได้"
  on storage.objects for select
  using (bucket_id = 'space_media');

create policy "space_media: authenticated อัปโหลดได้"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'space_media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "space_media: ลบรูปของตัวเองได้"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'space_media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. เพิ่ม media_url ใน private.posts
alter table private.posts 
  add column if not exists media_url text;

-- 3. ตาราง private.stories (เรื่องราวแบบชั่วคราว)
create table if not exists private.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  alias text not null,
  alias_color text not null,
  media_url text not null,
  caption text check (caption is null or char_length(trim(caption)) <= 150),
  tier text not null default 'free',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists stories_expires_created_idx 
  on private.stories (expires_at desc, created_at desc);

create index if not exists stories_author_idx 
  on private.stories (author_id);

alter table private.stories enable row level security;

-- 4. อัปเกรดฟังก์ชัน create_post ให้รองรับ p_media_url
drop function if exists public.create_post(text, text);
create or replace function public.create_post(
  p_body text,
  p_mood text default null,
  p_media_url text default null
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
  perform private.check_rate('post_hour', v_uid::text, 10, interval '1 hour');
  perform private.check_rate('post_day', v_uid::text, 50, interval '1 day');

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
  left join private.profile_private pp on pp.user_id = p.id
  where p.id = v_uid;

  insert into private.posts (
    author_id, alias, alias_color, body, hashtags, area_id, age_band, mood, media_url, status
  )
  values (
    v_uid, v_alias, v_alias_color, v_body, v_hashtags, v_area_id, private.age_band_for(v_birthdate), p_mood, p_media_url, 'published'
  )
  returning * into v_post;

  return json_build_object(
    'id', v_post.id,
    'alias', v_post.alias,
    'alias_color', v_post.alias_color,
    'body', v_post.body,
    'hashtags', coalesce(v_post.hashtags, '{}'),
    'mood', v_post.mood,
    'media_url', v_post.media_url,
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

-- 5. อัปเกรดฟังก์ชัน get_feed ให้ส่ง media_url ออกมาด้วย
create or replace function public.get_feed(
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
  v_raw_tag text := nullif(trim(coalesce(p_hashtag, '')), '');
  v_hashtag text := null;
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 50));
  v_my_area text;
  v_my_age_band text;
begin
  if v_tab not in ('all', 'nearby', 'same_age') then
    raise exception 'invalid_feed_tab' using errcode = '22023';
  end if;

  if v_sort not in ('latest', 'hot') then
    raise exception 'invalid_feed_sort' using errcode = '22023';
  end if;

  if v_raw_tag is not null then
    v_hashtag := private.normalize_hashtag(v_raw_tag);
    if v_hashtag is null then
      raise exception 'invalid_hashtag' using errcode = '22023';
    end if;
  end if;

  select p.area_id, private.age_band_for(pp.birthdate)
  into v_my_area, v_my_age_band
  from public.profiles p
  left join private.profile_private pp on pp.user_id = p.id
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
          po.media_url,
          coalesce(po.hashtags, '{}') as hashtags,
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
          and not private.is_blocked(v_uid, po.author_id)
          and private.user_state(po.author_id) = 'active'
          and (v_tab <> 'nearby' or (v_my_area is not null and po.area_id = v_my_area))
          and (v_tab <> 'same_age' or (v_my_age_band is not null and po.age_band = v_my_age_band))
          and (v_hashtag is null or po.hashtags @> array[v_hashtag])
          and (
            p_before_created_at is null
            or (po.created_at, po.id) < (
              p_before_created_at,
              coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
            )
          )
        order by
          case when v_sort = 'hot' then po.like_count + (po.reply_count * 2) end desc nulls last,
          po.created_at desc,
          po.id desc
        limit v_limit
      ) t
    ),
    '[]'::json
  );
end;
$$;

-- 6. RPC สร้าง Story (หมดอายุ 24 ชม. สำหรับ Free, 48 ชม. สำหรับ Gold/Premium)
create or replace function public.create_story(
  p_media_url text,
  p_caption text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('selfie');
  v_alias text;
  v_alias_color text;
  v_tier text := 'free';
  v_duration interval := interval '24 hours';
  v_story private.stories%rowtype;
begin
  if p_media_url is null or trim(p_media_url) = '' then
    raise exception 'invalid_story_media' using errcode = '22023';
  end if;

  -- ดึง tier ของผู้ใช้
  select coalesce(tier, 'free') into v_tier
  from private.subscriptions
  where user_id = v_uid and status = 'active' and (expires_at is null or expires_at > now())
  order by starts_at desc limit 1;

  if v_tier is null then
    v_tier := 'free';
  end if;

  if v_tier in ('gold', 'premium') then
    v_duration := interval '48 hours';
  else
    v_duration := interval '24 hours';
  end if;

  select a.alias, a.color
  into v_alias, v_alias_color
  from private.aliases a
  where a.user_id = v_uid;

  insert into private.stories (
    author_id, alias, alias_color, media_url, caption, tier, expires_at
  )
  values (
    v_uid, v_alias, v_alias_color, p_media_url, nullif(trim(p_caption), ''), v_tier, now() + v_duration
  )
  returning * into v_story;

  return json_build_object(
    'id', v_story.id,
    'alias', v_story.alias,
    'alias_color', v_story.alias_color,
    'media_url', v_story.media_url,
    'caption', v_story.caption,
    'tier', v_story.tier,
    'is_mine', true,
    'created_at', v_story.created_at,
    'expires_at', v_story.expires_at
  );
end;
$$;

-- 7. RPC ดึง Stories ที่ยังไม่หมดอายุ
create or replace function public.get_active_stories()
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
      select json_agg(row_to_json(t))
      from (
        select
          s.id,
          s.alias,
          s.alias_color,
          s.media_url,
          s.caption,
          s.tier,
          (s.author_id = v_uid) as is_mine,
          s.created_at,
          s.expires_at
        from private.stories s
        where s.expires_at > now()
          and not private.is_blocked(v_uid, s.author_id)
          and private.user_state(s.author_id) = 'active'
        order by s.created_at desc
        limit 50
      ) t
    ),
    '[]'::json
  );
end;
$$;

-- 8. RPC ลบ Story ของตนเอง
create or replace function public.delete_my_story(p_story_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
begin
  delete from private.stories
  where id = p_story_id and author_id = v_uid;

  return found;
end;
$$;

grant execute on function public.create_story(text, text) to authenticated;
grant execute on function public.get_active_stories() to authenticated;
grant execute on function public.delete_my_story(uuid) to authenticated;
grant execute on function public.create_post(text, text, text) to authenticated;
