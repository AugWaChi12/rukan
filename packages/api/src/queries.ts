import type { AppealStatus, ProfileMode, ReportStatus, SpaceFeedTab } from '@rukan/shared';
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
  mySubscription: ['me', 'subscription'] as const,
  myPhotos: ['me', 'photos'] as const,
  myBlocks: ['me', 'blocks'] as const,
  myModerationHistory: ['me', 'moderation-history'] as const,
  myBubbles: ['me', 'bubbles'] as const,
  myConversations: ['me', 'conversations'] as const,
  conversation: (conversationId: string) => ['me', 'conversations', conversationId] as const,
  messages: (conversationId: string) =>
    ['me', 'conversations', conversationId, 'messages'] as const,
  myDrop: (mode: ProfileMode) => ['me', 'drop', mode] as const,
  myMatches: ['me', 'matches'] as const,
  profileCard: (userId: string) => ['me', 'profile-card', userId] as const,
  space: ['space'] as const,
  spaceFeed: (tab: SpaceFeedTab) => ['space', 'feed', tab] as const,
  spaceReplies: (postId: string) => ['space', 'replies', postId] as const,
  moderation: ['moderation'] as const,
  modDashboardCounts: ['moderation', 'dashboard-counts'] as const,
  modWaitlistStats: ['moderation', 'waitlist-stats'] as const,
  modWaitlist: (search = '') => ['moderation', 'waitlist', search] as const,
  modReports: (status: ReportStatus = 'open') => ['moderation', 'reports', status] as const,
  modReport: (reportId: string) => ['moderation', 'report', reportId] as const,
  modAppeals: (status: AppealStatus = 'pending') => ['moderation', 'appeals', status] as const,
  reference: ['reference'] as const,
  tierConfigs: ['reference', 'tier-configs'] as const,
  areas: ['reference', 'areas'] as const,
  interests: ['reference', 'interests'] as const,
  prompts: ['reference', 'prompts'] as const,
};

const REFERENCE_STALE_MS = 60 * 60 * 1000; // ข้อมูลอ้างอิงเปลี่ยนแค่ตอน deploy

export function createQueries(api: RukanApi) {
  return {
    myStatus: () => queryOptions({ queryKey: queryKeys.myStatus, queryFn: api.getMyStatus }),
    myProfile: () => queryOptions({ queryKey: queryKeys.myProfile, queryFn: api.getMyProfile }),
    mySubscription: () =>
      queryOptions({ queryKey: queryKeys.mySubscription, queryFn: api.getMySubscription }),
    tierConfigs: () =>
      queryOptions({ queryKey: queryKeys.tierConfigs, queryFn: api.getTierConfigs }),
    myPhotos: () => queryOptions({ queryKey: queryKeys.myPhotos, queryFn: api.listMyPhotos }),
    myBlocks: () => queryOptions({ queryKey: queryKeys.myBlocks, queryFn: api.getMyBlocks }),
    myModerationHistory: () =>
      queryOptions({
        queryKey: queryKeys.myModerationHistory,
        queryFn: api.getMyModerationHistory,
      }),
    myBubbles: () => queryOptions({ queryKey: queryKeys.myBubbles, queryFn: api.getMyBubbles }),
    myConversations: () =>
      queryOptions({ queryKey: queryKeys.myConversations, queryFn: api.getConversations }),
    conversation: (conversationId: string) =>
      queryOptions({
        queryKey: queryKeys.conversation(conversationId),
        queryFn: () => api.getConversation(conversationId),
      }),
    messages: (conversationId: string, limit = 50) =>
      queryOptions({
        queryKey: queryKeys.messages(conversationId),
        queryFn: () => api.getMessages({ conversationId, limit }),
      }),
    myDrop: (mode: ProfileMode) =>
      queryOptions({
        queryKey: queryKeys.myDrop(mode),
        queryFn: () => api.getMyDrop(mode),
      }),
    myMatches: () => queryOptions({ queryKey: queryKeys.myMatches, queryFn: api.getMyMatches }),
    profileCard: (userId: string) =>
      queryOptions({
        queryKey: queryKeys.profileCard(userId),
        queryFn: () => api.getProfileCard(userId),
      }),
    spaceFeed: (tab: SpaceFeedTab = 'all', limit = 20) =>
      queryOptions({
        queryKey: queryKeys.spaceFeed(tab),
        queryFn: () => api.getFeed({ tab, limit }),
      }),
    spaceReplies: (postId: string) =>
      queryOptions({
        queryKey: queryKeys.spaceReplies(postId),
        queryFn: () => api.getReplies(postId),
      }),
    modDashboardCounts: () =>
      queryOptions({
        queryKey: queryKeys.modDashboardCounts,
        queryFn: api.moderation.getDashboardCounts,
      }),
    modWaitlistStats: () =>
      queryOptions({
        queryKey: queryKeys.modWaitlistStats,
        queryFn: api.moderation.getWaitlistStats,
      }),
    modWaitlist: (search = '', limit = 100) =>
      queryOptions({
        queryKey: queryKeys.modWaitlist(search),
        queryFn: () => api.moderation.listWaitlist({ search: search || undefined, limit }),
      }),
    modReports: (status: ReportStatus = 'open', limit = 50) =>
      queryOptions({
        queryKey: queryKeys.modReports(status),
        queryFn: () => api.moderation.listReports({ status, limit }),
      }),
    modReport: (reportId: string) =>
      queryOptions({
        queryKey: queryKeys.modReport(reportId),
        queryFn: () => api.moderation.getReport(reportId),
      }),
    modAppeals: (status: AppealStatus = 'pending', limit = 50) =>
      queryOptions({
        queryKey: queryKeys.modAppeals(status),
        queryFn: () => api.moderation.listAppeals({ status, limit }),
      }),
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
