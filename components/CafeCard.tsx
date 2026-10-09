'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { BadgeCheck, Info, MessageCircle, Navigation, Phone, Star, Trees, Tv, Volume2, VolumeX } from 'lucide-react';
import { FanBadge, KindIcon } from './bits';
import { HookahIcon, PintIcon } from './art';
import { directionsLink, formatPhone, telLink, tl } from '@/lib/hooks';
import { districtName } from '@/lib/places';
import { hasWhatsApp } from '@/lib/venues';
import type { Broadcast, Cafe } from '@/lib/types';

interface Props {
  cafe: Cafe;
  b: Broadcast;
  index: number;
  active: boolean;
  onSeat: (cafeId: string) => void;
  onFocus: (cafeId: string) => void;
}

export default function CafeCard({ cafe, b, index, active, onSeat, onFocus }: Props) {
  const pro = cafe.plan === 'pro';
  const wa = hasWhatsApp(cafe.phone);

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
        <span className="pill ok">
          <BadgeCheck size={15} /> Anlaşmalı · bu maçı veriyor
        </span>
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
            <Trees size={15} /> Açık alan
          </span>
        )}
        {b.reservationRequired && <span className="pill" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>Önceden yer ayırt</span>}
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

      <div className="cc-actions">
        {wa ? (
          <motion.button className="btn btn-primary" onClick={() => onSeat(cafe.id)} whileTap={{ scale: 0.95 }}>
            <MessageCircle size={16} /> Yerini ayırt
          </motion.button>
        ) : (
          <a className="btn btn-primary" href={telLink(cafe.phone)}>
            <Phone size={16} /> Arayıp yer ayırt
          </a>
        )}
        {wa && (
          <a className="btn btn-soft" href={telLink(cafe.phone)} title={formatPhone(cafe.phone)}>
            <Phone size={15} /> Ara
          </a>
        )}
        <button className="btn btn-ghost" onClick={() => onFocus(cafe.id)}>
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
