-- ข้อมูลทดสอบสำหรับ dev บนเครื่องเท่านั้น — รันอัตโนมัติตอน `pnpm db:reset`
-- (ไม่ถูกใช้กับ Supabase project จริง)
--
-- ผู้ใช้ทดสอบ (login ได้จริง):
--   demo@rukan.dev  / password123  — ยืนยันครบ (selfie) + onboarding เสร็จ → เข้าแอปได้เลย · เป็น moderator (app_metadata.role) ใช้เข้า admin console ได้
--   demo2@rukan.dev / password123  — ยืนยันครบเหมือนกัน (ใช้เป็น "อีกคน" ตอนทดสอบสิทธิ์)
--   demo3@rukan.dev / password123  — ผู้ใช้ใหม่ ยังไม่ทำอะไร → ใช้ทดสอบ flow onboarding

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'demo@rukan.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"],"role":"moderator"}', '{"display_name":"Demo User"}', now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'demo2@rukan.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Demo Friend"}', now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'demo3@rukan.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Demo New"}', now(), now(),
    '', '', '', ''
  );

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like 'demo%@rukan.dev';

-- trigger on_auth_user_created สร้าง profiles / profile_private / verifications / aliases ให้แล้ว
-- ด้านล่าง = ทำให้ demo กับ demo2 เหมือนผ่าน onboarding + ยืนยันตัวตนครบ
-- (บนเครื่องเท่านั้น — ของจริงต้องผ่าน OTP + liveness vendor ไม่มีทางลัดในโค้ด)
update public.profiles set
  bio = case id when '11111111-1111-1111-1111-111111111111' then 'บัญชีทดสอบสำหรับ dev' else 'ชอบคาเฟ่ ตีแบดวันเสาร์' end,
  occupation = case id when '11111111-1111-1111-1111-111111111111' then 'UX Designer' else 'นักศึกษาปี 3' end,
  area_id = case id when '11111111-1111-1111-1111-111111111111' then 'ari' else 'siam' end,
  modes = '{friend,date}',
  verification_level = 'selfie',
  onboarded_at = now()
where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

update private.profile_private set birthdate = case user_id
    when '11111111-1111-1111-1111-111111111111' then date '2001-05-14'
    else date '2004-11-02'
  end
where user_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

update private.verifications set
  phone_verified_at = now(), liveness_status = 'passed', liveness_passed_at = now(), liveness_vendor_ref = 'seed'
where user_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

insert into private.consents (user_id, doc, version)
select u, d, private.current_consent_version(d)
from unnest(array['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222']::uuid[]) as u,
     unnest(array['terms', 'privacy', 'rules', 'biometric']) as d;

insert into public.profile_interests (user_id, interest_id) values
  ('11111111-1111-1111-1111-111111111111', 'cafe'),
  ('11111111-1111-1111-1111-111111111111', 'photography'),
  ('22222222-2222-2222-2222-222222222222', 'badminton');

insert into public.profile_prompts (user_id, prompt_id, answer) values
  ('11111111-1111-1111-1111-111111111111', 'perfect_weekend', 'ตื่นสาย หาคาเฟ่ใหม่ แล้วเดินถ่ายรูป');
