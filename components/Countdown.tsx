'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

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

export default function Countdown({ to, live }: { to: string; live?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (live) return <span className="badge badge-live">CANLI</span>;
  if (now === null) return <div className="countdown" style={{ height: 52 }} />;

  const diff = Math.max(0, new Date(to).getTime() - now);
  if (diff === 0) return <span className="badge badge-live">BAŞLADI</span>;
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
