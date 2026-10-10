import Link from 'next/link';
import { LogoMark } from './art';
import { CONTACT_EMAIL } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-row">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: '1 1 420px' }}>
          <LogoMark size={24} />
          <div>
            <p>
              Anlaşmalı mekanların bilgileri kendi beyanıdır. Diğer mekanlar ancak son aylarda maç yayını yaptığını yazan taraftar yorumlarıyla
              doğrulanınca listelenir; kanıtı eskiyen mekan listeden çıkar. Yine de gitmeden sorup teyit et.
            </p>
            <p className="footer-legal">
              NeredeMaç yayın yapmaz ve yayın bağlantısı vermez, yalnızca maçın izlenebileceği fiziki mekanları listeler; mekandaki yayının
              ticari lisansı ve yasal sorumluluğu tamamen ilgili işletmeye aittir.
            </p>
          </div>
        </div>
        <div className="footer-links">
          <Link href="/kayit">Mekanını ekle</Link>
          <Link href="/giris">Mekan girişi</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>
      </div>
    </footer>
  );
}
