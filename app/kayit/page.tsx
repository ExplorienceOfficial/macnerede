import RegisterFlow from '@/components/RegisterFlow';
import { currentWeek } from '@/lib/fixtures';

export const metadata = { title: 'Mekanını ekle — MaçNerede' };

export default function RegisterPage() {
  return <RegisterFlow weekMatchCount={currentWeek().matches.length} />;
}
