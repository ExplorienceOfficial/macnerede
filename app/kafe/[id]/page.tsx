import CafeView from '@/components/CafeView';
import { currentWeek, decorate } from '@/lib/fixtures';

export const metadata = { title: 'Mekan — MaçNerede' };

export default async function CafePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const now = new Date();
  return <CafeView id={id} matches={currentWeek(now).matches.map((m) => decorate(m, now))} />;
}
