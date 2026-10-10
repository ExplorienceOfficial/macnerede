import data from '@/data/fikstur.json';
import { BIG4, stadiumFor, team, type BigTeam } from './teams';

export type Competition = 'superlig' | 'ucl' | 'uel' | 'uecl';

export interface Match {
  id: string;
  comp: Competition;
  round: number;
  date: string; // YYYY-MM-DD (TSİ)
  time: string | null; // HH:MM (TSİ) — null: saat açıklanmadı
  home: string;
  away: string;
  channel?: string;
  stadium?: string;
  derby?: boolean;
}

export const compLabel: Record<Competition, string> = {
  superlig: 'Süper Lig',
  ucl: 'Şampiyonlar Ligi',
  uel: 'Avrupa Ligi',
  uecl: 'Konferans Ligi',
};

export const compLogo: Record<Competition, string> = {
  superlig: '/comps/superlig.svg',
  ucl: '/comps/ucl.svg',
  uel: '/comps/uel.png',
  uecl: '/comps/uecl.svg',
};

export const allMatches = data.matches as Match[];

const TZ = 'Europe/Istanbul';
/** Başlama + 2 saat: maç bitti sayılır (uzatmalar dahil) */
export const MATCH_LENGTH_MS = 2 * 60 * 60 * 1000;

/** Türkiye'de yaz/kış saati yok: her zaman UTC+3 */
export function kickoff(m: Match): Date {
  return new Date(`${m.date}T${m.time ?? '20:00'}:00+03:00`);
}

export const isFinished = (m: Match, now = new Date()) => kickoff(m).getTime() + MATCH_LENGTH_MS < now.getTime();
export const isLive = (m: Match, now = new Date()) => {
  const k = kickoff(m).getTime();
  return !!m.time && now.getTime() >= k && now.getTime() < k + MATCH_LENGTH_MS;
};

export function ymdIstanbul(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return ymdIstanbul(d);
}

/** Pazartesi–Pazar haftası (TSİ) */
export function weekRange(now = new Date()) {
  const today = ymdIstanbul(now);
  const dow = new Date(`${today}T12:00:00+03:00`).getUTCDay(); // 0=Pazar
  const start = addDays(today, -((dow + 6) % 7));
  return { start, end: addDays(start, 6) };
}

export interface Week {
  start: string;
  end: string;
  matches: Match[];
  /** Bu haftanın maçları bittiyse sıradaki haftayı gösteriyoruz */
  next: boolean;
}

export function currentWeek(now = new Date()): Week {
  let { start, end } = weekRange(now);
  const inRange = (s: string, e: string) => allMatches.filter((m) => m.date >= s && m.date <= e);
  let matches = inRange(start, end);
  let next = false;
  if (!matches.some((m) => !isFinished(m, now))) {
    start = addDays(start, 7);
    end = addDays(end, 7);
    matches = inRange(start, end);
    next = true;
  }
  return { start, end, matches, next };
}

export const findMatch = (id: string) => allMatches.find((m) => m.id === id);

export const matchesBetween = (start: string, end: string) => allMatches.filter((m) => m.date >= start && m.date <= end);

// ---- Adresler: /ankara/galatasaray-kasimpasa-maci ----
/** "Gençlerbirliği" → "genclerbirligi" */
export function slugify(s: string) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const matchSlug = (m: Pick<Match, 'home' | 'away'>) => `${slugify(team(m.home).name)}-${slugify(team(m.away).name)}-maci`;

/** Maç sayfası: şehir + eşleşme; semt filtresi sorgu parametresi olarak kalır */
export const matchPath = (m: Pick<Match, 'home' | 'away'>, city: string, semt?: string) =>
  `/${city}/${matchSlug(m)}${semt ? `?semt=${semt}` : ''}`;

