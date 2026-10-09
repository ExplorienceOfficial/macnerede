'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { CheckCheck, ChevronDown } from 'lucide-react';
import { updateCafeProfile, type CafeProfile } from '@/lib/db';
import { BIG4, team, type BigTeam } from '@/lib/teams';
import { CAFE_KINDS, type Cafe, type CafeKind } from '@/lib/types';

function pickProfile(c: Cafe): CafeProfile {
  return {
    name: c.name,
    kind: c.kind,
    address: c.address,
    phone: c.phone,
    capacity: c.capacity,
    screens: c.screens,
    features: { ...c.features },
    priceMin: c.priceMin,
    priceMax: c.priceMax,
    fanOf: c.fanOf,
  };
}

/** Mekanın kendi bilgilerini düzenlemesi (yönetici kısa bilgiyle açtıysa sonradan tamamlanır) */
export default function ProfileEditor({ cafe, onCafe }: { cafe: Cafe; onCafe: (c: Cafe) => void }) {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<CafeProfile>(() => pickProfile(cafe));
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof CafeProfile>(k: K, v: CafeProfile[K]) => setP((x) => ({ ...x, [k]: v }));

  async function save() {
    setError(null);
    if (p.name.trim().length < 2) return setError('Mekan adı boş olamaz.');
    if (!(p.capacity > 0)) return setError('Kapasiteyi yaz.');
    setState('saving');
    try {
      const clean = { ...p, name: p.name.trim(), address: p.address.trim(), screens: p.screens.trim() || 'TV' };
      await updateCafeProfile(cafe.id, clean);
      onCafe({ ...cafe, ...clean });
      setState('saved');
      setTimeout(() => setState('idle'), 1800);
    } catch (e) {
      setError((e as Error).message);
      setState('idle');
    }
  }

  return (
    <section className="card panel-card">
      <button className="profile-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Mekan bilgilerim
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'grid' }}>
          <ChevronDown size={20} />
        </motion.span>
      </button>
      <p style={{ marginTop: 4 }}>Ad, adres, kapasite, ekranlar ve fiyatlar — taraftarların gördüğü bilgiler.</p>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="row-2">
              <div className="field">
                <label htmlFor="p-name">Mekan adı</label>
                <input id="p-name" className="input" value={p.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="p-kind">Tür</label>
                <select id="p-kind" className="input" value={p.kind} onChange={(e) => set('kind', e.target.value as CafeKind)}>
                  {CAFE_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="p-addr">Adres</label>
              <input id="p-addr" className="input" value={p.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="row-3">
              <div className="field">
                <label htmlFor="p-cap">Kapasite</label>
                <input id="p-cap" className="input" type="number" min={1} value={p.capacity || ''} onChange={(e) => set('capacity', Math.round(Number(e.target.value)))} />
              </div>
              <div className="field">
                <label htmlFor="p-pmin">Kişi başı en az</label>
                <input id="p-pmin" className="input" type="number" min={0} value={p.priceMin || ''} onChange={(e) => set('priceMin', Math.round(Number(e.target.value)))} />
              </div>
              <div className="field">
                <label htmlFor="p-pmax">Kişi başı en çok</label>
                <input id="p-pmax" className="input" type="number" min={0} value={p.priceMax || ''} onChange={(e) => set('priceMax', Math.round(Number(e.target.value)))} />
              </div>
            </div>
            <div className="row-2">
              <div className="field">
                <label htmlFor="p-screens">Ekranlar</label>
                <input id="p-screens" className="input" value={p.screens} onChange={(e) => set('screens', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="p-phone">WhatsApp (90 ile)</label>
                <input id="p-phone" className="input" type="tel" value={p.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <div className="chips" style={{ marginBottom: 14 }}>
              {(
                [
                  ['bigScreen', 'Dev ekran'],
                  ['alcohol', 'Alkol var'],
                  ['hookah', 'Nargile'],
                  ['garden', 'Açık alan'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" className="chip" aria-pressed={p.features[k]} onClick={() => set('features', { ...p.features, [k]: !p.features[k] })}>
                  {l}
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="p-fan">Taraftar mekanı</label>
              <select id="p-fan" className="input" value={p.fanOf ?? ''} onChange={(e) => set('fanOf', (e.target.value || null) as BigTeam | null)}>
                <option value="">Herkese açık</option>
                {BIG4.map((t) => (
                  <option key={t} value={t}>
                    {team(t).name}
                  </option>
                ))}
              </select>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={state === 'saving'}>
                {state === 'saving' ? 'Kaydediliyor…' : 'Bilgileri kaydet'}
              </button>
              <AnimatePresence>
                {state === 'saved' && (
                  <motion.span className="saved" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <CheckCheck size={18} /> Kaydedildi
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
