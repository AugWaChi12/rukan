import type { OnboardingStep } from '@rukan/shared';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { ONBOARDING_SCREENS, stepNumber } from './steps';

export function StepHeader({
  step,
  title,
  body,
}: {
  step: OnboardingStep;
  title: string;
  body?: string;
}) {
  const { t } = useTranslation();
  return (
    <>
      <AppText variant="small">
        {t('onboarding.step', { current: stepNumber(step), total: ONBOARDING_SCREENS.length })}
      </AppText>
      <AppText variant="title">{title}</AppText>
      {body ? <AppText variant="muted">{body}</AppText> : null}
    </>
  );
}
