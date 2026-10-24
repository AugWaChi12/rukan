import type { MyProfile } from '@rukan/shared';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '@/components/list';
import { AppText, Button, Loading, Screen } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { queries } from '@/lib/api';

export function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}

/** โหลดโปรไฟล์ของฉันก่อน แล้วค่อยแสดงเนื้อหา (โหลด / error ใช้หน้าตาเดียวกันทุกหน้า) */
export function WithProfile({ children }: { children: (profile: MyProfile) => ReactNode }) {
  const { t } = useTranslation();
  const profile = useQuery(queries.myProfile());
  if (profile.isPending) return <Loading />;
  if (profile.isError) {
    return (
      <Screen>
        <AppText variant="error">{errorMessage(profile.error)}</AppText>
        <Button label={t('common.retry')} onPress={() => void profile.refetch()} />
      </Screen>
    );
  }
  return <>{children(profile.data)}</>;
}

/** โครงหน้าย่อยของแท็บ "ฉัน": หัว (ปุ่มกลับ + ชื่อ) + คำอธิบายสั้น + เนื้อหา */
export function SubScreen({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Screen>
      <ScreenHeader title={title} />
      {hint ? <AppText variant="muted">{hint}</AppText> : null}
      {children}
    </Screen>
  );
}
