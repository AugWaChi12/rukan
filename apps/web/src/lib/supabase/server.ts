import { createServerClient } from '@supabase/ssr';
import type { Database } from '@stumatch/shared';
import { cookies } from 'next/headers';
import { supabaseEnv } from './env';

/**
 * Supabase client สำหรับ Server Component / Server Action / Route Handler
 * สร้างใหม่ทุก request (ห้ามเก็บไว้ใน global) เพราะผูกกับ cookie ของผู้ใช้คนนั้น
 * เช็คว่า login หรือยังด้วย `supabase.auth.getClaims()` — ห้ามเชื่อ `getSession()` ฝั่ง server
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseEnv.url, supabaseEnv.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // เรียกจาก Server Component ซึ่ง set cookie ไม่ได้ — ไม่เป็นไร เพราะ proxy.ts refresh session ให้แล้ว
        }
      },
    },
  });
}
