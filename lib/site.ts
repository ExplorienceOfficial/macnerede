/** Marka adı alan adıyla aynı: neredemac.com → NeredeMaç */
export const SITE_NAME = 'NeredeMaç';
export const SITE_URL = 'https://neredemac.com';
export const CONTACT_EMAIL = 'merhaba@neredemac.com';

/**
 * Ödeme / ücretli üyelik. Şimdilik kapalı (amaç trafik): kayıtta plan ve fiyat adımı yok, panelde ödeme yok,
 * yönetimde Ödemeler sekmesi yok, ödeme API'si kapalı; deneme süresi dolan mekan da listede kalır.
 * Açmak için true yap (iyzico anahtarları Vercel ortam değişkenlerinde olmalı).
 */
export const PAYMENTS_ENABLED = false;

/** "Bu işletmenin sahibi misiniz?": hazır konulu e-posta */
export function claimLink(venueId: string, label: string) {
  const subject = `İşletme sahibiyim: ${label}`;
  const body = `Merhaba,\n\n${label} işletmesinin sahibiyim. NeredeMaç'taki profilimiz hakkında yazıyorum: ${SITE_URL}/mekan/${venueId}\n\nAdım soyadım:\nTelefon:\n`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
