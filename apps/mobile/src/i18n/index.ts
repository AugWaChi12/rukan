import { isApiError } from '@rukan/api';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { th, type Messages } from './th';

export type AppLocale = 'th' | 'en';

const deviceLocale: AppLocale = getLocales()[0]?.languageCode === 'en' ? 'en' : 'th';

/** instance เดียวของแอป (initReactI18next ทำให้ useTranslation() ใช้ตัวนี้) */
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { th: { translation: th }, en: { translation: en } },
  lng: deviceLocale,
  fallbackLng: 'th',
  interpolation: { escapeValue: false }, // React escape ให้แล้ว
  returnNull: false,
});

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: Messages };
  }
}

/** ข้อความ error สำหรับผู้ใช้ จาก ApiError code (ไม่มีคำแปล → ข้อความทั่วไป) */
export function errorMessage(error: unknown): string {
  const code = isApiError(error) ? error.code : 'unknown';
  // Supabase Auth ส่ง invalid_credentials มาเป็นข้อความ ไม่ใช่ code ของเรา
  const key =
    isApiError(error) && error.detail === 'Invalid login credentials'
      ? 'invalid_credentials'
      : code;
  return i18n.exists(`errors.${key}`)
    ? i18n.t(`errors.${key}` as 'errors.unknown')
    : i18n.t('errors.unknown');
}

export default i18n;
