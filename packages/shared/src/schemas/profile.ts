import { z } from 'zod';
import {
  ONBOARDING_STEPS,
  PROFILE_LIMITS,
  PROFILE_LOCALES,
  PROFILE_MODES,
  PROFILE_THEMES,
  VERIFICATION_LEVELS,
} from '../constants/identity';

/** อายุเป็นปีเต็ม ณ วันที่ `today` (ตรงกับ private.age_years ใน DB) */
export function ageFromBirthdate(birthdate: string, today: Date = new Date()): number {
  const [y, m, d] = birthdate.split('-').map(Number) as [number, number, number];
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

const displayName = z
  .string()
  .trim()
  .min(1, 'กรุณาใส่ชื่อ')
  .max(PROFILE_LIMITS.displayName, `ชื่อยาวได้ไม่เกิน ${PROFILE_LIMITS.displayName} ตัวอักษร`);
const modes = z.array(z.enum(PROFILE_MODES)).min(1, 'เลือกอย่างน้อย 1 อย่าง');
const occupation = z.string().trim().max(PROFILE_LIMITS.occupation);
const areaId = z.string().trim().min(1);

/**
 * ฟอร์มขั้น "ข้อมูลพื้นฐาน" ของ onboarding → complete_onboarding()
 * กฎต้องตรงกับ DB (DB คือด่านสุดท้าย, zod ใช้บอกผู้ใช้ก่อนส่ง)
 */
export const onboardingSchema = z.object({
  displayName,
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันเกิดไม่ถูกต้อง')
    .refine(
      (v) => ageFromBirthdate(v) >= PROFILE_LIMITS.minAge,
      `ต้องอายุ ${PROFILE_LIMITS.minAge} ปีขึ้นไป`,
    )
    .refine((v) => ageFromBirthdate(v) <= 100, 'รูปแบบวันเกิดไม่ถูกต้อง'),
  modes,
  areaId: areaId.optional(),
  occupation: occupation.optional(),
});
export type OnboardingInput = z.input<typeof onboardingSchema>;

/** แก้โปรไฟล์ → update_my_profile() — ไม่ส่ง = ไม่เปลี่ยน, '' (bio/occupation/areaId) = ล้างค่า */
export const updateProfileSchema = z.object({
  displayName: displayName.optional(),
  bio: z
    .string()
    .trim()
    .max(PROFILE_LIMITS.bio, `แนะนำตัวได้ไม่เกิน ${PROFILE_LIMITS.bio} ตัวอักษร`)
    .optional(),
  occupation: occupation.optional(),
  areaId: z.string().trim().optional(),
  modes: modes.optional(),
  locale: z.enum(PROFILE_LOCALES).optional(),
  theme: z.enum(PROFILE_THEMES).optional(),
});
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const interestsSchema = z
  .array(z.string().trim().min(1))
  .max(PROFILE_LIMITS.interests, `เลือกความสนใจได้ไม่เกิน ${PROFILE_LIMITS.interests} อย่าง`);

export const promptAnswerSchema = z.object({
  promptId: z.string().trim().min(1),
  answer: z.string().trim().max(PROFILE_LIMITS.promptAnswer),
});

export const photoPositionSchema = z
  .number()
  .int()
  .min(0)
  .max(PROFILE_LIMITS.photos - 1);

// ---------------------------------------------------------------------------
// รูปร่างผลลัพธ์ของ RPC (RPC คืน json → parse ด้วย schema เหล่านี้ใน @rukan/api)
// ---------------------------------------------------------------------------

/** get_my_status() */
export const myStatusSchema = z.object({
  user_id: z.guid(),
  state: z.enum(['active', 'suspended', 'banned']),
  verification_level: z.enum(VERIFICATION_LEVELS),
  onboarded: z.boolean(),
  missing_consents: z.array(z.string()),
  next_step: z.enum(ONBOARDING_STEPS),
});
export type MyStatus = z.infer<typeof myStatusSchema>;

/** get_my_profile() */
export const myProfileSchema = z.object({
  id: z.guid(),
  display_name: z.string(),
  bio: z.string().nullable(),
  occupation: z.string().nullable(),
  area_id: z.string().nullable(),
  modes: z.array(z.enum(PROFILE_MODES)),
  org_badge: z.string().nullable(),
  verification_level: z.enum(VERIFICATION_LEVELS),
  locale: z.enum(PROFILE_LOCALES),
  theme: z.enum(PROFILE_THEMES),
  onboarded_at: z.string().nullable(),
  birthdate: z.string().nullable(),
  age: z.number().int().nullable(),
  alias: z.string(),
  alias_color: z.string(),
  interests: z.array(z.string()),
  prompts: z.array(z.object({ prompt_id: z.string(), answer: z.string() })),
});
export type MyProfile = z.infer<typeof myProfileSchema>;
