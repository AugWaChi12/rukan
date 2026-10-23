-- ข้อมูลทดสอบสำหรับ dev บนเครื่องเท่านั้น — รันอัตโนมัติตอน `pnpm db:reset`
-- (ไม่ถูกใช้กับ Supabase project จริง)
--
-- ผู้ใช้ทดสอบ (login ได้จริง):
--   demo@stumatch.dev  / password123
--   demo2@stumatch.dev / password123

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'demo@stumatch.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Demo User"}', now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'demo2@stumatch.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Demo Friend"}', now(), now(),
    '', '', '', ''
  );

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email in ('demo@stumatch.dev', 'demo2@stumatch.dev');

-- profiles ถูกสร้างโดย trigger on_auth_user_created แล้ว — เติมข้อมูลเพิ่มได้ตรงนี้
update public.profiles set bio = 'บัญชีทดสอบสำหรับ dev' where id = '11111111-1111-1111-1111-111111111111';
