// Firebase bağlı değilken sitenin boş görünmemesi için örnek mekanlar.
// İsimler ve numaralar uydurmadır; Firebase bağlandığında bu dosya hiç kullanılmaz.
import { allMatches, bigTeamsIn } from './fixtures';
import type { Broadcast, Cafe, CafeKind, PlanId } from './types';
import type { BigTeam } from './teams';

type Row = [id: string, name: string, kind: CafeKind, city: string, district: string, address: string, lat: number, lng: number, cap: number, screens: string, big: boolean, alc: boolean, hookah: boolean, garden: boolean, p: [number, number], fan: BigTeam | null, plan: PlanId];

const rows: Row[] = [
  ['moda-tribun', 'Moda Tribün Pub', 'Pub', 'istanbul', 'kadikoy', 'Moda Cd. No:61, Caferağa', 40.9839, 29.0263, 110, '4 TV + projeksiyon', true, true, false, false, [350, 650], 'fb', 'pro'],
  ['kadife-mac-evi', 'Kadife Maç Evi', 'Bar', 'istanbul', 'kadikoy', 'Kadife Sk. No:14, Caferağa', 40.9863, 29.0297, 90, '3 TV + dev perde', true, true, false, false, [300, 600], null, 'standart'],
  ['bahariye-cay', 'Bahariye Çay Bahçesi', 'Nargile', 'istanbul', 'kadikoy', 'Bahariye Cd. No:33, Osmanağa', 40.9889, 29.0312, 140, '5 TV + 180" perde', true, false, true, true, [180, 380], null, 'standart'],
  ['yeldegirmeni-kose', 'Yeldeğirmeni Köşe', 'Kafe', 'istanbul', 'kadikoy', 'Karakolhane Cd. No:22, Rasimpaşa', 40.9964, 29.0284, 45, '2 büyük TV', false, false, false, false, [150, 300], 'fb', 'standart'],
  ['rihtim-sahne', 'Rıhtım Sahne', 'Bar', 'istanbul', 'kadikoy', 'Rıhtım Cd. No:8, Rasimpaşa', 40.9924, 29.0232, 160, 'Dev LED ekran + 3 TV', true, true, false, true, [400, 750], null, 'pro'],
  ['carsi-kartal', 'Çarşı Kartal Pub', 'Pub', 'istanbul', 'besiktas', 'Mumcu Bakkal Sk. No:6, Çarşı', 41.0427, 29.0058, 120, '4 TV + perde', true, true, false, false, [350, 650], 'bjk', 'pro'],
  ['koyici-mac-kafe', 'Köyiçi Maç Kafe', 'Kafe', 'istanbul', 'besiktas', 'Ihlamurdere Cd. No:11, Köyiçi', 41.0440, 29.0046, 60, '3 TV', false, false, false, true, [180, 320], null, 'standart'],
  ['abbasaga-kiraathanesi', 'Abbasağa Kıraathanesi', 'Kıraathane', 'istanbul', 'besiktas', 'Yıldız Cd., Abbasağa Parkı karşısı', 41.0461, 29.0034, 50, '2 TV', false, false, false, true, [80, 180], 'bjk', 'standart'],
  ['akaretler-tap', 'Akaretler Tap', 'Pub', 'istanbul', 'besiktas', 'Spor Cd. No:48, Akaretler', 41.0406, 29.0011, 130, 'Dev perde + 3 TV', true, true, false, false, [450, 800], null, 'standart'],
  ['mecidiyekoy-aslan', 'Aslan Kafe Mecidiyeköy', 'Kafe', 'istanbul', 'sisli', 'Büyükdere Cd. No:92, Mecidiyeköy', 41.0668, 28.9946, 80, '4 TV + projeksiyon', true, false, true, false, [200, 380], 'gs', 'pro'],
  ['bomonti-bira', 'Bomonti Bira Evi', 'Pub', 'istanbul', 'sisli', 'Birahane Sk. No:1, Bomonti', 41.0570, 28.9800, 100, '3 TV + perde', true, true, false, true, [350, 650], null, 'standart'],
  ['kibris-sehitleri-pub', 'Kıbrıs Şehitleri Pub', 'Pub', 'izmir', 'konak', 'Kıbrıs Şehitleri Cd. No:72, Alsancak', 38.4382, 27.1441, 90, '3 TV + perde', true, true, false, false, [300, 550], null, 'standart'],
  ['alsancak-sari-kirmizi', 'Sarı Kırmızı Nargile', 'Nargile', 'izmir', 'konak', '1382 Sk. No:9, Alsancak', 38.4357, 27.1408, 70, '4 TV', false, false, true, true, [200, 360], 'gs', 'standart'],
  ['tunali-pub', 'Tunalı Pub', 'Pub', 'ankara', 'cankaya', 'Tunalı Hilmi Cd. No:88, Kavaklıdere', 39.9034, 32.8604, 110, '4 TV + perde', true, true, false, false, [300, 600], null, 'pro'],
  ['kugulu-kafe', 'Kuğulu Sarı Lacivert', 'Kafe', 'ankara', 'cankaya', 'Bestekar Sk. No:31, Kavaklıdere', 39.9057, 32.8596, 45, '2 TV', false, false, false, false, [150, 300], 'fb', 'standart'],
  ['meydan-bordo-mavi', 'Meydan Bordo Mavi', 'Kafe', 'trabzon', 'ortahisar', 'Meydan Parkı yanı, Kemerkaya', 41.0049, 39.7268, 120, '5 TV + dev perde', true, false, true, false, [180, 350], 'ts', 'pro'],
  ['uzun-sokak-pub', 'Uzun Sokak Pub', 'Pub', 'trabzon', 'ortahisar', 'Uzun Sk. No:40, Ortahisar', 41.0047, 39.7225, 80, '3 TV', true, true, false, false, [300, 550], 'ts', 'standart'],
  ['kahvehane-1967', 'Kahvehane 1967', 'Kıraathane', 'trabzon', 'ortahisar', 'Kunduracılar Cd. No:12', 41.0040, 39.7290, 60, '2 TV', false, false, false, false, [80, 160], 'ts', 'standart'],
];

