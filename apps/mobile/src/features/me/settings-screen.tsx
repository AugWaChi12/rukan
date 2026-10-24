import { queryKeys } from '@rukan/api';
import { PROFILE_THEMES } from '@rukan/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ListGroup, ListRow } from '@/components/list';
import { api } from '@/lib/api';
import { useAppTheme } from '@/theme/theme-provider';
import { SubScreen, WithProfile } from './shared';

const LOCALES = [
  { id: 'th', label: 'ไทย' },
  { id: 'en', label: 'English' },
] as const;

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { setPreference } = useAppTheme();

  const update = useMutation({
    mutationFn: api.updateMyProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myProfile }),
  });

  return (
    <SubScreen title={t('me.menu.settings')}>
      <WithProfile>
        {(profile) => (
          <>
            <ListGroup title={t('me.theme')}>
              {PROFILE_THEMES.map((theme) => (
                <ListRow
                  key={theme}
                  label={t(`me.themes.${theme}`)}
                  checked={profile.theme === theme}
                  onPress={() => {
                    setPreference(theme);
                    update.mutate({ theme });
                  }}
                />
              ))}
            </ListGroup>
            <ListGroup title={t('me.language')}>
              {LOCALES.map((locale) => (
                <ListRow
                  key={locale.id}
                  label={locale.label}
                  checked={i18n.language === locale.id}
                  onPress={() => {
                    void i18n.changeLanguage(locale.id);
                    update.mutate({ locale: locale.id });
                  }}
                />
              ))}
            </ListGroup>
          </>
        )}
      </WithProfile>
    </SubScreen>
  );
}
