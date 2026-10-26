import Ionicons from '@expo/vector-icons/Ionicons';
import type { NotificationItem, NotificationType } from '@rukan/shared';
import { GlassView } from 'expo-glass-effect';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { api, queryClient, queryKeys } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';
import { radius } from '@/theme/tokens';

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

interface InAppToastProps {
  notification: NotificationItem | null;
  onDismiss: () => void;
}

export function InAppToast({ notification, onDismiss }: InAppToastProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, name } = useAppTheme();
  const isDark = name === 'gold';

  const [translateY] = useState(() => new Animated.Value(-120));
  const [opacity] = useState(() => new Animated.Value(0));

  const hide = useCallback(
    (onComplete?: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss();
        onComplete?.();
      });
    },
    [onDismiss, opacity, translateY],
  );

  useEffect(() => {
    if (!notification) return;

    // เด้งลงมาแบบสปริงนุ่มนวล
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss หลัง 4.5 วินาที
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss();
      });
    }, 4500);

    return () => {
      clearTimeout(timer);
    };
  }, [notification, onDismiss, opacity, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
        onPanResponderMove: (_, gesture) => {
          // อนุญาตให้ลากขึ้นเพื่อปัดทิ้ง
          if (gesture.dy < 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -20 || gesture.vy < -0.5) {
            hide();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [hide, translateY],
  );

  if (!notification) return null;

  const visual = getNotificationVisual(notification.type);
  const capsuleWidth = Math.min(width - 24, 420);
  const topOffset = Math.max(insets.top, 10);

  const handlePress = () => {
    haptic.selection();
    // ทำเครื่องหมายว่าอ่านแล้วทันที
    void api.markNotificationRead(notification.id);
    void queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });

    hide(() => {
      const data = (notification.data || {}) as Record<string, unknown>;
      if (data.conversation_id || data.bubble_id || notification.type === 'bubble_received') {
        router.push('/(app)/(tabs)/chats' as Href);
      } else if (data.match_id || notification.type === 'new_match') {
        router.push('/(app)/(tabs)/chats' as Href);
      } else if (data.post_id || notification.type === 'post_reply' || notification.type === 'post_like') {
        router.push('/(app)/(tabs)/space' as Href);
      } else if (notification.type === 'coin_credited') {
        router.push('/(app)/(tabs)/me' as Href);
      } else {
        router.push('/(app)/(tabs)/notifications' as Href);
      }
    });
  };

  const webBlurStyle: ViewStyle =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        } as unknown as ViewStyle)
      : {};

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          top: topOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <GlassView
        glassEffectStyle="regular"
        colorScheme={isDark ? 'dark' : 'light'}
        style={[
          styles.capsule,
          {
            width: capsuleWidth,
            backgroundColor: isDark ? 'rgba(26, 22, 28, 0.88)' : 'rgba(255, 255, 255, 0.88)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(46, 34, 56, 0.12)',
          },
          webBlurStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={handlePress}
          style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.88 : 1 }]}
        >
          {/* Icon Circle */}
          <View style={[styles.iconCircle, { backgroundColor: visual.bg }]}>
            <Text style={{ fontSize: 18 }}>{visual.icon}</Text>
          </View>

          {/* Text preview */}
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText
                style={[styles.title, { color: colors.text }]}
                numberOfLines={1}
              >
                {notification.title}
              </AppText>
              <AppText variant="small" style={{ fontSize: 11, color: colors.accent, fontWeight: '700' }}>
                เมื่อสักครู่
              </AppText>
            </View>
            <AppText
              variant="muted"
              numberOfLines={1}
              style={{ fontSize: 12.5, lineHeight: 16 }}
            >
              {notification.body}
            </AppText>
          </View>

          {/* Dismiss button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ปิดการแจ้งเตือน"
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation();
              hide();
            }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={16} color={colors.muted} />
          </Pressable>
        </Pressable>
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  capsule: {
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#2E2238',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 14,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13.5,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
  },
});
