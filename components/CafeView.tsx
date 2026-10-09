'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Navigation, Phone, Star, Ticket, Volume2, VolumeX, X } from 'lucide-react';
import Crest from './Crest';
import CafeMap from './CafeMap';
import ReserveSheet from './ReserveSheet';
import { FanBadge, KindIcon } from './bits';
import { TvIllustration } from './art';
import { getCafe, listCafeBroadcasts, listPhotos } from '@/lib/db';
import { directionsLink, formatPhone, telLink, tl } from '@/lib/hooks';
import { cityById, districtName } from '@/lib/places';
import { team } from '@/lib/teams';
import type { Broadcast, Cafe, CafePhoto } from '@/lib/types';
import type { MatchInfo } from '@/lib/fixtures';

export default function CafeView({ id, matches }: { id: string; matches: MatchInfo[] }) {
  const [cafe, setCafe] = useState<Cafe | null | undefined>(undefined);
  const [bcs, setBcs] = useState<Broadcast[]>([]);
  const [reserving, setReserving] = useState<string | null>(null);
  const [photos, setPhotos] = useState<CafePhoto[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getCafe(id), listCafeBroadcasts(id)]).then(([c, b]) => {
      setCafe(c);
      setBcs(b);
    });
    listPhotos(id).then(setPhotos).catch(() => setPhotos([]));
  }, [id]);

  if (cafe === undefined) {
    return (
      <div className="container cafe-hero">
        <div className="skeleton" style={{ height: 380 }} />
        <div className="skeleton" style={{ height: 380 }} />
      </div>
    );
  }
  if (cafe === null) {
    return (
      <div className="container">
        <div className="card empty" style={{ margin: '40px 0' }}>
          <TvIllustration />
          <strong>Bu mekanı bulamadık</strong>
          <Link href="/" className="btn btn-primary btn-sm">Bu haftanın maçları</Link>
        </div>
      </div>
    );
  }

  const shows = matches.map((m) => ({ m, b: bcs.find((b) => b.matchId === m.id) })).filter((x): x is { m: MatchInfo; b: Broadcast } => !!x.b);
  const reservingRow = shows.find((s) => s.m.id === reserving);

  return (
    <div className="container">
      <Link href="/" className="back">
        <ChevronLeft size={16} /> Bu haftanın maçları
      </Link>
      <div className="cafe-hero">
        <motion.div className={`card info${cafe.plan === 'pro' ? ' cafe-card pro' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="cc-head">
            <div className="kind-tile" style={{ width: 56, height: 56 }}>
              <KindIcon kind={cafe.kind} size={26} />
            </div>
            <div className="cc-title">
              <h1>{cafe.name}</h1>
              <p>
                {cafe.kind} · {districtName(cafe.city, cafe.district)}, {cityById(cafe.city)?.name}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {cafe.plan === 'pro' && (
              <span className="badge badge-pro">
                <Star size={12} fill="currentColor" /> Öne çıkan mekan
              </span>
            )}
            {cafe.fanOf && <FanBadge id={cafe.fanOf} />}
          </div>
          <dl className="spec-list">
            <div><dt>Adres</dt><dd>{cafe.address}</dd></div>
            <div><dt>Telefon</dt><dd><a href={telLink(cafe.phone)} style={{ color: 'var(--accent)' }}>{formatPhone(cafe.phone)}</a></dd></div>
            <div><dt>Ekranlar</dt><dd>{cafe.screens}</dd></div>
            <div><dt>Kapasite</dt><dd>{cafe.capacity} kişi</dd></div>
            <div><dt>Kişi başı</dt><dd>{cafe.priceMin}–{cafe.priceMax} TL</dd></div>
            <div>
              <dt>Ortam</dt>
              <dd>
                {[cafe.features.alcohol ? 'Alkol var' : 'Alkolsüz', cafe.features.hookah && 'Nargile', cafe.features.garden && 'Bahçe', cafe.features.bigScreen && 'Dev ekran']
                  .filter(Boolean)
                  .join(' · ')}
              </dd>
            </div>
          </dl>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <a className="btn btn-primary" href={telLink(cafe.phone)}>
              <Phone size={15} /> Mekanı ara
            </a>
            <a className="btn btn-ghost" href={directionsLink(cafe.lat, cafe.lng)} target="_blank" rel="noopener noreferrer">
              <Navigation size={15} /> Yol tarifi al
            </a>
          </div>
          {photos.length > 0 && (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 24 }}>Mekandan fotoğraflar</h2>
              <div className="gallery">
                {photos.map((p, i) => (
                  <motion.button key={p.id} onClick={() => setViewing(i)} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }} aria-label={`Fotoğraf ${i + 1}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.data} alt="" loading="lazy" />
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </motion.div>

        <div>
          <motion.div className="map-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <CafeMap cafes={[{ id: cafe.id, name: cafe.name, lat: cafe.lat, lng: cafe.lng, kind: cafe.kind, pro: cafe.plan === 'pro', fanOf: cafe.fanOf, cover: cafe.cover }]} activeId={cafe.id} center={[cafe.lat, cafe.lng]} zoom={16} />
          </motion.div>

          <section className="card panel-card" style={{ marginTop: 20 }}>
            <h2>Bu hafta verdiği maçlar</h2>
            <p>Yerini buradan da ayırtabilirsin.</p>
            {shows.length === 0 && <p className="faint">Bu hafta için girilmiş maç yok.</p>}
            {shows.map(({ m, b }, i) => {
              const left = b.seats - b.reserved;
              return (
                <motion.div key={m.id} className="bc-row" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
                  <div className="bc-head">
                    <Crest id={m.home} size={28} />
                    <Crest id={m.away} size={28} />
                    <div className="info">
                      <b>
                        {team(m.home).name} – {team(m.away).name}
                      </b>
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {m.day} {m.time ?? ''} · {b.sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
                        {b.entryFee ? ` Giriş ${tl(b.entryFee)}` : ' Girişsiz'} · {left > 0 ? `${left} yer` : 'dolu'}
                      </span>
                    </div>
                    <button className="btn btn-primary btn-sm" disabled={left <= 0 || m.finished} onClick={() => setReserving(m.id)}>
                      <Ticket size={15} /> Ayırt
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {viewing !== null && photos[viewing] && <Lightbox photos={photos} index={viewing} onIndex={setViewing} />}
      </AnimatePresence>

      <AnimatePresence>
        {reservingRow && (
          <ReserveSheet
            cafe={cafe}
            b={reservingRow.b}
            match={reservingRow.m}
            onClose={() => setReserving(null)}
            onReserved={(n) => setBcs((all) => all.map((b) => (b.matchId === reservingRow.m.id ? { ...b, reserved: b.reserved + n } : b)))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Tam ekran fotoğraf görüntüleyici: ok tuşları, Esc ve kaydırmalı geçiş */
function Lightbox({ photos, index, onIndex }: { photos: CafePhoto[]; index: number; onIndex: (i: number | null) => void }) {
  const [dir, setDir] = useState(1);
  const go = (d: number) => {
    setDir(d);
    onIndex((index + d + photos.length) % photos.length);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onIndex(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && onIndex(null)}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img
          key={photos[index].id}
          src={photos[index].data}
          alt=""
          custom={dir}
          initial={{ x: dir * 80, opacity: 0, scale: 0.96 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: dir * -80, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => Math.abs(info.offset.x) > 60 && go(info.offset.x < 0 ? 1 : -1)}
        />
      </AnimatePresence>
      {photos.length > 1 && (
        <>
          <button className="nav-btn" style={{ left: 16 }} onClick={() => go(-1)} aria-label="Önceki">
            <ChevronLeft size={22} />
          </button>
          <button className="nav-btn" style={{ right: 16 }} onClick={() => go(1)} aria-label="Sonraki">
            <ChevronRight size={22} />
          </button>
        </>
      )}
      <button className="icon-btn close" onClick={() => onIndex(null)} aria-label="Kapat">
        <X size={18} />
      </button>
      <span className="count">
        {index + 1} / {photos.length}
      </span>
    </motion.div>
  );
}
