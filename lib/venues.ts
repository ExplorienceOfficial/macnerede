// Rehber mekanları: maç verdiği Google yorumlarıyla doğrulanmış, henüz anlaşmalı olmayan mekanlar.
// Kaynak: data/rehber.json. Firebase'de "venues" koleksiyonu boşsa site bu listeyi gösterir;
// yönetici sayfasından Firebase'e yüklenince oradaki kayıtlar (gizlenenler hariç) kullanılır.
import data from '@/data/rehber.json';
import type { Venue } from './types';

export const bundledVenues = data.venues as Venue[];
export const venuesCheckedAt: string = data.checkedAt;

/** Sadece 5xx ile başlayan cep numaraları WhatsApp'a yazılabilir */
export const hasWhatsApp = (phone: string) => /^905\d{9}$/.test(phone);

// ---- Güvenilirlik: maç vermeyen mekan listede görünmesin ----
/** En yeni maç yorumu bu kadar yeniyse tek yorum yeter */
export const FRESH_MONTHS = 6;
/** Son 11 ayda en az bu kadar maç yorumu varsa da listede kalır */
export const MIN_RECENT = 3;
export const MAX_MONTHS = 11;

const monthsBefore = (now: Date, n: number) => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};

/** Kanıtın yaşına göre durum. Kanıt eskidikçe mekan kendiliğinden listeden düşer; yeniden doğrulanınca geri gelir. */
export function trustStatus(v: Pick<Venue, 'evidenceDate' | 'evidenceCount'>, now = new Date()): 'ok' | 'stale' | 'none' {
  if (!v.evidenceDate) return 'none';
  if (v.evidenceDate >= monthsBefore(now, FRESH_MONTHS)) return 'ok';
  if ((v.evidenceCount ?? 0) >= MIN_RECENT && v.evidenceDate >= monthsBefore(now, MAX_MONTHS)) return 'ok';
  return 'stale';
}

export const isTrusted = (v: Pick<Venue, 'evidenceDate' | 'evidenceCount'>, now = new Date()) => trustStatus(v, now) === 'ok';

/** "2026-07-09" → "Temmuz 2026" */
export const evidenceMonth = (date: string) =>
  new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00+03:00`));
