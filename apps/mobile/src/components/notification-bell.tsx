import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BouncyPressable } from '@/components/ui';
import { api, queries, queryClient, queryKeys } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useSession } from '@/providers/session-provider';
import { useAppTheme } from '@/theme/theme-provider';

export function NotificationBellButton({ size = 36 }: { size?: number }) {
  const { colors } = useAppTheme();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const countQuery = useQuery(queries.unreadNotificationCount());
  const unreadCount = countQuery.data ?? 0;

  // Realtime subscription สำหรับอัปเดตแจ้งเตือนทันทีที่มีกิจกรรมใหม่
  useEffect(() => {
    if (!userId) return;
    return api.realtime.subscribeUserInbox(userId, () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    });
  }, [userId]);

  return (
    <BouncyPressable
      accessibilityRole="button"
      accessibilityLabel={`การแจ้งเตือน ${unreadCount > 0 ? `มี ${unreadCount} รายการใหม่` : ''}`}
      hapticFeedback="selection"
      activeScale={0.9}
      onPress={() => {
        haptic.selection();
        router.push('/(app)/(tabs)/notifications' as Href);
      }}
      style={[
        styles.bellButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.card,
          borderColor: unreadCount > 0 ? colors.accentSoft : colors.line,
        },
      ]}
    >
      <Ionicons
        name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
        size={Math.round(size * 0.52)}
        color={unreadCount > 0 ? colors.accent : colors.muted}
      />

      {unreadCount > 0 ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.accent,
            },
          ]}
        >
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </BouncyPressable>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
