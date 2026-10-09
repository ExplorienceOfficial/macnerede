'use client';

import { AnimatePresence, motion } from 'motion/react';
import { MATCH_LENGTH_MS } from '@/lib/fixtures';
import { useNow } from '@/lib/hooks';

function Digit({ d }: { d: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: '0.62em', textAlign: 'center' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={d}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.7, 0.3, 1] }}
        >
          {d}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  const s = String(value).padStart(2, '0');
  return (
    <div className="cd-unit">
      <div className="cd-num">
        {s.split('').map((d, i) => (
          <Digit key={i} d={d} />
        ))}
      </div>
      <small>{label}</small>
    </div>
  );
}

/** Başlamaya kalan süre; düdükten sonra "Oynanıyor", 2 saat sonra "Maç sona erdi" olur */
export default function Countdown({ to }: { to: string }) {
  const now = useNow(1000);
  if (now === null) return <div className="countdown" style={{ height: 52 }} />;

  const diff = new Date(to).getTime() - now;
  if (diff <= -MATCH_LENGTH_MS) return <div className="countdown"><span className="badge badge-done">Maç sona erdi</span></div>;
  if (diff <= 0) return <div className="countdown"><span className="badge badge-live">Oynanıyor</span></div>;
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  return (
    <div className="countdown" aria-label="Maçın başlamasına kalan süre">
      {days > 0 && <Unit value={days} label="gün" />}
      <Unit value={hours} label="saat" />
      <Unit value={mins} label="dk" />
      {days === 0 && <Unit value={secs} label="sn" />}
    </div>
  );
}
