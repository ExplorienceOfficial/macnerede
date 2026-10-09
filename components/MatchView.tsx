'use client';

import Link from 'next/link';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { ChevronLeft, List, Map as MapIcon } from 'lucide-react';
import Crest from './Crest';
import Countdown from './Countdown';
import CafeCard from './CafeCard';
import CafeMap from './CafeMap';
import ReserveSheet from './ReserveSheet';
import { PlayerCards } from './PlayerStrip';
import { CityPicker, CompBadge, StadiumBackdrop } from './bits';
import { PitchLines, TvIllustration } from './art';
import type { MatchInfo } from '@/lib/fixtures';
import { useListings, usePref } from '@/lib/hooks';
import { cityById, distanceKm, locative } from '@/lib/places';
import { bigTeamsIn, type Match } from '@/lib/fixtures';
import { stadiumFor, team, type BigTeam } from '@/lib/teams';

type FilterId = 'sound' | 'big' | 'alcohol' | 'hookah' | 'free' | 'seats' | `fan-${BigTeam}`;

export default function MatchView({ match, initialCity }: { match: MatchInfo; initialCity?: string }) {
  const [storedCity, setStoredCity] = usePref<string>('mn.city', 'istanbul');
  const [cityOverride, setCityOverride] = useState(initialCity && cityById(initialCity) ? initialCity : null);
  const city = cityOverride ?? storedCity;
  const setCity = (c: string) => {
    setCityOverride(null);
    setStoredCity(c);
    setDistrict('all');
    setActive(null);
  };

  const [district, setDistrict] = useState('all');
  const [filters, setFilters] = useState<Set<FilterId>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [reserving, setReserving] = useState<string | null>(null);

  const { cafes, broadcasts, loading, error, addReserved } = useListings([match.id]);
  const cafeById = useMemo(() => new Map(cafes.map((c) => [c.id, c])), [cafes]);
  const fanTeams = bigTeamsIn(match as Match);

  const inCity = useMemo(
    () =>
      broadcasts
        .map((b) => ({ b, c: cafeById.get(b.cafeId)! }))
        .filter((x) => x.c && x.c.city === city),
    [broadcasts, cafeById, city],
  );

  const cityCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const b of broadcasts) {
      const c = cafeById.get(b.cafeId);
      if (c) out[c.city] = (out[c.city] ?? 0) + 1;
    }
    return out;
  }, [broadcasts, cafeById]);

  const districts = useMemo(() => {
    const counts = new Map<string, number>();
    inCity.forEach(({ c }) => counts.set(c.district, (counts.get(c.district) ?? 0) + 1));
    return (cityById(city)?.districts ?? []).filter((d) => counts.has(d.id)).map((d) => ({ ...d, n: counts.get(d.id)! }));
  }, [inCity, city]);

  const rows = useMemo(() => {
    return inCity
      .filter(({ b, c }) => {
        if (district !== 'all' && c.district !== district) return false;
        if (filters.has('sound') && !b.sound) return false;
        if (filters.has('big') && !c.features.bigScreen) return false;
        if (filters.has('alcohol') && !c.features.alcohol) return false;
        if (filters.has('hookah') && !c.features.hookah) return false;
        if (filters.has('free') && b.entryFee) return false;
        if (filters.has('seats') && b.seats - b.reserved <= 0) return false;
        const fan = [...filters].find((f) => f.startsWith('fan-'));
        if (fan && c.fanOf !== fan.slice(4)) return false;
        return true;
      })
      .sort(
        (x, y) =>
          Number(y.c.plan === 'pro') - Number(x.c.plan === 'pro') ||
          Number(!!y.c.fanOf && fanTeams.includes(y.c.fanOf)) - Number(!!x.c.fanOf && fanTeams.includes(x.c.fanOf)) ||
          y.b.seats - y.b.reserved - (x.b.seats - x.b.reserved),
      );
  }, [inCity, district, filters, fanTeams]);

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

  const cityInfo = cityById(city)!;
  // Maçın stadyumu seçili şehirdeyse haritada fotoğraflı işaretçiyle gösterilir
  const homeStadium = stadiumFor(match.home);
  const mapStadium = homeStadium && distanceKm(homeStadium.coords, cityInfo.center) < 60 ? { ...homeStadium, homeId: match.home } : null;
  const home = team(match.home);
  const away = team(match.away);
  const resRow = reserving ? rows.find((r) => r.c.id === reserving) ?? inCity.find((r) => r.c.id === reserving) : null;

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
    { id: 'seats', label: 'Boş yer var' },
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
        {match.time && !match.finished && <Countdown to={match.kickoffISO} live={match.live} />}
        {match.finished && <p className="faint" style={{ textAlign: 'center', position: 'relative' }}>Bu maç oynandı.</p>}
      </motion.section>

      <PlayerCards teams={fanTeams} />

      <div className="toolbar">
        <div className="toolbar-row">
          <CityPicker value={city} onChange={setCity} counts={loading ? undefined : cityCounts} />
        </div>
        {districts.length > 1 && (
          <div className="toolbar-row chips">
            <button className="chip" aria-pressed={district === 'all'} onClick={() => setDistrict('all')}>
              Tüm {cityInfo.name}
            </button>
            {districts.map((d) => (
              <button key={d.id} className="chip" aria-pressed={district === d.id} onClick={() => setDistrict(d.id)}>
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
        </div>
        <div className="toolbar-row" style={{ justifyContent: 'space-between' }}>
          <p className="list-count">
            {loading ? (
              'Mekanlar yükleniyor…'
            ) : (
              <>
                {locative(cityInfo.name)} <b>{rows.length} anlaşmalı mekan</b> bu maçı veriyor
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
          {loading &&
            [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 250 }} />)}

          {!loading && !error && rows.length === 0 && (
            <motion.div className="card empty" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <TvIllustration home={match.home} away={match.away} />
              <strong>{filters.size || district !== 'all' ? 'Bu filtrelere uyan mekan yok' : `${locative(cityInfo.name)} henüz anlaşmalı mekan yok`}</strong>
              {filters.size || district !== 'all' ? 'Bir filtreyi kaldırmayı dene.' : 'Mekan sahibi misin? İlk sen ol.'}
              {!filters.size && district === 'all' && (
                <Link href="/kayit" className="btn btn-primary btn-sm" style={{ marginTop: 6 }}>
                  Mekanını ekle
                </Link>
              )}
            </motion.div>
          )}

          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {rows.map(({ b, c }, i) => (
                <CafeCard key={c.id} cafe={c} b={b} index={i} active={active === c.id} onReserve={setReserving} onFocus={focus} />
              ))}
            </AnimatePresence>
          </LayoutGroup>
        </div>

        <div className="map-wrap">
          <CafeMap
            cafes={rows.map(({ c }) => ({ id: c.id, name: c.name, lat: c.lat, lng: c.lng, kind: c.kind, pro: c.plan === 'pro', fanOf: c.fanOf, cover: c.cover }))}
            stadium={mapStadium}
            activeId={active}
            onSelect={(id) => {
              setView('list');
              focus(id);
            }}
            center={district !== 'all' ? cityInfo.districts.find((d) => d.id === district)!.center : cityInfo.center}
          />
        </div>
      </div>

      <AnimatePresence>
        {resRow && (
          <ReserveSheet
            key={resRow.c.id}
            cafe={resRow.c}
            b={resRow.b}
            match={match}
            onClose={() => setReserving(null)}
            onReserved={(n) => addReserved(resRow.c.id, match.id, n)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
