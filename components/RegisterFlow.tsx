'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Gift, KeyRound, Loader2, Star, Trees, Tv, Volume2 } from 'lucide-react';
import Crest from './Crest';
import LocationPicker, { type LatLng } from './LocationPicker';
import PhotoPicker, { type PickedPhoto } from './PhotoPicker';
import { FanBadge, KindIcon } from './bits';
import { HookahIcon, LogoMark, PintIcon, PitchLines, TvIllustration } from './art';
import { checkCode, demoMode, normalizeCode, registerCafe } from '@/lib/db';
import { toCover, toPhoto } from '@/lib/images';
import { scenes } from '@/lib/scenes';
import { cities, cityById, districtById, districtName } from '@/lib/places';
import { BIG4, team, type BigTeam } from '@/lib/teams';
import { CAFE_KINDS, plans, TRIAL_DAYS, type Cafe, type CafeKind, type PlanId } from '@/lib/types';

const STEPS = ['Hesap', 'Mekan', 'Konum', 'Ortam', 'Üyelik'] as const;

type CodeState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; days: number; plan: PlanId }
  | { status: 'bad'; reason: string };

interface Form {
  email: string;
  password: string;
  name: string;
  kind: CafeKind;
  city: string;
  district: string;
  address: string;
  phone: string;
  loc: LatLng;
  locTouched: boolean;
  capacity: string;
  screens: string;
  bigScreen: boolean;
  alcohol: boolean;
  hookah: boolean;
  garden: boolean;
  priceMin: string;
  priceMax: string;
  fanOf: BigTeam | null;
  plan: PlanId;
}

const initial: Form = {
  email: '',
  password: '',
  name: '',
  kind: 'Kafe',
  city: 'istanbul',
  district: 'kadikoy',
  address: '',
  phone: '',
  loc: { lat: 40.99, lng: 29.029 },
  locTouched: false,
  capacity: '',
  screens: '',
  bigScreen: false,
  alcohol: false,
  hookah: false,
  garden: false,
  priceMin: '',
  priceMax: '',
  fanOf: null,
  plan: 'standart',
};

