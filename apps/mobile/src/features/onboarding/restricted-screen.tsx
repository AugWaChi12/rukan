import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Card, Row, Screen, TextField } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries, queryClient, queryKeys } from '@/lib/api';
import { space } from '@/theme/tokens';

export function RestrictedScreen() {
  const { t } = useTranslation();
  const history = useQuery(queries.myModerationHistory());
  const [appealTexts, setAppealTexts] = useState<Record<string, string>>({});

  const appealMut = useMutation({
    mutationFn: (input: { actionId: string; appealText: string }) => api.submitAppeal(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myModerationHistory }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myStatus }),
      ]);
    },
  });

  return (
    <Screen>
      <Card tone="night" style={styles.heroCard}>
        <Badge label="Safety & Policy" tone="gold" />
        <AppText variant="title" style={{ color: '#f2eadb' }}>
          {t('onboarding.restricted.title')}
        </AppText>
        <AppText variant="muted" style={{ color: '#a69d90' }}>
          {t('onboarding.restricted.body')}
        </AppText>
      </Card>

      <AppText variant="heading">{t('onboarding.restricted.historyTitle')}</AppText>

      {(history.data ?? []).length === 0 ? (
        <Card>
          <AppText variant="muted">{t('onboarding.restricted.emptyHistory')}</AppText>
        </Card>
      ) : (
        (history.data ?? []).map((item) => {
          const draft = appealTexts[item.id] ?? '';
          const statusLabel =
            item.appeal_status === 'pending'
              ? t('onboarding.restricted.appealStatus.pending')
              : item.appeal_status === 'accepted'
                ? t('onboarding.restricted.appealStatus.accepted')
                : item.appeal_status === 'rejected'
                  ? t('onboarding.restricted.appealStatus.rejected')
                  : t('onboarding.restricted.appealStatus.none');

          return (
            <Card key={item.id}>
              <Row style={styles.headerRow}>
                <Badge
                  label={t('onboarding.restricted.level', { level: item.level })}
                  tone="rose"
                />
                <Badge
                  label={
                    item.until
                      ? t('onboarding.restricted.until', {
                          date: new Date(item.until).toLocaleDateString(),
                        })
                      : t('onboarding.restricted.permanent')
                  }
                  tone="lilac"
                />
              </Row>
              <AppText variant="subheading">{item.reason}</AppText>
              <AppText variant="small">{statusLabel}</AppText>

              {item.appeal_text ? (
                <Card tone="cream">
                  <AppText variant="small">{item.appeal_text}</AppText>
                </Card>
              ) : null}

              {item.can_appeal ? (
                <View style={styles.appealForm}>
                  <TextField
                    label={t('onboarding.restricted.appealSubmit')}
                    value={draft}
                    onChangeText={(v) => setAppealTexts((prev) => ({ ...prev, [item.id]: v }))}
                    placeholder={t('onboarding.restricted.appealPlaceholder')}
                    maxLength={1000}
                    multiline
                  />
                  {appealMut.error ? (
                    <AppText variant="error">{errorMessage(appealMut.error)}</AppText>
                  ) : null}
                  <Button
                    variant="primary"
                    label={t('onboarding.restricted.appealSubmit')}
                    loading={appealMut.isPending}
                    disabled={draft.trim().length < 5}
                    onPress={() =>
                      appealMut.mutate({ actionId: item.id, appealText: draft.trim() })
                    }
                  />
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <Button variant="ghost" label={t('common.signOut')} onPress={() => void api.auth.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: space.sm,
  },
  headerRow: {
    justifyContent: 'space-between',
  },
  appealForm: {
    gap: space.sm,
    marginTop: space.xs,
  },
});
