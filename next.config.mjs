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
