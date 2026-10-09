'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarDays, Check, CreditCard, Copy, Eye, EyeOff, ExternalLink, FileUp, Inbox, KeyRound, LogOut, MessageCircle, RefreshCw, Search, ShieldCheck, Store, Trash2, UploadCloud, UserPlus } from 'lucide-react';
import Crest from './Crest';
import LocationPicker, { type LatLng } from './LocationPicker';
import { CompBadge, KindIcon } from './bits';
import { LogoMark } from './art';
import {
  CODE_DAYS,
  POPUP_BLOCKED,
  adminCreateCafe,
  adminDeleteLead,
  adminImportVenues,
  adminListCafes,
  adminListCodes,
  adminListLeads,
  adminListPayments,
  adminListVenues,
  adminSetMembership,
  adminSetVenueHidden,
  adminSignIn,
  adminUploadCodes,
  demoMode,
  listBroadcasts,
  logout,
  prepareGoogle,
  watchAdmin,
  type AdminSession,
  type MembershipPreset,
} from '@/lib/db';
import { DEFAULT_CITY, cities, cityById, districtById, districtName } from '@/lib/places';
import { BIG4, team, type BigTeam } from '@/lib/teams';
import { CAFE_KINDS, plans, type Payment, type ActivationCode, type Broadcast, type Cafe, type CafeKind, type Lead, type PlanId, type Venue } from '@/lib/types';
import { matchPath, type MatchInfo } from '@/lib/fixtures';
import { formatPhone, tl, waLink } from '@/lib/hooks';
import { bundledVenues } from '@/lib/venues';

type Tab = 'hafta' | 'mekanlar' | 'basvurular' | 'rehber' | 'yeni' | 'odemeler' | 'kodlar';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'hafta', label: 'Bu hafta', icon: <CalendarDays size={15} /> },
  { id: 'mekanlar', label: 'Mekanlar', icon: <Store size={15} /> },
  { id: 'basvurular', label: 'Başvurular', icon: <Inbox size={15} /> },
  { id: 'rehber', label: 'Rehber', icon: <BookOpen size={15} /> },
  { id: 'yeni', label: 'Yeni mekan', icon: <UserPlus size={15} /> },
  { id: 'odemeler', label: 'Ödemeler', icon: <CreditCard size={15} /> },
  { id: 'kodlar', label: 'Kodlar', icon: <KeyRound size={15} /> },
];

function friendly(e: unknown) {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/operation-not-allowed') return 'Google ile giriş kapalı. Firebase Console → Authentication → Sign-in method → Google’ı aç.';
  if (code === 'auth/unauthorized-domain') return 'Bu alan adı Firebase’de yetkili değil (Authentication → Settings → Authorized domains).';
  if (code === 'auth/popup-blocked') return POPUP_BLOCKED;
  // Panel sadece yönetici doğrulanınca açılıyor: burada reddedilme çoğunlukla canlıdaki kuralların eski kalmasıdır
  if (code === 'permission-denied') return 'Erişim reddedildi. Yönetici hesabıyla girdiysen Firestore kuralları güncel değil: firebase deploy --only firestore:rules';
  return (e as Error)?.message ?? 'Bir şeyler ters gitti.';
}

const daysLeft = (c: Cafe) => Math.max(0, Math.ceil((new Date(c.membership.renewsAt).getTime() - Date.now()) / 86400000));
const fmtDate = (iso: string) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

