import {
  REPORT_REASONS,
  type BlockTargetType,
  type ReportReason,
  type ReportTargetType,
} from '@rukan/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { AppText, Badge, Button, Card, Chip, ModalSheet, Row, TextField } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queryClient, queryKeys } from '@/lib/api';
import { space } from '@/theme/tokens';

export interface SafetyTarget {
  targetType: BlockTargetType;
  reportTargetType?: ReportTargetType;
  targetId: string;
  label?: string;
}

export function CareNoticeBanner({ onDismiss }: { onDismiss?: () => void }) {
  const { t } = useTranslation();
  return (
    <Card tone="sage" style={styles.careCard}>
      <Badge label="1323 · 24/7" tone="sage" />
      <AppText variant="subheading">{t('space.careTitle')}</AppText>
      <AppText variant="body">{t('space.careBody')}</AppText>
      {onDismiss ? (
        <Button size="sm" variant="ghost" label={t('common.close')} onPress={onDismiss} />
      ) : null}
    </Card>
  );
}

export function SafetySheet({
  target,
  onClose,
  onBlocked,
}: {
  target: SafetyTarget | null;
  onClose: () => void;
  onBlocked?: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [details, setDetails] = useState('');
  const [careNotice, setCareNotice] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const blockMut = useMutation({
    mutationFn: async () => {
      if (!target) return;
      await api.blockUserFrom({
        targetType: target.targetType,
        targetId: target.targetId,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.space }),
        queryClient.invalidateQueries({ queryKey: queryKeys.me }),
      ]);
      onBlocked?.();
      onClose();
    },
  });

  const reportTargetType: ReportTargetType | null = target
    ? (target.reportTargetType ?? (target.targetType === 'conversation' ? null : target.targetType))
    : null;

  const reportMut = useMutation({
    mutationFn: async () => {
      if (!target || !reportTargetType) return null;
      return api.reportTarget({
        targetType: reportTargetType,
        targetId: target.targetId,
        reason,
        details: details.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      setReportDone(true);
      if (res?.care_notice) {
        setCareNotice(true);
      }
    },
  });

  const handleClose = () => {
    setDetails('');
    setReportDone(false);
    setCareNotice(false);
    onClose();
  };

  return (
    <ModalSheet
      visible={target !== null}
      title={target?.label ? `${t('safety.sheetTitle')} · ${target.label}` : t('safety.sheetTitle')}
      onClose={handleClose}
    >
      {careNotice ? <CareNoticeBanner /> : null}

      <Card tone="night" style={styles.blockBox}>
        <Badge label="Soft & Safe" tone="gold" />
        <AppText variant="muted" style={{ color: '#f2eadb' }}>
          {t('safety.blockHint')}
        </AppText>
        {blockMut.error ? <AppText variant="error">{errorMessage(blockMut.error)}</AppText> : null}
        <Button
          variant="danger"
          label={t('safety.blockBtn')}
          loading={blockMut.isPending}
          onPress={() => blockMut.mutate()}
        />
      </Card>

      {reportTargetType ? (
        <Card>
          <AppText variant="subheading">{t('safety.reportSection')}</AppText>
          {reportDone ? (
            <AppText variant="body">{t('safety.reportedSuccess')}</AppText>
          ) : (
            <>
              <Row>
                {REPORT_REASONS.map((r) => (
                  <Chip
                    key={r}
                    label={t(`safety.reasons.${r}`)}
                    selected={reason === r}
                    onPress={() => setReason(r)}
                  />
                ))}
              </Row>
              <TextField
                label={t('common.optional')}
                value={details}
                onChangeText={setDetails}
                placeholder={t('safety.detailsPlaceholder')}
                maxLength={500}
                multiline
              />
              {reportMut.error ? (
                <AppText variant="error">{errorMessage(reportMut.error)}</AppText>
              ) : null}
              <Button
                variant="primary"
                label={t('safety.submitReport')}
                loading={reportMut.isPending}
                onPress={() => reportMut.mutate()}
              />
            </>
          )}
        </Card>
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  careCard: {
    gap: space.xs,
  },
  blockBox: {
    gap: space.sm,
  },
});
