import type { Metadata } from 'next';
import VenueView from '@/components/VenueView';
import { currentWeek, decorate } from '@/lib/fixtures';
import { districtName } from '@/lib/places';
import { bundledVenues, isTrusted } from '@/lib/venues';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const v = bundledVenues.find((x) => x.id === id);
  // Kanıtı eskimiş mekan için başlıkta da "maç yayını" demiyoruz; arama motoruna da kapalı
  if (!v || v.hidden || !isTrusted(v)) return { title: 'Mekan', robots: { index: false } };
  return { title: `${v.name} maç yayını — ${districtName(v.city, v.district)}`, description: `${v.name}: adres, telefon, yol tarifi ve bu haftanın maçları.` };
}

export default async function VenuePage({ params }: { params: Params }) {
  const { id } = await params;
  const now = new Date();
  return <VenueView id={id} matches={currentWeek(now).matches.map((m) => decorate(m, now))} />;
}
