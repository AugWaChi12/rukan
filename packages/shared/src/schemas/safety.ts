import { z } from 'zod';
import { VERIFICATION_LEVELS } from '../constants/identity';

export const BLOCK_TARGET_TYPES = [
  'profile',
  'post',
  'reply',
  'conversation',
  'message',
  'bubble',
] as const;
export type BlockTargetType = (typeof BLOCK_TARGET_TYPES)[number];

export const REPORT_TARGET_TYPES = ['profile', 'post', 'reply', 'message', 'bubble'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  'harassment',
  'scam',
  'fake',
  'nsfw',
  'underage',
  'self_harm',
  'spam',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const MOD_ACTIONS = ['warn', 'remove_content', 'suspend', 'ban', 'unban'] as const;
export type ModAction = (typeof MOD_ACTIONS)[number];

export const APPEAL_DECISIONS = ['accepted', 'rejected'] as const;
export type AppealDecision = (typeof APPEAL_DECISIONS)[number];

export const APPEAL_STATUSES = ['none', 'pending', 'accepted', 'rejected'] as const;
export type AppealStatus = (typeof APPEAL_STATUSES)[number];

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

export const blockUserFromSchema = z.object({
  targetType: z.enum(BLOCK_TARGET_TYPES),
  targetId: z.guid(),
});
export type BlockUserFromInput = z.input<typeof blockUserFromSchema>;

export const reportTargetSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.guid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});
export type ReportTargetInput = z.input<typeof reportTargetSchema>;

export const submitAppealSchema = z.object({
  actionId: z.guid(),
  appealText: z.string().trim().min(5).max(1000),
});
export type SubmitAppealInput = z.input<typeof submitAppealSchema>;

export const modListReportsSchema = z.object({
  status: z.enum(REPORT_STATUSES).default('open'),
  limit: z.number().int().min(1).max(100).default(50),
});
export type ModListReportsInput = z.input<typeof modListReportsSchema>;

export const modRevealAuthorSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.guid(),
  reason: z.string().trim().min(3).max(500),
});
export type ModRevealAuthorInput = z.input<typeof modRevealAuthorSchema>;

export const modTakeActionSchema = z.object({
  userId: z.guid(),
  action: z.enum(MOD_ACTIONS),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  reason: z.string().trim().min(3).max(500),
  until: z.string().optional(),
  reportId: z.guid().optional(),
  targetType: z.enum(REPORT_TARGET_TYPES).optional(),
  targetId: z.guid().optional(),
});
export type ModTakeActionInput = z.input<typeof modTakeActionSchema>;

export const modReviewAppealSchema = z.object({
  actionId: z.guid(),
  decision: z.enum(APPEAL_DECISIONS),
});
export type ModReviewAppealInput = z.input<typeof modReviewAppealSchema>;

// ---------------------------------------------------------------------------
// Output Schemas (RPC JSON responses)
// ---------------------------------------------------------------------------

export const blockedUserItemSchema = z.object({
  id: z.guid(),
  is_anonymous: z.boolean(),
  blocked_user_id: z.guid().nullable(),
  display_name: z.string().nullable(),
  created_at: z.string(),
});
export type BlockedUserItem = z.infer<typeof blockedUserItemSchema>;
export const blockedUserListSchema = z.array(blockedUserItemSchema);

export const reportResultSchema = z.object({
  report_id: z.guid(),
  severity: z.number().int(),
  care_notice: z.boolean(),
});
export type ReportResult = z.infer<typeof reportResultSchema>;

export const moderationHistoryItemSchema = z.object({
  id: z.guid(),
  action: z.enum(MOD_ACTIONS),
  level: z.number().int(),
  reason: z.string(),
  until: z.string().nullable(),
  appeal_status: z.enum(APPEAL_STATUSES),
  appeal_text: z.string().nullable(),
  appealed_at: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  created_at: z.string(),
  can_appeal: z.boolean(),
});
export type ModerationHistoryItem = z.infer<typeof moderationHistoryItemSchema>;
export const moderationHistoryListSchema = z.array(moderationHistoryItemSchema);

export const modReportItemSchema = z.object({
  id: z.guid(),
  target_type: z.enum(REPORT_TARGET_TYPES),
  target_id: z.guid(),
  reason: z.enum(REPORT_REASONS),
  severity: z.number().int(),
  details: z.string().nullable(),
  status: z.enum(REPORT_STATUSES),
  created_at: z.string(),
  resolved_at: z.string().nullable(),
});
export type ModReportItem = z.infer<typeof modReportItemSchema>;
export const modReportListSchema = z.array(modReportItemSchema);

export const modReportDetailSchema = z.object({
  id: z.guid(),
  target_type: z.enum(REPORT_TARGET_TYPES),
  target_id: z.guid(),
  reason: z.enum(REPORT_REASONS),
  severity: z.number().int(),
  details: z.string().nullable(),
  snapshot: z.record(z.string(), z.unknown()),
  status: z.enum(REPORT_STATUSES),
  created_at: z.string(),
  resolved_at: z.string().nullable(),
});
export type ModReportDetail = z.infer<typeof modReportDetailSchema>;

export const modRevealedAuthorSchema = z.object({
  user_id: z.guid(),
  display_name: z.string(),
  verification_level: z.enum(VERIFICATION_LEVELS),
  created_at: z.string(),
  state: z.enum(['active', 'suspended', 'banned']),
  strikes: z.number().int(),
});
export type ModRevealedAuthor = z.infer<typeof modRevealedAuthorSchema>;

export const modTakeActionResultSchema = z.object({
  action_id: z.guid(),
  user_id: z.guid(),
  state: z.enum(['active', 'suspended', 'banned']),
  strikes: z.number().int(),
});
export type ModTakeActionResult = z.infer<typeof modTakeActionResultSchema>;
