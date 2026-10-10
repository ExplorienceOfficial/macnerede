'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ExternalLink, Info, MessageCircle, Navigation, Phone, Star, Trees, Tv } from 'lucide-react';
import { KindIcon } from './bits';
import { HookahIcon, PintIcon } from './art';
import { directionsLink, telLink } from '@/lib/hooks';
import { track } from '@/lib/db';
import { districtName } from '@/lib/places';
import { hasWhatsApp } from '@/lib/venues';
import type { Venue } from '@/lib/types';

interface Props {
  v: Venue;
  index: number;
  active: boolean;
  onSeat: (id: string) => void;
  onFocus: (id: string) => void;
}

/** Rehber mekanı: anlaşmalı değil, maç verdiği taraftar yorumlarından biliniyor */
export default function VenueCard({ v, index, active, onSeat, onFocus }: Props) {
  const wa = hasWhatsApp(v.phone);
  return (
    <motion.article
      layout
      id={`cafe-${v.id}`}
      className={`card cafe-card venue${active ? ' active' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
    >
      <div className="cc-head">
        <div className="kind-tile">
          <KindIcon kind={v.kind} />
        </div>
        <div className="cc-title">
          <h3 onClick={() => onFocus(v.id)}>{v.name}</h3>
          <p>
            {v.kind} · {districtName(v.city, v.district)} · {v.address}
          </p>
        </div>
      </div>

      <div className="cc-pills">
        {v.rating && (
          <span className="pill">
            <Star size={15} /> {v.rating.toLocaleString('tr-TR')} · {v.reviews?.toLocaleString('tr-TR')} yorum
          </span>
        )}
        {v.features.bigScreen && (
          <span className="pill">
            <Tv size={15} /> Dev ekran
          </span>
        )}
        {v.features.alcohol && (
          <span className="pill">
            <PintIcon size={15} /> Alkol var
          </span>
        )}
        {v.features.hookah && (
          <span className="pill">
            <HookahIcon size={15} /> Nargile
          </span>
        )}
        {v.features.garden && (
          <span className="pill">
            <Trees size={15} /> Açık alan
          </span>
        )}
      </div>

      <p className="cc-note">
        <Info size={15} style={{ flex: 'none', marginTop: 2 }} />
        <span>
          Taraftar yorumlarına göre maç veriyor ({v.evidence}). Anlaşmalı değil: o maçı verip vermediğini, sesi ve giriş ücretini gitmeden sor.
        </span>
      </p>

      <div className="cc-actions">
        {wa ? (
          <motion.button className="btn btn-primary" onClick={() => onSeat(v.id)} whileTap={{ scale: 0.95 }}>
            <MessageCircle size={16} /> Yerini ayırt
          </motion.button>
        ) : (
          v.phone && (
            <a className="btn btn-primary" href={telLink(v.phone)} onClick={() => track(v.id, 'call')}>
              <Phone size={16} /> Arayıp sor
            </a>
          )
        )}
        {wa && (
          <a className="btn btn-soft" href={telLink(v.phone)} onClick={() => track(v.id, 'call')}>
            <Phone size={15} /> Ara
          </a>
        )}
        <button className="btn btn-ghost" onClick={() => onFocus(v.id)}>
          Haritada
        </button>
        <a className="btn btn-ghost" href={directionsLink(v.lat, v.lng)} onClick={() => track(v.id, 'dir')} target="_blank" rel="noopener noreferrer">
          <Navigation size={15} /> Yol tarifi
        </a>
        {v.instagram && (
          <a className="btn btn-ghost" href={`https://instagram.com/${v.instagram}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} /> Instagram
          </a>
        )}
      </div>
      <Link className="claim-link" href={`/kayit?mekan=${v.id}`}>
        Bu mekan senin mi? Maçlarını ve fiyatlarını sen gir →
      </Link>
    </motion.article>
  );
}