/** Aynı eşleşme birden çok kez varsa (kupa, yeni sezon) bitmemiş en yakını, yoksa en son oynananı */
export function findMatchBySlug(slug: string, now = new Date()) {
  const list = allMatches.filter((m) => matchSlug(m) === slug).sort((a, b) => kickoff(a).getTime() - kickoff(b).getTime());
  return list.find((m) => !isFinished(m, now)) ?? list[list.length - 1];
}

/** Maçtaki büyük takım(lar)ın bir sonraki maçı: oynanmış maç sayfasından ileriye bağlantı */
export function nextMatchAfter(m: Match) {
  const teams = BIG4.filter((t) => t === m.home || t === m.away) as string[];
  const k = kickoff(m).getTime();
  return allMatches
    .filter((x) => kickoff(x).getTime() > k && (teams.includes(x.home) || teams.includes(x.away)))
    .sort((a, b) => kickoff(a).getTime() - kickoff(b).getTime())[0];
}

// ---- Gün sekmeleri: Bugün · Yarın · Hafta sonu ----
export interface DayTabs {
  today: string;
  tomorrow: string;
  /** Sıradaki (ya da içinde bulunulan) cumartesi–pazar */
  weekend: [string, string];
}

export function dayTabs(now = new Date()): DayTabs {
  const today = ymdIstanbul(now);
  const dow = new Date(`${today}T12:00:00+03:00`).getUTCDay(); // 0=Pazar
  const sat = dow === 0 ? addDays(today, -1) : addDays(today, 6 - dow);
  return { today, tomorrow: addDays(today, 1), weekend: [sat, addDays(sat, 1)] };
}

export const bigTeamsIn = (m: Match): BigTeam[] => BIG4.filter((t) => t === m.home || t === m.away);

// ---- Biçimlendirme ----
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, ...opts });

export function dayName(m: Match, now = new Date()) {
  const today = ymdIstanbul(now);
  if (m.date === today) return 'Bugün';
  if (m.date === addDays(today, 1)) return 'Yarın';
  return fmt({ weekday: 'long' }).format(kickoff(m));
}

export const dateLabel = (ymd: string) => fmt({ day: 'numeric', month: 'long' }).format(new Date(`${ymd}T12:00:00+03:00`));
export const weekdayLabel = (ymd: string) => fmt({ weekday: 'long' }).format(new Date(`${ymd}T12:00:00+03:00`));

export const weekLabel = (w: { start: string; end: string }) => {
  const s = new Date(`${w.start}T12:00:00+03:00`);
  const e = new Date(`${w.end}T12:00:00+03:00`);
  const sameMonth = s.getUTCMonth() === e.getUTCMonth();
  return sameMonth
    ? `${fmt({ day: 'numeric' }).format(s)}–${fmt({ day: 'numeric', month: 'long' }).format(e)}`
    : `${fmt({ day: 'numeric', month: 'short' }).format(s)} – ${fmt({ day: 'numeric', month: 'short' }).format(e)}`;
};

/** Sunucuda hesaplanıp istemciye giden, etiketleri hazır maç */
export interface MatchInfo extends Match {
  slug: string;
  day: string;
  dateText: string;
  kickoffISO: string;
  finished: boolean;
  live: boolean;
}

export const decorate = (m: Match, now = new Date()): MatchInfo => ({
  ...m,
  slug: matchSlug(m),
  stadium: m.stadium ?? stadiumFor(m.home)?.name,
  day: dayName(m, now),
  dateText: dateLabel(m.date),
  kickoffISO: kickoff(m).toISOString(),
  finished: isFinished(m, now),
  live: isLive(m, now),
});

/** Sayfa açık kalırken saat ilerler: başladı / bitti bilgisini tarayıcıdaki saate göre tazeler */
export function withStatus(m: MatchInfo, now: number): MatchInfo {
  const k = new Date(m.kickoffISO).getTime();
  return { ...m, live: !!m.time && now >= k && now < k + MATCH_LENGTH_MS, finished: now > k + MATCH_LENGTH_MS };
}
