import { queryKeys } from '@rukan/api';
import { PROFILE_LIMITS } from '@rukan/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Chip, Row } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries } from '@/lib/api';
import { sameSet, SubScreen, WithProfile } from './shared';

export function InterestsScreen() {
  const { t } = useTranslation();
  return (
    <SubScreen title={t('me.menu.interests')} hint={t('me.interestsHint')}>
      <WithProfile>{(profile) => <InterestsPicker initialIds={profile.interests} />}</WithProfile>
    </SubScreen>
  );
}

function InterestsPicker({ initialIds }: { initialIds: string[] }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const interestsQuery = useQuery(queries.interests());
  const [selected, setSelected] = useState<string[]>(initialIds);

  const toggle = (id: string) =>
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= PROFILE_LIMITS.interests) return prev;
      return [...prev, id];
    });

  const unchanged = sameSet(selected, initialIds);
  const save = useMutation({
    mutationFn: () => api.setInterests(selected),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myProfile }),
  });

  return (
    <>
      <AppText variant="small">
        {t('me.selectedCount', { count: selected.length, max: PROFILE_LIMITS.interests })}
      </AppText>
      <Row>
        {(interestsQuery.data ?? []).map((item) => (
          <Chip
            key={item.id}
            label={i18n.language === 'en' ? item.name_en : item.name_th}
            selected={selected.includes(item.id)}
            onPress={() => toggle(item.id)}
          />
        ))}
      </Row>
      {save.isError ? <AppText variant="error">{errorMessage(save.error)}</AppText> : null}
      <Button
        label={save.isSuccess && unchanged ? t('common.saved') : t('common.save')}
        onPress={() => save.mutate()}
        loading={save.isPending}
        disabled={unchanged}
      />
    </>
  );
}
