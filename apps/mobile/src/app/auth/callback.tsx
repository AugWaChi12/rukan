import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { AppText, Button, Loading, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

/**
 * ปลายทางของ OAuth บนเว็บ (expo web) — มือถือแลก code ใน sign-in-screen เอง
 *
 * PKCE: supabase-js (detectSessionInUrl) แลก ?code= ให้เองตอนโหลดหน้า → ที่นี่แค่รอผล
 * ไม่อ่าน access_token จาก URL เด็ดขาด (กันถูกยัด session ของคนอื่น — docs/AUDIT.md P0-2)
 */
export default function AuthCallback() {
  const router = useRouter();
  const { t } = useTranslation();
  // provider ตอบ error กลับมา (เช่น ผู้ใช้กดยกเลิก) → ไม่ต้องรอ session
  const [failed, setFailed] = useState(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    const query = new URLSearchParams(window.location.search);
    return !!(query.get('error') || query.get('error_description'));
  });

  useEffect(() => {
    if (failed) return;
    if (Platform.OS !== 'web') {
      router.replace('/');
      return;
    }
    // getSession() รอให้ supabase-js แลก code เสร็จก่อนค่อยคืนค่า
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) setFailed(true);
      else router.replace('/');
    });
  }, [router, failed]);

  if (!failed) return <Loading />;
  return (
    <Screen>
      <AppText variant="error">{t('errors.unknown')}</AppText>
      <Button label={t('common.retry')} onPress={() => router.replace('/')} />
    </Screen>
  );
}
