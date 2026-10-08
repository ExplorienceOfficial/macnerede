import HomeView from '@/components/HomeView';
import { currentWeek, decorate, weekLabel } from '@/lib/fixtures';

export default function Home() {
  const now = new Date();
  const week = currentWeek(now);
  const matches = week.matches.map((m) => decorate(m, now));
  return <HomeView matches={matches} weekText={weekLabel(week)} nextWeek={week.next} />;
}
