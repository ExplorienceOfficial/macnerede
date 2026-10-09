import PanelView from '@/components/PanelView';
import { currentWeek, decorate, weekLabel } from '@/lib/fixtures';

export const metadata = { title: 'Mekan paneli' };

export default function PanelPage() {
  const now = new Date();
  const week = currentWeek(now);
  return <PanelView matches={week.matches.map((m) => decorate(m, now))} weekText={weekLabel(week)} />;
}
