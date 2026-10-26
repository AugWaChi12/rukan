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

export const REPORT_TARGET_TYPES = [
  'profile',
  'post',
  'reply',
  'message',
  'bubble',
  'conversation',
] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  'harassment',
  'doxxing',
  'scam',
  'fake',
  'nsfw',
  'spam',
  'impersonation',
  'underage',
  'self_harm',
  'threat',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ['open', 'reviewing', 'actioned', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const MOD_ACTIONS = [
  'warn',
  'hide_content',
  'remove_content',
  'suspend',
  'ban',
  'unban',
] as const;
export type ModAction = (typeof MOD_ACTIONS)[number];

export const APPEAL_DECISIONS = ['accepted', 'rejected'] as const;
export type AppealDecision = (typeof APPEAL_DECISIONS)[number];

export const APPEAL_STATUSES = ['none', 'pending', 'accepted', 'rejected'] as const;
export type AppealStatus = (typeof APPEAL_STATUSES)[number];

export const SUBSCRIPTION_TIERS = ['free', 'gold', 'premium'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const SUBSCRIPTION_SOURCES = [
  'revenuecat_ios',
  'revenuecat_android',
  'coins',
  'web_topup',
  'manual',
  'promo',
] as const;
export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[number];

export const PASS_DURATIONS = ['weekly', 'monthly'] as const;
export type PassDuration = (typeof PASS_DURATIONS)[number];

export const SUBSCRIPTION_STATUSES = ['active', 'canceled', 'expired', 'grace_period'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

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
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
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

export const modListAppealsSchema = z.object({
  status: z.enum(APPEAL_STATUSES).optional().default('pending'),
  limit: z.number().int().min(1).max(100).default(50),
});
export type ModListAppealsInput = z.input<typeof modListAppealsSchema>;

export const modListWaitlistSchema = z.object({
  limit: z.number().int().min(1).max(200).default(100),
  offset: z.number().int().min(0).default(0),
  search: z.string().trim().optional(),
});
export type ModListWaitlistInput = z.input<typeof modListWaitlistSchema>;

export const tierConfigUpdateFieldsSchema = z.object({
  display_name: z.string().trim().min(1).max(100).optional(),
  swipe_batch_size: z.number().int().min(1).max(200).optional(),
  swipe_window_hours: z.number().int().min(1).max(48).optional(),
  daily_bubble_limit: z.number().int().min(0).max(9999).optional(),
  daily_golden_bubbles: z.number().int().min(0).max(100).optional(),
  allow_rewind: z.boolean().optional(),
  match_expiry_hours: z.number().int().min(1).max(720).optional(),
  allow_see_likes: z.boolean().optional(),
  allow_spotlight_post: z.boolean().optional(),
  allow_advanced_filters: z.boolean().optional(),
  allow_ai_assistant: z.boolean().optional(),
  ai_coin_cost_per_use: z.number().int().min(0).max(10000).optional(),
  price_coins_weekly: z.number().int().min(0).max(1000000).optional(),
  price_coins_monthly: z.number().int().min(0).max(1000000).optional(),
  price_thb_monthly: z.number().min(0).max(99999).optional(),
});

export const modUpdateTierConfigSchema = z.object({
  tier: z.enum(SUBSCRIPTION_TIERS),
  config: tierConfigUpdateFieldsSchema,
});
export type ModUpdateTierConfigInput = z.input<typeof modUpdateTierConfigSchema>;

export const modSetUserSubscriptionSchema = z.object({
  userId: z.guid(),
  tier: z.enum(SUBSCRIPTION_TIERS),
  source: z.enum(SUBSCRIPTION_SOURCES).default('manual'),
  expiresAt: z.string().nullable().optional(),
});
export type ModSetUserSubscriptionInput = z.input<typeof modSetUserSubscriptionSchema>;

export const exchangeCoinsForPassSchema = z.object({
  tier: z.enum(['gold', 'premium'] as const),
  duration: z.enum(PASS_DURATIONS).default('monthly'),
});
export type ExchangeCoinsForPassInput = z.input<typeof exchangeCoinsForPassSchema>;

export const modGrantUserCoinsSchema = z.object({
  userId: z.guid(),
  amount: z
    .number()
    .int()
    .min(-1000000)
    .max(1000000)
    .refine((v) => v !== 0, 'amount must not be 0'),
  note: z.string().trim().max(500).optional(),
});
export type ModGrantUserCoinsInput = z.input<typeof modGrantUserCoinsSchema>;

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

export const reportResultSchema = z
  .object({
    id: z.guid().optional(),
    report_id: z.guid().optional(),
    status: z.string().optional(),
    severity: z.number().int().optional(),
    care_notice: z.boolean(),
  })
  .refine((v) => Boolean(v.id ?? v.report_id), {
    message: 'reportResultSchema requires id or report_id',
  });
export type ReportResult = z.infer<typeof reportResultSchema>;

export const moderationHistoryItemSchema = z.object({
  id: z.guid(),
  action: z.enum(MOD_ACTIONS),
  level: z.number().int(),
  reason: z.string(),
  until: z.string().nullable(),
  appeal_status: z.enum(APPEAL_STATUSES).nullable(),
  appeal_text: z.string().nullable(),
  appealed_at: z.string().nullable(),
  reviewed_at: z.string().nullable().optional(),
  created_at: z.string(),
  can_appeal: z.boolean().optional(),
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
  assigned_to: z.guid().nullable().optional(),
  resolved_by: z.guid().nullable().optional(),
  created_at: z.string(),
  resolved_at: z.string().nullable().optional(),
});
export type ModReportItem = z.infer<typeof modReportItemSchema>;
export const modReportListSchema = z.array(modReportItemSchema);

export const modReportDetailSchema = z.object({
  id: z.guid(),
  target_type: z.enum(REPORT_TARGET_TYPES),
  target_id: z.guid(),
  target_user_id: z.guid().nullable().optional(),
  reason: z.enum(REPORT_REASONS),
  severity: z.number().int(),
  details: z.string().nullable(),
  snapshot: z.record(z.string(), z.unknown()).optional(),
  content: z.record(z.string(), z.unknown()).nullable().optional(),
  prior_action_count: z.number().int().optional(),
  status: z.enum(REPORT_STATUSES),
  created_at: z.string(),
  resolved_at: z.string().nullable().optional(),
});
export type ModReportDetail = z.infer<typeof modReportDetailSchema>;

export const modRevealedAuthorSchema = z.object({
  user_id: z.guid(),
  display_name: z.string(),
  verification_level: z.enum(VERIFICATION_LEVELS),
  created_at: z.string().optional(),
  state: z.enum(['active', 'suspended', 'banned']),
  strikes: z.number().int().optional(),
});
export type ModRevealedAuthor = z.infer<typeof modRevealedAuthorSchema>;

export const modTakeActionResultSchema = z.object({
  action_id: z.guid(),
  user_id: z.guid(),
  state: z.enum(['active', 'suspended', 'banned']),
  strikes: z.number().int().optional(),
});
export type ModTakeActionResult = z.infer<typeof modTakeActionResultSchema>;

export const modAppealItemSchema = z.object({
  id: z.guid(),
  user_id: z.guid(),
  display_name: z.string(),
  action: z.enum(MOD_ACTIONS),
  level: z.number().int(),
  reason: z.string(),
  until: z.string().nullable(),
  appeal_text: z.string().nullable(),
  appealed_at: z.string().nullable(),
  appeal_status: z.enum(APPEAL_STATUSES).nullable(),
  moderator_id: z.guid().nullable(),
  appeal_reviewed_by: z.guid().nullable(),
  appeal_reviewed_at: z.string().nullable(),
  created_at: z.string(),
});
export type ModAppealItem = z.infer<typeof modAppealItemSchema>;
export const modAppealListSchema = z.array(modAppealItemSchema);

export const modDashboardCountsSchema = z.object({
  waitlist_total: z.number().int(),
  reports_pending: z.number().int(),
  appeals_pending: z.number().int(),
  active_suspensions: z.number().int(),
});
export type ModDashboardCounts = z.infer<typeof modDashboardCountsSchema>;

export const modWaitlistStatsSchema = z.object({
  total_count: z.number().int(),
  today_count: z.number().int(),
  by_area: z.array(z.object({ area: z.string(), count: z.number().int() })),
  by_age_band: z.array(z.object({ age_band: z.string(), count: z.number().int() })),
  by_locale: z.array(z.object({ locale: z.string(), count: z.number().int() })),
});
export type ModWaitlistStats = z.infer<typeof modWaitlistStatsSchema>;

export const modWaitlistRowSchema = z.object({
  id: z.guid(),
  email: z.string(),
  area: z.string(),
  age_band: z.string().nullable(),
  intents: z.array(z.string()),
  locale: z.string(),
  consented_at: z.string(),
  created_at: z.string(),
});
export type ModWaitlistRow = z.infer<typeof modWaitlistRowSchema>;
export const modWaitlistListSchema = z.array(modWaitlistRowSchema);

export const tierConfigSchema = z.object({
  tier: z.enum(SUBSCRIPTION_TIERS),
  display_name: z.string(),
  swipe_batch_size: z.number().int(),
  swipe_window_hours: z.number().int(),
  daily_bubble_limit: z.number().int(),
  daily_golden_bubbles: z.number().int(),
  allow_rewind: z.boolean(),
  match_expiry_hours: z.number().int(),
  allow_see_likes: z.boolean(),
  allow_spotlight_post: z.boolean(),
  allow_advanced_filters: z.boolean(),
  allow_ai_assistant: z.boolean().default(false),
  ai_coin_cost_per_use: z.number().int().default(30),
  price_coins_weekly: z.number().int().default(0),
  price_coins_monthly: z.number().int().default(0),
  price_thb_monthly: z.number(),
  updated_at: z.string().optional(),
});
export type TierConfig = z.infer<typeof tierConfigSchema>;
export const tierConfigListSchema = z.array(tierConfigSchema);

export const userLimitsSchema = z.object({
  swipe_batch_size: z.number().int(),
  swipe_window_hours: z.number().int(),
  daily_bubble_limit: z.number().int(),
  daily_golden_bubbles: z.number().int(),
  allow_rewind: z.boolean(),
  match_expiry_hours: z.number().int(),
  allow_see_likes: z.boolean(),
  allow_spotlight_post: z.boolean(),
  allow_advanced_filters: z.boolean(),
  allow_ai_assistant: z.boolean().default(false),
  ai_coin_cost_per_use: z.number().int().default(30),
  price_coins_weekly: z.number().int().default(0),
  price_coins_monthly: z.number().int().default(0),
});
export type UserLimits = z.infer<typeof userLimitsSchema>;

export const mySubscriptionSchema = z.object({
  tier: z.enum(SUBSCRIPTION_TIERS),
  source: z.enum(SUBSCRIPTION_SOURCES).nullable(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  expires_at: z.string().nullable(),
  coin_balance: z.number().int().default(0),
  limits: userLimitsSchema,
});
export type MySubscription = z.infer<typeof mySubscriptionSchema>;

export const modSetUserSubscriptionResultSchema = z.object({
  user_id: z.guid(),
  tier: z.enum(SUBSCRIPTION_TIERS),
  source: z.enum(SUBSCRIPTION_SOURCES),
  status: z.enum(SUBSCRIPTION_STATUSES),
  expires_at: z.string().nullable(),
});
export type ModSetUserSubscriptionResult = z.infer<typeof modSetUserSubscriptionResultSchema>;

export const modGrantUserCoinsResultSchema = z.object({
  user_id: z.guid(),
  coin_balance: z.number().int(),
  delta: z.number().int(),
});
export type ModGrantUserCoinsResult = z.infer<typeof modGrantUserCoinsResultSchema>;

export const useAiWingmanSchema = z.object({
  contextType: z.enum(['bubble', 'chat']).default('bubble'),
  contextText: z.string().max(500).default(''),
});
export type UseAiWingmanInput = z.input<typeof useAiWingmanSchema>;

export const aiWingmanResultSchema = z.object({
  suggestions: z.array(z.string()),
  coins_charged: z.number().int(),
  coin_balance: z.number().int(),
  tier: z.enum(SUBSCRIPTION_TIERS),
  is_free_vip: z.boolean(),
});
export type AiWingmanResult = z.infer<typeof aiWingmanResultSchema>;

export const modListUsersSchema = z.object({
  search: z.string().trim().max(100).optional(),
  filterTier: z.enum(['all', 'free', 'gold', 'premium'] as const).default('all'),
  filterState: z.enum(['all', 'active', 'suspended', 'banned'] as const).default('all'),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});
export type ModListUsersInput = z.input<typeof modListUsersSchema>;

export const modUserRowSchema = z.object({
  user_id: z.guid(),
  email: z.string().nullable().optional(),
  display_name: z.string(),
  alias: z.string(),
  alias_color: z.string(),
  area_id: z.string().nullable(),
  modes: z.array(z.string()).default([]),
  verification_level: z.enum(VERIFICATION_LEVELS),
  state: z.enum(['active', 'suspended', 'banned'] as const),
  tier: z.enum(SUBSCRIPTION_TIERS),
  coin_balance: z.number().int().default(0),
  tier_expires_at: z.string().nullable(),
  is_moderator: z.boolean().default(false),
  onboarded_at: z.string().nullable(),
  last_active_at: z.string().nullable(),
  created_at: z.string(),
});
export type ModUserRow = z.infer<typeof modUserRowSchema>;
export const modUserListSchema = z.array(modUserRowSchema);

export const modSetUserVerificationSchema = z.object({
  userId: z.guid(),
  level: z.enum(VERIFICATION_LEVELS),
});
export type ModSetUserVerificationInput = z.input<typeof modSetUserVerificationSchema>;

export const modSetUserVerificationResultSchema = z.object({
  user_id: z.guid(),
  verification_level: z.enum(VERIFICATION_LEVELS),
  onboarded_at: z.string().nullable(),
});
export type ModSetUserVerificationResult = z.infer<typeof modSetUserVerificationResultSchema>;
