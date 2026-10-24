import type { OnboardingStep } from '@rukan/shared';

/** ขั้นที่มีหน้าจอใน onboarding (ตามลำดับที่ get_my_status บอก) */
export const ONBOARDING_SCREENS = ['consents', 'phone', 'profile', 'selfie'] as const;
export type OnboardingScreen = (typeof ONBOARDING_SCREENS)[number] | 'restricted';

/** path ของหน้าจอสำหรับขั้นนี้ ('done' ไม่มีหน้าใน onboarding) */
export function stepPath(step: OnboardingStep): `/${OnboardingScreen}` | null {
  return step === 'done' ? null : `/${step}`;
}

export function stepNumber(step: OnboardingStep): number {
  return ONBOARDING_SCREENS.indexOf(step as (typeof ONBOARDING_SCREENS)[number]) + 1;
}
