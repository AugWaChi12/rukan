import type { Metadata, Viewport } from 'next';
import { dictionaries, type Locale } from '@/i18n/dictionaries';
import { legalDictionaries, type LegalDocKey } from '@/i18n/legal';

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

export function legalMetadata(locale: Locale, docKey: LegalDocKey): Metadata {
  const site = dictionaries[locale];
  const doc = legalDictionaries[locale].docs[docKey];
  const thPath = `/${docKey}`;
  const enPath = `/en/${docKey}`;
  const path = locale === 'en' ? enPath : thPath;

  return {
    metadataBase: new URL(SITE_URL),
    title: doc.metaTitle,
    description: doc.metaDescription,
    alternates: {
      canonical: path,
      languages: { th: thPath, en: enPath, 'x-default': thPath },
    },
    openGraph: {
      type: 'article',
      url: path,
      siteName: site.brand,
      title: doc.metaTitle,
      description: doc.metaDescription,
      locale: locale === 'en' ? 'en_US' : 'th_TH',
    },
    twitter: { card: 'summary', title: doc.metaTitle, description: doc.metaDescription },
  };
}

export const viewport: Viewport = {
  themeColor: '#FAF8F7',
};