export default function AdminView({ matches, weekText }: { matches: MatchInfo[]; weekText: string }) {
  const [session, setSession] = useState<AdminSession | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('hafta');
  const [cafes, setCafes] = useState<Cafe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const email = session?.admin ? session.email : null;

  useEffect(() => watchAdmin(setSession), []);

  useEffect(() => {
    if (session !== undefined && !email) prepareGoogle();
  }, [session, email]);

  const loadCafes = useCallback(() => {
    adminListCafes()
      .then(setCafes)
      .catch((e) => setError(friendly(e)));
  }, []);

  useEffect(() => {
    if (email) loadCafes();
  }, [email, loadCafes]);

  if (session === undefined) return <div className="skeleton" style={{ height: 200, margin: '40px 0' }} />;

  if (!email) {
    return (
      <motion.div className="card auth-wrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <LogoMark size={40} />
        <h1 style={{ marginTop: 14 }}>Yönetim</h1>
        <p className="muted" style={{ margin: '6px 0 22px' }}>Mekanları, üyelikleri ve kodları yönetmek için yönetici Google hesabınla gir.</p>
        {session && <div className="form-error">{session.email} hesabının yönetim yetkisi yok. Yönetici hesabıyla gir.</div>}
        {error && <div className="form-error">{error}</div>}
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() =>
            adminSignIn().catch((e) => {
              if ((e as { code?: string })?.code !== 'auth/popup-closed-by-user') setError(friendly(e));
            })
          }
        >
          <ShieldCheck size={18} /> {session ? 'Başka Google hesabıyla gir' : 'Google ile giriş yap'}
        </button>
      </motion.div>
    );
  }

  return (
    <div style={{ padding: '30px 0 70px' }}>
      <div className="panel-head" style={{ paddingTop: 0 }}>
        <div>
          <span className="faint" style={{ fontSize: 14, fontWeight: 600 }}>
            Yönetim · {email}
            {demoMode && ' (demo)'}
          </span>
          <h1>Admin paneli</h1>
        </div>
        {!demoMode && (
          <button className="btn btn-soft btn-sm" onClick={() => logout()}>
            <LogOut size={15} /> Çıkış
          </button>
        )}
      </div>

      <div className="seg admin-tabs" role="tablist" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {tab === t.id && <motion.span layoutId="admin-tab" className="seg-thumb" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {t.icon} {t.label}
            </span>
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {tab === 'hafta' && <WeekTab matches={matches} weekText={weekText} cafes={cafes} />}
          {tab === 'mekanlar' && <CafesTab cafes={cafes} onChange={(c) => setCafes((all) => (all ?? []).map((x) => (x.id === c.id ? c : x)))} onReload={loadCafes} />}
          {tab === 'basvurular' && <LeadsTab />}
          {tab === 'rehber' && <VenuesTab />}
          {tab === 'yeni' && <NewCafeTab onCreated={(c) => setCafes((all) => [c, ...(all ?? [])])} />}
          {tab === 'odemeler' && <PaymentsTab />}
          {tab === 'kodlar' && <CodesTab cafes={cafes} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------- Bu hafta ----------------
function WeekTab({ matches, weekText, cafes }: { matches: MatchInfo[]; weekText: string; cafes: Cafe[] | null }) {
  const [bcs, setBcs] = useState<Broadcast[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const ids = useMemo(() => matches.map((m) => m.id), [matches]);

  useEffect(() => {
    listBroadcasts(ids).then(setBcs).catch(() => setBcs([]));
  }, [ids]);

  const byId = useMemo(() => new Map((cafes ?? []).map((c) => [c.id, c])), [cafes]);

  return (
    <>
      <div className="stats">
        <div className="card stat-tile hl">
          <b>{matches.length}</b>
          <span>Maç ({weekText})</span>
        </div>
        <div className="card stat-tile">
          <b>{bcs ? new Set(bcs.map((b) => b.cafeId)).size : '…'}</b>
          <span>Yayın veren mekan</span>
        </div>
        <div className="card stat-tile">
          <b>{bundledVenues.length}</b>
          <span>Rehber mekanı</span>
        </div>
      </div>

      <section className="card panel-card">
        <h2>Bu haftanın maçları</h2>
        <p>Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor · satıra tıkla, maçı veren mekanları gör.</p>
        {matches.length === 0 && <p className="faint">Bu hafta maç yok.</p>}
        {matches.map((m) => {
          const mb = (bcs ?? []).filter((b) => b.matchId === m.id);
          const isOpen = open === m.id;
          return (
            <div key={m.id} className={`bc-row${isOpen ? ' on' : ''}`} style={m.finished ? { opacity: 0.6 } : undefined}>
              <button className="bc-head admin-match" onClick={() => setOpen(isOpen ? null : m.id)} aria-expanded={isOpen}>
                <Crest id={m.home} size={28} />
                <Crest id={m.away} size={28} />
                <div className="info">
                  <b>
                    {team(m.home).name} – {team(m.away).name}
                  </b>
                  <span>
                    {m.day} {m.dateText} · {m.time ?? 'saat ?'} {m.finished ? '· oynandı' : ''}
                  </span>
                </div>
                <CompBadge comp={m.comp} />
                <span className="admin-nums">
                  <b>{bcs ? mb.length : '…'}</b> anlaşmalı mekan
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div className="bc-body">
                      {mb.length === 0 ? (
                        <p className="faint" style={{ fontSize: 14, paddingTop: 10 }}>Bu maçı veren mekan yok.</p>
                      ) : (
                        mb.map((b) => {
                          const c = byId.get(b.cafeId);
                          return (
                            <div key={b.cafeId} className="res-item">
                              <div className="who">
                                <b>{c?.name ?? 'Bilinmeyen mekan'}</b>
                                <span>
                                  {c ? `${cityById(c.city)?.name} / ${districtName(c.city, c.district)}` : ''} {b.sound ? '· ses açık' : ''} {b.entryFee ? `· giriş ${tl(b.entryFee)}` : ''}
                                </span>
                              </div>
                              <Link className="btn btn-ghost btn-sm" href={`/kafe/${b.cafeId}`}>
                                Sayfası
                              </Link>
                            </div>
                          );
                        })
                      )}
                      <Link className="btn btn-soft btn-sm" style={{ marginTop: 10 }} href={matchPath(m, DEFAULT_CITY)}>
                        <ExternalLink size={14} /> Maç sayfası
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </section>
    </>
  );
}

// ---------------- Mekanlar ----------------
type CafeFilter = 'all' | 'active' | 'trial' | 'code' | 'off';

function statusOf(c: Cafe) {
  const left = daysLeft(c);
  if (c.membership.status === 'canceled') return { t: 'Askıda', cls: 'off' };
  if (c.membership.status === 'past_due') return { t: 'Ödeme bekliyor', cls: 'warn' };
  if (c.membership.status === 'trial' && left === 0) return { t: 'Süresi doldu', cls: 'off' };
  if (c.membership.status === 'active') return { t: `Aktif · ${left} gün`, cls: 'ok' };
  const length = (new Date(c.membership.renewsAt).getTime() - new Date(c.membership.startedAt).getTime()) / 86400000;
  const label = c.activationCode ? 'Kodlu' : length > 30 ? 'Ücretsiz' : 'Deneme';
  return { t: `${label} · ${left} gün`, cls: 'ok' };
}

function CafesTab({ cafes, onChange, onReload }: { cafes: Cafe[] | null; onChange: (c: Cafe) => void; onReload: () => void }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<CafeFilter>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr-TR');
    return (cafes ?? []).filter((c) => {
      if (term && !`${c.name} ${c.address} ${districtName(c.city, c.district)}`.toLocaleLowerCase('tr-TR').includes(term)) return false;
      const listed = c.membership.status === 'active' || (c.membership.status === 'trial' && daysLeft(c) > 0);
      if (filter === 'active') return c.membership.status === 'active';
      if (filter === 'trial') return c.membership.status === 'trial' && !c.activationCode && listed;
      if (filter === 'code') return !!c.activationCode;
      if (filter === 'off') return !listed;
      return true;
    });
  }, [cafes, q, filter]);

  async function act(c: Cafe, preset: MembershipPreset | null, plan?: PlanId) {
    if (preset === 'cancel' && !confirm(`${c.name} askıya alınsın mı? Sitede görünmez olur.`)) return;
    setBusy(c.id);
    try {
      const next = await adminSetMembership(c, preset, plan);
      onChange(next);
      setFlash(c.id);
      setTimeout(() => setFlash((f) => (f === c.id ? null : f)), 1500);
    } catch (e) {
      alert(friendly(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card panel-card">
      <div className="admin-toolbar">
        <h2 style={{ marginRight: 'auto' }}>Mekanlar {cafes && <span className="faint">({cafes.length})</span>}</h2>
        <div className="admin-search">
          <Search size={16} />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mekan, adres, ilçe ara" />
        </div>
        <button className="icon-btn" onClick={onReload} aria-label="Yenile" title="Yenile">
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="chips" style={{ margin: '12px 0 6px' }}>
        {(
          [
            ['all', 'Hepsi'],
            ['active', 'Aktif (ödeyen)'],
            ['trial', 'Deneme'],
            ['code', 'Kodlu'],
            ['off', 'Listede değil'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {l}
          </button>
        ))}
      </div>

      {cafes === null ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : shown.length === 0 ? (
        <p className="faint" style={{ padding: '16px 0' }}>Bu filtrede mekan yok.</p>
      ) : (
        <div className="admin-cafes">
          <AnimatePresence initial={false}>
            {shown.map((c) => {
              const st = statusOf(c);
              return (
                <motion.div key={c.id} layout className={`admin-cafe${flash === c.id ? ' flash' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="ac-main">
                    <span className="kind-tile ac-thumb">
                      {c.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.cover} alt="" />
                      ) : (
                        <KindIcon kind={c.kind} />
                      )}
                    </span>
                    <div className="ac-info">
                      <b>
                        {c.name} {c.fanOf && <Crest id={c.fanOf} size={16} />}
                      </b>
                      <span>
                        {cityById(c.city)?.name} / {districtName(c.city, c.district)} · {c.kind} · kayıt {fmtDate(c.createdAt)}
                        {c.activationCode ? ` · ${c.activationCode}` : ''}
                      </span>
                    </div>
                    <span className={`ac-status ${st.cls}`}>{st.t}</span>
                    <div className="seg ac-plan">
                      {(['standart', 'pro'] as PlanId[]).map((p) => (
                        <button key={p} aria-pressed={c.plan === p} disabled={busy === c.id} onClick={() => c.plan !== p && act(c, null, p)}>
                          {c.plan === p && <motion.span layoutId={`plan-${c.id}`} className="seg-thumb" />}
                          {plans[p].name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ac-actions">
                    <button className="btn btn-primary btn-sm" disabled={busy === c.id} onClick={() => act(c, 'month')}>
                      +1 ay aktif
                    </button>
                    <button className="btn btn-soft btn-sm" disabled={busy === c.id} onClick={() => act(c, 'year')}>
                      1 yıl ücretsiz
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={busy === c.id} onClick={() => act(c, 'trial')}>
                      14 gün deneme
                    </button>
                    <button className="btn btn-ghost btn-sm danger" disabled={busy === c.id || c.membership.status === 'canceled'} onClick={() => act(c, 'cancel')}>
                      Askıya al
                    </button>
                    <Link className="btn btn-ghost btn-sm" href={`/kafe/${c.id}`}>
                      <ExternalLink size={14} /> Sayfası
                    </Link>
                    <span className="faint" style={{ fontSize: 12.5, marginLeft: 'auto' }}>
                      Bitiş: {fmtDate(c.membership.renewsAt)} · WhatsApp +{c.phone}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

// ---------------- Yeni mekan hesabı ----------------
function makePassword() {
  const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint32Array(10);
  crypto.getRandomValues(buf);
  return [...buf].map((n) => a[n % a.length]).join('');
}

const PRESETS: { id: Exclude<MembershipPreset, 'cancel'>; label: string; desc: string }[] = [
  { id: 'year', label: '1 yıl ücretsiz', desc: 'Anlaşmalı mekan, kod gibi' },
  { id: 'month', label: '1 ay aktif', desc: 'Ödemesi alındı' },
  { id: 'trial', label: '14 gün deneme', desc: 'Önce denesin' },
];

function NewCafeTab({ onCreated }: { onCreated: (c: Cafe) => void }) {
  const [f, setF] = useState({
    email: '',
    password: '',
    name: '',
    kind: 'Kafe' as CafeKind,
    city: 'istanbul',
    district: 'kadikoy',
    address: '',
    phone: '',
    capacity: '',
    priceMin: '',
    priceMax: '',
    screens: '',
    bigScreen: false,
    alcohol: false,
    hookah: false,
    garden: false,
    fanOf: null as BigTeam | null,
    plan: 'standart' as PlanId,
    preset: 'year' as Exclude<MembershipPreset, 'cancel'>,
  });
  const [loc, setLoc] = useState<LatLng>({ lat: 40.99, lng: 29.029 });
  const [locTouched, setLocTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ cafe: Cafe; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => setF((p) => ({ ...p, password: p.password || makePassword() })), []);
  useEffect(() => {
    const d = districtById(f.city, f.district);
    if (d && !locTouched) setLoc({ lat: d.center[0], lng: d.center[1] });
  }, [f.city, f.district, locTouched]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const digits = f.phone.replace(/\D/g, '');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError('Geçerli bir e-posta yaz.');
    if (f.name.trim().length < 2) return setError('Mekan adını yaz.');
    if (digits.length < 10) return setError('WhatsApp numarası eksik görünüyor.');
    if (!(Number(f.capacity) > 0)) return setError('Kapasiteyi yaz.');
    setBusy(true);
    try {
      const cafe = await adminCreateCafe(
        f.email.trim(),
        f.password,
        {
          name: f.name.trim(),
          kind: f.kind,
          city: f.city,
          district: f.district,
          address: f.address.trim() || districtName(f.city, f.district),
          lat: loc.lat,
          lng: loc.lng,
          phone: digits.startsWith('90') ? digits : `90${digits.replace(/^0/, '')}`,
          capacity: Math.round(Number(f.capacity)),
          screens: f.screens.trim() || 'TV',
          features: { bigScreen: f.bigScreen, alcohol: f.alcohol, hookah: f.hookah, garden: f.garden },
          priceMin: Math.round(Number(f.priceMin) || 0),
          priceMax: Math.round(Number(f.priceMax) || Number(f.priceMin) || 0),
          fanOf: f.fanOf,
          plan: f.plan,
        },
        f.preset,
      );
      onCreated(cafe);
      setDone({ cafe, email: f.email.trim(), password: f.password });
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const loginUrl = `${window.location.origin}/giris`;
    const msg = `Merhaba ${done.cafe.name}, NeredeMaç mekan hesabınız açıldı.\nGiriş: ${loginUrl}\nE-posta: ${done.email}\nŞifre: ${done.password}\nGirişten sonra panelden maçlarınızı ve fotoğraflarınızı ekleyebilirsiniz.`;
    return (
      <motion.section className="card panel-card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="code-gift" style={{ marginBottom: 16 }}>
          <motion.span className="ic" initial={{ rotate: -30, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
            <Check size={24} />
          </motion.span>
          <span>
            <span className="big">{done.cafe.name} hesabı açıldı</span>
            <span className="muted" style={{ fontSize: 14 }}>
              Bu bilgileri mekana gönder. Şifreyi daha sonra “Şifremi unuttum” ile kendisi değiştirebilir.
            </span>
          </span>
        </div>
        <pre className="cred-box">{msg}</pre>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button
            className="btn btn-primary"
            onClick={async () => {
              await navigator.clipboard.writeText(msg).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Kopyalandı' : 'Bilgileri kopyala'}
          </button>
          <a className="btn btn-wa" href={`https://wa.me/${done.cafe.phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} /> WhatsApp’tan gönder
          </a>
          <button className="btn btn-ghost" onClick={() => setDone(null)}>
            Yeni mekan ekle
          </button>
        </div>
      </motion.section>
    );
  }

  const cityInfo = cityById(f.city)!;
  return (
    <form className="card panel-card" onSubmit={submit}>
      <h2>Mekan adına hesap aç</h2>
      <p>Anlaştığın mekanın hesabını buradan aç; mekan bu e-posta ve şifreyle “Mekan girişi”nden panele girer.</p>

      <div className="row-2">
        <div className="field">
          <label htmlFor="n-email">Mekanın e-postası</label>
          <input id="n-email" className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="mekan@ornek.com" />
        </div>
        <div className="field">
          <label htmlFor="n-pass">Geçici şifre</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input id="n-pass" className="input" value={f.password} onChange={(e) => set('password', e.target.value)} style={{ fontFamily: 'ui-monospace, monospace' }} />
            <button type="button" className="icon-btn" style={{ width: 48, height: 48, borderRadius: 14, flex: 'none' }} onClick={() => set('password', makePassword())} aria-label="Yeni şifre üret" title="Yeni şifre üret">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="row-2">
        <div className="field">
          <label htmlFor="n-name">Mekan adı</label>
          <input id="n-name" className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="ör. Moda Köşe Pub" />
        </div>
        <div className="field">
          <label htmlFor="n-kind">Tür</label>
          <select id="n-kind" className="input" value={f.kind} onChange={(e) => set('kind', e.target.value as CafeKind)}>
            {CAFE_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="row-3">
        <div className="field">
          <label htmlFor="n-city">Şehir</label>
          <select
            id="n-city"
            className="input"
            value={f.city}
            onChange={(e) => {
              setLocTouched(false);
              setF((p) => ({ ...p, city: e.target.value, district: cityById(e.target.value)!.districts[0].id }));
            }}
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="n-dist">İlçe</label>
          <select
            id="n-dist"
            className="input"
            value={f.district}
            onChange={(e) => {
              setLocTouched(false);
              set('district', e.target.value);
            }}
          >
            {cityInfo.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="n-phone">WhatsApp</label>
          <input id="n-phone" className="input" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="05xx xxx xx xx" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="n-addr">Adres</label>
        <input id="n-addr" className="input" value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Sokak, numara, mahalle" />
      </div>

      <div className="row-3">
        <div className="field">
          <label htmlFor="n-cap">Kapasite</label>
          <input id="n-cap" className="input" type="number" min={1} value={f.capacity} onChange={(e) => set('capacity', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="n-pmin">Kişi başı en az (TL)</label>
          <input id="n-pmin" className="input" type="number" min={0} value={f.priceMin} onChange={(e) => set('priceMin', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="n-pmax">Kişi başı en çok (TL)</label>
          <input id="n-pmax" className="input" type="number" min={0} value={f.priceMax} onChange={(e) => set('priceMax', e.target.value)} />
        </div>
      </div>

      <div className="row-2">
        <div className="field">
          <label htmlFor="n-screens">Ekranlar</label>
          <input id="n-screens" className="input" value={f.screens} onChange={(e) => set('screens', e.target.value)} placeholder="ör. 3 TV + projeksiyon" />
        </div>
        <div className="field">
          <label htmlFor="n-fan">Taraftar mekanı</label>
          <select id="n-fan" className="input" value={f.fanOf ?? ''} onChange={(e) => set('fanOf', (e.target.value || null) as BigTeam | null)}>
            <option value="">Herkese açık</option>
            {BIG4.map((t) => (
              <option key={t} value={t}>
                {team(t).name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        {(
          [
            ['bigScreen', 'Dev ekran'],
            ['alcohol', 'Alkol var'],
            ['hookah', 'Nargile'],
            ['garden', 'Açık alan'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={f[k]} onClick={() => set(k, !f[k])}>
            {l}
          </button>
        ))}
      </div>

      <div className="field">
        <span className="label">Konum</span>
        <LocationPicker
          value={loc}
          onChange={(v) => {
            setLoc(v);
            setLocTouched(true);
          }}
        />
      </div>

      <div className="field">
        <span className="label">Üyelik</span>
        <div className="opt-grid">
          {PRESETS.map((p) => (
            <motion.button key={p.id} type="button" className="opt" aria-pressed={f.preset === p.id} onClick={() => set('preset', p.id)} whileTap={{ scale: 0.96 }}>
              <b style={{ color: 'var(--text)' }}>{p.label}</b>
              <small style={{ fontWeight: 500 }}>{p.desc}</small>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Plan</span>
        <div className="seg" style={{ width: 'fit-content' }}>
          {(['standart', 'pro'] as PlanId[]).map((p) => (
            <button key={p} type="button" aria-pressed={f.plan === p} onClick={() => set('plan', p)}>
              {f.plan === p && <motion.span layoutId="new-plan" className="seg-thumb" />}
              {plans[p].name}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      <button className="btn btn-primary btn-lg" disabled={busy}>
        <UserPlus size={18} /> {busy ? 'Hesap açılıyor…' : 'Mekan hesabını aç'}
      </button>
    </form>
  );
}

// ---------------- Kodlar ----------------
const CODE_RE = /MAC-[A-Z2-9]{4}-[A-Z2-9]{4}/g;

function CodesTab({ cafes }: { cafes: Cafe[] | null }) {
  const [codes, setCodes] = useState<ActivationCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'free' | 'used'>('all');
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setCodes(await adminListCodes());
      setError(null);
    } catch (e) {
      setError(friendly(e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const names = useMemo(() => new Map((cafes ?? []).map((c) => [c.id, c.name])), [cafes]);
  const shown = useMemo(() => (codes ?? []).filter((c) => (filter === 'all' ? true : filter === 'used' ? c.used : !c.used)), [codes, filter]);
  const usedCount = (codes ?? []).filter((c) => c.used).length;

  async function readFile(file: File | undefined) {
    if (!file) return;
    const found = [...new Set((await file.text()).toUpperCase().match(CODE_RE) ?? [])];
    setPending(found);
    setNotice(found.length ? null : 'Dosyada MAC-XXXX-XXXX biçiminde kod bulunamadı.');
  }

  async function upload() {
    setBusy(true);
    setNotice(null);
    try {
      const n = await adminUploadCodes(pending);
      setNotice(`${n} yeni kod yüklendi${pending.length - n ? `, ${pending.length - n} tanesi zaten vardı` : ''}.`);
      setPending([]);
      if (fileRef.current) fileRef.current.value = '';
      await refresh();
    } catch (e) {
      setNotice(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1400);
  }

  if (error) return <div className="form-error">{error}</div>;

  return (
    <>
      <div className="stats">
        <div className="card stat-tile">
          <b>{codes?.length ?? '…'}</b>
          <span>Toplam kod</span>
        </div>
        <div className="card stat-tile hl">
          <b>{codes ? codes.length - usedCount : '…'}</b>
          <span>Boşta (gönderilebilir)</span>
        </div>
        <div className="card stat-tile">
          <b>{codes ? usedCount : '…'}</b>
          <span>Kullanılan</span>
        </div>
        <div className="card stat-tile">
          <b>{Math.round(CODE_DAYS / 365)} yıl</b>
          <span>Kod başına ücretsiz süre</span>
        </div>
      </div>

      <section className="card panel-card">
        <h2>Kod yükle</h2>
        <p>kodlar.txt dosyasını seç ya da kodları aşağıya yapıştır. Firebase’de zaten olan kodlara dokunulmaz, kullanılmış kodlar sıfırlanmaz.</p>
        <textarea
          className="input"
          rows={3}
          placeholder={'MAC-XXXX-XXXX\nMAC-XXXX-XXXX\n…'}
          onChange={(e) => {
            const found = [...new Set(e.target.value.toUpperCase().match(CODE_RE) ?? [])];
            setPending(found);
            setNotice(null);
          }}
          style={{ marginBottom: 10, fontFamily: 'ui-monospace, monospace' }}
        />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <FileUp size={16} /> Dosya seç
          </button>
          <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={(e) => readFile(e.target.files?.[0])} />
          {pending.length > 0 && (
            <motion.button className="btn btn-primary" onClick={upload} disabled={busy} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <KeyRound size={16} /> {busy ? 'Yükleniyor…' : `${pending.length} kodu yükle`}
            </motion.button>
          )}
        </div>
        <AnimatePresence>
          {notice && (
            <motion.p className="trial-note" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {notice}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      <section className="card panel-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <h2>Kodlar</h2>
          <div className="chips">
            {(
              [
                ['all', 'Hepsi'],
                ['free', 'Boşta'],
                ['used', 'Kullanılan'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {codes === null ? (
          <div className="skeleton" style={{ height: 200 }} />
        ) : codes.length === 0 ? (
          <p className="faint">Henüz kod yok. Yukarıdan kodlar.txt dosyasını yükle.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Durum</th>
                  <th>Mekan</th>
                  <th>Tarih</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.code}>
                    <td>
                      <code>{c.code}</code>
                    </td>
                    <td>
                      {c.used ? (
                        <span className="badge badge-comp">Kullanıldı</span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                          Boşta
                        </span>
                      )}
                    </td>
                    <td>{c.usedBy ? names.get(c.usedBy) ?? '…' : '—'}</td>
                    <td className="faint">{c.usedAt ? fmtDate(c.usedAt) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {!c.used && (
                        <button className="icon-btn" onClick={() => copy(c.code)} aria-label="Kodu kopyala" title="Kopyala">
                          {copied === c.code ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ---------------- Ödemeler ----------------
function PaymentsTab() {
  const [list, setList] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminListPayments()
      .then(setList)
      .catch((e) => setError(friendly(e)));
  }, []);
  if (error) return <div className="form-error">{error}</div>;
  const paid = (list ?? []).filter((p) => p.status === 'paid');
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const thisMonth = paid.filter((p) => new Date(p.createdAt).getTime() >= monthStart);
  const sum = (l: Payment[]) => l.reduce((s, p) => s + p.amount, 0);
  const statusText: Record<Payment['status'], string> = { paid: 'Ödendi', pending: 'Bekliyor', failed: 'Başarısız' };

  return (
    <>
      <div className="stats">
        <div className="card stat-tile hl">
          <b>{list ? tl(sum(thisMonth)) : '…'}</b>
          <span>Bu ay tahsilat</span>
        </div>
        <div className="card stat-tile">
          <b>{list ? tl(sum(paid)) : '…'}</b>
          <span>Toplam tahsilat</span>
        </div>
        <div className="card stat-tile">
          <b>{list ? paid.length : '…'}</b>
          <span>Başarılı ödeme</span>
        </div>
        <div className="card stat-tile">
          <b>{list ? new Set(paid.map((p) => p.cafeId)).size : '…'}</b>
          <span>Ödeyen mekan</span>
        </div>
      </div>
      <section className="card panel-card">
        <h2>Ödemeler</h2>
        <p>iyzico üzerinden gelen üyelik ödemeleri. Başarılı ödeme mekanın üyeliğini otomatik uzatır.</p>
        {list === null ? (
          <div className="skeleton" style={{ height: 160 }} />
        ) : list.length === 0 ? (
          <p className="faint">Henüz ödeme yok.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Mekan</th>
                  <th>Plan</th>
                  <th>Süre</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td className="faint">{fmtDate(p.createdAt)}</td>
                    <td>{p.cafeName}</td>
                    <td>{plans[p.plan]?.name ?? p.plan}</td>
                    <td>{p.months} ay</td>
                    <td>
                      <b>{tl(p.amount)}</b>
                    </td>
                    <td>
                      <span className={`ac-status ${p.status === 'paid' ? 'ok' : p.status === 'failed' ? 'off' : 'warn'}`}>{statusText[p.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ---------------- Başvurular ----------------
function LeadsTab() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListLeads()
      .then(setLeads)
      .catch((e) => setError(friendly(e)));
  }, []);

  async function done(l: Lead) {
    if (!confirm(`${l.name} başvurusunu listeden kaldırayım mı?`)) return;
    await adminDeleteLead(l.id);
    setLeads((all) => (all ?? []).filter((x) => x.id !== l.id));
  }

  const venueName = (id: string | null) => (id ? bundledVenues.find((v) => v.id === id)?.name : null);

  return (
    <section className="card panel-card">
      <h2>Başvurular</h2>
      <p>“Mekanını ekle” kısa formundan gelenler. WhatsApp’tan yaz, profili “Yeni mekan” sekmesinden aç, sonra başvuruyu kaldır.</p>
      {error && <div className="form-error">{error}</div>}
      {leads === null && !error && <div className="skeleton" style={{ height: 120 }} />}
      {leads?.length === 0 && <p className="faint">Henüz başvuru yok.</p>}
      {leads?.map((l) => (
        <div key={l.id} className="res-item">
          <div className="who">
            <b>{l.name}</b>
            <span>
              {cityById(l.city)?.name} / {districtName(l.city, l.district)} · {formatPhone(l.phone)} · {fmtDate(l.createdAt)}
              {venueName(l.venueId) && ` · rehberdeki “${venueName(l.venueId)}” için`}
            </span>
          </div>
          <a className="btn btn-wa btn-sm" href={waLink(l.phone, `Merhaba, NeredeMaç’a ${l.name} için yaptığınız başvuru hakkında yazıyorum.`)} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={15} /> Yaz
          </a>
          <button className="icon-btn" onClick={() => done(l)} aria-label={`${l.name} başvurusunu kaldır`}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </section>
  );
}

// ---------------- Rehber ----------------
function VenuesTab() {
  const [list, setList] = useState<Venue[] | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminListVenues()
      .then(setList)
      .catch((e) => setError(friendly(e)));
  }, []);
  useEffect(load, [load]);

  async function upload() {
    setBusy(true);
    setError(null);
    try {
      const n = await adminImportVenues();
      setMsg(`${n} mekan Firebase’e yazıldı. Gizlediklerin gizli kaldı.`);
      load();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(v: Venue) {
    await adminSetVenueHidden(v.id, !v.hidden);
    setList((all) => (all ?? []).map((x) => (x.id === v.id ? { ...x, hidden: !v.hidden } : x)));
  }

  return (
    <section className="card panel-card">
      <h2>Rehber mekanları</h2>
      <p>
        Maç verdiği taraftar yorumlarıyla doğrulanmış, anlaşmalı olmayan mekanlar. Liste <code>data/rehber.json</code>’dan gelir; Firebase’e
        yükleyince buradan gizleyip açabilirsin. Anlaşmalı bir mekan aynı telefonla kayıt olursa sitede rehber kaydı kendiliğinden gizlenir.
      </p>
      {error && <div className="form-error">{error}</div>}
      {msg && <div className="trial-note" style={{ marginBottom: 12 }}>{msg}</div>}
      <button className="btn btn-primary btn-sm" onClick={upload} disabled={busy} style={{ marginBottom: 12 }}>
        <UploadCloud size={15} /> {busy ? 'Yükleniyor…' : list === null ? `${bundledVenues.length} mekanı Firebase’e yükle` : 'Paketteki listeyle güncelle'}
      </button>
      {list === null && <p className="faint" style={{ fontSize: 14 }}>Firebase’de henüz rehber yok; site şimdilik paketteki listeyi gösteriyor.</p>}
      {list === undefined && !error && <div className="skeleton" style={{ height: 120 }} />}
      {list !== undefined &&
        (list ?? bundledVenues).map((v) => (
          <div key={v.id} className="res-item" style={v.hidden ? { opacity: 0.5 } : undefined}>
            <div className="who">
              <b>{v.name}</b>
              <span>
                {cityById(v.city)?.name} / {districtName(v.city, v.district)} · {v.phone ? formatPhone(v.phone) : 'telefon yok'} · {v.evidence}
              </span>
            </div>
            {list && (
              <button className="btn btn-ghost btn-sm" onClick={() => toggle(v)}>
                {v.hidden ? <Eye size={15} /> : <EyeOff size={15} />} {v.hidden ? 'Göster' : 'Gizle'}
              </button>
            )}
          </div>
        ))}
    </section>
  );
}
