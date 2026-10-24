import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/features/placeholder-screen';

export default function SpaceTab() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('tabs.space')} />;
}
