import { notFound, permanentRedirect } from 'next/navigation';
import { findMatch, matchPath } from '@/lib/fixtures';
import { DEFAULT_CITY, cityById } from '@/lib/places';

/** Eski adres (/mac/261009-gs-kasimpasa?sehir=istanbul) → /istanbul/galatasaray-kasimpasa-maci */
export default async function OldMatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sehir?: string; semt?: string }> }) {
  const { id } = await params;
  const { sehir, semt } = await searchParams;
  const m = findMatch(id);
  if (!m) notFound();
  permanentRedirect(matchPath(m, sehir && cityById(sehir) ? sehir : DEFAULT_CITY, semt));
}
