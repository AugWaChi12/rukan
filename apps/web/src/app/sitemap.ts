import type { MetadataRoute } from 'next';
import { SITE_URL } from './site-metadata';

export default function sitemap(): MetadataRoute.Sitemap {
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
  ];
}
