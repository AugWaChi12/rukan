import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Loading, Screen } from '@/components/ui';
import { useMyStatus } from '@/hooks/use-my-status';
import { errorMessage } from '@/i18n'; // import นี้ init i18n ด้วย
import { queryClient } from '@/lib/api';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { AppThemeProvider, useAppTheme } from '@/theme/theme-provider';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * แบ่งแอปเป็น 3 โซนตามสถานะผู้ใช้ (expo-router Stack.Protected):
 *   (auth)        ยังไม่ login
 *   (onboarding)  login แล้วแต่ยังไม่ครบขั้น (get_my_status().next_step ≠ 'done')
 *   (app)         พร้อมใช้งาน
 * guard ฝั่งแอปมีไว้พาไปหน้าที่ถูก — สิทธิ์จริงเช็คที่ server ในทุก RPC อยู่แล้ว
 */
function RootNavigator() {
  const { t } = useTranslation();
  const { name, colors } = useAppTheme();
  const { session, initializing } = useSession();
  const status = useMyStatus();

  if (initializing || (session && status.isPending)) return <Loading />;
  if (session && status.isError) {
    return (
      <Screen>
        <AppText variant="error">{errorMessage(status.error)}</AppText>
        <Button label={t('common.retry')} onPress={() => void status.refetch()} />
      </Screen>
    );
  }

  const ready = status.data?.next_step === 'done';
  const base = name === 'gold' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: { ...base.colors, background: colors.background, text: colors.text },
      }}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!session && !ready}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={!!session && ready}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
