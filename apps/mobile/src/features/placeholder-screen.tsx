import { useTranslation } from 'react-i18next';
import { AppText, Card, Screen } from '@/components/ui';

/** หน้าของฟีเจอร์ที่ยังไม่ได้สร้าง (Space / Drop / แชท — เฟส 3–5) */
export function PlaceholderScreen({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <AppText variant="title">{title}</AppText>
      <Card>
        <AppText variant="muted">{t('placeholder.comingSoon')}</AppText>
      </Card>
    </Screen>
  );
}
