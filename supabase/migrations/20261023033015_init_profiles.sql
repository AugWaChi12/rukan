-- =============================================================================
-- profiles: ข้อมูลสาธารณะของผู้ใช้ (1:1 กับ auth.users ที่ Supabase Auth จัดการ)
-- กฎ: ทุกตารางใน schema public ต้อง enable RLS + มี policy ชัดเจน (ดู docs/CONVENTIONS.md)
-- =============================================================================

-- ฟังก์ชันกลางสำหรับอัปเดต updated_at อัตโนมัติ — ใช้ซ้ำได้กับทุกตาราง
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'ข้อมูลโปรไฟล์ที่ผู้ใช้คนอื่นเห็นได้ — ห้ามเก็บข้อมูลส่วนตัว (email, เบอร์โทร) ที่นี่';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- คนที่ไม่ได้ login ห้ามแตะตารางนี้เลย
revoke all on table public.profiles from anon;

create policy "profiles: ผู้ใช้ที่ login แล้วอ่านได้ทุกโปรไฟล์"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: แก้ได้เฉพาะโปรไฟล์ตัวเอง"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ไม่มี policy สำหรับ insert/delete:
--   insert → trigger handle_new_user สร้างให้ตอนสมัคร
--   delete → ลบตามเมื่อ auth.users ถูกลบ (on delete cascade)

-- ---------------------------------------------------------------------------
-- สร้าง profile อัตโนมัติเมื่อมีผู้ใช้สมัครใหม่
-- display_name เอาจาก metadata ตอน signUp({ options: { data: { display_name } } })
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1),
      'user'
    )
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- health(): ให้ client เช็คว่าต่อ Supabase + database ได้ (เรียกผ่าน supabase.rpc('health'))
-- รูปแบบผลลัพธ์ตรงกับ healthResponseSchema ใน packages/shared
-- ---------------------------------------------------------------------------
create function public.health()
returns json
language sql
stable
set search_path = ''
as $$
  select json_build_object(
    'status', 'ok',
    'database', 'up',
    'timestamp', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
$$;

grant execute on function public.health() to anon, authenticated;
