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
  'overthinking',
] as const;
export type SpaceMood = (typeof SPACE_MOODS)[number];

export const SPACE_FEED_TABS = ['all', 'nearby', 'same_age'] as const;
export type SpaceFeedTab = (typeof SPACE_FEED_TABS)[number];

export const SPACE_FEED_SORTS = ['latest', 'hot'] as const;
export type SpaceFeedSort = (typeof SPACE_FEED_SORTS)[number];

export const SPACE_LIMITS = {
  postBody: 500,
  replyBody: 300,
  feedDefaultLimit: 20,
  feedMaxLimit: 50,
  maxHashtagsPerPost: 5,
  maxHashtagLength: 40,
  trendingDefaultHours: 24,
  trendingDefaultLimit: 10,
  trendingMaxLimit: 30,
} as const;

const HASHTAG_NAME_RE = /^[a-z0-9_\u0E01-\u0E5B]{1,40}$/;
const HASHTAG_EXTRACT_RE = /(?<![a-zA-Z0-9_\u0E01-\u0E5B@])#([a-zA-Z0-9_\u0E01-\u0E5B]{1,40})/g;

/** ทำความสะอาดชื่อ #แท็ก (ตัด # นำหน้า, แปลงเป็นตัวพิมพ์เล็ก) — คืน null ถ้ารูปแบบไม่ถูกต้อง */
export function normalizeHashtag(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/^#+/, '');
  return HASHTAG_NAME_RE.test(clean) ? clean : null;
}

/** สกัดรายการ #แท็ก จากข้อความโพสต์ (รักษาลำดับที่พิมพ์, ลบตัวซ้ำ, สูงสุด 5 แท็ก — ตรงกับ private.extract_hashtags ใน DB) */
export function extractHashtags(body: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const match of body.matchAll(HASHTAG_EXTRACT_RE)) {
    const tag = match[1]?.toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
      if (tags.length >= SPACE_LIMITS.maxHashtagsPerPost) break;
    }
  }
  return tags;
}

export const hashtagSchema = z
  .string()
  .trim()
  .transform((val) => val.toLowerCase().replace(/^#+/, ''))
  .refine(
    (val) => HASHTAG_NAME_RE.test(val),
    'ชื่อแฮชแท็กไม่ถูกต้อง (1–40 ตัวอักษร ไทย/อังกฤษ/ตัวเลข)',
  );

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
  mediaUrl: z.string().url().max(500).nullish(),
});
export type CreatePostInput = z.input<typeof createPostSchema>;

export const createStorySchema = z.object({
  mediaUrl: z.string().url().max(500),
  caption: z.string().trim().max(150).nullish(),
});
export type CreateStoryInput = z.input<typeof createStorySchema>;

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
  hashtag: hashtagSchema.optional(),
  sort: z.enum(SPACE_FEED_SORTS).default('latest'),
});
export type GetFeedInput = z.input<typeof getFeedSchema>;

export const getTrendingHashtagsSchema = z.object({
  hours: z.number().int().min(1).max(168).default(SPACE_LIMITS.trendingDefaultHours),
  limit: z
    .number()
    .int()
    .min(1)
    .max(SPACE_LIMITS.trendingMaxLimit)
    .default(SPACE_LIMITS.trendingDefaultLimit),
});
export type GetTrendingHashtagsInput = z.input<typeof getTrendingHashtagsSchema>;

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
  media_url: z.string().nullable().optional(),
  hashtags: z.array(z.string()).default([]),
  mood: z.enum(SPACE_MOODS).nullable().optional(),
  area_id: z.string().nullable().optional(),
  age_band: z.string().nullable().optional(),
  like_count: z.number().int().optional(),
  reply_count: z.number().int().optional(),
  liked_by_me: z.boolean().optional(),
  is_mine: z.boolean().optional(),
  created_at: z.string(),
  care_notice: z.boolean(),
});
export type CreatePostResult = z.infer<typeof createPostResultSchema>;

export const spacePostSchema = z.object({
  id: z.guid(),
  alias: z.string(),
  alias_color: z.string(),
  body: z.string(),
  media_url: z.string().nullable().optional(),
  hashtags: z.array(z.string()).default([]),
  mood: z.enum(SPACE_MOODS).nullable().optional(),
  area_id: z.string().nullable().optional(),
  age_band: z.string().nullable().optional(),
  like_count: z.number().int().default(0),
  reply_count: z.number().int().default(0),
  liked_by_me: z.boolean().default(false),
  is_mine: z.boolean().default(false),
  created_at: z.string(),
});
export type SpacePost = z.infer<typeof spacePostSchema>;
export const spaceFeedSchema = z.array(spacePostSchema);

export const storyItemSchema = z.object({
  id: z.guid(),
  alias: z.string(),
  alias_color: z.string(),
  media_url: z.string(),
  caption: z.string().nullable().optional(),
  tier: z.string().default('free'),
  is_mine: z.boolean().default(false),
  created_at: z.string(),
  expires_at: z.string(),
});
export type StoryItem = z.infer<typeof storyItemSchema>;
export const storiesFeedSchema = z.array(storyItemSchema);

export const trendingHashtagSchema = z.object({
  tag: z.string(),
  post_count: z.number().int().min(0),
});
export type TrendingHashtag = z.infer<typeof trendingHashtagSchema>;
export const trendingHashtagsSchema = z.array(trendingHashtagSchema);

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
