import type { Database } from '@rukan/shared';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { LargeSecureStore } from './large-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'ไม่พบ EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY — copy apps/mobile/.env.example เป็น .env แล้วใส่ค่า',
  );
}

/** Supabase client ตัวเดียวของทั้งแอป — import จากไฟล์นี้เสมอ */
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    // บน web (expo start --web) ใช้ localStorage ของ browser ตามปกติ
    storage: Platform.OS === 'web' ? undefined : new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    // PKCE: OAuth คืนแค่ ?code= (ใช้ได้ครั้งเดียว + ต้องมี code_verifier ที่เก็บในเครื่องนี้)
    // ไม่ใช้ implicit flow ที่ส่ง access_token มาใน URL (หลุดผ่าน history / ถูกยัด session คนอื่นได้)
    flowType: 'pkce',
    // บนเว็บให้ supabase-js แลก ?code= เองตอนเปิดหน้า /auth/callback
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// refresh token เฉพาะตอนแอปเปิดอยู่ (ตามคำแนะนำของ Supabase สำหรับ React Native)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
