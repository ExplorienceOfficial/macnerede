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
        <Link href="/" className="brand" aria-label="MaçNerede ana sayfa">
          <LogoMark />
          <span>maç<b>nerede</b></span>
        </Link>
        <nav className="nav">
          <ThemeToggle />
          <Link href="/" className="link">Bu hafta</Link>
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
