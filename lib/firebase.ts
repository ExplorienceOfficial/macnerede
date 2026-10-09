import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Next.js bu değişkenleri derlemede koda gömer; bu yüzden tek tek ve açıkça yazılmalı
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | undefined;
export function firebase() {
  app ??= getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp(config);
  const auth = getAuth(app);
  auth.languageCode = 'tr'; // şifre sıfırlama e-postaları Türkçe gitsin
  return { db: getFirestore(app), auth };
}

/**
 * Yöneticinin mekan adına hesap açması için ikinci bir uygulama örneği.
 * Yeni hesap burada açılır; böylece yöneticinin kendi oturumu kapanmaz.
 */
export function creatorAuth() {
  const name = 'mekan-hesabi-ac';
  const second = getApps().some((a) => a.name === name) ? getApp(name) : initializeApp(config, name);
  return getAuth(second);
}
