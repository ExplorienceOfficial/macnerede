// Canlı derlemede Firebase ayarları yoksa derlemeyi durdur: site sessizce demo moduna (sahte mekanlar) düşmesin,
// Vercel önceki çalışan sürümü yayında tutsun. Ayarlar Vercel → Settings → Environment Variables'ta olmalı.
const FIREBASE_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];
if (process.env.VERCEL_ENV === 'production') {
  const missing = FIREBASE_VARS.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Canlı derleme durduruldu: Vercel ortam değişkenleri eksik → ${missing.join(', ')}`);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aynı klasörde ikinci bir sunucu (ör. demo modu) çalıştırırken derleme klasörleri çakışmasın
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Taraftar hesabı kaldırıldı: eski /hesap bağlantıları ana sayfaya düşsün
  async redirects() {
    return [{ source: '/hesap', destination: '/', permanent: true }];
  },
};
export default nextConfig;
