'use client';

import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Map as MapIcon } from 'lucide-react';
import Crest from './Crest';
import { KindIcon } from './bits';
import type { CafeKind } from '@/lib/types';
import type { BigTeam } from '@/lib/teams';
import { useTheme } from '@/lib/theme';

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
  /** Rehber mekanı (anlaşmalı değil): daha sade işaretçi */
  guide?: boolean;
}

interface Props {
  cafes: MapCafe[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  center: [number, number];
  zoom?: number;
}

export default function CafeMap(props: Props) {
  const theme = useTheme();
  if (!mapsEnabled) return <EmbedMap {...props} />;
  const { cafes, activeId, onSelect, center, zoom = 13 } = props;
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
        colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
        style={{ width: '100%', height: '100%' }}
      >
        {cafes.map((c, i) => (
          <AdvancedMarker key={c.id} position={{ lat: c.lat, lng: c.lng }} onClick={() => onSelect?.(c.id)} zIndex={c.id === activeId ? 1000 : c.pro ? 500 : i} title={c.name}>
            <CafePin c={c} active={c.id === activeId} delay={Math.min(i, 12) * 0.05} />
          </AdvancedMarker>
        ))}
        <FitBounds cafes={cafes} activeId={activeId ?? null} />
      </Map>
    </APIProvider>
  );
}

/** Harita mekanların hepsini kapsayacak şekilde açılır (taraftar stadı değil, yakınındaki mekanı arıyor) */
function FitBounds({ cafes, activeId }: { cafes: MapCafe[]; activeId: string | null }) {
  const map = useMap();
  const key = cafes.map((c) => c.id).join(',');

  useEffect(() => {
    if (!map) return;
    const pts = cafes.map((c) => ({ lat: c.lat, lng: c.lng }));
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

/** Mekan işaretçisi: kapak fotoğrafı varsa o, yoksa taraftar arması ya da mekan türü ikonu */
function CafePin({ c, active, delay = 0 }: { c: MapCafe; active: boolean; delay?: number }) {
  return (
    <motion.div
      className={`marker${c.pro ? ' pro' : ''}${c.guide ? ' guide' : ''}${active ? ' active' : ''}${c.cover ? ' has-photo' : ''}`}
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

// Web Mercator: Google haritasında yakınlaştırma z'de dünya 256·2^z piksel genişliğinde
const TILE = 256;
const toX = (lng: number) => (lng + 180) / 360;
const toY = (lat: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};
const toLng = (x: number) => x * 360 - 180;
const toLat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

/**
 * API anahtarı yokken: Google Maps gömülü görünümü (iğnesiz) + üstüne kendi işaretçilerimiz.
 * Gömülü harita verilen merkez ve yakınlaştırmayla açıldığı için her mekanın ekrandaki yeri hesaplanabiliyor;
 * kaydırınca işaretçiler kaymasın diye harita etkileşimsiz, "Google Maps'te aç" ile açılır.
 */
function EmbedMap({ cafes, activeId, onSelect, center, zoom = 13 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // Bir mekan seçiliyken "Tüm mekanlar" ile genel görünüme dönülebilir
  const [overview, setOverview] = useState(false);
  useEffect(() => setOverview(false), [activeId]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Mobilde liste görünümündeyken harita gizli (0×0): o sırada gömülü haritayı hiç yükleme
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      const h = Math.round(e.contentRect.height);
      setSize(w > 0 && h > 0 ? { w, h } : null);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const active = overview ? null : cafes.find((x) => x.id === activeId) ?? null;
  // Görünüm: seçili mekan, yoksa bütün mekanları kapsayan en yakın tam sayı yakınlaştırma
  let view = { x: toX(center[1]), y: toY(center[0]), z: zoom };
  if (active) view = { x: toX(active.lng), y: toY(active.lat), z: 16 };
  else if (cafes.length > 0 && size) {
    const xs = cafes.map((c) => toX(c.lng));
    const ys = cafes.map((c) => toY(c.lat));
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    let z = 16;
    while (z > 4 && ((x1 - x0) * TILE * 2 ** z > size.w - 80 || (y1 - y0) * TILE * 2 ** z > size.h - 110)) z--;
    // İğneler yukarı doğru uzandığı için alanı biraz aşağı kaydır
    view = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 - 15 / (TILE * 2 ** z), z };
  }
  const lat = toLat(view.y).toFixed(6);
  const lng = toLng(view.x).toFixed(6);
  const src = `https://maps.google.com/maps?ll=${lat},${lng}&z=${view.z}&hl=tr&t=m&output=embed`;
  const scale = TILE * 2 ** view.z;

  return (
    <div className="embed-map" ref={box}>
      {size && (
        <AnimatePresence mode="wait">
          <motion.iframe key={src} title="Google Haritalar" src={src} loading="lazy" tabIndex={-1} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
        </AnimatePresence>
      )}
      {size &&
        cafes.map((c, i) => {
          const left = (toX(c.lng) - view.x) * scale + size.w / 2;
          const top = (toY(c.lat) - view.y) * scale + size.h / 2;
          if (left < -30 || left > size.w + 30 || top < -10 || top > size.h + 60) return null;
          return (
            <button
              key={c.id}
              type="button"
              className="embed-marker"
              style={{ left, top, zIndex: c.id === activeId ? 2 : 1 }}
              onClick={() => onSelect?.(c.id)}
              aria-label={c.name}
              title={c.name}
            >
              <CafePin c={c} active={c.id === activeId} delay={Math.min(i, 12) * 0.03} />
            </button>
          );
        })}
      <div className="embed-actions">
        {active && cafes.length > 1 && (
          <button type="button" className="open-maps" onClick={() => setOverview(true)}>
            <MapIcon size={14} /> Tüm mekanlar
          </button>
        )}
        <a className="open-maps" href={`https://www.google.com/maps/search/?api=1&query=${active ? `${active.lat},${active.lng}` : `${lat},${lng}`}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} /> Google Maps’te aç
        </a>
      </div>
    </div>
  );
}
