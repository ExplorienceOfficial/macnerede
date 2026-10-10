'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ChevronLeft, ExternalLink, Info, MessageCircle, Navigation, Phone, Star } from 'lucide-react';
import Crest from './Crest';
import CafeMap from './CafeMap';
import SeatSheet from './SeatSheet';
import { KindIcon } from './bits';
import { TvIllustration } from './art';
import { ClaimLink } from './VenueCard';
import { getVenue, track } from '@/lib/db';
import { directionsLink, formatPhone, telLink } from '@/lib/hooks';
import { evidenceMonth, hasWhatsApp } from '@/lib/venues';
import { cityById, districtName } from '@/lib/places';
import { matchPath, type MatchInfo } from '@/lib/fixtures';
import { team } from '@/lib/teams';
import type { Venue } from '@/lib/types';

/**
 * Rehber mekanının profil sayfası (/mekan/[id]). Mekanlara gönderilen bağlantı budur.
 * Kanıtı eskimiş ya da gizlenmiş mekanın sayfası da açılmaz: listede olmayan mekan hiçbir yerde görünmez.
 */
export default function VenueView({ id, matches }: { id: string; matches: MatchInfo[] }) {
  const [v, setV] = useState<Venue | null | undefined>(undefined);
  const [seat, setSeat] = useState<MatchInfo | null>(null);

  useEffect(() => {
    getVenue(id).then((x) => {
      setV(x);
      if (x) track(x.id, 'view');
    });
  }, [id]);

  if (v === undefined) {
    return (
      <div className="container cafe-hero">
        <div className="skeleton" style={{ height: 380 }} />
        <div className="skeleton" style={{ height: 380 }} />
      </div>
    );
  }
  if (v === null) {
    return (
      <div className="container">
        <div className="card empty" style={{ margin: '40px 0' }}>
          <TvIllustration />
          <strong>Bu mekan şu an listemizde yok</strong>
          Maç yayını yaptığını yakın tarihte doğrulayamadığımız mekanları göstermiyoruz.
          <Link href="/" className="btn btn-primary btn-sm">
            Bu haftanın maçları
          </Link>
        </div>
      </div>
    );
  }

  const wa = hasWhatsApp(v.phone);
  const upcoming = matches.filter((m) => !m.finished);
  const maps = v.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.address}`)}`;

  return (
    <div className="container">
      <Link href="/" className="back">
        <ChevronLeft size={16} /> Bu haftanın maçları
      </Link>
      <div className="cafe-hero">
        <motion.div className="card info" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="cc-head">
            <div className="kind-tile" style={{ width: 56, height: 56 }}>
              <KindIcon kind={v.kind} size={26} />
            </div>
            <div className="cc-title">
              <h1>{v.name}</h1>
              <p>
                {v.kind} · {districtName(v.city, v.district)}, {cityById(v.city)?.name}
              </p>
            </div>
          </div>
          {v.rating && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <span className="pill">
                <Star size={15} /> {v.rating.toLocaleString('tr-TR')} · {v.reviews?.toLocaleString('tr-TR')} Google yorumu
              </span>
            </div>
          )}
          <p className="cc-note" style={{ marginTop: 14 }}>
            <Info size={15} style={{ flex: 'none', marginTop: 2 }} />
            <span>
              Taraftar yorumlarına göre maç veriyor{v.evidenceDate && ` (en yeni maç yorumu ${evidenceMonth(v.evidenceDate)})`}. Anlaşmalı değil: o
              maçı verip vermediğini, sesi ve giriş ücretini gitmeden sor.
            </span>
          </p>
          <dl className="spec-list">
            <div>
              <dt>Adres</dt>
              <dd>{v.address}</dd>
            </div>
            {v.phone && (
              <div>
                <dt>Telefon</dt>
                <dd>
                  <a href={telLink(v.phone)} onClick={() => track(v.id, 'call')} style={{ color: 'var(--accent)' }}>
                    {formatPhone(v.phone)}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt>Ortam</dt>
              <dd>
                {[v.features.bigScreen && 'Dev ekran', v.features.alcohol ? 'Alkol var' : 'Alkolsüz', v.features.hookah && 'Nargile', v.features.garden && 'Açık alan']
                  .filter(Boolean)
                  .join(' · ')}
              </dd>
            </div>
          </dl>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            {v.phone && (
              <a className="btn btn-primary" href={telLink(v.phone)} onClick={() => track(v.id, 'call')}>
                <Phone size={15} /> Ara
              </a>
            )}
            <a className="btn btn-ghost" href={directionsLink(v.lat, v.lng)} onClick={() => track(v.id, 'dir')} target="_blank" rel="noopener noreferrer">
              <Navigation size={15} /> Yol tarifi
            </a>
            <a className="btn btn-ghost" href={maps} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> Google Maps
            </a>
            {v.instagram && (
              <a className="btn btn-ghost" href={`https://instagram.com/${v.instagram}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={15} /> Instagram
              </a>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <ClaimLink v={v} />
          </div>
        </motion.div>

        <div>
          <motion.div className="map-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <CafeMap cafes={[{ id: v.id, name: v.name, lat: v.lat, lng: v.lng, kind: v.kind, pro: false, fanOf: null, guide: true }]} activeId={v.id} center={[v.lat, v.lng]} zoom={16} />
          </motion.div>

          <section className="card panel-card" style={{ marginTop: 20 }}>
            <h2>Bu haftanın büyük maçları</h2>
            <p>{wa ? 'Maça dokun, “bu maçı veriyor musunuz, yer var mı?” mesajı WhatsApp’ta hazır gelsin.' : 'Maçı verip vermediğini mekanı arayıp sor.'}</p>
            {upcoming.length === 0 && <p className="faint">Bu hafta başka maç kalmadı.</p>}
            {upcoming.map((m) => (
              <div key={m.id} className="bc-row venue-match">
                <Link href={matchPath(m, v.city)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <Crest id={m.home} size={22} />
                  <Crest id={m.away} size={22} />
                  <span style={{ minWidth: 0 }}>
                    <b>
                      {team(m.home).name} – {team(m.away).name}
                    </b>
                    <span className="faint" style={{ display: 'block', fontSize: 13 }}>
                      {m.day} {m.time ?? ''}
                    </span>
                  </span>
                </Link>
                {wa ? (
                  <button className="btn btn-primary btn-sm" onClick={() => setSeat(m)}>
                    <MessageCircle size={15} /> Sor
                  </button>
                ) : (
                  v.phone && (
                    <a className="btn btn-primary btn-sm" href={telLink(v.phone)} onClick={() => track(v.id, 'call')}>
                      <Phone size={15} /> Ara
                    </a>
                  )
                )}
              </div>
            ))}
          </section>
        </div>
      </div>
      <AnimatePresence>{seat && <SeatSheet key={seat.id} place={v} match={seat} onClose={() => setSeat(null)} />}</AnimatePresence>
    </div>
  );
}
