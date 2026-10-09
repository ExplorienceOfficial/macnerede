import AdminView from '@/components/AdminView';
import { currentWeek, decorate, weekLabel } from '@/lib/fixtures';

export const metadata = { title: 'Admin paneli', robots: { index: false, follow: false } };

export default function AdminPage() {
  const now = new Date();
  const week = currentWeek(now);
  return (
    <div className="container">
      <AdminView matches={week.matches.map((m) => decorate(m, now))} weekText={weekLabel(week)} />
    </div>
  );
}
