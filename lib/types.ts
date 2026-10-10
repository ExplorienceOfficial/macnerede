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
  /** Öne çıkarma (ücretli, yönetici açar): bu tarihe kadar (dahil, YYYY-AA-GG) şehrin listesinde en üstte */
  featuredUntil?: string | null;
}

/**
 * Rehber mekanı: henüz anlaşmalı olmayan ama maç verdiği taraftar yorumlarıyla doğrulanmış mekan.
 * Hangi maçı vereceğini mekan girmez; taraftar gitmeden WhatsApp'tan ya da telefonla sorar.
 */
export interface Venue {
  id: string;
  name: string;
  kind: CafeKind;
  city: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  phone: string; // 90XXXXXXXXXX, bilinmiyorsa boş
  features: Cafe['features'];
  rating: number | null;
  reviews: number | null;
  /** Neden "maç veriyor" diyoruz: kanıtın kısa notu (ör. "5 yorum, en yenisi 1 ay önce" ya da bir bağlantı) */
  evidence: string;
  /** Maç izlendiğini yazan en yeni yorumun/paylaşımın tarihi (YYYY-AA-GG). Yoksa mekan listede görünmez. */
  evidenceDate?: string | null;
  /** Son 11 ayda maç izlendiğini yazan yorum sayısı (elle sayıldıysa) */
  evidenceCount?: number | null;
  instagram?: string;
  website?: string;
  /** Google Maps bağlantısı */
  mapsUrl?: string;
  /** Yönetici listeden kaldırdıysa */
  hidden?: boolean;
  /** Öne çıkarma (ücretli, yönetici açar): bu tarihe kadar (dahil) şehrin listesinde en üstte */
  featuredUntil?: string | null;
}

/** Öne çıkarma bugün geçerli mi (TSİ tarihiyle) */
export const isFeatured = (p: { featuredUntil?: string | null }, today: string) => !!p.featuredUntil && p.featuredUntil >= today;

/** "Mekanını ekle" kısa formundan gelen başvuru: profili yönetici hazırlar */
export interface Lead {
  id: string;
  name: string;
  city: string;
  district: string;
  phone: string;
  /** Rehberdeki bir mekan "bu benim" dediyse onun id'si */
  venueId: string | null;
  createdAt: string;
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
  /** Mekan "önceden yer ayırtın" diyorsa */
  reservationRequired: boolean;
  note?: string;
  /** Maç başlama saati (ISO) */
  kickoff?: string;
}

export const plans: Record<PlanId, { name: string; price: number; tagline: string; perks: string[] }> = {
  standart: {
    name: 'Standart',
    price: 1000,
    tagline: 'Haritada ol, taraftar sana yazsın',
    perks: ['Haritada ve maç listelerinde “Anlaşmalı” olarak görün', 'Sınırsız maç yayını gir', 'Ses, giriş ücreti ve notlarını kendin yaz', 'Taraftarlar WhatsApp’tan doğrudan yer sorsun'],
  },
  pro: {
    name: 'Pro',
    price: 2500,
    tagline: 'Her maçta listenin en üstünde',
    perks: ['Standart’taki her şey', 'Tüm maçlarda “Öne çıkan” rozeti ve üst sıra', 'Instagram için “Maç bizde” hikaye görseli'],
  },
};

/** Kişi başı harcamadan bütçe seviyesi: 1 = ₺, 2 = ₺₺, 3 = ₺₺₺ */
export function priceLevel(min: number, max: number): 1 | 2 | 3 {
  const avg = (min + max) / 2;
  return avg <= 350 ? 1 : avg <= 700 ? 2 : 3;
}

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
