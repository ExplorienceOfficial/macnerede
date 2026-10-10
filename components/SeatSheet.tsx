'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { MessageCircle, Minus, Phone, Plus, X } from 'lucide-react';
import Crest from './Crest';
import { formatPhone, seatMessage, telLink, waLink } from '@/lib/hooks';
import { track } from '@/lib/db';
import { districtName } from '@/lib/places';
import { team } from '@/lib/teams';
import type { MatchInfo } from '@/lib/fixtures';

export interface SeatPlace {
  /** Analitik için mekan id'si (anlaşmalı: uid, rehber: rehber id'si) */
  id: string;
  name: string;
  phone: string;
  city: string;
  district: string;
  address: string;
}

const MAX_PEOPLE = 20;

/**
 * "Yerini ayırt": kaç kişi olduğunu seçtirir, mekanın WhatsApp'ına hazır mesajı açar.
 * Yer ayırma mekanla taraftar arasında kalır; site rezervasyon tutmaz.
 */
export default function SeatSheet({ place, match, onClose }: { place: SeatPlace; match: MatchInfo; onClose: () => void }) {
  const [people, setPeople] = useState(4);
  const [dir, setDir] = useState(1);
  const started = Date.now() >= new Date(match.kickoffISO).getTime();
  const message = seatMessage(match, people);

  // "Yerini ayırt" penceresi açıldı: mekana ilgi
  useEffect(() => track(place.id, 'seat'), [place.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function bump(d: number) {
    setDir(d);
    setPeople((p) => Math.max(1, Math.min(MAX_PEOPLE, p + d)));
  }

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Yerini ayırt"
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        <button className="icon-btn sheet-close" onClick={onClose} aria-label="Kapat">
          <X size={18} />
        </button>
        <h2>{place.name}</h2>
        <p className="sheet-sub">
          {districtName(place.city, place.district)} · {place.address}
        </p>

        <div className="mini-match">
          <Crest id={match.home} size={24} />
          <span>{team(match.home).short}</span>
          <span className="faint">–</span>
          <span>{team(match.away).short}</span>
          <Crest id={match.away} size={24} />
          <span className="when">
            {match.day} {match.time ?? ''}
          </span>
        </div>

        {started && <div className="form-error">Maç başladı. Yine de yer sormak istersen mekana yazabilirsin.</div>}

        <div className="people">
          <div className="people-label">
            Kaç kişisiniz?
            <small>Mesaja eklenir</small>
          </div>
          <div className="stepper">
            <button type="button" onClick={() => bump(-1)} disabled={people <= 1} aria-label="Azalt">
              <Minus size={18} />
            </button>
            <div className="val" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.span key={people} custom={dir} initial={{ y: dir * 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: dir * -22, opacity: 0 }} transition={{ duration: 0.18 }}>
                  {people}
                </motion.span>
              </AnimatePresence>
            </div>
            <button type="button" onClick={() => bump(1)} disabled={people >= MAX_PEOPLE} aria-label="Arttır">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <p className="wa-preview">{message}</p>

        <a className="btn btn-wa btn-lg btn-block" href={waLink(place.phone, message)} onClick={() => track(place.id, 'wa')} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={18} /> WhatsApp’tan yer sor
        </a>
        <a className="btn btn-ghost btn-lg btn-block" style={{ marginTop: 8 }} href={telLink(place.phone)} onClick={() => track(place.id, 'call')}>
          <Phone size={17} /> Ara · {formatPhone(place.phone)}
        </a>
        <p className="legal">Yer ayırma mekanla aranda kalır; giriş ücreti, harcama şartı gibi detayları mekana sor.</p>
      </motion.div>
    </motion.div>
  );
}
