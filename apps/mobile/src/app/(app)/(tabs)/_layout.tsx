import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/theme-provider';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen name="space" options={{ title: t('tabs.space') }} />
      <Tabs.Screen name="drop" options={{ title: t('tabs.drop') }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats') }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.me') }} />
    </Tabs>
  );
}
