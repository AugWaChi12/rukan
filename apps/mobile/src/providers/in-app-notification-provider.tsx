import type { NotificationItem } from '@rukan/shared';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { InAppToast } from '@/components/in-app-toast';
import { api, queryClient, queryKeys } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useSession } from '@/providers/session-provider';

interface InAppNotificationContextValue {
  showToast: (item: NotificationItem) => void;
  dismissToast: () => void;
}

const InAppNotificationContext = createContext<InAppNotificationContextValue>({
  showToast: () => {},
  dismissToast: () => {},
});

export function InAppNotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);

  const showToast = useCallback((item: NotificationItem) => {
    setActiveToast(item);
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  useEffect(() => {
    if (!userId) return;

    return api.realtime.subscribeUserInbox(userId, async () => {
      // 1. สั่น Haptic Feedback ให้ผู้ใช้รู้สึกตัวทันที
      haptic.success();

      // 2. Invalidate cache queries เพื่อให้ Badge และ Red dot เด้งอัปเดต 0ms
      void queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myConversations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBubbles });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myMatches });

      // 3. ดึงรายการแจ้งเตือนล่าสุดมาแสดงบน Floating In-App Toast Capsule
      try {
        const items = await api.getMyNotifications({ limit: 1, offset: 0 });
        if (items.length > 0 && !items[0].read) {
          setActiveToast(items[0]);
        }
      } catch {
        // ignore
      }
    });
  }, [userId]);

  return (
    <InAppNotificationContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <InAppToast notification={activeToast} onDismiss={dismissToast} />
    </InAppNotificationContext.Provider>
  );
}

export function useInAppNotification(): InAppNotificationContextValue {
  return useContext(InAppNotificationContext);
}
