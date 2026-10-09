import type { MetadataRoute } from 'next';
import { currentWeek, isFinished, matchPath, matchesBetween } from '@/lib/fixtures';
import { cities } from '@/lib/places';
import { SITE_URL } from '@/lib/site';

// Fikstür saatle ilerler: liste saatte bir tazelenir (derleme anında donup kalmasın)
export const revalidate = 3600;

/** Ana sayfa + bu ve gelecek haftanın oynanmamış maçları, her şehir için ayrı sayfa */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const week = currentWeek(now);
  const end = new Date(`${week.end}T12:00:00+03:00`);
  end.setUTCDate(end.getUTCDate() + 7);
  const matches = matchesBetween(week.start, end.toISOString().slice(0, 10)).filter((m) => !isFinished(m, now));
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    ...matches.flatMap((m) => cities.map((c) => ({ url: `${SITE_URL}${matchPath(m, c.id)}`, changeFrequency: 'daily' as const, priority: 0.8 }))),
    { url: `${SITE_URL}/kayit`, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
