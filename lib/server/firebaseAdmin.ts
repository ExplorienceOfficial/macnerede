import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Sunucu tarafı Firebase (ödeme sonucu üyeliği güncellemek için; güvenlik kurallarını aşar).
 * FIREBASE_SERVICE_ACCOUNT: Firebase Console → Proje ayarları → Hizmet hesapları → "Yeni özel anahtar oluştur"
 * dosyasının içeriği (JSON ya da base64). Asla NEXT_PUBLIC_ ile başlatma, depoya koyma.
 */
let app: App | null = null;

export const adminConfigured = () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);

function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT!.trim();
  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  return JSON.parse(json);
}

export function admin() {
  if (!adminConfigured()) throw new Error('FIREBASE_SERVICE_ACCOUNT tanımlı değil');
  app ??= getApps()[0] ?? initializeApp({ credential: cert(credentials()) });
  return { db: getFirestore(app), auth: getAuth(app) };
}
