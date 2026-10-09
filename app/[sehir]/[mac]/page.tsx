import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MatchView from '@/components/MatchView';
import { decorate, findMatchBySlug, matchPath, nextMatchAfter } from '@/lib/fixtures';
import { cityById, locative } from '@/lib/places';
import { team } from '@/lib/teams';

type Params = Promise<{ sehir: string; mac: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sehir, mac } = await params;
  const city = cityById(sehir);
  const m = findMatchBySlug(mac);
  if (!city || !m) return {};
  const d = decorate(m);
  const vs = `${team(m.home).name} – ${team(m.away).name}`;
  return {
    title: `${vs} maçı ${locative(city.name)} nerede izlenir?`,
    description: `${d.dateText}${m.time ? ` ${m.time}` : ''} ${vs} maçını veren ${city.name} kafe ve pub’ları: semt, ses, dev ekran, giriş ücreti. Yerini WhatsApp’tan ayırt.`,
    alternates: { canonical: matchPath(m, city.id) },
  };
}

export default async function CityMatchPage({ params, searchParams }: { params: Params; searchParams: Promise<{ semt?: string }> }) {
  const { sehir, mac } = await params;
  const { semt } = await searchParams;
  const m = findMatchBySlug(mac);
  if (!cityById(sehir) || !m) notFound();
  const after = nextMatchAfter(m);
  return <MatchView key={`${sehir}/${mac}`} match={decorate(m)} city={sehir} initialDistrict={semt} nextMatch={after ? decorate(after) : undefined} />;
}
