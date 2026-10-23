import type { Metadata, Viewport } from 'next';
import { dictionaries, type Locale } from '@/i18n/dictionaries';

export const SITE_URL = 'https://rukan.app';

export function siteMetadata(locale: Locale): Metadata {
  const t = dictionaries[locale];
  const path = locale === 'en' ? '/en' : '/';
  return {
    metadataBase: new URL(SITE_URL),
    title: t.meta.title,
    description: t.meta.description,
    alternates: {
      canonical: path,
      languages: { th: '/', en: '/en', 'x-default': '/' },
    },
    openGraph: {
      type: 'website',
      url: path,
      siteName: t.brand,
      title: t.meta.title,
      description: t.meta.description,
      locale: locale === 'en' ? 'en_US' : 'th_TH',
    },
    twitter: { card: 'summary_large_image', title: t.meta.title, description: t.meta.description },
  };
}

export const viewport: Viewport = {
  themeColor: '#FAF8F7',
};
