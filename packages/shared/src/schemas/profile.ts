import { z } from 'zod';

/**
 * กฎของข้อมูลที่ผู้ใช้แก้ได้ — ต้องตรงกับ check constraint ใน supabase/migrations
 * (DB คือด่านสุดท้าย, zod ใช้ validate ฟอร์มฝั่ง client ก่อนส่ง)
 */
export const updateProfileSchema = z.object({
  display_name: z.string().trim().min(1, 'กรุณาใส่ชื่อ').max(50, 'ชื่อยาวได้ไม่เกิน 50 ตัวอักษร'),
  bio: z.string().trim().max(500, 'แนะนำตัวได้ไม่เกิน 500 ตัวอักษร').nullable().optional(),
  avatar_url: z.url().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
