import { z } from 'zod';

export const SPACE_MOODS = [
  'lonely',
  'tired',
  'happy',
  'anxious',
  'bored',
  'hopeful',
  'calm',
  'excited',
] as const;
export type SpaceMood = (typeof SPACE_MOODS)[number];

export const SPACE_FEED_TABS = ['all', 'nearby', 'same_age'] as const;
export type SpaceFeedTab = (typeof SPACE_FEED_TABS)[number];

export const SPACE_LIMITS = {
  postBody: 500,
  replyBody: 300,
  feedDefaultLimit: 20,
  feedMaxLimit: 50,
} as const;

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

export const createPostSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'กรุณาเขียนข้อความ')
    .max(SPACE_LIMITS.postBody, `โพสต์ได้ไม่เกิน ${SPACE_LIMITS.postBody} ตัวอักษร`),
  mood: z.enum(SPACE_MOODS).optional(),
});
export type CreatePostInput = z.input<typeof createPostSchema>;

export const getFeedSchema = z.object({
  tab: z.enum(SPACE_FEED_TABS).default('all'),
  beforeCreatedAt: z.string().optional(),
  beforeId: z.guid().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(SPACE_LIMITS.feedMaxLimit)
    .default(SPACE_LIMITS.feedDefaultLimit),
});
export type GetFeedInput = z.input<typeof getFeedSchema>;

export const replyPostSchema = z.object({
  postId: z.guid(),
  body: z
    .string()
    .trim()
    .min(1, 'กรุณาเขียนข้อความ')
    .max(SPACE_LIMITS.replyBody, `ตอบกลับได้ไม่เกิน ${SPACE_LIMITS.replyBody} ตัวอักษร`),
});
export type ReplyPostInput = z.input<typeof replyPostSchema>;

export const checkinMoodSchema = z.enum(SPACE_MOODS);

// ---------------------------------------------------------------------------
// Output Schemas (RPC JSON responses — ห้ามมี author_id / user_id เด็ดขาด)
// ---------------------------------------------------------------------------

export const createPostResultSchema = z.object({
  id: z.guid(),
  alias: z.string(),
  alias_color: z.string(),
  body: z.string(),
  mood: z.enum(SPACE_MOODS).nullable(),
  area_id: z.string().nullable(),
  age_band: z.string().nullable(),
  created_at: z.string(),
  care_notice: z.boolean(),
});
export type CreatePostResult = z.infer<typeof createPostResultSchema>;

export const spacePostSchema = z.object({
  id: z.guid(),
  alias: z.string(),
  alias_color: z.string(),
  body: z.string(),
  mood: z.enum(SPACE_MOODS).nullable(),
  area_id: z.string().nullable(),
  age_band: z.string().nullable(),
  like_count: z.number().int(),
  reply_count: z.number().int(),
  liked_by_me: z.boolean(),
  is_mine: z.boolean(),
  created_at: z.string(),
});
export type SpacePost = z.infer<typeof spacePostSchema>;
export const spaceFeedSchema = z.array(spacePostSchema);

export const spaceReplySchema = z.object({
  id: z.guid(),
  post_id: z.guid(),
  alias: z.string(),
  alias_color: z.string(),
  body: z.string(),
  is_op: z.boolean(),
  is_mine: z.boolean(),
  created_at: z.string(),
});
export type SpaceReply = z.infer<typeof spaceReplySchema>;
export const spaceRepliesSchema = z.array(spaceReplySchema);

export const replyPostResultSchema = spaceReplySchema.extend({
  care_notice: z.boolean(),
});
export type ReplyPostResult = z.infer<typeof replyPostResultSchema>;

export const moodCheckinResultSchema = z.object({
  checkin_date: z.string(),
  mood: z.enum(SPACE_MOODS),
});
export type MoodCheckinResult = z.infer<typeof moodCheckinResultSchema>;
