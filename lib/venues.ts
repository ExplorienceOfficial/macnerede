// Rehber mekanları: maç verdiği Google yorumlarıyla doğrulanmış, henüz anlaşmalı olmayan mekanlar.
// Kaynak: data/rehber.json. Firebase'de "venues" koleksiyonu boşsa site bu listeyi gösterir;
// yönetici sayfasından Firebase'e yüklenince oradaki kayıtlar (gizlenenler hariç) kullanılır.
import data from '@/data/rehber.json';
import type { Venue } from './types';

export const bundledVenues = data.venues as Venue[];
export const venuesCheckedAt: string = data.checkedAt;

/** Sadece 5xx ile başlayan cep numaraları WhatsApp'a yazılabilir */
export const hasWhatsApp = (phone: string) => /^905\d{9}$/.test(phone);
