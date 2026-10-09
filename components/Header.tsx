'use client';

import Link from 'next/link';
import { LogoMark, ScarfStripe } from './art';
import ThemeToggle from './ThemeToggle';
import { useAccount } from '@/lib/hooks';

export default function Header() {
  const account = useAccount();

  return (
    <header className="site-header">
      <ScarfStripe />
      <div className="container header-row">
        <Link href="/" className="brand" aria-label="NeredeMaç ana sayfa">
          <LogoMark />
          <span>
            nerede<b>maç</b>
          </span>
        </Link>
        <nav className="nav">
          <ThemeToggle />
          {/* Maç günü hızlı erişim: ana sayfadaki gün sekmesini açar */}
          <Link href="/?gun=bugun#maclar" className="link day-link">Bugün</Link>
          <Link href="/?gun=yarin#maclar" className="link day-link">Yarın</Link>
          <Link href="/?gun=haftasonu#maclar" className="link day-link">Hafta sonu</Link>
          {account ? (
            <Link href="/panel" className="btn btn-soft btn-sm">Mekan paneli</Link>
          ) : (
            <>
              <Link href="/giris" className="link">Mekan girişi</Link>
              <Link href="/kayit" className="btn btn-primary btn-sm">Mekanını ekle</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
