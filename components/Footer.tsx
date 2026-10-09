import Link from 'next/link';
import { LogoMark } from './art';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-row">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LogoMark size={24} />
          <span>Sadece anlaşmalı mekanlar listelenir. Bilgiler mekanların kendi beyanıdır.</span>
        </div>
        <div className="footer-links">
          <Link href="/hesap">Hesabım</Link>
          <Link href="/kayit">Mekanını ekle</Link>
          <Link href="/giris">Mekan girişi</Link>
          <a href="mailto:merhaba@macnerede.com">İletişim</a>
          <Link href="/yonetim">Yönetim</Link>
        </div>
      </div>
    </footer>
  );
}
