import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';
import { themeInitScript } from '@/lib/theme';

const sans = Figtree({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-sans' });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MaçNerede — Bu haftaki maçı hangi mekanda izlersin?',
  description: 'Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor maçlarını veren kafe ve pub’lar: İstanbul, Ankara, İzmir. Semtini seç, mekanı bul, yerini WhatsApp’tan ayırt.',
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
