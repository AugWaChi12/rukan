/**
 * ค่าคงที่ของระบบตัวตน — ต้องตรงกับ supabase/migrations/*_identity_core.sql
 * (DB เป็นตัวตัดสินสุดท้าย ค่าตรงนี้ใช้กับฟอร์ม / UI)
 */

/** เวอร์ชันเอกสารที่ต้องยอมรับ — ตรงกับ private.current_consent_version() */
export const CONSENT_VERSIONS = {
  terms: 'v1',
  privacy: 'v1',
  rules: 'v1',
  biometric: 'v1',
  location: 'v1',
} as const;

export type ConsentDoc = keyof typeof CONSENT_VERSIONS;

/** ต้องยอมรับก่อนเริ่มใช้แอป (ขั้น consents ใน onboarding) */
export const REQUIRED_CONSENTS = [
  'terms',
  'privacy',
  'rules',
] as const satisfies readonly ConsentDoc[];

export const PROFILE_MODES = ['friend', 'date'] as const;
export type ProfileMode = (typeof PROFILE_MODES)[number];

export const VERIFICATION_LEVELS = ['none', 'phone', 'selfie'] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

/** ขั้นต่อไปที่ get_my_status() บอก — แอปใช้เลือกหน้า */
export const ONBOARDING_STEPS = [
  'restricted',
  'consents',
  'phone',
  'profile',
  'selfie',
  'done',
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const PROFILE_LOCALES = ['th', 'en'] as const;
export const PROFILE_THEMES = ['light', 'gold', 'system'] as const;

export const PROFILE_LIMITS = {
  displayName: 50,
  bio: 500,
  occupation: 60,
  interests: 10,
  prompts: 3,
  promptAnswer: 200,
  photos: 6,
  minAge: 18,
} as const;
