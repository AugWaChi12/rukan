import { z } from 'zod';

export const BUBBLE_STATUSES = ['pending', 'accepted', 'declined', 'expired'] as const;
export type BubbleStatus = (typeof BUBBLE_STATUSES)[number];

export const CONVERSATION_KINDS = ['anon', 'match'] as const;
export type ConversationKind = (typeof CONVERSATION_KINDS)[number];

export const MESSAGE_KINDS = ['text', 'system', 'polite_close'] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const CHAT_LIMITS = {
  bubbleMessage: 200,
  messageBody: 1000,
  messagesDefaultLimit: 50,
  messagesMaxLimit: 100,
} as const;

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

export const sendBubbleSchema = z.object({
  postId: z.guid(),
  message: z
    .string()
    .trim()
    .min(1, 'กรุณาเขียนข้อความทักทาย')
    .max(CHAT_LIMITS.bubbleMessage, `ข้อความยาวได้ไม่เกิน ${CHAT_LIMITS.bubbleMessage} ตัวอักษร`),
});
export type SendBubbleInput = z.input<typeof sendBubbleSchema>;

export const respondBubbleSchema = z.object({
  bubbleId: z.guid(),
  accept: z.boolean(),
});
export type RespondBubbleInput = z.input<typeof respondBubbleSchema>;

export const getMessagesSchema = z.object({
  conversationId: z.guid(),
  beforeCreatedAt: z.string().optional(),
  beforeId: z.guid().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(CHAT_LIMITS.messagesMaxLimit)
    .default(CHAT_LIMITS.messagesDefaultLimit),
});
export type GetMessagesInput = z.input<typeof getMessagesSchema>;

export const sendMessageSchema = z.object({
  conversationId: z.guid(),
  body: z
    .string()
    .trim()
    .min(1, 'กรุณาพิมพ์ข้อความ')
    .max(CHAT_LIMITS.messageBody, `ข้อความยาวได้ไม่เกิน ${CHAT_LIMITS.messageBody} ตัวอักษร`),
});
export type SendMessageInput = z.input<typeof sendMessageSchema>;

// ---------------------------------------------------------------------------
// Output Schemas (RPC JSON responses — ไม่เคยส่ง sender_id ออกมา)
// ---------------------------------------------------------------------------

export const sendBubbleResultSchema = z.object({
  id: z.guid(),
  post_id: z.guid(),
  status: z.enum(BUBBLE_STATUSES),
  created_at: z.string(),
});
export type SendBubbleResult = z.infer<typeof sendBubbleResultSchema>;

export const incomingBubbleSchema = z.object({
  id: z.guid(),
  post_id: z.guid(),
  post_body_preview: z.string(),
  sender_alias: z.string(),
  sender_alias_color: z.string(),
  message: z.string(),
  status: z.enum(BUBBLE_STATUSES),
  conversation_id: z.guid().nullable(),
  created_at: z.string(),
});
export type IncomingBubble = z.infer<typeof incomingBubbleSchema>;

export const outgoingBubbleSchema = z.object({
  id: z.guid(),
  post_id: z.guid(),
  post_body_preview: z.string(),
  recipient_alias: z.string(),
  recipient_alias_color: z.string(),
  message: z.string(),
  status: z.enum(BUBBLE_STATUSES),
  conversation_id: z.guid().nullable(),
  created_at: z.string(),
});
export type OutgoingBubble = z.infer<typeof outgoingBubbleSchema>;

export const myBubblesSchema = z.object({
  incoming: z.array(incomingBubbleSchema),
  outgoing: z.array(outgoingBubbleSchema),
});
export type MyBubbles = z.infer<typeof myBubblesSchema>;

export const respondBubbleResultSchema = z.object({
  id: z.guid(),
  status: z.enum(['accepted', 'declined']),
  conversation_id: z.guid().nullable(),
});
export type RespondBubbleResult = z.infer<typeof respondBubbleResultSchema>;

export const conversationPeerSchema = z.object({
  user_id: z.guid().nullable(),
  display_name: z.string().nullable(),
  alias: z.string(),
  alias_color: z.string(),
});
export type ConversationPeer = z.infer<typeof conversationPeerSchema>;

