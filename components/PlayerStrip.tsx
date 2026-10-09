'use client';

import { AnimatePresence, motion } from 'motion/react';
import Crest from './Crest';
import { players, type Player } from '@/lib/players';
import { team, type BigTeam } from '@/lib/teams';

/** Maç sayfası: o maçtaki büyük takımların öne çıkan oyuncuları, künyeli kartlar */
export function PlayerCards({ teams }: { teams: BigTeam[] }) {
  const list = teams.flatMap((t) => players[t].map((p) => ({ ...p, team: t })));
  if (!list.length) return null;
  return (
    <section className="players">
      <div className="players-head">
        <h2>Gözler onlarda</h2>
        <span className="faint">{teams.map((t) => team(t).name).join(' · ')} kadrosundan</span>
      </div>
      <div className="player-row">
        {list.map((p, i) => (
          <motion.figure
            key={p.id}
            className="player-card"
            initial={{ opacity: 0, y: 24, rotate: i % 2 ? 2 : -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: Math.min(i, 7) * 0.06 }}
            whileHover={{ y: -6, rotate: i % 2 ? 1.5 : -1.5 }}
          >
            <div className="pc-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo} alt={p.name} loading="lazy" />
              <span className="pc-crest">
                <Crest id={p.team} size={22} />
              </span>
            </div>
            <figcaption>
              <b>{p.name}</b>
              <span>{p.pos}</span>
              <a className="pc-credit" href={p.source} target="_blank" rel="noopener noreferrer" title={`Foto: ${p.credit}, ${p.license}`}>
                Foto: {p.credit} · {p.license}
              </a>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}

/** Ana sayfa: seçilen takımın (ya da her takımdan birer) yıldızları, yuvarlak ve animasyonlu */
export function PlayerAvatars({ pick }: { pick: 'all' | BigTeam }) {
  const list: (Player & { team: BigTeam })[] =
    pick === 'all'
      ? (Object.keys(players) as BigTeam[]).map((t) => ({ ...players[t][0], team: t }))
      : players[pick].map((p) => ({ ...p, team: pick }));
  return (
    <div className="avatar-row" aria-label="Öne çıkan oyuncular">
      <AnimatePresence mode="popLayout" initial={false}>
        {list.map((p, i) => (
          <motion.div
            key={p.id}
            className="avatar"
            title={`${p.name} — ${team(p.team).name} · Foto: ${p.credit}, ${p.license}`}
            initial={{ opacity: 0, scale: 0.4, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22, delay: i * 0.05 }}
            whileHover={{ y: -4 }}
            style={{ ['--ring' as string]: team(p.team).colors[0] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.photo} alt="" />
            <span>{p.name.split(' ').slice(-1)[0]}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
