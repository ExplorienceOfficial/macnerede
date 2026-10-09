import JoinView from '@/components/JoinView';
import { currentWeek } from '@/lib/fixtures';

export const metadata = { title: 'Mekanını ekle — MaçNerede' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ mekan?: string }> }) {
  const { mekan } = await searchParams;
  return <JoinView weekMatchCount={currentWeek().matches.length} venueId={mekan} />;
}
