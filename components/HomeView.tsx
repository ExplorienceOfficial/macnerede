'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { ArrowRight, CalendarDays, Check, MapPin } from 'lucide-react';
import Crest from './Crest';
import Countdown from './Countdown';
import MatchCard from './MatchCard';
import { CityPicker, CompBadge, StadiumBackdrop } from './bits';
import { scenes } from '@/lib/scenes';
import { Jersey, PitchLines, TvIllustration } from './art';
import { matchPath, weekdayLabel, withStatus, type DayTabs, type MatchInfo } from '@/lib/fixtures';
import { BIG4, stadiumFor, team, type BigTeam } from '@/lib/teams';
import { cityById, locative } from '@/lib/places';
import { useCity, useListings, useNow, usePref } from '@/lib/hooks';

type Day = 'hafta' | 'bugun' | 'yarin' | 'haftasonu';
const DAY_IDS: Day[] = ['hafta', 'bugun', 'yarin', 'haftasonu'];

interface Props {
  /** Haftanın maçları + hafta dışına taşan Bugün/Yarın/Hafta sonu günleri, başlama saatine göre sıralı */
  matches: MatchInfo[];
  week: { start: string; end: string };
  weekText: string;
  nextWeek: boolean;
  tabs: DayTabs;
}

export default function HomeView({ matches: initial, week, weekText, nextWeek, tabs }: Props) {
  const [teamPick, setTeamPick] = usePref<'all' | BigTeam>('mn.team', 'all');
  const [city, setCity] = useCity();
  const { cafes, broadcasts, venues, loading, error } = useListings(initial.map((m) => m.id));

  // Sayfa açık kalırsa maç başlar/biter: durum tarayıcı saatiyle tazelenir, biten maç "sıradaki" kartından düşer
  const now = useNow(30_000);
  const matches = useMemo(() => (now === null ? initial : initial.map((m) => withStatus(m, now))), [initial, now]);

  // Gün sekmesi adreste (?gun=bugun): üst menüdeki bağlantılar da aynı sekmeyi açar
  const params = useSearchParams();
  const day: Day = DAY_IDS.find((d) => d === params.get('gun')) ?? 'hafta';
  const setDay = (d: Day) => window.history.replaceState(null, '', d === 'hafta' ? '/' : `/?gun=${d}`);
  const inDay = (m: MatchInfo, d: Day) =>
    d === 'bugun'
      ? m.date === tabs.today
      : d === 'yarin'
        ? m.date === tabs.tomorrow
        : d === 'haftasonu'
          ? m.date >= tabs.weekend[0] && m.date <= tabs.weekend[1]
          : m.date >= week.start && m.date <= week.end;

  const byTeam = useMemo(
    () => (teamPick === 'all' ? matches : matches.filter((m) => m.home === teamPick || m.away === teamPick)),
    [matches, teamPick],
  );
  const visible = byTeam.filter((m) => inDay(m, day));
  const dayLabel: Record<Day, string> = { hafta: nextWeek ? 'Gelecek hafta' : 'Bu hafta', bugun: 'Bugün', yarin: 'Yarın', haftasonu: 'Hafta sonu' };
  const listTitle: Record<Day, string> = {
    hafta: nextWeek ? 'Gelecek haftanın maçları' : 'Bu haftanın maçları',
    bugun: 'Bugünün maçları',
    yarin: 'Yarının maçları',
    haftasonu: 'Hafta sonu maçları',
  };

  // Maçı veren anlaşmalı mekanlar + şehrin rehber mekanları (onlar büyük maçların hepsini genelde verir)
  const cafeCity = useMemo(() => new Map(cafes.map((c) => [c.id, c.city])), [cafes]);
  const cityVenues = useMemo(() => venues.filter((v) => v.city === city), [venues, city]);
  const count = (matchId: string) =>
    loading || error ? null : broadcasts.filter((b) => b.matchId === matchId && cafeCity.get(b.cafeId) === city).length + cityVenues.length;
  const cityCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of [...cafes, ...venues]) out[c.city] = (out[c.city] ?? 0) + 1;
    return out;
  }, [cafes, venues]);
  // Mekanı olan semtler, en kalabalıktan başlayarak
  const semts = useMemo(() => {
    const n = new Map<string, number>();
    for (const p of [...cafes.filter((c) => c.city === city), ...cityVenues]) n.set(p.district, (n.get(p.district) ?? 0) + 1);
    return (cityById(city)?.districts ?? []).filter((d) => n.has(d.id)).sort((a, b) => n.get(b.id)! - n.get(a.id)!);
  }, [cafes, cityVenues, city]);

  const next = byTeam.find((m) => !m.finished);
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
              Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor maçlarını veren mekanlar. Semtini seç, mekanı bul, yerini
              WhatsApp’tan tek mesajla ayırt.
            </motion.p>

            <div className="pick-label">Takımın</div>
            <TeamPicker value={teamPick} onChange={setTeamPick} />

            <div className="pick-label">Şehrin</div>
            <CityPicker value={city} onChange={setCity} counts={loading ? undefined : cityCounts} />

            {next && semts.length > 0 && (
              <>
                <div className="pick-label">Popüler semtler</div>
                <div className="chips semt-chips">
                  {semts.slice(0, 8).map((d) => (
                    <Link key={d.id} className="chip" href={matchPath(next, city, d.id)}>
                      <MapPin size={14} /> {d.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
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

        <section className="section" id="maclar">
          <div className="section-head">
            <div>
              <h2>{listTitle[day]}</h2>
              <p>
                {cityById(city)?.name} için mekan sayıları gösteriliyor
                {teamPick !== 'all' && ` · sadece ${team(teamPick).name}`}
              </p>
            </div>
            <div className="seg day-tabs" role="group" aria-label="Gün">
              {DAY_IDS.map((d) => (
                <button key={d} aria-pressed={day === d} onClick={() => setDay(d)}>
                  {day === d && <motion.span layoutId="day-thumb" className="seg-thumb" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  {dayLabel[d]}
                  <span className="seg-count">{byTeam.filter((m) => inDay(m, d)).length}</span>
                </button>
              ))}
            </div>
          </div>

          {byDay.length === 0 && (
            <div className="card empty">
              <TvIllustration home={teamPick === 'all' ? 'gs' : teamPick} />
              <strong>
                {dayLabel[day]} {teamPick !== 'all' ? `${team(teamPick).name} maçı` : 'maç'} yok
              </strong>
              {day === 'hafta' ? (
                'Milli ara ya da boş hafta olabilir.'
              ) : (
                <>
                  {next && `Sıradaki maç: ${team(next.home).name} – ${team(next.away).name}, ${next.day}${next.time ? ` ${next.time}` : ''}.`}
                  <button className="btn btn-soft btn-sm" style={{ marginTop: 6 }} onClick={() => setDay('hafta')}>
                    Haftanın bütün maçları
                  </button>
                </>
              )}
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
      {m.time && <Countdown to={m.kickoffISO} />}
      <div className="next-foot" style={{ marginTop: 18 }}>
        <span className="mc-count">
          <MapPin size={15} /> {count === null ? 'Mekanlar yükleniyor…' : `${locative(cityById(city)?.name ?? '')} ${count} mekan veriyor`}
        </span>
        <Link href={matchPath(m, city)} className="btn btn-primary btn-sm">
          Mekanları gör <ArrowRight size={15} />
        </Link>
      </div>
    </motion.div>
  );
}

function VenueBand() {
  return (
    <motion.section
      className="venue-band with-photo"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="scene-photo" src={scenes.crowd.photo} alt="" loading="lazy" />
      <span className="stadium-shade" aria-hidden style={{ background: 'linear-gradient(100deg, rgba(8,12,10,.92) 30%, rgba(8,12,10,.55))' }} />
      <a className="photo-credit" href={scenes.crowd.source} target="_blank" rel="noopener noreferrer">
        Foto: {scenes.crowd.credit}, {scenes.crowd.license}
      </a>
      <div>
        <h2>Mekanın maç veriyorsa, masaları biz dolduralım.</h2>
        <p>
          Şimdilik ücretsiz. Mekanının adını, semtini ve WhatsApp numaranı bırak; profilini biz hazırlayıp onayına sunalım. Taraftarlar yer
          sormak için doğrudan sana yazsın.
        </p>
        <Link href="/kayit" className="btn btn-primary btn-lg">
          Mekanını ekle <ArrowRight size={17} />
        </Link>
      </div>
      <ul className="perks">
        {['Kayıt 1 dakika: ad, semt, WhatsApp', 'Taraftarlar hazır mesajla WhatsApp’tan yazar', 'Ses, giriş ücreti ve kampanyanı sen girersin', 'Anlaşmalı mekanlar listede en üstte'].map((t, i) => (
          <motion.li key={t} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.08 }}>
            <Check size={18} /> {t}
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
