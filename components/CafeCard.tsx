'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Info, Navigation, Star, Ticket, Trees, Tv, Volume2, VolumeX } from 'lucide-react';
import { FanBadge, KindIcon } from './bits';
import { HookahIcon, PintIcon } from './art';
import { directionsLink, tl } from '@/lib/hooks';
import { districtName } from '@/lib/places';
import type { Broadcast, Cafe } from '@/lib/types';

interface Props {
  cafe: Cafe;
  b: Broadcast;
  index: number;
  active: boolean;
  onReserve: (cafeId: string) => void;
  onFocus: (cafeId: string) => void;
}

export default function CafeCard({ cafe, b, index, active, onReserve, onFocus }: Props) {
  const left = Math.max(0, b.seats - b.reserved);
  const pct = b.seats ? Math.min(100, Math.round((b.reserved / b.seats) * 100)) : 0;
  const pro = cafe.plan === 'pro';

  return (
    <motion.article
      layout
      id={`cafe-${cafe.id}`}
      className={`card cafe-card${pro ? ' pro' : ''}${active ? ' active' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
    >
      {cafe.cover && (
        <Link href={`/kafe/${cafe.id}`} className="cc-cover" aria-label={`${cafe.name} fotoğrafları`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img src={cafe.cover} alt="" initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }} />
        </Link>
      )}
      <div className="cc-head">
        <div className="kind-tile">
          <KindIcon kind={cafe.kind} />
        </div>
        <div className="cc-title">
          <h3 onClick={() => onFocus(cafe.id)}>
            {cafe.name}
            {pro && (
              <span className="badge badge-pro">
                <Star size={12} fill="currentColor" /> Öne çıkan
              </span>
            )}
          </h3>
          <p>
            {cafe.kind} · {districtName(cafe.city, cafe.district)} · {cafe.address}
          </p>
        </div>
      </div>

      {cafe.fanOf && (
        <div style={{ marginTop: 12 }}>
          <FanBadge id={cafe.fanOf} />
        </div>
      )}

      <div className="cc-pills">
        <span className={`pill${b.sound ? ' ok' : ''}`}>
          {b.sound ? <Volume2 size={15} /> : <VolumeX size={15} />} {b.sound ? 'Ses açık' : 'Ses kapalı'}
        </span>
        <span className="pill">
          <Tv size={15} /> {cafe.screens}
        </span>
        {cafe.features.alcohol && (
          <span className="pill">
            <PintIcon size={15} /> Alkol var
          </span>
        )}
        {cafe.features.hookah && (
          <span className="pill">
            <HookahIcon size={15} /> Nargile
          </span>
        )}
        {cafe.features.garden && (
          <span className="pill">
            <Trees size={15} /> Bahçe
          </span>
        )}
        {b.reservationRequired && <span className="pill" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>Rezervasyon şart</span>}
      </div>

      <div className="cc-prices">
        <div>
          <small>Giriş</small>
          <b>{b.entryFee ? tl(b.entryFee) : 'Ücretsiz'}</b>
        </div>
        <div>
          <small>Min. harcama</small>
          <b>{b.minSpend ? tl(b.minSpend) : 'Yok'}</b>
        </div>
        <div>
          <small>Kişi başı</small>
          <b>
            {cafe.priceMin}–{cafe.priceMax} TL
          </b>
        </div>
      </div>

      {b.note && (
        <p className="cc-note">
          <Info size={15} style={{ flex: 'none', marginTop: 2 }} /> {b.note}
        </p>
      )}

      <div className="occ">
        <div className="occ-top">
          <span>{left > 0 ? `${left} kişilik yer kaldı` : 'Rezervasyonlar doldu'}</span>
          <span>
            {b.reserved}/{b.seats} dolu
          </span>
        </div>
        <div className="occ-track">
          <motion.div
            className={`occ-fill${pct >= 100 ? ' full' : pct >= 75 ? ' hot' : ''}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: [0.2, 0.7, 0.3, 1], delay: 0.15 }}
          />
        </div>
      </div>

      <div className="cc-actions">
        <motion.button className="btn btn-primary" disabled={left <= 0} onClick={() => onReserve(cafe.id)} whileTap={{ scale: 0.95 }}>
          <Ticket size={16} /> Yerini ayırt
        </motion.button>
        <button className="btn btn-soft" onClick={() => onFocus(cafe.id)}>
          Haritada
        </button>
        <a className="btn btn-ghost" href={directionsLink(cafe.lat, cafe.lng)} target="_blank" rel="noopener noreferrer">
          <Navigation size={15} /> Yol tarifi
        </a>
        <Link className="btn btn-ghost" href={`/kafe/${cafe.id}`}>
          Detay
        </Link>
      </div>
    </motion.article>
  );
}