export const conversationListItemSchema = z.object({
  id: z.guid(),
  kind: z.enum(CONVERSATION_KINDS),
  is_anonymous: z.boolean(),
  reveal_stage: z.number().int().min(0).max(3),
  match_id: z.guid().nullable(),
  closed_at: z.string().nullable(),
  closed_reason: z.string().nullable(),
  last_message_at: z.string().nullable(),
  peer: conversationPeerSchema,
  my_message_count: z.number().int(),
  peer_message_count: z.number().int(),
  my_wants_reveal: z.boolean(),
  peer_wants_reveal: z.boolean(),
  last_message_preview: z.string().nullable(),
  unread_count: z.number().int(),
});
export type ConversationListItem = z.infer<typeof conversationListItemSchema>;
export const conversationListSchema = z.array(conversationListItemSchema);

export const conversationDetailSchema = z.object({
  id: z.guid(),
  kind: z.enum(CONVERSATION_KINDS),
  is_anonymous: z.boolean(),
  reveal_stage: z.number().int().min(0).max(3),
  match_id: z.guid().nullable(),
  closed_at: z.string().nullable(),
  closed_reason: z.string().nullable(),
  peer: conversationPeerSchema,
  my_message_count: z.number().int(),
  peer_message_count: z.number().int(),
  my_wants_reveal: z.boolean(),
  peer_wants_reveal: z.boolean(),
  my_wants_photo_unlock: z.boolean(),
  peer_wants_photo_unlock: z.boolean(),
  next_stage_target_messages: z.number().int().nullable(),
  my_messages_needed_for_next_stage: z.number().int().nullable(),
  peer_messages_needed_for_next_stage: z.number().int().nullable(),
});
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

export const chatMessageSchema = z.object({
  id: z.guid(),
  body: z.string(),
  kind: z.enum(MESSAGE_KINDS),
  is_mine: z.boolean(),
  scam_warning: z.boolean(),
  created_at: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export const chatMessageListSchema = z.array(chatMessageSchema);

export const sendMessageResultSchema = chatMessageSchema.extend({
  reveal_stage: z.number().int().min(0).max(3),
});
export type SendMessageResult = z.infer<typeof sendMessageResultSchema>;

export const requestRevealResultSchema = z.object({
  revealed: z.boolean(),
  is_anonymous: z.boolean(),
  match_id: z.guid().nullable(),
  reveal_stage: z.number().int().min(0).max(3),
});
export type RequestRevealResult = z.infer<typeof requestRevealResultSchema>;

export const requestPhotoUnlockResultSchema = z.object({
  reveal_stage: z.number().int().min(0).max(3),
  unlocked_all: z.boolean(),
});
export type RequestPhotoUnlockResult = z.infer<typeof requestPhotoUnlockResultSchema>;

// ---------------------------------------------------------------------------
// Realtime Private Broadcast Signal Schemas (ตาม D36 — ไม่มี sender_id / user_id / body)
// ---------------------------------------------------------------------------

export const REALTIME_CHAT_EVENT_TYPES = [
  'new_message',
  'reveal_requested',
  'identity_revealed',
  'photo_unlock_updated',
  'conversation_closed',
  'bubble_accepted',
  'conversation_updated',
] as const;
export type RealtimeChatEventType = (typeof REALTIME_CHAT_EVENT_TYPES)[number];

export const realtimeChatSignalSchema = z.object({
  id: z.guid().optional(),
  type: z.enum(REALTIME_CHAT_EVENT_TYPES),
  conversation_id: z.guid(),
  message_id: z.guid().nullable().optional(),
  reveal_stage: z.number().int().min(0).max(3).nullable().optional(),
});
export type RealtimeChatSignal = z.infer<typeof realtimeChatSignalSchema>;

export const REALTIME_INBOX_EVENT_TYPES = [
  'new_message',
  'reveal_requested',
  'identity_revealed',
  'photo_unlock_updated',
  'conversation_closed',
  'bubble_received',
  'bubble_accepted',
  'bubble_declined',
  'daily_drop_ready',
  'inbox_updated',
] as const;
export type RealtimeInboxEventType = (typeof REALTIME_INBOX_EVENT_TYPES)[number];

export const realtimeInboxSignalSchema = z.object({
  id: z.guid().optional(),
  type: z.enum(REALTIME_INBOX_EVENT_TYPES),
  conversation_id: z.guid().nullable().optional(),
  drop_date: z.string().optional(),
  slot: z.string().optional(),
});
export type RealtimeInboxSignal = z.infer<typeof realtimeInboxSignalSchema>;
