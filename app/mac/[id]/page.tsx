import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MatchView from '@/components/MatchView';
import { decorate, findMatch } from '@/lib/fixtures';
import { team } from '@/lib/teams';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const m = findMatch((await params).id);
  return m ? { title: `${team(m.home).name} – ${team(m.away).name} nerede izlenir? — MaçNerede` } : {};
}

export default async function MatchPage({ params, searchParams }: { params: Params; searchParams: Promise<{ sehir?: string; semt?: string }> }) {
  const { id } = await params;
  const { sehir, semt } = await searchParams;
  const m = findMatch(id);
  if (!m) notFound();
  return <MatchView match={decorate(m)} initialCity={sehir} initialDistrict={semt} />;
}
