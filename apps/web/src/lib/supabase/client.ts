import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@rukan/shared';
import { supabaseEnv } from './env';

/** Supabase client สำหรับ Client Component ('use client') */
export function createClient() {
  return createBrowserClient<Database>(supabaseEnv.url, supabaseEnv.publishableKey);
}
