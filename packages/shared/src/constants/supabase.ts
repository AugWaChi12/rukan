/** ชื่อ Postgres function ที่ client เรียกผ่าน `supabase.rpc(...)` (ต้องตรงกับ supabase/migrations) */
export const SUPABASE_RPC = {
  health: 'health',
  joinWaitlist: 'join_waitlist',
  getMyStatus: 'get_my_status',
  getMyProfile: 'get_my_profile',
  updateMyProfile: 'update_my_profile',
  completeOnboarding: 'complete_onboarding',
  recordConsent: 'record_consent',
  setInterests: 'set_interests',
  setPromptAnswer: 'set_prompt_answer',
  addPhoto: 'add_photo',
  removePhoto: 'remove_photo',
} as const;

/** ชื่อ Storage bucket (ต้องตรงกับ supabase/migrations) — ทุก bucket เป็น private */
export const STORAGE_BUCKETS = {
  /** รูปโปรไฟล์ — path ต้องเป็น `<user id>/<uuid>.webp|jpg` (อัปโหลดแล้วเรียก add_photo) */
  photos: 'photos',
} as const;

/** ตารางที่ client อ่านตรงได้ด้วย `supabase.from(...)` (ตาม RLS) — เขียนต้องผ่าน RPC เสมอ */
export const TABLES = {
  /** อ่านได้แค่แถวของตัวเอง */
  profiles: 'profiles',
  profileInterests: 'profile_interests',
  profilePrompts: 'profile_prompts',
  photos: 'photos',
  /** ข้อมูลอ้างอิง อ่านได้ทุกคน */
  areas: 'areas',
  interests: 'interests',
  prompts: 'prompts',
} as const;
