import AdminView from '@/components/AdminView';

export const metadata = { title: 'Yönetim — MaçNerede', robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="container">
      <AdminView />
    </div>
  );
}
