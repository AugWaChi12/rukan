import type { MetadataRoute } from 'next';
import { SITE_URL } from './site-metadata';

const LEGAL_PATHS = ['rules', 'privacy', 'terms'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const legalEntries: MetadataRoute.Sitemap = LEGAL_PATHS.flatMap((slug) => {
    const thUrl = `${SITE_URL}/${slug}`;
    const enUrl = `${SITE_URL}/en/${slug}`;
    const alternates = { languages: { th: thUrl, en: enUrl } };
    return [
      { url: thUrl, changeFrequency: 'monthly', priority: 0.5, alternates },
      { url: enUrl, changeFrequency: 'monthly', priority: 0.4, alternates },
    ];
  });

  return [
    {
      url: SITE_URL,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: { languages: { th: SITE_URL, en: `${SITE_URL}/en` } },
    },
    {
      url: `${SITE_URL}/en`,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: { languages: { th: SITE_URL, en: `${SITE_URL}/en` } },
    },
    ...legalEntries,
  ];
}
