'use client';

import { motion } from 'motion/react';
import { Coffee, Tv, Volume2, VolumeX, Trees } from 'lucide-react';
import type { CafeKind } from '@/lib/types';
import { cities } from '@/lib/places';
import { HookahIcon, PintIcon, TeaGlassIcon } from './art';
import Crest from './Crest';
import { fanLabel, stadiumFor, team, type BigTeam } from '@/lib/teams';
import { compLabel, compLogo, type Competition } from '@/lib/fixtures';

export function KindIcon({ kind, size = 22 }: { kind: CafeKind; size?: number }) {
  if (kind === 'Kafe') return <Coffee size={size} strokeWidth={1.8} />;
  if (kind === 'Nargile') return <HookahIcon size={size} />;
  if (kind === 'Kıraathane') return <TeaGlassIcon size={size} />;
  return <PintIcon size={size} />;
}

export const featureIcons = { Tv, Volume2, VolumeX, Trees };

export function FanBadge({ id }: { id: BigTeam }) {
  const [c1] = team(id).colors;
  return (
    <span className="fan-badge" style={{ background: `color-mix(in srgb, ${c1} 13%, transparent)` }}>
      <Crest id={id} size={20} />
      {fanLabel[id]}
    </span>
  );
}

/** Kayan "başparmak"lı şehir seçici */
export function CityPicker({ value, onChange, counts }: { value: string; onChange: (id: string) => void; counts?: Record<string, number> }) {
  return (
    <div className="seg" role="group" aria-label="Şehir">
      {cities.map((c) => (
        <button key={c.id} aria-pressed={value === c.id} onClick={() => onChange(c.id)}>
          {value === c.id && <motion.span layoutId="city-thumb" className="seg-thumb" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          {c.name}
          {counts && counts[c.id] !== undefined && <span style={{ marginLeft: 6, color: 'var(--text-3)', fontWeight: 500 }}>{counts[c.id]}</span>}
        </button>
      ))}
    </div>
  );
}

/** Turnuva logosu + adı */
export function CompBadge({ comp, round }: { comp: Competition; round?: number }) {
  return (
    <span className="comp-badge">
      <span className="comp-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={compLogo[comp]} alt="" />
      </span>
      {compLabel[comp]}
      {round ? <span className="faint"> · {round}. hafta</span> : null}
    </span>
  );
}

/** Ev sahibinin stadyum fotoğrafı: yavaş yakınlaşan arka plan + karartma + künye */
export function StadiumBackdrop({ homeId }: { homeId: string }) {
  const s = stadiumFor(homeId);
  if (!s) return null;
  return (
    <>
      <motion.img
        className="stadium-photo"
        src={s.photo}
        alt=""
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 9, ease: 'easeOut' }}
      />
      <span className="stadium-shade" aria-hidden />
      <a className="photo-credit" href={s.source} target="_blank" rel="noopener noreferrer">
        {s.name} · Foto: {s.credit}, {s.license}
      </a>
    </>
  );
}
