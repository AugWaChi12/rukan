import { onboardingSchema, PROFILE_MODES, type ProfileMode } from '@rukan/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Chip, Row, Screen, TextField } from '@/components/ui';
import { useRefreshStatus } from '@/hooks/use-my-status';
import { errorMessage } from '@/i18n';
import { api, queries } from '@/lib/api';
import { StepHeader } from './step-header';

/** ขั้น 3: ข้อมูลพื้นฐาน → complete_onboarding() (เช็คอายุ 18+ ทั้งที่แอปและ DB) */
export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const refreshStatus = useRefreshStatus();
  const areas = useQuery(queries.areas());

  const [displayName, setDisplayName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [modes, setModes] = useState<ProfileMode[]>([]);
  const [areaId, setAreaId] = useState<string | undefined>();
  const [occupation, setOccupation] = useState('');

  const input = { displayName, birthdate, modes, areaId, occupation: occupation || undefined };
  const validation = onboardingSchema.safeParse(input);
  const firstIssue = validation.success ? null : validation.error.issues[0];

  const save = useMutation({
    mutationFn: () => api.completeOnboarding(input),
    onSuccess: refreshStatus,
  });
  const toggleMode = (mode: ProfileMode) =>
    setModes((m) => (m.includes(mode) ? m.filter((x) => x !== mode) : [...m, mode]));

  return (
    <Screen>
      <StepHeader step="profile" title={t('onboarding.profile.title')} />

      <TextField
        label={t('onboarding.profile.displayName')}
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={50}
      />
      <TextField
        label={t('onboarding.profile.birthdate')}
        hint={t('onboarding.profile.birthdateHint')}
        value={birthdate}
        onChangeText={setBirthdate}
        placeholder="2002-05-14"
        inputMode="numeric"
        maxLength={10}
      />

      <AppText variant="small">{t('onboarding.profile.modes')}</AppText>
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

      <AppText variant="small">
        {t('onboarding.profile.area')} {t('common.optional')}
      </AppText>
      <Row>
        {(areas.data ?? []).map((area) => (
          <Chip
            key={area.id}
            label={i18n.language === 'en' ? area.name_en : area.name_th}
            selected={areaId === area.id}
            onPress={() => setAreaId(areaId === area.id ? undefined : area.id)}
          />
        ))}
      </Row>

      <TextField
        label={`${t('onboarding.profile.occupation')} ${t('common.optional')}`}
        placeholder={t('onboarding.profile.occupationPlaceholder')}
        value={occupation}
        onChangeText={setOccupation}
        maxLength={60}
      />

      {save.isError ? (
        <AppText variant="error">{errorMessage(save.error)}</AppText>
      ) : firstIssue && birthdate.length === 10 ? (
        <AppText variant="error">{firstIssue.message}</AppText>
      ) : null}

      <Button
        label={t('common.continue')}
        onPress={() => save.mutate()}
        disabled={!validation.success}
        loading={save.isPending}
      />
      <Button variant="ghost" label={t('common.signOut')} onPress={() => void api.auth.signOut()} />
    </Screen>
  );
}
