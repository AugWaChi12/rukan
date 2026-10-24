import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuth() {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          await api.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          router.replace('/');
          return;
        }

        const query = new URLSearchParams(window.location.search);
        const code = query.get('code');
        if (code) {
          await api.auth.exchangeCodeForSession(code);
          router.replace('/');
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          router.replace('/');
          return;
        }
      }
      router.replace('/');
    }
    void handleAuth();
  }, [router]);

  return <Loading />;
}
