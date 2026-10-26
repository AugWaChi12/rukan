import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'post_reply',
  'post_like',
  'bubble_received',
  'bubble_accepted',
  'new_match',
  'new_message',
  'reveal_request',
  'reveal_completed',
  'photo_unlock_request',
  'photo_unlock_completed',
  'coin_credited',
  'system',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationItemSchema = z.object({
  id: z.string().uuid(),
  type: notificationTypeSchema.catch('system'),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.unknown()).default({}),
  read: z.boolean(),
  created_at: z.string(),
});
export type NotificationItem = z.infer<typeof notificationItemSchema>;

export const notificationsListSchema = z.array(notificationItemSchema);

export const getNotificationsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});
export type GetNotificationsInput = z.infer<typeof getNotificationsInputSchema>;
