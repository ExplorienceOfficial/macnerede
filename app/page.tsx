import HomeView from '@/components/HomeView';
import { currentWeek, dayTabs, decorate, matchesBetween, weekLabel } from '@/lib/fixtures';

export default function Home() {
  const now = new Date();
  const week = currentWeek(now);
  const tabs = dayTabs(now);
  // Hafta sınırında da (ör. pazar günü "Yarın") sekmeler dolu gelsin: aralık haftayı ve bu günleri kapsar
  const start = [week.start, tabs.today].sort()[0];
  const end = [week.end, tabs.tomorrow, tabs.weekend[1]].sort()[2];
  const matches = matchesBetween(start, end)
    .map((m) => decorate(m, now))
    .sort((a, b) => a.kickoffISO.localeCompare(b.kickoffISO));
  return <HomeView matches={matches} week={{ start: week.start, end: week.end }} weekText={weekLabel(week)} nextWeek={week.next} tabs={tabs} />;
}
