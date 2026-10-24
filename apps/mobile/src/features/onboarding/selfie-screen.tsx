import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Card, Chip, Screen } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { StepHeader } from './step-header';

/**
 * ขั้น 4: selfie liveness
 * ยังไม่มีผู้ให้บริการ (Q14) → หน้านี้เก็บ consent biometric ได้ แต่ยังยืนยันไม่ได้
 * ระดับ 'selfie' ตั้งได้จาก server (Edge Function + private.mark_liveness_passed) เท่านั้น — ไม่มีปุ่มข้ามในแอป
 */
export function SelfieScreen() {
  const { t } = useTranslation();
  const [consented, setConsented] = useState(false);
  const [started, setStarted] = useState(false);

  const start = useMutation({
    mutationFn: () => api.recordConsents(['biometric']),
    onSuccess: () => setStarted(true),
  });

  return (
    <Screen>
      <StepHeader
        step="selfie"
        title={t('onboarding.selfie.title')}
        body={t('onboarding.selfie.body')}
      />
      <Chip
        label={t('onboarding.selfie.consent')}
        selected={consented}
        onPress={() => setConsented(!consented)}
      />
      {start.isError ? <AppText variant="error">{errorMessage(start.error)}</AppText> : null}
      {started ? (
        <Card>
          <AppText variant="muted">{t('onboarding.selfie.notReady')}</AppText>
        </Card>
      ) : (
        <Button
          label={t('onboarding.selfie.start')}
          onPress={() => start.mutate()}
          disabled={!consented}
          loading={start.isPending}
        />
      )}
      <Button variant="ghost" label={t('common.signOut')} onPress={() => void api.auth.signOut()} />
    </Screen>
  );
}