export const demoCafes: Cafe[] = rows.map((r, i) => ({
  id: r[0],
  name: r[1],
  kind: r[2],
  city: r[3],
  district: r[4],
  address: r[5],
  lat: r[6],
  lng: r[7],
  capacity: r[8],
  screens: r[9],
  features: { bigScreen: r[10], alcohol: r[11], hookah: r[12], garden: r[13] },
  priceMin: r[14][0],
  priceMax: r[14][1],
  fanOf: r[15],
  plan: r[16],
  phone: `9000000${String(1000 + i).padStart(5, '0')}`,
  membership: { status: 'active', startedAt: '2026-09-01', renewsAt: '2026-11-01' },
  createdAt: '2026-09-01',
}));

function hash(s: string) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

export function demoBroadcasts(): Broadcast[] {
  const out: Broadcast[] = [];
  for (const m of allMatches) {
    const teams = bigTeamsIn(m);
    for (const c of demoCafes) {
      const r = hash(c.id + m.id);
      const fanMatch = !!c.fanOf && teams.includes(c.fanOf);
      // Trabzon'daki mekanlar ağırlıklı Trabzonspor maçı verir
      const base = c.city === 'trabzon' ? (teams.includes('ts') || m.derby ? 9 : 2) : m.derby ? 10 : 7;
      if (!fanMatch && r % 10 >= base) continue;
      const isBar = c.kind === 'Pub' || c.kind === 'Bar';
      const seats = Math.round(c.capacity * (m.derby ? 1 : 0.8));
      out.push({
        cafeId: c.id,
        matchId: m.id,
        sound: c.kind === 'Kıraathane' ? r % 2 === 0 : r % 5 !== 0,
        entryFee: isBar && (m.derby || m.comp !== 'superlig') ? [100, 150, 200][r % 3] : null,
        minSpend: !isBar && m.derby ? [250, 300, 400][r % 3] : null,
        seats,
        reserved: Math.round(seats * ((r % 70) / 100 + (m.derby ? 0.25 : 0))) % (seats + 1),
        reservationRequired: !!m.derby && isBar,
        note: m.derby && r % 3 === 0 ? (isBar ? 'Giriş ücretine 1 içecek dahil' : 'Çay sınırsız, masalar 2 saat önceden dolar') : undefined,
      });
    }
  }
  return out;
}
