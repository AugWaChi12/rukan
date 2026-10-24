import { Redirect } from 'expo-router';
import { stepPath } from '@/features/onboarding/steps';
import { useMyStatus } from '@/hooks/use-my-status';
import { useSession } from '@/providers/session-provider';

/** จุดเริ่มต้น — พาไปโซนที่ถูกตามสถานะ (root layout รอโหลดสถานะให้แล้ว) */
export default function Index() {
  const { session } = useSession();
  const status = useMyStatus();

  if (!session) return <Redirect href="/sign-in" />;
  const path = status.data ? stepPath(status.data.next_step) : null;
  return <Redirect href={path ?? '/space'} />;
}
