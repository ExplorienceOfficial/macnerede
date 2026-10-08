'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { ArrowRight, CalendarDays, Check, MapPin } from 'lucide-react';
import Crest from './Crest';
import Countdown from './Countdown';
import MatchCard from './MatchCard';
import { CityPicker, CompBadge, StadiumBackdrop } from './bits';
import { Jersey, PitchLines, TvIllustration } from './art';
import { weekdayLabel, type MatchInfo } from '@/lib/fixtures';
import { BIG4, stadiumFor, team, type BigTeam } from '@/lib/teams';
import { cityById, locative } from '@/lib/places';
import { useListings, usePref } from '@/lib/hooks';
import { plans } from '@/lib/types';

interface Props {
  matches: MatchInfo[];
  weekText: string;
  nextWeek: boolean;
}

export default function HomeView({ matches, weekText, nextWeek }: Props) {
  const [teamPick, setTeamPick] = usePref<'all' | BigTeam>('mn.team', 'all');
  const [city, setCity] = usePref<string>('mn.city', 'istanbul');
  const { cafes, broadcasts, loading, error } = useListings(matches.map((m) => m.id));

  const visible = useMemo(
    () => (teamPick === 'all' ? matches : matches.filter((m) => m.home === teamPick || m.away === teamPick)),
    [matches, teamPick],
  );

  const cafeCity = useMemo(() => new Map(cafes.map((c) => [c.id, c.city])), [cafes]);
  const count = (matchId: string) => (loading || error ? null : broadcasts.filter((b) => b.matchId === matchId && cafeCity.get(b.cafeId) === city).length);
  const cityCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of cafes) out[c.city] = (out[c.city] ?? 0) + 1;
    return out;
  }, [cafes]);

  const next = visible.find((m) => !m.finished);
  const byDay = useMemo(() => {
    const g = new Map<string, MatchInfo[]>();
    for (const m of visible) g.set(m.date, [...(g.get(m.date) ?? []), m]);
    return [...g.entries()];
  }, [visible]);

  return (
    <>
      <div className="container">
        <section className="hero">
          <div>
            <motion.span className="eyebrow" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
              <CalendarDays size={15} /> {nextWeek ? 'Gelecek hafta' : 'Bu hafta'} · {weekText}
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              Maçı nerede izliyoruz? <span className="hl">Yerini şimdiden ayırt.</span>
            </motion.h1>
            <motion.p className="lead" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor maçlarını veren anlaşmalı mekanlar. Ses açık mı, giriş kaç para,
              kaç kişilik yer kaldı — hepsi tek ekranda.
            </motion.p>

            <div className="pick-label">Takımın</div>
            <TeamPicker value={teamPick} onChange={setTeamPick} />

            <div className="pick-label">Şehrin</div>
            <CityPicker value={city} onChange={setCity} counts={loading ? undefined : cityCounts} />
          </div>

          <AnimatePresence mode="wait">
            {next ? (
              <NextMatch key={next.id} m={next} count={count(next.id)} city={city} />
            ) : (
              <motion.div key="none" className="card empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <TvIllustration />
                <strong>Bu hafta başka maç kalmadı</strong>
                Yeni hafta pazartesi açılıyor.
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <h2>{nextWeek ? 'Gelecek haftanın maçları' : 'Bu haftanın maçları'}</h2>
              <p>
                {cityById(city)?.name} için mekan sayıları gösteriliyor
                {teamPick !== 'all' && ` · sadece ${team(teamPick).name}`}
              </p>
            </div>
          </div>

          {byDay.length === 0 && (
            <div className="card empty">
              <TvIllustration home={teamPick === 'all' ? 'gs' : teamPick} />
              <strong>Bu hafta {teamPick !== 'all' ? `${team(teamPick).name} maçı` : 'maç'} yok</strong>
              Milli ara ya da boş hafta olabilir.
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {byDay.map(([date, list]) => (
              <motion.div key={date} className="day-group" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="day-head">
                  <strong>{list[0].day === 'Bugün' || list[0].day === 'Yarın' ? list[0].day : weekdayLabel(date)}</strong>
                  <span>{list[0].dateText}</span>
                </div>
                <div className="match-list">
                  <AnimatePresence mode="popLayout">
                    {list.map((m, i) => (
                      <MatchCard key={m.id} m={m} count={count(m.id)} city={city} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

        <VenueBand />
      </div>
    </>
  );
}

function TeamPicker({ value, onChange }: { value: 'all' | BigTeam; onChange: (v: 'all' | BigTeam) => void }) {
  return (
    <div className="jersey-line" role="group" aria-label="Takım seç">
      {BIG4.map((id, i) => {
        const on = value === id;
        return (
          <motion.button
            key={id}
            className="jersey-btn"
            aria-pressed={on}
            onClick={() => onChange(on ? 'all' : id)}
            initial={{ y: -30, opacity: 0, rotate: -10 }}
            animate={{ y: on ? 4 : 0, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 11, delay: 0.15 + i * 0.07 }}
            whileHover={{ rotate: [0, -7, 5, -3, 0], transition: { duration: 0.7 } }}
            whileTap={{ scale: 0.94 }}
          >
            <Jersey id={id} size={70} />
            <span>{team(id).name}</span>
          </motion.button>
        );
      })}
      <button className="chip jersey-all" aria-pressed={value === 'all'} onClick={() => onChange('all')}>
        Hepsi
      </button>
    </div>
  );
}

function NextMatch({ m, count, city }: { m: MatchInfo; count: number | null; city: string }) {
  const float = (delay: number) => ({
    animate: { y: [0, -5, 0] },
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const, delay },
  });
  return (
    <motion.div
      className={`card next-card${stadiumFor(m.home) ? ' photo-card' : ''}`}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.2, 0.7, 0.3, 1] }}
    >
      {stadiumFor(m.home) ? <StadiumBackdrop homeId={m.home} /> : <PitchLines className="pitch" />}
      <div className="next-top">
        <span>{m.live ? 'Şu an oynanıyor' : 'Sıradaki maç'}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {m.derby && <span className="badge badge-derby">Derbi</span>}
          <CompBadge comp={m.comp} />
        </span>
      </div>
      <div className="vs-row">
        <motion.div className="vs-team" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}>
          <motion.div {...float(0)}>
            <span className="crest-plate">
              <Crest id={m.home} size={60} />
            </span>
          </motion.div>
          {team(m.home).name}
        </motion.div>
        <motion.div className="vs-mid" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.25 }}>
          <span className="time">{m.time ?? '—'}</span>
          <span className="day">{m.day} · {m.dateText}</span>
        </motion.div>
        <motion.div className="vs-team" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}>
          <motion.div {...float(1.2)}>
            <span className="crest-plate">
              <Crest id={m.away} size={60} />
            </span>
          </motion.div>
          {team(m.away).name}
        </motion.div>
      </div>
      {m.time && <Countdown to={m.kickoffISO} live={m.live} />}
      <div className="next-foot" style={{ marginTop: 18 }}>
        <span className="mc-count">
          <MapPin size={15} /> {count === null ? 'Mekanlar yükleniyor…' : `${locative(cityById(city)?.name ?? '')} ${count} mekan veriyor`}
        </span>
        <Link href={`/mac/${m.id}?sehir=${city}`} className="btn btn-primary btn-sm">
          Mekanları gör <ArrowRight size={15} />
        </Link>
      </div>
    </motion.div>
  );
}

function VenueBand() {
  return (
    <motion.section
      className="venue-band"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
    >
      <div>
        <h2>Mekanın maç veriyorsa, masaları biz dolduralım.</h2>
        <p>
          Aylık {new Intl.NumberFormat('tr-TR').format(plans.standart.price)} TL’den başlayan üyelikle haritada görün, rezervasyonları doğrudan
          al. İlk 14 gün ücretsiz.
        </p>
        <Link href="/kayit" className="btn btn-primary btn-lg">
          Mekanını ekle <ArrowRight size={17} />
        </Link>
      </div>
      <ul className="perks">
        {['Maç başına değil, aylık sabit ücret', 'Rezervasyonlar paneline anında düşer', 'Boş masa sayın sitede canlı görünür', 'Pro üyelikle her maçta en üstte'].map((t, i) => (
          <motion.li key={t} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.08 }}>
            <Check size={18} /> {t}
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
