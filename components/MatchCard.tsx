'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ChevronRight, MapPin } from 'lucide-react';
import Crest from './Crest';
import { matchPath, type MatchInfo } from '@/lib/fixtures';
import { CompBadge } from './bits';
import { team } from '@/lib/teams';

// Ebeveyn etiketleri (hidden/show/hover) çocuklara yayılır; hover bitince "show"a döner
const crestHover = {
  hidden: { rotate: 0, scale: 1 },
  show: { rotate: 0, scale: 1 },
  hover: { rotate: -8, scale: 1.1, transition: { type: 'spring' as const, stiffness: 400, damping: 12 } },
};
const arrow = { hidden: { x: 0 }, show: { x: 0 }, hover: { x: 4 } };

export default function MatchCard({ m, count, city, index }: { m: MatchInfo; count: number | null; city: string; index: number }) {
  const home = team(m.home);
  const away = team(m.away);
  return (
    <motion.div
      layout
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35, delay: index * 0.05, ease: [0.2, 0.7, 0.3, 1] } },
        hover: {},
      }}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover="hover"
    >
      <Link href={matchPath(m, city)} className={`card match-card${m.finished ? ' done' : ''}`}>
        <span className="colors" aria-hidden>
          <i style={{ background: home.colors[0] }} />
          <i style={{ background: away.colors[0] }} />
        </span>
        <div>
          <div className="mc-teams">
            <motion.span variants={crestHover} style={{ display: 'grid' }}>
              <Crest id={m.home} size={32} />
            </motion.span>
            <b>{home.name}</b>
            <motion.span variants={crestHover} style={{ display: 'grid' }}>
              <Crest id={m.away} size={32} />
            </motion.span>
            <b>{away.name}</b>
          </div>
          <div className="mc-meta">
            <CompBadge comp={m.comp} />
            {m.derby && <span className="badge badge-derby">Derbi</span>}
            {m.stadium && <span>{m.stadium}</span>}
            {m.channel && (
              <>
                <span className="dot" />
                <span>{m.channel}</span>
              </>
            )}
          </div>
        </div>
        <div className="mc-side">
          {m.live ? <span className="badge badge-live">Oynanıyor</span> : <span className="mc-time">{m.time ?? 'Saat ?'}</span>}
          {m.finished ? (
            <span className="faint" style={{ fontSize: 13.5 }}>Oynandı</span>
          ) : (
            <span className="mc-count">
              <MapPin size={15} />
              {count === null ? '…' : `${count} mekan`}
              <motion.span variants={arrow} style={{ display: 'grid' }}>
                <ChevronRight size={16} />
              </motion.span>
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
