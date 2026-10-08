/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aynı klasörde ikinci bir sunucu (ör. demo modu) çalıştırırken derleme klasörleri çakışmasın
  distDir: process.env.NEXT_DIST_DIR || '.next',
};
export default nextConfig;
