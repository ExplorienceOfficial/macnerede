import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';
import { themeInitScript } from '@/lib/theme';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const sans = Figtree({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-sans' });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Maçı hangi mekanda izlersin?`, template: `%s — ${SITE_NAME}` },
  description: 'Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor maçlarını veren kafe ve pub’lar: Ankara, İstanbul, İzmir. Semtini seç, mekanı bul, yerini WhatsApp’tan ayırt.',
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, locale: 'tr_TR', type: 'website' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f1' },
    { media: '(prefers-color-scheme: dark)', color: '#111513' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
