-- =============================================================================
-- Storage bucket สำหรับรูปโปรไฟล์
-- path ของไฟล์ต้องเป็น  <user id>/<ชื่อไฟล์>  เช่น  2f1c.../avatar.jpg
-- ทุกคนดูรูปได้ (bucket public) แต่อัปโหลด/แก้/ลบได้เฉพาะโฟลเดอร์ของตัวเอง
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']);

create policy "avatars: อัปโหลดได้เฉพาะโฟลเดอร์ตัวเอง"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: แก้ไฟล์ได้เฉพาะของตัวเอง"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: ลบไฟล์ได้เฉพาะของตัวเอง"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
