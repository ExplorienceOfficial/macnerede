import Link from 'next/link';
import { LogoMark } from './art';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-row">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LogoMark size={24} />
          <span>Anlaşmalı mekanların bilgileri kendi beyanıdır. Diğer mekanlar taraftar yorumlarından derlendi; gitmeden sorup teyit et.</span>
        </div>
        <div className="footer-links">
          <Link href="/kayit">Mekanını ekle</Link>
          <Link href="/giris">Mekan girişi</Link>
          <a href="mailto:merhaba@macnerede.com">İletişim</a>
          <Link href="/yonetim">Yönetim</Link>
        </div>
      </div>
    </footer>
  );
}
