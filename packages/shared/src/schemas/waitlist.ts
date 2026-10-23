import { z } from 'zod';

/**
 * เวอร์ชันข้อความยินยอมของฟอร์ม waitlist — เปลี่ยนเมื่อแก้ข้อความยินยอม/นโยบาย
 * (บันทึกลง DB เพื่อรู้ว่าแต่ละคนยินยอมกับข้อความฉบับไหน ตาม PDPA)
 */
export const WAITLIST_CONSENT_VERSION = 'waitlist-2026-10';

/** ต้องตรงกับ check constraint ใน supabase/migrations/*_waitlist.sql */
export const AGE_BANDS = ['18-21', '22-25', '26-30', '30+'] as const;
export const WAITLIST_INTENTS = ['friend', 'talk', 'date'] as const;

export type AgeBand = (typeof AGE_BANDS)[number];
export type WaitlistIntent = (typeof WAITLIST_INTENTS)[number];

export const waitlistFormSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  area: z.string().trim().min(1).max(80),
  ageBand: z.enum(AGE_BANDS).optional(),
  intents: z.array(z.enum(WAITLIST_INTENTS)).max(WAITLIST_INTENTS.length).default([]),
  // ต้องติ๊กยินยอมเอง (checkbox ไม่ติ๊กไว้ก่อน)
  consent: z.literal(true),
});

export type WaitlistFormInput = z.input<typeof waitlistFormSchema>;
export type WaitlistForm = z.output<typeof waitlistFormSchema>;
