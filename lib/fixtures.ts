import data from '@/data/fikstur.json';
import { BIG4, stadiumFor, type BigTeam } from './teams';

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
const MATCH_LENGTH_MS = 2 * 60 * 60 * 1000;

/** Türkiye'de yaz/kış saati yok: her zaman UTC+3 */
export function kickoff(m: Match): Date {
  return new Date(`${m.date}T${m.time ?? '20:00'}:00+03:00`);
}

export const isFinished = (m: Match, now = new Date()) => kickoff(m).getTime() + MATCH_LENGTH_MS < now.getTime();
export const isLive = (m: Match, now = new Date()) => {
  const k = kickoff(m).getTime();
  return !!m.time && now.getTime() >= k && now.getTime() < k + MATCH_LENGTH_MS;
};

function ymdIstanbul(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function addDays(ymd: string, n: number) {
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
  day: string;
  dateText: string;
  kickoffISO: string;
  finished: boolean;
  live: boolean;
}

export const decorate = (m: Match, now = new Date()): MatchInfo => ({
  ...m,
  stadium: m.stadium ?? stadiumFor(m.home)?.name,
  day: dayName(m, now),
  dateText: dateLabel(m.date),
  kickoffISO: kickoff(m).toISOString(),
  finished: isFinished(m, now),
  live: isLive(m, now),
});
