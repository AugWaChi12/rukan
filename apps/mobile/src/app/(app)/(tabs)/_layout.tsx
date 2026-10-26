import { useQuery } from '@tanstack/react-query';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { TabChatsIcon, TabDropIcon, TabMeIcon, TabSpaceIcon } from '@/components/brand-icons';
import { queries } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';
import { radius } from '@/theme/tokens';

function renderTabBrandIcon(routeName: string, focused: boolean) {
  switch (routeName) {
    case 'space':
      return <TabSpaceIcon size={26} focused={focused} />;
    case 'drop':
      return <TabDropIcon size={26} focused={focused} />;
    case 'chats':
      return <TabChatsIcon size={26} focused={focused} />;
    case 'me':
      return <TabMeIcon size={26} focused={focused} />;
    default:
      return <TabSpaceIcon size={26} focused={focused} />;
  }
}

const SUPPORTS_NATIVE_LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="space" options={{ title: t('tabs.space') }} />
      <Tabs.Screen name="drop" options={{ title: t('tabs.drop') }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats') }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.me') }} />
    </Tabs>
  );
}

function LiquidGlassTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const { name } = useAppTheme();
  const isDark = name === 'gold';

  // ดึงจำนวนข้อความยังไม่อ่าน + Bubble ที่รอตอบ เพื่อแสดงจุดแจ้งเตือนสีชมพู/แดงแบบ Instagram
  const conversationsQuery = useQuery(queries.myConversations());
  const bubblesQuery = useQuery(queries.myBubbles());
  const unreadChats = (conversationsQuery.data ?? []).reduce((sum, c) => sum + c.unread_count, 0);
  const pendingBubbles = (bubblesQuery.data?.incoming ?? []).filter(
    (b) => b.status === 'pending',
  ).length;
  const hasChatActivity = unreadChats + pendingBubbles > 0;

  const bottomOffset = Math.max(insets.bottom, 12);

  const webBlurStyle: ViewStyle =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(24px) saturate(185%)',
          WebkitBackdropFilter: 'blur(24px) saturate(185%)',
        } as unknown as ViewStyle)
      : {};

  const shellSurfaceStyle: ViewStyle = isDark
    ? {
        backgroundColor: SUPPORTS_NATIVE_LIQUID_GLASS
          ? 'rgba(20, 18, 16, 0.35)'
          : 'rgba(22, 20, 18, 0.82)',
        borderColor: 'rgba(255, 255, 255, 0.16)',
        shadowColor: '#000000',
        shadowOpacity: 0.42,
      }
    : {
        backgroundColor: SUPPORTS_NATIVE_LIQUID_GLASS
          ? 'rgba(255, 255, 255, 0.32)'
          : 'rgba(255, 255, 255, 0.78)',
        borderColor: 'rgba(255, 255, 255, 0.92)',
        shadowColor: '#2e2238',
        shadowOpacity: 0.14,
      };

  const activePillStyle: ViewStyle = isDark
    ? {
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        borderColor: 'rgba(255, 255, 255, 0.22)',
      }
    : {
        backgroundColor: 'rgba(46, 34, 56, 0.085)',
        borderColor: 'rgba(255, 255, 255, 0.85)',
      };

  return (
    <View pointerEvents="box-none" style={[styles.floatingHost, { bottom: bottomOffset }]}>
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        colorScheme={isDark ? 'dark' : 'light'}
        style={[styles.glassCapsule, shellSurfaceStyle, webBlurStyle]}
      >
        {/* เส้นแสงสะท้อนขอบบน (Specular Liquid Highlight) */}
        <View
          pointerEvents="none"
          style={[
            styles.specularRim,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 255, 255, 0.95)',
            },
          ]}
        />

        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key]!;
            const focused = state.index === index;
            const showDot = route.name === 'chats' && hasChatActivity;

            const onPress = () => {
              haptic.selection();
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigateToTab(route.key);
              }
            };

            const onLongPress = () => {
              emitter.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title ?? route.name}
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [
                  styles.tabButton,
                  {
                    transform: [{ scale: pressed ? 0.91 : focused ? 1.02 : 1 }],
                  },
                ]}
              >
                <View style={[styles.pillIndicator, focused ? activePillStyle : null]}>
                  {renderTabBrandIcon(route.name, focused)}
                  {showDot ? <View style={styles.activityDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingHost: {
    position: 'absolute',
    left: 22,
    right: 22,
    alignItems: 'center',
    zIndex: 50,
  },
  glassCapsule: {
    width: '100%',
    maxWidth: 420,
    height: 62,
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 12,
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    borderRadius: 1,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: '100%',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIndicator: {
    minWidth: 64,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDot: {
    position: 'absolute',
    bottom: 6,
    right: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff3b5c',
  },
});
