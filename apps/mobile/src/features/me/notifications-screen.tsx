import type { NotificationItem, NotificationType } from '@rukan/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { AppText, BouncyPressable, Chip, EmptyState, Loading, Row, Screen } from '@/components/ui';
import { api, queries, queryClient, queryKeys } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';
import { SubScreen } from './shared';

function formatRelativeTime(dateString: string, t: any, lang: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSec < 60) return t('notifications.justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('notifications.minutesAgo', { count: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('notifications.hoursAgo', { count: diffHour });
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return t('notifications.yesterday');
  if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });
  return new Date(dateString).toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH', {
    day: 'numeric',
    month: 'short',
  });
}

function getNotificationVisual(type: NotificationType) {
  switch (type) {
    case 'bubble_received':
      return { icon: '🫧', color: '#e9a9bf', bg: '#fdf2f6' };
    case 'bubble_accepted':
      return { icon: '🎉', color: '#10b981', bg: '#ecfdf5' };
    case 'post_like':
      return { icon: '❤️', color: '#ef4444', bg: '#fef2f2' };
    case 'post_reply':
      return { icon: '💭', color: '#8b5cf6', bg: '#f5f3ff' };
    case 'new_match':
      return { icon: '✨', color: '#f59e0b', bg: '#fffbeb' };
    case 'new_message':
      return { icon: '💬', color: '#3b82f6', bg: '#eff6ff' };
    case 'reveal_request':
    case 'reveal_completed':
      return { icon: '🔓', color: '#d97706', bg: '#fffbeb' };
    case 'photo_unlock_request':
    case 'photo_unlock_completed':
      return { icon: '📷', color: '#ec4899', bg: '#fdf2f8' };
    case 'coin_credited':
      return { icon: '🪙', color: '#d97706', bg: '#fef3c7' };
    default:
      return { icon: '🔔', color: '#6b7280', bg: '#f3f4f6' };
  }
}

export function NotificationsScreen({ isTab = false }: { isTab?: boolean } = {}) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const notificationsQuery = useQuery(queries.myNotifications(50, 0));
  const unreadCountQuery = useQuery(queries.unreadNotificationCount());

  const items = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);
  const unreadCount = unreadCountQuery.data ?? 0;

  const markReadMut = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
      ]);
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: async () => {
      haptic.success();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
      ]);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic.selection();
    await Promise.all([notificationsQuery.refetch(), unreadCountQuery.refetch()]);
    setRefreshing(false);
  }, [notificationsQuery, unreadCountQuery]);

  const filteredItems = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.read);
    return items;
  }, [items, filter]);

  const handleNotificationPress = (item: NotificationItem) => {
    haptic.selection();
    if (!item.read) {
      markReadMut.mutate(item.id);
    }

    const data = (item.data || {}) as Record<string, unknown>;

    // นำทางตามบริบทของการแจ้งเตือน
    if (data.conversation_id) {
      router.push('/(app)/(tabs)/chats' as Href);
    } else if (data.bubble_id || item.type === 'bubble_received') {
      router.push('/(app)/(tabs)/chats' as Href);
    } else if (data.match_id || item.type === 'new_match') {
      router.push('/(app)/(tabs)/chats' as Href);
    } else if (data.post_id || item.type === 'post_reply' || item.type === 'post_like') {
      router.push('/(app)/(tabs)/space' as Href);
    } else if (item.type === 'coin_credited') {
      router.push('/(app)/(tabs)/me' as Href);
    }
  };

  const markAllBtn =
    unreadCount > 0 ? (
      <BouncyPressable
        accessibilityRole="button"
        onPress={() => markAllReadMut.mutate()}
        style={{ paddingVertical: 4, paddingHorizontal: 8 }}
      >
        <AppText variant="small" style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>
          {markAllReadMut.isPending
            ? t('notifications.markingAllRead')
            : t('notifications.markAllRead')}
        </AppText>
      </BouncyPressable>
    ) : null;

  const refreshEl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent}
      colors={[colors.accent]}
    />
  );

  const content = (
    <>
      {/* Filter Chips */}
      <Row style={{ gap: 8, marginVertical: space.sm }}>
        <Chip
          label={`${t('notifications.filterAll')} (${items.length})`}
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <Chip
          label={`${t('notifications.filterUnread')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          selected={filter === 'unread'}
          onPress={() => setFilter('unread')}
        />
      </Row>

      {/* Content */}
      {notificationsQuery.isPending ? (
        <Loading />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          badge="Notification"
          title={t('notifications.emptyTitle')}
          body={t('notifications.emptyBody')}
        />
      ) : (
        <View style={{ gap: 10, marginTop: 4 }}>
          {filteredItems.map((n) => {
            const visual = getNotificationVisual(n.type);

            return (
              <BouncyPressable
                key={n.id}
                accessibilityRole="button"
                hapticFeedback="none"
                activeScale={0.98}
                onPress={() => handleNotificationPress(n)}
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor: n.read ? colors.card : colors.accentTint,
                    borderColor: n.read ? colors.line : colors.accentSoft,
                  },
                ]}
              >
                {/* Icon Circle */}
                <View style={[styles.iconCircle, { backgroundColor: visual.bg }]}>
                  <Text style={{ fontSize: 18 }}>{visual.icon}</Text>
                </View>

                {/* Text Content */}
                <View style={{ flex: 1, gap: 3 }}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <AppText
                      style={[
                        styles.notificationTitle,
                        {
                          color: colors.text,
                          fontWeight: n.read ? '600' : '800',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {n.title}
                    </AppText>
                    <AppText variant="muted" style={styles.timeText}>
                      {formatRelativeTime(n.created_at, t, i18n.language)}
                    </AppText>
                  </Row>

                  <AppText
                    variant="muted"
                    numberOfLines={2}
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      color: n.read ? colors.muted : colors.text,
                    }}
                  >
                    {n.body}
                  </AppText>
                </View>

                {/* Unread Indicator Dot */}
                {!n.read ? (
                  <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
                ) : null}
              </BouncyPressable>
            );
          })}
        </View>
      )}

      {/* Spacing for floating bottom bar */}
      <View style={{ height: isTab ? 90 : 20 }} />
    </>
  );

  if (isTab) {
    return (
      <Screen refreshControl={refreshEl}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs }}>
          <View style={{ flex: 1 }}>
            <AppText variant="small" style={{ color: colors.accent, fontWeight: '700' }}>
              {t('notifications.eyebrow', { defaultValue: 'อัปเดตของคุณ' })}
            </AppText>
            <AppText variant="title">{t('notifications.title')}</AppText>
          </View>
          {markAllBtn}
        </Row>
        {content}
      </Screen>
    );
  }

  return (
    <SubScreen
      title={t('notifications.title')}
      right={markAllBtn}
      refreshControl={refreshEl}
    >
      {content}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  notificationTitle: {
    fontSize: 14.5,
    flex: 1,
    marginRight: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
});
