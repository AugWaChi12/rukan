import { queryKeys } from '@rukan/api';
import { PROFILE_THEMES, type MyProfile } from '@rukan/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Card, Chip, Loading, Row, Screen, TextField } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries } from '@/lib/api';
import { useAppTheme } from '@/theme/theme-provider';

/** หน้า "ฉัน": โปรไฟล์ของตัวเอง + ตั้งค่าธีม / ภาษา */
export function MeScreen() {
  const profile = useQuery(queries.myProfile());
  if (profile.isPending) return <Loading />;
  if (profile.isError) {
    return (
      <Screen>
        <AppText variant="error">{errorMessage(profile.error)}</AppText>
        <Button label="↻" onPress={() => void profile.refetch()} />
      </Screen>
    );
  }
  return <MeContent profile={profile.data} />;
}

function MeContent({ profile }: { profile: MyProfile }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { setPreference } = useAppTheme();
  const [bio, setBio] = useState(profile.bio ?? '');

  const update = useMutation({
    mutationFn: api.updateMyProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myProfile }),
  });

  return (
    <Screen>
      <Card>
        <AppText variant="title">{profile.display_name}</AppText>
        <AppText variant="muted">
          {[
            profile.age === null ? null : t('me.age', { age: profile.age }),
            profile.occupation,
            t(`me.verified.${profile.verification_level}`),
          ]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
        <AppText variant="small">
          {t('me.alias')}: {profile.alias}
        </AppText>
      </Card>

      <TextField label={t('me.bio')} value={bio} onChangeText={setBio} multiline maxLength={500} />
      {update.isError ? <AppText variant="error">{errorMessage(update.error)}</AppText> : null}
      <Button
        label={
          update.isSuccess && bio === (profile.bio ?? '') ? t('common.saved') : t('common.save')
        }
        onPress={() => update.mutate({ bio })}
        loading={update.isPending}
        disabled={bio === (profile.bio ?? '')}
      />

      <AppText variant="small">{t('me.theme')}</AppText>
      <Row>
        {PROFILE_THEMES.map((theme) => (
          <Chip
            key={theme}
            label={t(`me.themes.${theme}`)}
            selected={profile.theme === theme}
            onPress={() => {
              setPreference(theme);
              update.mutate({ theme });
            }}
          />
        ))}
      </Row>

      <AppText variant="small">{t('me.language')}</AppText>
      <Row>
        {(['th', 'en'] as const).map((locale) => (
          <Chip
            key={locale}
            label={locale === 'th' ? 'ไทย' : 'English'}
            selected={i18n.language === locale}
            onPress={() => {
              void i18n.changeLanguage(locale);
              update.mutate({ locale });
            }}
          />
        ))}
      </Row>

      <Button variant="ghost" label={t('common.signOut')} onPress={() => void api.auth.signOut()} />
    </Screen>
  );
}
