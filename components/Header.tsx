'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';
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
          {account?.role === 'cafe' ? (
            <Link href="/panel" className="btn btn-soft btn-sm">Mekan paneli</Link>
          ) : account?.role === 'customer' ? (
            <>
              <Link href="/kayit" className="link">Mekanını ekle</Link>
              <Link href="/hesap" className="btn btn-soft btn-sm">
                <UserRound size={15} /> {account.customer?.name.split(' ')[0] || 'Hesabım'}
              </Link>
            </>
          ) : (
            <>
              <Link href="/kayit" className="link">Mekanını ekle</Link>
              <Link href="/hesap" className="btn btn-primary btn-sm">
                <UserRound size={15} /> Giriş yap
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
