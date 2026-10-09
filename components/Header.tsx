'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LogoMark, ScarfStripe } from './art';
import ThemeToggle from './ThemeToggle';
import { watchSession } from '@/lib/db';

export default function Header() {
  const [session, setSession] = useState<string | null>(null);
  useEffect(() => watchSession(setSession), []);

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
          {session ? (
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
