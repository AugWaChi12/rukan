-- =============================================================================
-- P0 security fix: moderator ต้องมาจาก app_metadata เท่านั้น — ดู docs/AUDIT.md หัวข้อ P0-1
--
-- ของเดิม (20261024170000_admin_console) ให้สิทธิ์ moderator กับ:
--   - อีเมลที่ลงท้าย @rukan.app ทุกอีเมล
--   - อีเมลตายตัว demo@rukan.dev / admin@rukan.app / namno@rukan.app
-- อีเมลเป็นข้อมูลที่ผู้ใช้กรอกเอง (สมัครด้วยอีเมลอะไรก็ได้ถ้าปิด email confirmation,
-- หรือใครซื้อโดเมน rukan.dev ได้ก็รับอีเมลยืนยันได้) → ใครก็กลายเป็น moderator ได้
-- → เปิดดูตัวตนคนโพสต์ Space (mod_reveal_author), อ่านอีเมล waitlist, แก้ราคา tier ได้
--
-- แก้: เชื่อแค่ app_metadata.role ซึ่งผู้ใช้แก้เองไม่ได้ (ตั้งได้จาก service role / Dashboard เท่านั้น)
-- ตั้ง moderator: Dashboard → Authentication → Users → user → raw_app_meta_data = {"role":"moderator"}
-- (local: seed.sql ตั้งให้ demo@rukan.dev แล้ว)
-- =============================================================================

create or replace function private.is_moderator()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('moderator', 'admin'), false);
$$;
