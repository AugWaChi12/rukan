import { queryKeys } from '@rukan/api';
import { PROFILE_LIMITS } from '@rukan/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ListGroup, ListRow } from '@/components/list';
import { AppText, Button, Card, Row, TextField } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries } from '@/lib/api';
import { space } from '@/theme/tokens';
import { SubScreen, WithProfile } from './shared';

export function PromptsScreen() {
  const { t } = useTranslation();
  return (
    <SubScreen title={t('me.menu.prompts')} hint={t('me.promptsHint')}>
      <WithProfile>{(profile) => <PromptsEditor initialPrompts={profile.prompts} />}</WithProfile>
    </SubScreen>
  );
}

function PromptsEditor({
  initialPrompts,
}: {
  initialPrompts: { prompt_id: string; answer: string }[];
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const promptsQuery = useQuery(queries.prompts());
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialPrompts.map((p) => [p.prompt_id, p.answer])),
  );
  const [activeIds, setActiveIds] = useState<string[]>(() =>
    initialPrompts.map((p) => p.prompt_id),
  );

  const savedByPrompt = new Map(initialPrompts.map((p) => [p.prompt_id, p.answer]));
  const allPrompts = promptsQuery.data ?? [];
  const promptText = (id: string) => {
    const found = allPrompts.find((p) => p.id === id);
    if (!found) return id;
    return i18n.language === 'en' ? found.text_en : found.text_th;
  };

  const savePrompt = useMutation({
    mutationFn: ({ promptId, answer }: { promptId: string; answer: string }) =>
      api.setPromptAnswer(promptId, answer),
    onSuccess: (_data, variables) => {
      if (variables.answer.trim().length === 0) {
        setActiveIds((prev) => prev.filter((id) => id !== variables.promptId));
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
    },
  });

  const availablePrompts = allPrompts.filter((p) => !activeIds.includes(p.id));
  const canAddMore = activeIds.length < PROFILE_LIMITS.prompts && availablePrompts.length > 0;

  return (
    <View style={styles.list}>
      {activeIds.map((promptId) => {
        const value = drafts[promptId] ?? '';
        const saved = savedByPrompt.get(promptId) ?? '';
        const dirty = value.trim() !== saved.trim() && value.trim().length > 0;

        return (
          <Card key={promptId}>
            <TextField
              label={promptText(promptId)}
              placeholder={t('me.promptAddPlaceholder')}
              value={value}
              onChangeText={(text) => setDrafts((prev) => ({ ...prev, [promptId]: text }))}
              multiline
              maxLength={PROFILE_LIMITS.promptAnswer}
            />
            <Row style={styles.actions}>
              <Button
                size="sm"
                variant="ghost"
                label={t('me.promptRemove')}
                onPress={() => {
                  if (saved) savePrompt.mutate({ promptId, answer: '' });
                  else setActiveIds((prev) => prev.filter((id) => id !== promptId));
                }}
                disabled={savePrompt.isPending}
              />
              <Button
                size="sm"
                label={t('me.promptSave')}
                onPress={() => savePrompt.mutate({ promptId, answer: value })}
                loading={savePrompt.isPending}
                disabled={!dirty}
              />
            </Row>
          </Card>
        );
      })}

      {canAddMore ? (
        <ListGroup title={t('me.promptChoose')}>
          {availablePrompts.map((p) => (
            <ListRow
              key={p.id}
              icon="add"
              label={i18n.language === 'en' ? p.text_en : p.text_th}
              onPress={() => setActiveIds((prev) => [...prev, p.id])}
            />
          ))}
        </ListGroup>
      ) : null}

      {savePrompt.isError ? (
        <AppText variant="error">{errorMessage(savePrompt.error)}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.lg },
  actions: { justifyContent: 'flex-end' },
});
