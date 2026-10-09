import type { BigTeam } from './teams';

export type CafeKind = 'Kafe' | 'Pub' | 'Bar' | 'Nargile' | 'Kıraathane';
export const CAFE_KINDS: CafeKind[] = ['Kafe', 'Pub', 'Bar', 'Nargile', 'Kıraathane'];

export type PlanId = 'standart' | 'pro';
export type MembershipStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export interface Cafe {
  id: string;
  name: string;
  kind: CafeKind;
  city: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  phone: string; // 90XXXXXXXXXX
  capacity: number;
  screens: string;
  features: { bigScreen: boolean; alcohol: boolean; hookah: boolean; garden: boolean };
  priceMin: number;
  priceMax: number;
  fanOf: BigTeam | null;
  plan: PlanId;
  membership: { status: MembershipStatus; startedAt: string; renewsAt: string };
  createdAt: string;
  /** Aktivasyon koduyla kayıt olduysa kullanılan kod */
  activationCode?: string;
  /** Küçük kapak fotoğrafı (data URL) — listelerde gösterilir */
  cover?: string | null;
  /** Kapak olarak seçilen galeri fotoğrafının id'si */
  coverPhotoId?: string | null;
}

export interface CafePhoto {
  id: string;
  data: string; // data:image/jpeg;base64,...
  createdAt: string;
}

export interface ActivationCode {
  code: string;
  days: number;
  plan: PlanId;
  used: boolean;
  usedBy: string | null;
  usedAt: string | null;
}

export interface Broadcast {
  cafeId: string;
  matchId: string;
  sound: boolean;
  entryFee: number | null;
  minSpend: number | null;
  seats: number;
  reserved: number;
  reservationRequired: boolean;
  note?: string;
  /** Maç başlama saati (ISO) — rezervasyonlar buna göre kapanır, iptal süresi hesaplanır */
  kickoff?: string;
  /** Son yer ayırma/iptal işleminin rezervasyon id'si (güvenlik kuralları sayacı doğrulasın diye) */
  lastRes?: string;
}

export type ReservationStatus = 'new' | 'arrived' | 'noshow' | 'cancelled';

export interface Reservation {
  id: string;
  cafeId: string;
  matchId: string;
  /** Rezervasyonu yapan müşteri hesabı */
  userId?: string;
  name: string;
  phone: string;
  people: number;
  code: string;
  createdAt: string;
  /** Maç başlama saati (ISO) — iptal süresi buna göre hesaplanır */
  kickoff?: string;
  status: ReservationStatus;
  cancelledAt?: string;
}

/** Müşteri (taraftar) profili */
export interface Customer {
  uid: string;
  email: string;
  name: string;
  phone: string;
}

/** Rezervasyon kuralları — firestore.rules ile aynı tutulmalı */
export const POLICY = {
  maxPeople: 12,
  /** Maça bu kadar dakika kala iptal kapanır */
  cancelCutoffMin: 60,
  /** Bu kadar "gelmedi" alan müşteri bir süre rezervasyon yapamaz */
  noShowLimit: 2,
  noShowWindowDays: 60,
  banDays: 30,
} as const;

export const plans: Record<PlanId, { name: string; price: number; tagline: string; perks: string[] }> = {
  standart: {
    name: 'Standart',
    price: 1000,
    tagline: 'Haritada ol, rezervasyon al',
    perks: ['Haritada ve maç listelerinde görün', 'Sınırsız maç yayını gir', 'Sitede rezervasyon al', 'WhatsApp’tan müşteri yönlendirme'],
  },
  pro: {
    name: 'Pro',
    price: 2500,
    tagline: 'Her maçta listenin en üstünde',
    perks: ['Standart’taki her şey', 'Tüm maçlarda “Öne çıkan” rozeti ve üst sıra', 'Haftalık rezervasyon raporu', 'Instagram için “Maç bizde” hikaye görseli'],
  },
};

/** Ödeme dönemleri: aylık ya da yıllık (yıllıkta 2 ay hediye — 10 ay fiyatına) */
export const PERIODS = {
  1: { label: '1 ay', months: 1, billedMonths: 1 },
  12: { label: '12 ay', months: 12, billedMonths: 10 },
} as const;
export type PeriodId = keyof typeof PERIODS;
export const periodPrice = (plan: PlanId, period: PeriodId) => plans[plan].price * PERIODS[period].billedMonths;

export interface Payment {
  id: string;
  cafeId: string;
  cafeName: string;
  plan: PlanId;
  months: number;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
  paymentId?: string;
}

export const TRIAL_DAYS = 14;
export const MAX_PHOTOS = 8;
export const CODE_PATTERN = /^MAC-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
