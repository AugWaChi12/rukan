import { Redirect, Stack, usePathname } from 'expo-router';
import { stepPath } from '@/features/onboarding/steps';
import { useMyStatus } from '@/hooks/use-my-status';

/**
 * onboarding เดินตามที่ server บอก (get_my_status().next_step) — ข้ามขั้นเองไม่ได้
 * เปิดหน้าที่ไม่ใช่ขั้นปัจจุบัน → ถูกพากลับไปขั้นที่ต้องทำ
 */
export default function OnboardingLayout() {
  const pathname = usePathname();
  const status = useMyStatus();
  const target = status.data ? stepPath(status.data.next_step) : null;

  if (target && pathname !== target) return <Redirect href={target} />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
