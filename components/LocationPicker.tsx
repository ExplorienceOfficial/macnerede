'use client';

import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { mapsEnabled } from './CafeMap';

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Google Maps paylaşım bağlantısından koordinat çıkarır (uzun bağlantılar için) */
export function parseMapsLink(s: string): LatLng | null {
  const patterns = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/, /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

export default function LocationPicker({ value, onChange }: { value: LatLng; onChange: (v: LatLng) => void }) {
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  function applyLink(s: string) {
    setLink(s);
    if (!s.trim()) return setLinkError(null);
    if (/goo\.gl|maps\.app/.test(s)) return setLinkError('Kısa bağlantıları okuyamıyoruz. Google Maps’te mekanına sağ tıkla, çıkan koordinatı (ör. 40.98, 29.02) buraya yapıştır.');
    const p = parseMapsLink(s);
    if (!p) return setLinkError('Bu bağlantıda konum bulamadık.');
    setLinkError(null);
    onChange(p);
  }

  return (
    <div>
      {mapsEnabled ? (
        <div className="loc-preview" style={{ height: 300 }}>
          <APIProvider apiKey={KEY} language="tr" region="TR">
            <Map
              mapId={MAP_ID}
              defaultCenter={value}
              defaultZoom={16}
              gestureHandling="greedy"
              disableDefaultUI
              zoomControl
              clickableIcons={false}
              colorScheme="FOLLOW_SYSTEM"
              onClick={(e) => e.detail.latLng && onChange(e.detail.latLng)}
              style={{ width: '100%', height: '100%' }}
            >
              <AdvancedMarker position={value} draggable onDragEnd={(e) => e.latLng && onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() })} />
              <Follow to={value} />
            </Map>
          </APIProvider>
        </div>
      ) : (
        <div className="loc-preview">
          <iframe title="Konum önizleme" src={`https://maps.google.com/maps?q=${value.lat},${value.lng}&z=16&hl=tr&output=embed`} loading="lazy" />
        </div>
      )}
      <p className="faint" style={{ fontSize: 13, margin: '8px 0 14px' }}>
        {mapsEnabled ? 'Haritaya tıkla ya da iğneyi sürükle.' : 'İğne şu an ilçe merkezinde. Tam yerini aşağıya yapıştır.'}
      </p>
      <div className="field">
        <label htmlFor="maps-link">Google Maps bağlantısı ya da koordinat</label>
        <input id="maps-link" className={`input${linkError ? ' err' : ''}`} value={link} onChange={(e) => applyLink(e.target.value)} placeholder="https://www.google.com/maps/place/... veya 40.9839, 29.0263" />
        {linkError ? <span className="hint" style={{ color: 'var(--danger)' }}>{linkError}</span> : <span className="hint">Seçilen: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>}
      </div>
    </div>
  );
}

/** Konum dışarıdan değişince (ilçe seçimi, yapıştırılan bağlantı) haritayı oraya kaydır */
function Follow({ to }: { to: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map?.panTo(to);
  }, [map, to.lat, to.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