export default function RegisterFlow({ weekMatchCount }: { weekMatchCount: number }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [f, setF] = useState<Form>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [done, setDone] = useState<Cafe | null>(null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeState, setCodeState] = useState<CodeState>({ status: 'idle' });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const coverPhoto = photos.find((p) => p.id === coverId) ?? photos[0] ?? null;

  async function addPhotos(files: File[]) {
    const added: PickedPhoto[] = [];
    for (const file of files) added.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, data: await toPhoto(file) });
    setPhotos((p) => [...p, ...added]);
    setCoverId((c) => c ?? added[0]?.id ?? null);
  }

  async function applyCode() {
    if (code.length < 13) return;
    setCodeState({ status: 'checking' });
    try {
      const r = await checkCode(code);
      if (r.ok) {
        setCodeState({ status: 'ok', days: r.days, plan: r.plan });
        set('plan', r.plan);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ['#1e7a4c', '#e2b54a', '#ffffff'], disableForReducedMotion: true });
      } else setCodeState({ status: 'bad', reason: r.reason });
    } catch {
      setCodeState({ status: 'bad', reason: 'Kod şu an kontrol edilemedi, tekrar dene.' });
    }
  }

  // İlçe değişince, kullanıcı elle konum seçmediyse iğneyi ilçe merkezine taşı
  useEffect(() => {
    const d = districtById(f.city, f.district);
    if (d && !f.locTouched) setF((p) => ({ ...p, loc: { lat: d.center[0], lng: d.center[1] } }));
  }, [f.city, f.district, f.locTouched]);

  function validate(s: number): string | null {
    if (s === 0) {
      if (!/^\S+@\S+\.\S+$/.test(f.email)) return 'Geçerli bir e-posta yaz.';
      if (f.password.length < 6) return 'Şifre en az 6 karakter olmalı.';
    }
    if (s === 1) {
      if (f.name.trim().length < 2) return 'Mekanının adını yaz.';
      if (f.address.trim().length < 5) return 'Adresi yaz (sokak, numara).';
      if (f.phone.replace(/\D/g, '').length < 10) return 'WhatsApp numarası eksik görünüyor.';
    }
    if (s === 3) {
      if (!(Number(f.capacity) > 0)) return 'Kaç kişilik yerin olduğunu yaz.';
      if (!(Number(f.priceMin) > 0) || Number(f.priceMax) < Number(f.priceMin)) return 'Kişi başı harcama aralığını kontrol et.';
    }
    return null;
  }

  function go(d: number) {
    if (d > 0) {
      const err = validate(step);
      if (err) return setError(err);
    }
    setError(null);
    setDir(d);
    setStep((s) => s + d);
  }

  async function finish() {
    setBusy(true);
    setError(null);
    const digits = f.phone.replace(/\D/g, '');
    try {
      // Kapak ilk sırada gitsin: kayıtta ilk fotoğraf kapak olarak işaretlenir
      const ordered = coverPhoto ? [coverPhoto, ...photos.filter((p) => p !== coverPhoto)] : photos;
      const extras = {
        code: codeState.status === 'ok' ? code : undefined,
        photos: ordered.map((p) => p.data),
        cover: coverPhoto ? await toCover(coverPhoto.data) : null,
      };
      const cafe = await registerCafe(f.email.trim(), f.password, {
        name: f.name.trim(),
        kind: f.kind,
        city: f.city,
        district: f.district,
        address: f.address.trim(),
        lat: f.loc.lat,
        lng: f.loc.lng,
        phone: digits.startsWith('90') ? digits : `90${digits.replace(/^0/, '')}`,
        capacity: Math.round(Number(f.capacity)),
        screens: f.screens.trim() || 'TV',
        features: { bigScreen: f.bigScreen, alcohol: f.alcohol, hookah: f.hookah, garden: f.garden },
        priceMin: Math.round(Number(f.priceMin)),
        priceMax: Math.round(Number(f.priceMax)),
        fanOf: f.fanOf,
        plan: f.plan,
      }, extras);
      setDone(cafe);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Welcome cafe={done} />;

  const cityInfo = cityById(f.city)!;

  return (
    <div className="container reg-layout">
      <aside className="card reg-aside">
        <div className="aside-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={scenes.pub.photo} alt="Pub’da maç izleyen taraftarlar" />
          <a className="photo-credit" href={scenes.pub.source} target="_blank" rel="noopener noreferrer">
            Foto: {scenes.pub.credit}, {scenes.pub.license}
          </a>
        </div>
        <h1>Mekanını taraftara göster.</h1>
        <p>Maç günü masalarını doldurmak için kayıt ol, vereceğin maçları işaretle, rezervasyonları panelinden takip et.</p>
        <div className="stat-row">
          <div className="stat">
            <b>{weekMatchCount}</b>
            <span>maç bu hafta</span>
          </div>
          <div className="stat">
            <b>{TRIAL_DAYS} gün</b>
            <span>ücretsiz deneme</span>
          </div>
        </div>
        <div className="pick-label" style={{ marginTop: 22 }}>Taraftar seni böyle görecek</div>
        <Preview f={f} cover={coverPhoto?.data ?? null} />
      </aside>

      <section className="card reg-main">
        <div className="progress" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s}>
              <motion.i initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ duration: 0.4, ease: [0.2, 0.7, 0.3, 1] }} />
            </span>
          ))}
        </div>
        <div className="step-meta">
          <span>
            Adım {step + 1} / {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>

        {demoMode && step === 0 && (
          <div className="demo-banner">
            <Gift size={18} style={{ flex: 'none', marginTop: 1 }} />
            <span>Demo modu: Firebase bağlı değil, kayıt sadece bu tarayıcıda saklanır. .env.local doldurulunca gerçek hesaplar açılır.</span>
          </div>
        )}

        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -40, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.7, 0.3, 1] }}
          >
            {step === 0 && (
              <>
                <h2 className="step-title">Önce hesabını açalım</h2>
                <p className="step-desc">Bu bilgilerle mekan paneline gireceksin.</p>
                <div className="field">
                  <label htmlFor="email">E-posta</label>
                  <input id="email" className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="isletme@ornek.com" />
                </div>
                <div className="field">
                  <label htmlFor="pass">Şifre</label>
                  <div style={{ position: 'relative' }}>
                    <input id="pass" className="input" type={showPass ? 'text' : 'password'} autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="En az 6 karakter" />
                    <button type="button" className="icon-btn" style={{ position: 'absolute', right: 5, top: 5 }} onClick={() => setShowPass((s) => !s)} aria-label={showPass ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="step-title">Mekanını tanıt</h2>
                <p className="step-desc">Taraftarların listede göreceği temel bilgiler.</p>
                <div className="field">
                  <label htmlFor="name">Mekan adı</label>
                  <input id="name" className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="ör. Moda Köşe Pub" />
                </div>
                <div className="field">
                  <span className="label">Mekan türü</span>
                  <div className="opt-grid">
                    {CAFE_KINDS.map((k) => (
                      <motion.button key={k} type="button" className="opt" aria-pressed={f.kind === k} onClick={() => set('kind', k)} whileTap={{ scale: 0.95 }}>
                        <KindIcon kind={k} size={24} />
                        {k}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div className="row-2">
                  <div className="field">
                    <label htmlFor="city">Şehir</label>
                    <select
                      id="city"
                      className="input"
                      value={f.city}
                      onChange={(e) => setF((p) => ({ ...p, city: e.target.value, district: cityById(e.target.value)!.districts[0].id, locTouched: false }))}
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="district">İlçe</label>
                    <select id="district" className="input" value={f.district} onChange={(e) => setF((p) => ({ ...p, district: e.target.value, locTouched: false }))}>
                      {cityInfo.districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="address">Adres</label>
                  <input id="address" className="input" value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Sokak, numara, mahalle" />
                </div>
                <div className="field">
                  <label htmlFor="phone">WhatsApp numarası</label>
                  <input id="phone" className="input" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="05xx xxx xx xx" />
                  <span className="hint">Taraftarlar rezervasyondan sonra bu numaraya yazabilir.</span>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="step-title">Haritada neredesin?</h2>
                <p className="step-desc">Taraftar yol tarifini buradan alacak, iğnenin kapının önünde olduğundan emin ol.</p>
                <LocationPicker value={f.loc} onChange={(v) => setF((p) => ({ ...p, loc: v, locTouched: true }))} />
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="step-title">Maç ortamın nasıl?</h2>
                <p className="step-desc">Filtrelerde bu bilgiler kullanılır, dürüst olmak puan kazandırır.</p>
                <div className="row-3">
                  <div className="field">
                    <label htmlFor="cap">Kapasite</label>
                    <input id="cap" className="input" type="number" min={1} inputMode="numeric" value={f.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="ör. 80" />
                  </div>
                  <div className="field">
                    <label htmlFor="pmin">Kişi başı en az</label>
                    <input id="pmin" className="input" type="number" min={0} inputMode="numeric" value={f.priceMin} onChange={(e) => set('priceMin', e.target.value)} placeholder="TL" />
                  </div>
                  <div className="field">
                    <label htmlFor="pmax">Kişi başı en çok</label>
                    <input id="pmax" className="input" type="number" min={0} inputMode="numeric" value={f.priceMax} onChange={(e) => set('priceMax', e.target.value)} placeholder="TL" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="screens">Ekranlar</label>
                  <input id="screens" className="input" value={f.screens} onChange={(e) => set('screens', e.target.value)} placeholder="ör. 3 TV + projeksiyon" />
                </div>
                <div className="toggle-list" style={{ marginBottom: 18 }}>
                  <Toggle icon={<Tv size={18} />} label="Dev ekran / projeksiyon" on={f.bigScreen} set={(v) => set('bigScreen', v)} />
                  <Toggle icon={<PintIcon size={18} />} label="Alkol servisi" on={f.alcohol} set={(v) => set('alcohol', v)} />
                  <Toggle icon={<HookahIcon size={18} />} label="Nargile" on={f.hookah} set={(v) => set('hookah', v)} />
                  <Toggle icon={<Trees size={18} />} label="Bahçe / açık alan" on={f.garden} set={(v) => set('garden', v)} />
                </div>
                <div className="field">
                  <span className="label">Taraftar mekanı mısın?</span>
                  <span className="hint" style={{ marginTop: -2 }}>Seçersen o takımın maçlarında taraftarlar seni üst sıralarda görür.</span>
                  <div className="opt-grid" style={{ marginTop: 6 }}>
                    <motion.button type="button" className="opt" aria-pressed={f.fanOf === null} onClick={() => set('fanOf', null)} whileTap={{ scale: 0.95 }}>
                      <span style={{ height: 34, display: 'grid', placeItems: 'center', fontSize: 22 }}>–</span>
                      Herkese açık
                    </motion.button>
                    {BIG4.map((t) => (
                      <motion.button key={t} type="button" className="opt" aria-pressed={f.fanOf === t} onClick={() => set('fanOf', t)} whileTap={{ scale: 0.95 }}>
                        <motion.span animate={f.fanOf === t ? { rotate: [0, -12, 10, 0], scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.5 }} style={{ display: 'grid' }}>
                          <Crest id={t} size={30} />
                        </motion.span>
                        {team(t).name}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div className="field" style={{ marginTop: 6 }}>
                  <span className="label">Mekanından fotoğraflar</span>
                  <span className="hint" style={{ marginTop: -2 }}>
                    Ekranlar, salon, bahçe… Taraftarlar listede kapağı, mekan sayfanda hepsini görür. Sonradan panelden de ekleyebilirsin.
                  </span>
                  <div style={{ marginTop: 8 }}>
                    <PhotoPicker
                      photos={photos}
                      coverId={coverPhoto?.id ?? null}
                      onAdd={addPhotos}
                      onRemove={(id) => setPhotos((p) => p.filter((x) => x.id !== id))}
                      onCover={setCoverId}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="step-title">Üyeliğini seç</h2>
                <p className="step-desc">Sadece anlaşmalı mekanlar sitede listelenir. Aktivasyon kodun varsa önce onu gir.</p>

                <motion.div className={`code-box${codeState.status === 'ok' ? ' ok' : ''}`} layout animate={codeState.status === 'bad' ? { x: [0, -8, 7, -4, 0] } : { x: 0 }} transition={{ duration: 0.35 }}>
                  <AnimatePresence mode="wait" initial={false}>
                    {codeState.status === 'ok' ? (
                      <motion.div key="gift" className="code-gift" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        <motion.span className="ic" initial={{ rotate: -30, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
                          <Gift size={24} />
                        </motion.span>
                        <span style={{ flex: 1 }}>
                          <span className="big">{codeState.days >= 365 ? `${Math.round(codeState.days / 365)} yıl` : `${codeState.days} gün`} ücretsiz!</span>
                          <span className="muted" style={{ fontSize: 14 }}>
                            <b>{code}</b> kodu ile {plans[codeState.plan].name} üyelik. Kart bilgisi yok, ödeme yok.
                          </span>
                        </span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCodeState({ status: 'idle' })}>
                          Kaldır
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="entry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <label htmlFor="act-code" className="label" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                          <KeyRound size={16} /> Aktivasyon kodun var mı?
                        </label>
                        <div className="code-row">
                          <input
                            id="act-code"
                            className={`input${codeState.status === 'bad' ? ' err' : ''}`}
                            value={code}
                            onChange={(e) => {
                              setCode(normalizeCode(e.target.value));
                              if (codeState.status === 'bad') setCodeState({ status: 'idle' });
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && applyCode()}
                            placeholder="MAC-XXXX-XXXX"
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <button type="button" className="btn btn-primary" onClick={applyCode} disabled={codeState.status === 'checking' || code.length < 13} style={{ height: 48 }}>
                            {codeState.status === 'checking' ? <Loader2 size={17} className="spin" /> : 'Uygula'}
                          </button>
                        </div>
                        {codeState.status === 'bad' && (
                          <p className="hint" style={{ color: 'var(--danger)', marginTop: 8 }}>
                            {codeState.reason}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <AnimatePresence initial={false}>
                  {codeState.status !== 'ok' && (
                    <motion.div key="plans" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div className="plans">
                  {(Object.keys(plans) as PlanId[]).map((id) => {
                    const p = plans[id];
                    const on = f.plan === id;
                    return (
                      <motion.button key={id} type="button" className={`plan-card${id === 'pro' ? ' pro' : ''}`} aria-pressed={on} onClick={() => set('plan', id)} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
                        <AnimatePresence>
                          {on && (
                            <motion.span className="plan-check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                              <Check size={16} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                        <h3>
                          {p.name} {id === 'pro' && <Star size={16} fill="var(--gold)" color="var(--gold)" />}
                        </h3>
                        <span className="muted" style={{ fontSize: 14 }}>{p.tagline}</span>
                        <div className="plan-price">
                          {new Intl.NumberFormat('tr-TR').format(p.price)} TL <small>/ ay</small>
                        </div>
                        <ul>
                          {p.perks.map((k) => (
                            <li key={k}>
                              <Check size={15} /> {k}
                            </li>
                          ))}
                        </ul>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="trial-note">
                  <Gift size={18} style={{ flex: 'none', marginTop: 2 }} />
                  <span>
                    İlk <b>{TRIAL_DAYS} gün ücretsiz</b>. Şimdi kart bilgisi istemiyoruz; deneme bitmeden ödeme bağlantısı e-postana gelir. Ödemezsen
                    mekanın sadece listeden kalkar.
                  </span>
                </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div className="form-error" style={{ marginTop: 16 }} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="step-nav">
          {step > 0 ? (
            <button className="btn btn-ghost" onClick={() => go(-1)} disabled={busy}>
              <ArrowLeft size={16} /> Geri
            </button>
          ) : (
            <Link href="/giris" className="btn btn-ghost">
              Zaten üyeyim
            </Link>
          )}
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => go(1)}>
              Devam <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={finish} disabled={busy}>
              {busy ? 'Kaydediliyor…' : codeState.status === 'ok' ? 'Ücretsiz üyeliği başlat' : `${TRIAL_DAYS} günlük denemeyi başlat`}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Toggle({ icon, label, on, set }: { icon: React.ReactNode; label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="toggle-row" onClick={() => set(!on)}>
      <span className="tl">
        <span className="ic">{icon}</span>
        {label}
      </span>
      <button type="button" className="switch" role="switch" aria-checked={on} aria-label={label} onClick={(e) => (e.stopPropagation(), set(!on))}>
        <motion.i layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} style={{ left: on ? 21 : 3 }} />
      </button>
    </div>
  );
}

function Preview({ f, cover }: { f: Form; cover: string | null }) {
  const pills = useMemo(
    () =>
      [
        f.bigScreen && { k: 'tv', icon: <Tv size={14} />, t: 'Dev ekran' },
        f.alcohol && { k: 'alc', icon: <PintIcon size={14} />, t: 'Alkol var' },
        f.hookah && { k: 'hk', icon: <HookahIcon size={14} />, t: 'Nargile' },
        f.garden && { k: 'gd', icon: <Trees size={14} />, t: 'Bahçe' },
      ].filter(Boolean) as { k: string; icon: React.ReactNode; t: string }[],
    [f.bigScreen, f.alcohol, f.hookah, f.garden],
  );
  return (
    <motion.div layout className={`card cafe-card${f.plan === 'pro' ? ' pro' : ''}`} style={{ boxShadow: 'var(--shadow)' }}>
      <AnimatePresence initial={false}>
        {cover && (
          <motion.div key={cover.slice(-40)} className="cc-cover" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 150 }} exit={{ opacity: 0, height: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="cc-head">
        <motion.div key={f.kind} className="kind-tile" initial={{ rotate: -20, scale: 0.7 }} animate={{ rotate: 0, scale: 1 }}>
          <KindIcon kind={f.kind} />
        </motion.div>
        <div className="cc-title">
          <h3 style={{ fontSize: 16 }}>
            {f.name || 'Mekanının adı'}
            {f.plan === 'pro' && (
              <span className="badge badge-pro">
                <Star size={11} fill="currentColor" /> Öne çıkan
              </span>
            )}
          </h3>
          <p>
            {f.kind} · {districtName(f.city, f.district)}
          </p>
        </div>
      </div>
      <AnimatePresence>
        {f.fanOf && (
          <motion.div key={f.fanOf} style={{ marginTop: 10 }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <FanBadge id={f.fanOf} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="cc-pills">
        <span className="pill ok">
          <Volume2 size={14} /> Ses açık
        </span>
        <AnimatePresence>
          {pills.map((p) => (
            <motion.span key={p.k} className="pill" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
              {p.icon} {p.t}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      {f.priceMin && (
        <p className="muted" style={{ fontSize: 13.5, marginTop: 12 }}>
          Kişi başı {f.priceMin}–{f.priceMax || '…'} TL{f.capacity ? ` · ${f.capacity} kişilik` : ''}
        </p>
      )}
    </motion.div>
  );
}

function Welcome({ cafe }: { cafe: Cafe }) {
  const router = useRouter();
  const pro = cafe.plan === 'pro';

  useEffect(() => {
    const colors = cafe.fanOf ? team(cafe.fanOf).colors : ['#1e7a4c', '#e2b54a', '#ffffff'];
    const t = setTimeout(() => {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.45 }, colors, disableForReducedMotion: true });
    }, 1000);
    return () => clearTimeout(t);
  }, [cafe.fanOf]);

  const renews = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', ...(cafe.activationCode ? { year: 'numeric' as const } : {}) }).format(
    new Date(cafe.membership.renewsAt),
  );

  return (
    <div className="container" style={{ maxWidth: 620, padding: '40px 20px 70px', textAlign: 'center' }}>
      <div className="member-stage">
        <motion.div className="member-card" initial={{ rotateY: 180, y: 30, scale: 0.9 }} animate={{ rotateY: 0, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 60, damping: 12, delay: 0.2 }}>
          <div className="member-face back">
            <LogoMark size={64} />
          </div>
          <div className={`member-face front${pro ? ' pro' : ''}`}>
            <PitchLines className="pitch" />
            <motion.span className="shine" initial={{ left: '-50%' }} animate={{ left: '160%' }} transition={{ duration: 1.1, delay: 1.3, ease: 'easeInOut' }} />
            <div className="mc-row">
              <span className="mc-label">MAÇNEREDE · ANLAŞMALI MEKAN</span>
              {cafe.fanOf ? <Crest id={cafe.fanOf} size={30} /> : <LogoMark size={28} />}
            </div>
            <div className="mc-name">{cafe.name}</div>
            <div className="mc-sub">
              {plans[cafe.plan].name} üyelik · {cafe.activationCode ? `Ücretsiz, ${renews} tarihine kadar` : `Deneme ${renews}’e kadar`}
            </div>
          </div>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginTop: 22 }}>Aramıza hoş geldin!</h1>
        <p className="muted" style={{ marginTop: 8, fontSize: 16 }}>
          {cafe.name} artık taraftarlara görünüyor. Şimdi bu hafta hangi maçları vereceğini işaretle, rezervasyonlar paneline düşsün.
        </p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 22 }} onClick={() => router.push('/panel')}>
          Bu haftanın maçlarını işaretle <ArrowRight size={17} />
        </button>
        <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center' }}>
          <TvIllustration home={cafe.fanOf ?? 'gs'} away={cafe.fanOf === 'fb' ? 'gs' : 'fb'} />
        </div>
      </motion.div>
    </div>
  );
}
