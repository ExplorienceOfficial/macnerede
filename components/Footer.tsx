import Link from 'next/link';
import { LogoMark } from './art';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-row">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: '1 1 420px' }}>
          <LogoMark size={24} />
          <div>
            <p>Anlaşmalı mekanların bilgileri kendi beyanıdır. Diğer mekanlar taraftar yorumlarından derlendi; gitmeden sorup teyit et.</p>
            <p className="footer-legal">
              NeredeMaç yayın yapmaz ve yayın bağlantısı vermez, yalnızca maçın izlenebileceği fiziki mekanları listeler; mekandaki yayının
              ticari lisansı ve yasal sorumluluğu tamamen ilgili işletmeye aittir.
            </p>
          </div>
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
