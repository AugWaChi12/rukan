import { queryOptions } from '@tanstack/react-query';
import type { RukanApi } from './client';

/**
 * query key กลาง — invalidate ด้วย prefix ได้ เช่น `queryClient.invalidateQueries({ queryKey: queryKeys.me })`
 * ข้อมูลของ "ฉัน" อยู่ใต้ ['me'] ทั้งหมด → ตอน logout ลบทิ้งทีเดียว
 */
export const queryKeys = {
  me: ['me'] as const,
  myStatus: ['me', 'status'] as const,
  myProfile: ['me', 'profile'] as const,
  reference: ['reference'] as const,
  areas: ['reference', 'areas'] as const,
  interests: ['reference', 'interests'] as const,
  prompts: ['reference', 'prompts'] as const,
};

const REFERENCE_STALE_MS = 60 * 60 * 1000; // ข้อมูลอ้างอิงเปลี่ยนแค่ตอน deploy

export function createQueries(api: RukanApi) {
  return {
    myStatus: () => queryOptions({ queryKey: queryKeys.myStatus, queryFn: api.getMyStatus }),
    myProfile: () => queryOptions({ queryKey: queryKeys.myProfile, queryFn: api.getMyProfile }),
    areas: () =>
      queryOptions({
        queryKey: queryKeys.areas,
        queryFn: api.listAreas,
        staleTime: REFERENCE_STALE_MS,
      }),
    interests: () =>
      queryOptions({
        queryKey: queryKeys.interests,
        queryFn: api.listInterests,
        staleTime: REFERENCE_STALE_MS,
      }),
    prompts: () =>
      queryOptions({
        queryKey: queryKeys.prompts,
        queryFn: api.listPrompts,
        staleTime: REFERENCE_STALE_MS,
      }),
  };
}

export type RukanQueries = ReturnType<typeof createQueries>;
