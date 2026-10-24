import { createServerClient } from '@supabase/ssr';
import type { Database } from '@rukan/shared';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseEnv } from './env';

/**
 * Refresh session ของ Supabase ทุก request แล้วส่ง cookie ใหม่ไปทั้ง Server Component และ browser
 * ถ้าจะ redirect/rewrite ต้อง copy cookie จาก response นี้ไปด้วย ไม่งั้นผู้ใช้จะโดน logout
 */
export async function updateSession(request: NextRequest, initialResponse?: NextResponse) {
  let response = initialResponse ?? NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseEnv.url, supabaseEnv.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // ห้ามมีโค้ดอื่นคั่นระหว่าง createServerClient กับ getClaims() — getClaims เป็นตัว refresh token
  await supabase.auth.getClaims();

  return response;
}
