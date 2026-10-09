'use client';

import Link from 'next/link';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, List, Map as MapIcon } from 'lucide-react';
import Crest from './Crest';
import Countdown from './Countdown';
import CafeCard from './CafeCard';
import VenueCard from './VenueCard';
import CafeMap from './CafeMap';
import SeatSheet, { type SeatPlace } from './SeatSheet';
import { CityPicker, CompBadge, StadiumBackdrop } from './bits';
import { PitchLines, TvIllustration } from './art';
import { bigTeamsIn, matchPath, withStatus, type Match, type MatchInfo } from '@/lib/fixtures';
import { useCity, useListings, useNow } from '@/lib/hooks';
import { cityById, locative } from '@/lib/places';
import { SITE_NAME } from '@/lib/site';
import { stadiumFor, team, type BigTeam } from '@/lib/teams';
import { priceLevel, type Broadcast, type Cafe, type Venue } from '@/lib/types';

type FilterId = 'sound' | 'big' | 'alcohol' | 'hookah' | 'garden' | 'free' | `fan-${BigTeam}`;
/** Bu bilgiler sadece anlaşmalı mekanlarda var; rehber mekanları bu filtrelerle elenir */
const PARTNER_ONLY: FilterId[] = ['sound', 'free'];

type Row = { type: 'cafe'; id: string; c: Cafe; b: Broadcast } | { type: 'venue'; id: string; v: Venue };

interface Props {
  match: MatchInfo;
  /** Adresteki şehir (/ankara/...) */
  city: string;
  initialDistrict?: string;
  /** Maçtaki büyük takımın sıradaki maçı: bu maç oynandıysa ona yönlendiririz */
  nextMatch?: MatchInfo;
}

