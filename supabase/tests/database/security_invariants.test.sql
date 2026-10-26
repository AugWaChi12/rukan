-- รั้วถาวรของทั้ง database — test นี้ fail ทันทีถ้ามี migration ไหนเปิดช่องโหว่
-- ถ้าเพิ่ม RPC ใหม่ที่ "ตั้งใจ" ให้ client เรียก → เพิ่มชื่อใน allowlist ข้อ 3/4 ด้านล่าง (คนรีวิว PR จะเห็นชัดว่า API เปลี่ยน)
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- 1) ทุกตารางของเราเปิด RLS
select is_empty(
  $$
    select n.nspname || '.' || c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private') and c.relkind in ('r', 'p') and not c.relrowsecurity
  $$,
  'ทุกตารางใน public / private เปิด RLS'
);

-- 2) ทุก function ของเราล็อก search_path (กัน search_path hijack)
select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind in ('f', 'p')
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) as c where c like 'search_path=%')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  $$,
  'ทุก function ใน public / private ตั้ง search_path'
);

-- 3) คนที่ไม่ได้ login เรียกได้แค่ function ที่ตั้งใจเปิด
select set_eq(
  $$
    select p.proname::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
  $$,
  array['health', 'join_waitlist', 'get_tier_configs'],
  'anon เรียกได้เฉพาะ allowlist'
);

-- 4) API ทั้งหมดของแอป (ผู้ใช้ที่ login) — เปลี่ยนรายการนี้ = เปลี่ยน API
select set_eq(
  $$
    select p.proname::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
  $$,
  array[
    'health', 'join_waitlist', 'get_tier_configs',
    -- เฟส 1: ตัวตน + โปรไฟล์ + รูป
    'get_my_status', 'get_my_profile', 'update_my_profile', 'complete_onboarding',
    'record_consent', 'set_interests', 'set_prompt_answer',
    'add_photo', 'remove_photo',
    -- เฟส 2: ความปลอดภัย + ดูแลชุมชน
    'block_user_from', 'unblock_user', 'get_my_blocks',
    'report_target', 'get_my_moderation_history', 'submit_appeal',
    'mod_list_reports', 'mod_get_report', 'mod_reveal_author',
    'mod_take_action', 'mod_review_appeal', 'mod_list_appeals',
    'mod_get_dashboard_counts', 'mod_get_waitlist_stats', 'mod_list_waitlist',
    -- เฟส 3: Space
    'create_post', 'get_feed', 'delete_my_post',
    'like_post', 'unlike_post',
    'reply_post', 'get_replies', 'delete_my_reply',
    'checkin_mood', 'get_trending_hashtags',
    -- เฟส 4: Bubble + แชท + Realtime Private Broadcast
    'send_bubble', 'get_my_bubbles', 'respond_bubble',
    'get_conversations', 'get_conversation', 'get_messages',
    'send_message', 'mark_conversation_read',
    'request_reveal', 'request_photo_unlock',
    'can_access_realtime_topic',
    -- เฟส 5: Daily Drop + Match + Profile Card
    'get_my_deck', 'swipe', 'get_my_matches',
    'polite_close', 'unmatch', 'get_profile_card',
    -- Master & Plans & Subscriptions & Rukan Coins & AI Wingman
    'get_my_subscription', 'mod_update_tier_config', 'mod_set_user_subscription',
    'exchange_coins_for_pass', 'mod_grant_user_coins', 'use_ai_wingman'
  ],
  'authenticated เรียกได้เฉพาะ API ที่ประกาศไว้'
);

-- 5) function ภายใน (private) ไม่มี client คนไหนเรียกได้
select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
  $$,
  'ไม่มี function ใน private ที่ client เรียกได้'
);

-- 6) schema private ปิดสนิท
select ok(
  not has_schema_privilege('anon', 'private', 'usage') and not has_schema_privilege('authenticated', 'private', 'usage'),
  'anon / authenticated ไม่มีสิทธิ์ใช้ schema private'
);

-- 7) client เขียนตารางใน public ตรงๆ ไม่ได้เลย (เขียนผ่าน RPC เท่านั้น)
select is_empty(
  $$
    select r.rolname || ' → ' || c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated')) as r(rolname)
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v')
      and (
        has_table_privilege(r.rolname, c.oid, 'insert')
        or has_table_privilege(r.rolname, c.oid, 'update')
        or has_table_privilege(r.rolname, c.oid, 'delete')
        or has_table_privilege(r.rolname, c.oid, 'truncate')
      )
  $$,
  'anon / authenticated ไม่มีสิทธิ์ insert/update/delete ตารางใน public'
);

-- 8) anon อ่านได้แค่ข้อมูลอ้างอิง
select set_eq(
  $$
    select c.relname::text
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v') and has_table_privilege('anon', c.oid, 'select')
  $$,
  array['areas', 'interests', 'prompts'],
  'anon อ่านได้เฉพาะ areas / interests / prompts'
);

-- 9) ไม่มี storage bucket แบบ public (รูปทุกรูปต้องผ่าน signed URL)
select is_empty(
  $$ select id from storage.buckets where public $$,
  'ไม่มี bucket ไหนเป็น public'
);

-- 10) security definer ทุกตัวใน public ต้องเป็นของ postgres (ไม่ใช่ role ที่ client สวมได้)
select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosecdef and pg_get_userbyid(p.proowner) <> 'postgres'
  $$,
  'function security definer ทุกตัวเป็นของ postgres'
);

select * from finish();
rollback;
