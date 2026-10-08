'use client';

import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import Crest from './Crest';
import { KindIcon } from './bits';
import type { CafeKind } from '@/lib/types';
import type { BigTeam, Stadium } from '@/lib/teams';

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
export const mapsEnabled = KEY.length > 0;

export interface MapCafe {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: CafeKind;
  pro: boolean;
  fanOf: BigTeam | null;
  cover?: string | null;
}

/** Haritada gösterilecek stadyum: fotoğraflı işaretçi */
export interface MapStadium extends Stadium {
  homeId: string;
}

interface Props {
  cafes: MapCafe[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  center: [number, number];
  zoom?: number;
  stadium?: MapStadium | null;
}

export default function CafeMap(props: Props) {
  if (!mapsEnabled) return <EmbedMap {...props} />;
  const { cafes, activeId, onSelect, center, zoom = 13, stadium } = props;
  return (
    <APIProvider apiKey={KEY} language="tr" region="TR">
      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: center[0], lng: center[1] }}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        colorScheme="FOLLOW_SYSTEM"
        style={{ width: '100%', height: '100%' }}
      >
        {stadium && (
          <AdvancedMarker position={{ lat: stadium.coords[0], lng: stadium.coords[1] }} zIndex={900} title={stadium.name}>
            <StadiumPin s={stadium} />
          </AdvancedMarker>
        )}
        {cafes.map((c, i) => (
          <AdvancedMarker key={c.id} position={{ lat: c.lat, lng: c.lng }} onClick={() => onSelect?.(c.id)} zIndex={c.id === activeId ? 1000 : c.pro ? 500 : i} title={c.name}>
            <CafePin c={c} active={c.id === activeId} delay={Math.min(i, 12) * 0.05} />
          </AdvancedMarker>
        ))}
        <FitBounds cafes={cafes} activeId={activeId ?? null} stadium={stadium ?? null} />
      </Map>
    </APIProvider>
  );
}

function FitBounds({ cafes, activeId, stadium }: { cafes: MapCafe[]; activeId: string | null; stadium: MapStadium | null }) {
  const map = useMap();
  const key = cafes.map((c) => c.id).join(',') + (stadium?.homeId ?? '');

  useEffect(() => {
    if (!map) return;
    const pts = [...cafes.map((c) => ({ lat: c.lat, lng: c.lng })), ...(stadium ? [{ lat: stadium.coords[0], lng: stadium.coords[1] }] : [])];
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setCenter(pts[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    pts.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 70);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  useEffect(() => {
    const c = cafes.find((x) => x.id === activeId);
    if (map && c) map.panTo({ lat: c.lat, lng: c.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, activeId]);

  return null;
}

/** Stadyum işaretçisi: yuvarlak fotoğraf, ev sahibi arması, nabız halkası ve isim etiketi */
function StadiumPin({ s }: { s: MapStadium }) {
  return (
    <motion.div className="pin-stadium" initial={{ y: -30, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }}>
      <span className="pulse" aria-hidden />
      <span className="photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.photo} alt="" />
      </span>
      <span className="crest">
        <Crest id={s.homeId} size={22} />
      </span>
      <span className="tail" aria-hidden />
      <span className="label">{s.name}</span>
    </motion.div>
  );
}

/** Mekan işaretçisi: kapak fotoğrafı varsa o, yoksa taraftar arması ya da mekan türü ikonu */
function CafePin({ c, active, delay = 0 }: { c: MapCafe; active: boolean; delay?: number }) {
  return (
    <motion.div
      className={`marker${c.pro ? ' pro' : ''}${active ? ' active' : ''}${c.cover ? ' has-photo' : ''}`}
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14, delay }}
    >
      {c.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.cover} alt="" />
      ) : c.fanOf ? (
        <Crest id={c.fanOf} size={22} />
      ) : (
        <KindIcon kind={c.kind} size={18} />
      )}
      {active && <span className="marker-label">{c.name}</span>}
    </motion.div>
  );
}

/**
 * API anahtarı yokken: Google Maps gömülü görünümü (iğnesiz) + ortasına kendi işaretçimiz.
 * Harita sabit önizleme; kaydırınca işaretçi kaymasın diye etkileşim kapalı, "Google Maps'te aç" ile açılır.
 */
function EmbedMap({ cafes, activeId, center, stadium }: Props) {
  const c = cafes.find((x) => x.id === activeId) ?? (cafes.length === 1 ? cafes[0] : null);
  const focus = c ? [c.lat, c.lng] : stadium ? stadium.coords : center;
  const zoom = c ? 16 : stadium ? 15 : 13;
  const src = `https://maps.google.com/maps?ll=${focus[0]},${focus[1]}&z=${zoom}&hl=tr&t=m&output=embed`;
  const pinKey = c ? `c-${c.id}` : stadium ? `s-${stadium.homeId}` : 'none';

  return (
    <div className="embed-map">
      <AnimatePresence mode="wait">
        <motion.iframe key={src} title="Google Haritalar" src={src} loading="lazy" tabIndex={-1} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
      </AnimatePresence>
      <div className="embed-pin">
        <AnimatePresence mode="wait">
          {c ? <CafePin key={pinKey} c={c} active /> : stadium ? <StadiumPin key={pinKey} s={stadium} /> : null}
        </AnimatePresence>
      </div>
      <a className="open-maps" href={`https://www.google.com/maps/search/?api=1&query=${focus[0]},${focus[1]}`} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={14} /> Google Maps’te aç
      </a>
      {cafes.length > 1 && !c && (
        <div className="map-note">
          Listeden bir mekan seç, konumu burada açılsın.
          {process.env.NODE_ENV !== 'production' && <span className="faint"> · Tüm mekanları tek haritada görmek için .env.local’a NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ekle.</span>}
        </div>
      )}
    </div>
  );
}
