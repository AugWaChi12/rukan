import { useTranslation } from 'react-i18next';
import { AppText, Button, Screen } from '@/components/ui';
import { api } from '@/lib/api';

export function RestrictedScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <AppText variant="title">{t('onboarding.restricted.title')}</AppText>
      <AppText variant="muted">{t('onboarding.restricted.body')}</AppText>
      <Button variant="ghost" label={t('common.signOut')} onPress={() => void api.auth.signOut()} />
    </Screen>
  );
}
