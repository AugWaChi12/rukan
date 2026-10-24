-- =============================================================================
-- รูปโปรไฟล์: bucket `photos` แบบ private แทน `avatars` (public) — ดู docs/SYSTEM_DESIGN.md หัวข้อ 7
--
-- - ไฟล์: photos/<user id>/<photo id>.webp|jpg — เจ้าของอัปโหลด/อ่าน/ลบได้แค่โฟลเดอร์ตัวเอง, แก้ไฟล์ทับไม่ได้
-- - คนอื่นดูรูปได้ทางเดียว: signed URL จาก Edge Function ที่เช็คขั้นเปิดรูป (เฟส Match — ยังไม่มี)
-- - ลำดับ: อัปโหลดไฟล์ → add_photo(path, position) · ลบ: remove_photo(id) → ลบไฟล์ด้วย Storage API
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ปิด bucket avatars เดิม (ลบ policy + เปลี่ยนเป็น private — ไฟล์ใน bucket ต้องลบผ่าน Storage API)
-- ---------------------------------------------------------------------------
drop policy "avatars: อัปโหลดได้เฉพาะโฟลเดอร์ตัวเอง" on storage.objects;
drop policy "avatars: แก้ไฟล์ได้เฉพาะของตัวเอง" on storage.objects;
drop policy "avatars: ลบไฟล์ได้เฉพาะของตัวเอง" on storage.objects;
update storage.buckets set public = false where id = 'avatars';

-- ---------------------------------------------------------------------------
-- bucket photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5 * 1024 * 1024, array['image/webp', 'image/jpeg']);

-- path ที่ถูกต้อง: <uid>/<uuid>.webp|jpg|jpeg (ใช้ใน RPC — policy ด้านล่างเขียน regex เดียวกันตรงๆ
-- เพราะ policy รันในฐานะผู้ใช้ ซึ่งไม่มีสิทธิ์ใช้ schema private)
create function private.is_own_photo_path(p_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_name ~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.(webp|jpe?g)$');
$$;

create policy "photos: เจ้าของอัปโหลดเข้าโฟลเดอร์ตัวเอง" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.(webp|jpe?g)$')
  );

create policy "photos: เจ้าของอ่านไฟล์ตัวเอง" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: เจ้าของลบไฟล์ตัวเอง" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- ไม่มี policy update → แก้ไฟล์ทับไม่ได้ (อัปโหลดใหม่ด้วย id ใหม่แทน)

-- ---------------------------------------------------------------------------
-- ตาราง photos (metadata)
-- ---------------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  position smallint not null check (position between 0 and 5),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (user_id, position)
);
alter table public.photos enable row level security;
grant select on public.photos to authenticated;

create policy "photos: เจ้าของอ่านของตัวเอง" on public.photos
  for select to authenticated using (user_id = (select auth.uid()));
-- ไม่มี policy insert/update/delete → ผ่าน RPC เท่านั้น

-- บันทึกรูปที่อัปโหลดแล้ว (ไฟล์ต้องมีอยู่จริงใน bucket และเป็นของตัวเอง)
create function public.add_photo(p_storage_path text, p_position smallint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_id uuid;
begin
  perform private.check_rate('add_photo', v_uid::text, 30, interval '1 hour');

  if not private.is_own_photo_path(p_storage_path) then
    raise exception 'invalid_photo_path' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'photos' and o.name = p_storage_path and o.owner_id = v_uid::text
  ) then
    raise exception 'photo_not_uploaded' using errcode = '22023';
  end if;

  insert into public.photos (user_id, storage_path, position)
  values (v_uid, p_storage_path, p_position)
  on conflict (user_id, position) do update
    set storage_path = excluded.storage_path, moderation_status = 'pending', created_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- ลบรูปออกจากโปรไฟล์ — คืน storage_path ให้แอปลบไฟล์ต่อด้วย Storage API
create function public.remove_photo(p_photo_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user('phone');
  v_path text;
begin
  delete from public.photos where id = p_photo_id and user_id = v_uid
  returning storage_path into v_path;
  if v_path is null then
    raise exception 'photo_not_found' using errcode = '22023';
  end if;
  return v_path;
end;
$$;

grant execute on function public.add_photo(text, smallint) to authenticated;
grant execute on function public.remove_photo(uuid) to authenticated;
