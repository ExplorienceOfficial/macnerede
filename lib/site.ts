/** Marka adı alan adıyla aynı: neredemac.com → NeredeMaç */
export const SITE_NAME = 'NeredeMaç';
export const SITE_URL = 'https://neredemac.com';

/** NeredeMaç'ın işletmelerle konuştuğu WhatsApp hattı (905xxxxxxxxx). Boşsa "sahibi misiniz" başvuru formuna gider. */
export const CONTACT_WHATSAPP = (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? '').replace(/\D/g, '');

/** "Bu işletmenin sahibi misiniz?" bağlantısı: hazır mesajla WhatsApp hattına, numara yoksa başvuru formuna */
export function claimLink(venueId: string, label: string) {
  if (!CONTACT_WHATSAPP) return `/kayit?mekan=${venueId}`;
  const text = `Merhaba, ${label} işletmesinin sahibiyim. NeredeMaç'taki profilimiz hakkında yazıyorum: ${SITE_URL}/mekan/${venueId}`;
  return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
