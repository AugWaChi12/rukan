import { queryKeys } from '@rukan/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queries } from '@/lib/api';
import { useSession } from '@/providers/session-provider';

/** สถานะของฉัน (ขั้น onboarding ถัดไป) — ใช้ตัดสินว่าจะพาไปหน้าไหน */
export function useMyStatus() {
  const { session } = useSession();
  return useQuery({ ...queries.myStatus(), enabled: !!session });
}

/** เรียกหลังทำขั้นใดขั้นหนึ่งสำเร็จ → ดึงสถานะใหม่ → navigator พาไปขั้นถัดไปเอง */
export function useRefreshStatus() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.myStatus });
}
