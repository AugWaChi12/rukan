/** ชื่อ Postgres function ที่ client เรียกผ่าน `supabase.rpc(...)` (ต้องตรงกับ supabase/migrations) */
export const SUPABASE_RPC = {
  health: 'health',
  joinWaitlist: 'join_waitlist',
} as const;

/** ชื่อ Storage bucket (ต้องตรงกับ supabase/migrations) */
export const STORAGE_BUCKETS = {
  /** รูปโปรไฟล์ — path ต้องเป็น `<user id>/<ชื่อไฟล์>` */
  avatars: 'avatars',
} as const;

/** ชื่อตาราง ที่ใช้กับ `supabase.from(...)` */
export const TABLES = {
  profiles: 'profiles',
} as const;
