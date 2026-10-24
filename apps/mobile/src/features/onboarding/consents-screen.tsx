import { REQUIRED_CONSENTS } from '@rukan/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Card, Chip, Screen } from '@/components/ui';
import { useRefreshStatus } from '@/hooks/use-my-status';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { StepHeader } from './step-header';

/** ขั้น 1: ยอมรับข้อกำหนด / นโยบาย / กติกา (ต้องติ๊กเองทีละข้อ — PDPA ห้ามติ๊กไว้ให้) */
export function ConsentsScreen() {
  const { t } = useTranslation();
  const refreshStatus = useRefreshStatus();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = REQUIRED_CONSENTS.every((doc) => checked[doc]);

  const accept = useMutation({
    mutationFn: () => api.recordConsents(REQUIRED_CONSENTS),
    onSuccess: refreshStatus,
  });

  return (
    <Screen>
      <StepHeader
        step="consents"
        title={t('onboarding.consents.title')}
        body={t('onboarding.consents.body')}
      />
      <Card>
        {REQUIRED_CONSENTS.map((doc) => (
          <Chip
            key={doc}
            label={t(`onboarding.consents.${doc}`)}
            selected={!!checked[doc]}
            onPress={() => setChecked((c) => ({ ...c, [doc]: !c[doc] }))}
          />
        ))}
      </Card>
      {accept.isError ? <AppText variant="error">{errorMessage(accept.error)}</AppText> : null}
      <Button
        label={t('onboarding.consents.accept')}
        onPress={() => accept.mutate()}
        disabled={!allChecked}
        loading={accept.isPending}
      />
      <Button variant="ghost" label={t('common.signOut')} onPress={() => void api.auth.signOut()} />
    </Screen>
  );
}
