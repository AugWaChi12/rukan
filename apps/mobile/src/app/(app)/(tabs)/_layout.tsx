import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { haptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          haptic.selection();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          height: Platform.OS === 'ios' ? 84 : 66,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          paddingTop: 8,
          shadowColor: '#2e2238',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="space"
        options={{
          title: t('tabs.space'),
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused ? { transform: [{ scale: 1.15 }] } : null]}>
              <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>🫧</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="drop"
        options={{
          title: t('tabs.drop'),
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused ? { transform: [{ scale: 1.15 }] } : null]}>
              <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>🌙</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: t('tabs.chats'),
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused ? { transform: [{ scale: 1.15 }] } : null]}>
              <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>💬</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: t('tabs.me'),
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused ? { transform: [{ scale: 1.15 }] } : null]}>
              <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>👤</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
