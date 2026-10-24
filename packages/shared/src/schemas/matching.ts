import { z } from 'zod';
import { PROFILE_MODES, VERIFICATION_LEVELS } from '../constants/identity';

export const SWIPE_DIRECTIONS = ['like', 'skip'] as const;
export type SwipeDirection = (typeof SWIPE_DIRECTIONS)[number];

export const MATCH_SOURCES = ['drop', 'bubble_reveal'] as const;
export type MatchSource = (typeof MATCH_SOURCES)[number];

export const MATCH_STATUSES = ['active', 'expired', 'closed', 'unmatched'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const POLITE_CLOSE_TEMPLATES = ['thanks', 'busy', 'found_someone', 'take_care'] as const;
export type PoliteCloseTemplate = (typeof POLITE_CLOSE_TEMPLATES)[number];

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

export const getMyDropSchema = z.enum(PROFILE_MODES);

export const swipeSchema = z.object({
  candidateId: z.guid(),
  mode: z.enum(PROFILE_MODES),
  direction: z.enum(SWIPE_DIRECTIONS),
});
export type SwipeInput = z.input<typeof swipeSchema>;

export const politeCloseSchema = z.object({
  matchId: z.guid(),
  templateId: z.enum(POLITE_CLOSE_TEMPLATES).default('thanks'),
});
export type PoliteCloseInput = z.input<typeof politeCloseSchema>;

// ---------------------------------------------------------------------------
// Output Schemas (RPC JSON responses — ไม่เคยส่ง birthdate ออกไป)
// ---------------------------------------------------------------------------

export const dropCandidatePromptSchema = z.object({
  prompt_id: z.string(),
  answer: z.string(),
});

export const dropCandidateSchema = z.object({
  candidate_id: z.guid(),
  mode: z.enum(PROFILE_MODES),
  rank: z.number().int(),
  action: z.enum(SWIPE_DIRECTIONS).nullable(),
  display_name: z.string(),
  age: z.number().int().nullable(),
  bio: z.string().nullable(),
  occupation: z.string().nullable(),
  area_id: z.string().nullable(),
  org_badge: z.string().nullable(),
  interests: z.array(z.string()),
  prompts: z.array(dropCandidatePromptSchema),
  photo_stage: z.number().int(),
});
export type DropCandidate = z.infer<typeof dropCandidateSchema>;
export const dailyDropListSchema = z.array(dropCandidateSchema);

export const swipeResultSchema = z.object({
  matched: z.boolean(),
  match_id: z.guid().nullable(),
  conversation_id: z.guid().nullable(),
});
export type SwipeResult = z.infer<typeof swipeResultSchema>;

export const matchPeerSchema = z.object({
  user_id: z.guid(),
  display_name: z.string(),
  age: z.number().int().nullable(),
  occupation: z.string().nullable(),
  area_id: z.string().nullable(),
  org_badge: z.string().nullable(),
});
export type MatchPeer = z.infer<typeof matchPeerSchema>;

export const matchItemSchema = z.object({
  id: z.guid(),
  mode: z.enum(PROFILE_MODES),
  source: z.enum(MATCH_SOURCES),
  status: z.enum(MATCH_STATUSES),
  expires_at: z.string().nullable(),
  conversation_id: z.guid().nullable(),
  reveal_stage: z.number().int().min(0).max(3),
  peer: matchPeerSchema,
  created_at: z.string(),
});
export type MatchItem = z.infer<typeof matchItemSchema>;
export const matchListSchema = z.array(matchItemSchema);

export const profileCardSchema = z.object({
  id: z.guid(),
  display_name: z.string(),
  age: z.number().int().nullable(),
  bio: z.string().nullable(),
  occupation: z.string().nullable(),
  area_id: z.string().nullable(),
  modes: z.array(z.enum(PROFILE_MODES)),
  org_badge: z.string().nullable(),
  verification_level: z.enum(VERIFICATION_LEVELS),
  reveal_stage: z.number().int().min(0).max(3),
  interests: z.array(z.string()),
  prompts: z.array(dropCandidatePromptSchema),
  unlocked_photo_paths: z.array(z.string()),
});
export type ProfileCard = z.infer<typeof profileCardSchema>;