export default function MatchView({ match, city: initialCity, initialDistrict, nextMatch }: Props) {
  const [, storeCity] = useCity();
  const [city, setCityState] = useState(initialCity);
  const cityInfo = cityById(city)!;
  const now = useNow(30_000);
  const finished = now === null ? match.finished : withStatus(match, now).finished;

  const [district, setDistrict] = useState(initialDistrict && cityInfo.districts.some((d) => d.id === initialDistrict) ? initialDistrict : 'all');
  const [filters, setFilters] = useState<Set<FilterId>>(new Set());
  const [budget, setBudget] = useState<1 | 2 | 3 | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [seating, setSeating] = useState<string | null>(null);

  // Şehir adresin parçası: sayfayı yeniden yüklemeden adresi de değiştir (paylaşılan bağlantı doğru şehri açsın)
  const setCity = (c: string) => {
    setCityState(c);
    storeCity(c);
    setDistrict('all');
    setActive(null);
    window.history.replaceState(null, '', matchPath(match, c));
    document.title = `${team(match.home).name} – ${team(match.away).name} maçı ${locative(cityById(c)!.name)} nerede izlenir? — ${SITE_NAME}`;
  };

  const { cafes, broadcasts, venues, loading, error } = useListings([match.id]);
  const cafeById = useMemo(() => new Map(cafes.map((c) => [c.id, c])), [cafes]);
  const fanTeams = bigTeamsIn(match as Match);

  // Anlaşmalı mekanlar bu maçı girdiyse, rehber mekanları her büyük maçı genelde verir
  const all = useMemo<Row[]>(
    () => [
      ...broadcasts.flatMap((b) => {
        const c = cafeById.get(b.cafeId);
        return c ? [{ type: 'cafe' as const, id: c.id, c, b }] : [];
      }),
      ...venues.map((v) => ({ type: 'venue' as const, id: v.id, v })),
    ],
    [broadcasts, cafeById, venues],
  );
  const place = (r: Row) => (r.type === 'cafe' ? r.c : r.v);

  const inCity = useMemo(() => all.filter((r) => place(r).city === city), [all, city]);

  const cityCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of all) out[place(r).city] = (out[place(r).city] ?? 0) + 1;
    return out;
  }, [all]);

  const districts = useMemo(() => {
    const counts = new Map<string, number>();
    inCity.forEach((r) => counts.set(place(r).district, (counts.get(place(r).district) ?? 0) + 1));
    return cityInfo.districts.filter((d) => counts.has(d.id)).map((d) => ({ ...d, n: counts.get(d.id)! }));
  }, [inCity, cityInfo]);

  const partnerOnlyActive = PARTNER_ONLY.some((f) => filters.has(f)) || [...filters].some((f) => f.startsWith('fan-')) || budget !== null;

  const rows = useMemo(() => {
    return inCity
      .filter((r) => {
        const p = place(r);
        if (district !== 'all' && p.district !== district) return false;
        if (filters.has('big') && !p.features.bigScreen) return false;
        if (filters.has('alcohol') && !p.features.alcohol) return false;
        if (filters.has('hookah') && !p.features.hookah) return false;
        if (filters.has('garden') && !p.features.garden) return false;
        if (r.type === 'venue') return !partnerOnlyActive;
        if (filters.has('sound') && !r.b.sound) return false;
        if (filters.has('free') && r.b.entryFee) return false;
        if (budget && priceLevel(r.c.priceMin, r.c.priceMax) !== budget) return false;
        const fan = [...filters].find((f) => f.startsWith('fan-'));
        if (fan && r.c.fanOf !== fan.slice(4)) return false;
        return true;
      })
      .sort((x, y) => {
        if (x.type !== y.type) return x.type === 'cafe' ? -1 : 1;
        if (x.type === 'cafe' && y.type === 'cafe') {
          return (
            Number(y.c.plan === 'pro') - Number(x.c.plan === 'pro') ||
            Number(!!y.c.fanOf && fanTeams.includes(y.c.fanOf)) - Number(!!x.c.fanOf && fanTeams.includes(x.c.fanOf))
          );
        }
        return ((y as { v: Venue }).v.reviews ?? 0) - ((x as { v: Venue }).v.reviews ?? 0);
      });
  }, [inCity, district, filters, budget, fanTeams, partnerOnlyActive]);

  const partnerCount = rows.filter((r) => r.type === 'cafe').length;

  function toggle(f: FilterId) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else {
        if (f.startsWith('fan-')) [...next].filter((x) => x.startsWith('fan-')).forEach((x) => next.delete(x));
        next.add(f);
      }
      return next;
    });
  }

  function focus(id: string) {
    setActive(id);
    document.getElementById(`cafe-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const home = team(match.home);
  const away = team(match.away);
  const seatRow = seating ? inCity.find((r) => r.id === seating) : null;
  const seatPlace: SeatPlace | null = seatRow ? place(seatRow) : null;
  const filtered = filters.size > 0 || budget !== null || district !== 'all';

  const filterDefs: { id: FilterId; label: React.ReactNode }[] = [
    ...fanTeams.map((t) => ({
      id: `fan-${t}` as FilterId,
      label: (
        <>
          <Crest id={t} size={18} /> {team(t).name} taraftarıyla
        </>
      ),
    })),
    { id: 'sound', label: 'Ses açık' },
    { id: 'big', label: 'Dev ekran' },
    { id: 'garden', label: 'Açık alan' },
    { id: 'free', label: 'Girişsiz' },
    { id: 'alcohol', label: 'Alkol var' },
    { id: 'hookah', label: 'Nargile' },
  ];

  return (
    <div className="container">
      <Link href="/" className="back">
        <ChevronLeft size={16} /> Bu haftanın maçları
      </Link>

      <motion.section className={`card match-hero${stadiumFor(match.home) ? ' photo-card' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {stadiumFor(match.home) ? <StadiumBackdrop homeId={match.home} /> : <PitchLines className="pitch" />}
        <div className="next-top">
          <CompBadge comp={match.comp} round={match.round} />
          {match.derby && <span className="badge badge-derby">Derbi</span>}
        </div>
        <div className="vs-row">
          <motion.div className="vs-team" initial={{ x: -50, opacity: 0, rotate: -12 }} animate={{ x: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 14 }}>
            <span className="crest-plate">
              <Crest id={match.home} size={76} />
            </span>
            {home.name}
          </motion.div>
          <motion.div className="vs-mid" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.2 }}>
            <span className="time">{match.time ?? '—'}</span>
            <span className="day">
              {match.day} · {match.dateText}
            </span>
            {match.channel && <span className="faint" style={{ fontSize: 12.5, marginTop: 2 }}>{match.channel}</span>}
          </motion.div>
          <motion.div className="vs-team" initial={{ x: 50, opacity: 0, rotate: 12 }} animate={{ x: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 14 }}>
            <span className="crest-plate">
              <Crest id={match.away} size={76} />
            </span>
            {away.name}
          </motion.div>
        </div>
        {match.time ? <Countdown to={match.kickoffISO} /> : finished && <p className="faint" style={{ textAlign: 'center', position: 'relative' }}>Bu maç oynandı.</p>}
        {finished && nextMatch && (
          <div className="next-match-link">
            <Link href={matchPath(nextMatch, city)} className="btn btn-primary btn-sm">
              Sıradaki maç: {team(nextMatch.home).name} – {team(nextMatch.away).name} · {nextMatch.day}
              {nextMatch.time && ` ${nextMatch.time}`} <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </motion.section>

      <div className="toolbar">
        <div className="toolbar-row">
          <CityPicker value={city} onChange={setCity} counts={loading ? undefined : cityCounts} />
        </div>
        {districts.length > 0 && (
          <div className="toolbar-row chips" role="group" aria-label="Semt">
            <button className="chip" aria-pressed={district === 'all'} onClick={() => setDistrict('all')}>
              Tüm {cityInfo.name}
            </button>
            {districts.map((d) => (
              <button key={d.id} className="chip" aria-pressed={district === d.id} onClick={() => setDistrict(district === d.id ? 'all' : d.id)}>
                {d.name} <span className="faint">{d.n}</span>
              </button>
            ))}
          </div>
        )}
        <div className="toolbar-row chips">
          {filterDefs.map((f) => (
            <motion.button key={f.id} className="chip" aria-pressed={filters.has(f.id)} onClick={() => toggle(f.id)} whileTap={{ scale: 0.94 }}>
              {f.label}
            </motion.button>
          ))}
          <span className="chip-sep" aria-hidden />
          {([1, 2, 3] as const).map((lvl) => (
            <motion.button key={lvl} className="chip" aria-pressed={budget === lvl} onClick={() => setBudget(budget === lvl ? null : lvl)} whileTap={{ scale: 0.94 }} title={['Uygun', 'Orta', 'Pahalı'][lvl - 1]}>
              {'₺'.repeat(lvl)}
            </motion.button>
          ))}
        </div>
        <div className="toolbar-row" style={{ justifyContent: 'space-between' }}>
          <p className="list-count">
            {loading ? (
              'Mekanlar yükleniyor…'
            ) : (
              <>
                {locative(district === 'all' ? cityInfo.name : cityInfo.districts.find((d) => d.id === district)!.name)} <b>{rows.length} mekan</b>
                {partnerCount > 0 && <span className="faint"> · {partnerCount} anlaşmalı</span>}
              </>
            )}
          </p>
          <div className="seg view-toggle">
            {(['list', 'map'] as const).map((v) => (
              <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
                {view === v && <motion.span layoutId="view-thumb" className="seg-thumb" />}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {v === 'list' ? <List size={15} /> : <MapIcon size={15} />} {v === 'list' ? 'Liste' : 'Harita'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="cafe-layout" data-view={view}>
        <div className="cafe-list">
          {loading && [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 250 }} />)}

          {!loading && !error && rows.length === 0 && (
            <motion.div className="card empty" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <TvIllustration home={match.home} away={match.away} />
              <strong>{filtered ? 'Bu filtrelere uyan mekan yok' : `${locative(cityInfo.name)} henüz mekan yok`}</strong>
              {filtered
                ? partnerOnlyActive
                  ? 'Ses, giriş ücreti, taraftar ve bütçe bilgisi sadece anlaşmalı mekanlarda var. Bir filtreyi kaldırmayı dene.'
                  : 'Bir filtreyi kaldırmayı dene.'
                : 'Mekan sahibi misin? İlk sen ol.'}
              {!filtered && (
                <Link href="/kayit" className="btn btn-primary btn-sm" style={{ marginTop: 6 }}>
                  Mekanını ekle
                </Link>
              )}
            </motion.div>
          )}

          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {rows.map((r, i) =>
                r.type === 'cafe' ? (
                  <CafeCard key={r.id} cafe={r.c} b={r.b} index={i} active={active === r.id} onSeat={setSeating} onFocus={focus} />
                ) : (
                  <VenueCard key={r.id} v={r.v} index={i} active={active === r.id} onSeat={setSeating} onFocus={focus} />
                ),
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>

        <div className="map-wrap">
          <CafeMap
            cafes={rows.map((r) => {
              const p = place(r);
              return r.type === 'cafe'
                ? { id: r.id, name: p.name, lat: p.lat, lng: p.lng, kind: p.kind, pro: r.c.plan === 'pro', fanOf: r.c.fanOf, cover: r.c.cover }
                : { id: r.id, name: p.name, lat: p.lat, lng: p.lng, kind: p.kind, pro: false, fanOf: null, guide: true };
            })}
            activeId={active}
            onSelect={(id) => {
              setView('list');
              focus(id);
            }}
            center={district !== 'all' ? cityInfo.districts.find((d) => d.id === district)!.center : cityInfo.center}
          />
        </div>
      </div>

      <AnimatePresence>{seatPlace && <SeatSheet key={seating} place={seatPlace} match={match} onClose={() => setSeating(null)} />}</AnimatePresence>
    </div>
  );
}
