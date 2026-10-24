import { queryKeys } from '@rukan/api';
import { PROFILE_LIMITS, PROFILE_MODES, type MyProfile, type ProfileMode } from '@rukan/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Chip, Row, TextField } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries } from '@/lib/api';
import { space } from '@/theme/tokens';
import { sameSet, SubScreen, WithProfile } from './shared';

export function ProfileEditScreen() {
  const { t } = useTranslation();
  return (
    <SubScreen title={t('me.menu.profileInfo')}>
      <WithProfile>{(profile) => <ProfileForm profile={profile} />}</WithProfile>
    </SubScreen>
  );
}

function ProfileForm({ profile }: { profile: MyProfile }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const areas = useQuery(queries.areas());

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [occupation, setOccupation] = useState(profile.occupation ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [modes, setModes] = useState<ProfileMode[]>(profile.modes);
  const [areaId, setAreaId] = useState<string>(profile.area_id ?? '');

  const toggleMode = (mode: ProfileMode) =>
    setModes((prev) => (prev.includes(mode) ? prev.filter((x) => x !== mode) : [...prev, mode]));

  const unchanged =
    displayName.trim() === profile.display_name &&
    occupation.trim() === (profile.occupation ?? '') &&
    bio.trim() === (profile.bio ?? '') &&
    areaId === (profile.area_id ?? '') &&
    sameSet(modes, profile.modes);

  const canSave = displayName.trim().length > 0 && modes.length > 0 && !unchanged;

  const update = useMutation({
    mutationFn: () => api.updateMyProfile({ displayName, occupation, bio, areaId, modes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myProfile }),
  });

  return (
    <View style={styles.form}>
      <TextField
        label={t('me.displayName')}
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={PROFILE_LIMITS.displayName}
      />
      <TextField
        label={`${t('me.occupation')} ${t('common.optional')}`}
        placeholder={t('me.occupationPlaceholder')}
        value={occupation}
        onChangeText={setOccupation}
        maxLength={PROFILE_LIMITS.occupation}
      />
      <TextField
        label={t('me.bio')}
        hint={`${bio.length}/${PROFILE_LIMITS.bio}`}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={PROFILE_LIMITS.bio}
      />

      <View style={styles.block}>
        <AppText variant="small" style={styles.label}>
          {t('me.modes')}
        </AppText>
        <Row>
          {PROFILE_MODES.map((mode) => (
            <Chip
              key={mode}
              label={t(`modes.${mode}`)}
              selected={modes.includes(mode)}
              onPress={() => toggleMode(mode)}
            />
          ))}
        </Row>
      </View>

      <View style={styles.block}>
        <AppText variant="small" style={styles.label}>
          {t('me.area')} {t('common.optional')}
        </AppText>
        <Row>
          {(areas.data ?? []).map((area) => (
            <Chip
              key={area.id}
              tone="lilac"
              label={i18n.language === 'en' ? area.name_en : area.name_th}
              selected={areaId === area.id}
              onPress={() => setAreaId(areaId === area.id ? '' : area.id)}
            />
          ))}
        </Row>
      </View>

      {update.isError ? <AppText variant="error">{errorMessage(update.error)}</AppText> : null}

      <Button
        label={update.isSuccess && unchanged ? t('common.saved') : t('common.save')}
        onPress={() => update.mutate()}
        loading={update.isPending}
        disabled={!canSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  block: { gap: space.sm },
  label: { fontWeight: '600' },
});
