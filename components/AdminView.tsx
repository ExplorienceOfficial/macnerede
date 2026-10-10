'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, BookOpen, CalendarDays, Download, Check, Plus, Star, CreditCard, Copy, Eye, EyeOff, ExternalLink, FileUp, Inbox, KeyRound, LogOut, MessageCircle, RefreshCw, Search, ShieldCheck, Store, Trash2, UploadCloud, UserPlus } from 'lucide-react';
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
  adminListStats,
  SITE_STAT_ID,
  adminSaveVenue,
  adminSetFeatured,
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
  type StatAction,
  type StatDay,
  type MembershipPreset,
} from '@/lib/db';
import { DEFAULT_CITY, cities, cityById, districtById, districtName } from '@/lib/places';
import { BIG4, team, type BigTeam } from '@/lib/teams';
import { CAFE_KINDS, isFeatured, plans, type Payment, type ActivationCode, type Broadcast, type Cafe, type CafeKind, type Lead, type PlanId, type Venue } from '@/lib/types';
import { addDays, allMatches, matchPath, slugify, ymdIstanbul, type MatchInfo } from '@/lib/fixtures';
import { formatPhone, tl, waLink } from '@/lib/hooks';
import { FRESH_MONTHS, MAX_MONTHS, MIN_RECENT, bundledVenues, evidenceMonth, isTrusted, trustStatus } from '@/lib/venues';
import { downloadXlsx, type Cell } from '@/lib/xlsx';
import { PAYMENTS_ENABLED } from '@/lib/site';

type Tab = 'hafta' | 'analitik' | 'mekanlar' | 'basvurular' | 'rehber' | 'yeni' | 'odemeler' | 'kodlar';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'hafta', label: 'Bu hafta', icon: <CalendarDays size={15} /> },
  { id: 'analitik', label: 'Analitik', icon: <BarChart3 size={15} /> },
  { id: 'mekanlar', label: 'Mekanlar', icon: <Store size={15} /> },
  { id: 'basvurular', label: 'Başvurular', icon: <Inbox size={15} /> },
  { id: 'rehber', label: 'Rehber', icon: <BookOpen size={15} /> },
  { id: 'yeni', label: 'Yeni mekan', icon: <UserPlus size={15} /> },
  ...(PAYMENTS_ENABLED ? [{ id: 'odemeler' as Tab, label: 'Ödemeler', icon: <CreditCard size={15} /> }] : []),
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
          {tab === 'analitik' && <StatsTab cafes={cafes} />}
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
                        {isFeatured(c, ymdIstanbul(new Date())) && <span className="badge badge-pro">Öne çıkan · {fmtDay(c.featuredUntil!)}’e kadar</span>}
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
                    <FeatureControl
                      until={c.featuredUntil ?? null}
                      today={ymdIstanbul(new Date())}
                      onSet={async (until) => {
                        await adminSetFeatured('cafe', c.id, until);
                        onChange({ ...c, featuredUntil: until });
                      }}
                    />
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

// ---------------- Analitik ----------------
const STAT_COLS: { id: StatAction; label: string }[] = [
  { id: 'seat', label: 'Yerini ayırt' },
  { id: 'wa', label: 'WhatsApp' },
  { id: 'call', label: 'Arama' },
  { id: 'dir', label: 'Yol tarifi' },
  { id: 'view', label: 'Mekan sayfası' },
];
const RANGES = [
  { id: 7, label: 'Son 7 gün' },
  { id: 30, label: 'Son 30 gün' },
  { id: 0, label: 'Tümü' },
] as const;
/** "261009-gs-kasimpasa" → "Galatasaray – Kasımpaşa" */
const matchLabel = (id: string) => {
  const m = allMatches.find((x) => x.id === id);
  return m ? `${team(m.home).name} – ${team(m.away).name}` : id;
};
const statTotal = (s: Record<StatAction, number>) => STAT_COLS.reduce((n, c) => n + s[c.id], 0);

/** Taraftarın mekanlar için yaptığı işlemler (anonim, günlük sayaç) + Excel dökümü */
function StatsTab({ cafes }: { cafes: Cafe[] | null }) {
  const [range, setRange] = useState<number>(30);
  const [days, setDays] = useState<StatDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Panelden eklenen rehber mekanlarının adları da görünsün
  const [fbVenues, setFbVenues] = useState<Venue[]>([]);
  useEffect(() => {
    adminListVenues()
      .then((l) => setFbVenues(l ?? []))
      .catch(() => {});
  }, []);

  const today = ymdIstanbul(new Date());
  const from = range ? addDays(today, -(range - 1)) : null;
  useEffect(() => {
    setDays(null);
    setError(null);
    adminListStats(from)
      .then(setDays)
      .catch((e) => setError(friendly(e)));
  }, [from]);

  // Mekan bilgisi: anlaşmalılar Firebase'den, rehber paketten
  const info = useMemo(() => {
    const m = new Map<string, { name: string; type: string; city: string; district: string; phone: string }>();
    for (const v of [...bundledVenues, ...fbVenues]) m.set(v.id, { name: v.name, type: 'Rehber', city: v.city, district: v.district, phone: v.phone ?? '' });
    for (const c of cafes ?? []) m.set(c.id, { name: c.name, type: c.plan === 'pro' ? 'Anlaşmalı (Pro)' : 'Anlaşmalı', city: c.city, district: c.district, phone: c.phone });
    return m;
  }, [cafes, fbVenues]);
  const describe = (id: string) => info.get(id) ?? { name: `(bilinmeyen mekan) ${id}`, type: '?', city: '', district: '', phone: '' };

  // Site geneli kayıtlar (tekil ziyaretçi, maç sayfaları) mekan tablosuna karışmasın
  const site = useMemo(() => (days ?? []).filter((d) => d.venueId === SITE_STAT_ID).sort((a, b) => b.date.localeCompare(a.date)), [days]);
  const matchViews = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of days ?? []) if (d.venueId.startsWith('mac-')) m.set(d.venueId.slice(4), (m.get(d.venueId.slice(4)) ?? 0) + d.view);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [days]);
  const venueDays = useMemo(() => (days ?? []).filter((d) => d.venueId !== SITE_STAT_ID && !d.venueId.startsWith('mac-')), [days]);
  const visitors = site.reduce((n, d) => n + d.view, 0);

  const totals = useMemo(() => {
    const m = new Map<string, Record<StatAction, number> & { first: string; last: string }>();
    for (const d of venueDays) {
      const t = m.get(d.venueId) ?? { seat: 0, wa: 0, call: 0, dir: 0, view: 0, first: d.date, last: d.date };
      for (const c of STAT_COLS) t[c.id] += d[c.id];
      if (d.date < t.first) t.first = d.date;
      if (d.date > t.last) t.last = d.date;
      m.set(d.venueId, t);
    }
    return [...m.entries()].map(([id, t]) => ({ id, ...t, total: statTotal(t) })).sort((a, b) => b.total - a.total);
  }, [venueDays]);
  const sum = STAT_COLS.map((c) => totals.reduce((n, t) => n + t[c.id], 0));

  function exportXlsx() {
    const where = (id: string): Cell[] => {
      const v = describe(id);
      return [v.name, v.type, cityById(v.city)?.name ?? v.city, v.city ? districtName(v.city, v.district) : '', v.phone ? formatPhone(v.phone) : ''];
    };
    const head = ['Mekan', 'Tür', 'Şehir', 'Semt', 'Telefon'];
    const summary: Cell[][] = [
      [...head, ...STAT_COLS.map((c) => c.label), 'Toplam', 'İlk gün', 'Son gün'],
      ...totals.map((t) => [...where(t.id), ...STAT_COLS.map((c) => t[c.id]), t.total, t.first, t.last]),
    ];
    const daily: Cell[][] = [
      ['Tarih', ...head, ...STAT_COLS.map((c) => c.label), 'Toplam'],
      ...[...venueDays]
        .sort((a, b) => b.date.localeCompare(a.date) || statTotal(b) - statTotal(a))
        .map((d) => [d.date, ...where(d.venueId), ...STAT_COLS.map((c) => d[c.id]), statTotal(d)]),
    ];
    const widths = [34, 16, 10, 22, 16, ...STAT_COLS.map(() => 13), 9];
    downloadXlsx(`neredemac-analitik-${from ?? 'tumu'}_${today}.xlsx`, [
      { name: 'Mekanlar', rows: summary, widths: [...widths, 12, 12] },
      { name: 'Günlük', rows: daily, widths: [12, ...widths] },
      { name: 'Site', rows: [['Tarih', 'Tekil ziyaretçi'], ...site.map((d) => [d.date, d.view])], widths: [12, 16] },
      { name: 'Maç sayfaları', rows: [['Maç', 'Tarih', 'Görüntüleme'], ...matchViews.map(([id, n]) => [matchLabel(id), id.slice(0, 6), n])], widths: [36, 10, 14] },
    ]);
  }

  return (
    <section className="card panel-card">
      <h2>Analitik</h2>
      <p>
        Taraftarların sitede mekanlar için yaptığı işlemler. Kişisel veri tutulmaz; aynı kişinin aynı gün aynı tıklaması bir kez sayılır. Mekana
        fiziksel olarak kaç kişinin gittiğini değil, ilgiyi gösterir.
      </p>
      <div className="admin-toolbar" style={{ marginBottom: 14 }}>
        <div className="seg" role="group" aria-label="Tarih aralığı">
          {RANGES.map((r) => (
            <button key={r.id} aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
              {range === r.id && <motion.span layoutId="stat-range" className="seg-thumb" />}
              {r.label}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={exportXlsx} disabled={!days || days.length === 0} style={{ marginLeft: 'auto' }}>
          <Download size={15} /> Excel indir
        </button>
      </div>
      {error && <div className="form-error">{error}</div>}
      {days === null && !error && <div className="skeleton" style={{ height: 160 }} />}
      {days && (
        <div className="stat-cards">
          <div className="stat">
            <b>{visitors}</b>
            <span>tekil ziyaretçi (gün gün toplam)</span>
          </div>
          <div className="stat">
            <b>{site.find((d) => d.date === today)?.view ?? 0}</b>
            <span>bugün tekil ziyaretçi</span>
          </div>
          <div className="stat">
            <b>{sum.reduce((a, b) => a + b, 0)}</b>
            <span>mekan tıklaması</span>
          </div>
          <div className="stat">
            <b>{matchViews.reduce((n, [, v]) => n + v, 0)}</b>
            <span>maç sayfası görüntüleme</span>
          </div>
        </div>
      )}
      {matchViews.length > 0 && (
        <p className="faint" style={{ fontSize: 13.5, margin: '-4px 0 14px' }}>
          En çok bakılan maçlar: {matchViews.slice(0, 3).map(([id, n]) => `${matchLabel(id)} (${n})`).join(' · ')}
        </p>
      )}
      {days && venueDays.length === 0 && <p className="faint">Bu aralıkta henüz mekan tıklaması yok.</p>}
      {totals.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table stats-table">
            <thead>
              <tr>
                <th>Mekan</th>
                {STAT_COLS.map((c) => (
                  <th key={c.id}>{c.label}</th>
                ))}
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((t) => {
                const v = describe(t.id);
                return (
                  <tr key={t.id}>
                    <td>
                      <b>{v.name}</b>
                      <div className="faint" style={{ fontSize: 12.5 }}>
                        {v.type}
                        {v.city && ` · ${cityById(v.city)?.name} / ${districtName(v.city, v.district)}`}
                      </div>
                    </td>
                    {STAT_COLS.map((c) => (
                      <td key={c.id}>{t[c.id] || <span className="faint">0</span>}</td>
                    ))}
                    <td>
                      <b>{t.total}</b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <b>{totals.length} mekan</b>
                </td>
                {sum.map((n, i) => (
                  <td key={STAT_COLS[i].id}>
                    <b>{n}</b>
                  </td>
                ))}
                <td>
                  <b>{sum.reduce((a, b) => a + b, 0)}</b>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------- Rehber ----------------
function VenuesTab() {
  const [list, setList] = useState<Venue[] | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState<'all' | 'ok' | 'stale' | 'hidden'>('all');
  const [cityPick, setCityPick] = useState<string>('all');
  const [q, setQ] = useState('');
  /** Açık form: yeni mekan (null id) ya da yeniden doğrulanan mekan */
  const [editing, setEditing] = useState<Venue | 'new' | null>(null);

  const load = useCallback(() => {
    adminListVenues()
      .then(setList)
      .catch((e) => setError(friendly(e)));
  }, []);
  useEffect(load, [load]);

  const all = list ?? bundledVenues;
  const now = new Date();
  const today = ymdIstanbul(now);
  const counts = { ok: 0, stale: 0, hidden: 0 };
  for (const v of all) {
    if (v.hidden) counts.hidden++;
    else if (isTrusted(v, now)) counts.ok++;
    else counts.stale++;
  }
  const term = q.trim().toLocaleLowerCase('tr-TR');
  const rows = all
    .filter((v) => cityPick === 'all' || v.city === cityPick)
    .filter((v) => !term || `${v.name} ${v.address}`.toLocaleLowerCase('tr-TR').includes(term))
    .filter((v) => (show === 'all' ? true : show === 'hidden' ? !!v.hidden : !v.hidden && (show === 'ok') === isTrusted(v, now)))
    .sort((a, b) => (b.evidenceDate ?? '').localeCompare(a.evidenceDate ?? ''));

  async function upload() {
    setBusy(true);
    setError(null);
    try {
      const n = await adminImportVenues();
      setMsg(n ? `Paketteki ${n} yeni mekan Firebase’e eklendi. Mevcut kayıtlar ve düzenlemelerin değişmedi.` : 'Paketteki bütün mekanlar zaten Firebase’de.');
      load();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(v: Venue) {
    try {
      await adminSaveVenue({ ...v, hidden: !v.hidden });
      load();
    } catch (e) {
      setError(friendly(e));
    }
  }

  async function feature(v: Venue, until: string | null) {
    try {
      await adminSetFeatured('venue', v.id, until);
      load();
    } catch (e) {
      setError(friendly(e));
    }
  }

  const statusOf = (v: Venue) => (v.hidden ? { t: 'Gizli', cls: 'off' } : trustStatus(v, now) === 'ok' ? { t: 'Sitede', cls: 'ok' } : { t: 'Kanıt eski · gizli', cls: 'off' });

  return (
    <section className="card panel-card">
      <h2>Rehber mekanları</h2>
      <p>
        Anlaşmalı olmayan, maç verdiği taraftar yorumlarıyla doğrulanmış mekanlar. <b>Güvenilirlik kuralı:</b> maç izlendiğini yazan en yeni yorum
        son {FRESH_MONTHS} ay içindeyse ya da son {MAX_MONTHS} ayda en az {MIN_RECENT} yorum varsa mekan sitede görünür; kanıt eskiyince kendiliğinden
        gizlenir. Google Maps’te yorumlarda “maç” diye arat, en yeni yorumun tarihini girip yeniden doğrula.
      </p>
      {error && <div className="form-error">{error}</div>}
      {msg && <div className="trial-note" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="admin-toolbar" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          <Plus size={15} /> Yeni mekan ekle
        </button>
        <button className="btn btn-soft btn-sm" onClick={upload} disabled={busy}>
          <UploadCloud size={15} /> {busy ? 'Yükleniyor…' : list === null ? `${bundledVenues.length} mekanı Firebase’e yükle` : 'Paketteki yeni mekanları ekle'}
        </button>
        <span className="faint" style={{ fontSize: 13.5 }}>
          Sitede <b>{counts.ok}</b> · kanıtı eski <b>{counts.stale}</b> · gizli <b>{counts.hidden}</b>
        </span>
      </div>
      {list === null && <p className="faint" style={{ fontSize: 14 }}>Firebase’de henüz rehber yok; site paketteki listeyi gösteriyor. İlk düzenlemede liste otomatik yüklenir.</p>}

      <AnimatePresence>
        {editing && (
          <VenueForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            existingIds={all.map((v) => v.id)}
            onCancel={() => setEditing(null)}
            onSaved={(v) => {
              setEditing(null);
              setMsg(`${v.name} kaydedildi${isTrusted(v) ? ', sitede görünüyor.' : '. Kanıt eski olduğu için sitede görünmüyor.'}`);
              load();
            }}
          />
        )}
      </AnimatePresence>

      <div className="admin-toolbar" style={{ marginBottom: 10 }}>
        <div className="seg" role="group" aria-label="Durum">
          {(
            [
              ['all', 'Tümü'],
              ['ok', 'Sitede'],
              ['stale', 'Kanıtı eski'],
              ['hidden', 'Gizli'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} aria-pressed={show === id} onClick={() => setShow(id)}>
              {show === id && <motion.span layoutId="venue-show" className="seg-thumb" />}
              {label}
            </button>
          ))}
        </div>
        <select className="input" style={{ width: 'auto', height: 38 }} value={cityPick} onChange={(e) => setCityPick(e.target.value)} aria-label="Şehir">
          <option value="all">Bütün şehirler</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="admin-search">
          <Search size={16} />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mekan ara" />
        </div>
      </div>

      {list === undefined && !error && <div className="skeleton" style={{ height: 120 }} />}
      {list !== undefined &&
        rows.map((v) => {
          const st = statusOf(v);
          const featured = isFeatured(v, today);
          return (
            <div key={v.id} className="res-item venue-row">
              <div className="who">
                <b>
                  {v.name} {featured && <span className="badge badge-pro">Öne çıkan · {fmtDay(v.featuredUntil!)}’e kadar</span>}
                </b>
                <span>
                  {cityById(v.city)?.name} / {districtName(v.city, v.district)} · {v.phone ? formatPhone(v.phone) : 'telefon yok'} ·{' '}
                  {v.evidenceDate ? `en yeni maç yorumu ${evidenceMonth(v.evidenceDate)}${v.evidenceCount ? ` · ${v.evidenceCount} yorum` : ''}` : 'kanıt tarihi yok'}
                </span>
              </div>
              <span className={`ac-status ${st.cls}`}>{st.t}</span>
              <div className="venue-actions">
                <button className="btn btn-soft btn-sm" onClick={() => setEditing(v)}>
                  <RefreshCw size={14} /> Yeniden doğrula
                </button>
                <FeatureControl until={v.featuredUntil ?? null} today={today} onSet={(d) => feature(v, d)} />
                <button className="btn btn-ghost btn-sm" onClick={() => toggle(v)}>
                  {v.hidden ? <Eye size={15} /> : <EyeOff size={15} />} {v.hidden ? 'Göster' : 'Gizle'}
                </button>
                <a className="btn btn-ghost btn-sm" href={v.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.address}`)}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} /> Maps
                </a>
                <Link className="btn btn-ghost btn-sm" href={`/mekan/${v.id}`}>
                  Profil
                </Link>
              </div>
            </div>
          );
        })}
    </section>
  );
}

const fmtDay = (ymd: string) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(`${ymd}T12:00:00+03:00`));

/** Öne çıkarma: son günü seçip aç, ya da kaldır (ücretli "Derbi boost" vb.) */
function FeatureControl({ until, today, onSet }: { until: string | null; today: string; onSet: (until: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(until && until >= today ? until : addDays(today, 2));
  if (until && until >= today && !open) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => onSet(null)}>
        <Star size={14} /> Öne çıkarmayı kaldır
      </button>
    );
  }
  if (!open) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        <Star size={14} /> Öne çıkar
      </button>
    );
  }
  return (
    <span className="feature-pick">
      <input type="date" className="input" value={day} min={today} onChange={(e) => setDay(e.target.value)} aria-label="Öne çıkarmanın son günü" />
      <button
        className="btn btn-primary btn-sm"
        onClick={() => {
          onSet(day);
          setOpen(false);
        }}
      >
        Kaydet
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
        Vazgeç
      </button>
    </span>
  );
}

/**
 * Rehber mekanı ekleme / yeniden doğrulama. Maç yayını kanıtı (not + en yeni yorum tarihi) olmadan kaydedilmez:
 * sitede maç vermeyen bir işletme görünmesin.
 */
function VenueForm({ initial, existingIds, onCancel, onSaved }: { initial: Venue | null; existingIds: string[]; onCancel: () => void; onSaved: (v: Venue) => void }) {
  const today = ymdIstanbul(new Date());
  const [v, setV] = useState<Venue>(
    initial ?? {
      id: '',
      name: '',
      kind: 'Pub',
      city: DEFAULT_CITY,
      district: cityById(DEFAULT_CITY)!.districts[0].id,
      address: '',
      lat: cityById(DEFAULT_CITY)!.districts[0].center[0],
      lng: cityById(DEFAULT_CITY)!.districts[0].center[1],
      phone: '',
      features: { bigScreen: false, alcohol: true, hookah: false, garden: false },
      rating: null,
      reviews: null,
      evidence: '',
      evidenceDate: null,
      evidenceCount: null,
    },
  );
  const [phone, setPhone] = useState(initial?.phone ? formatPhone(initial.phone) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Venue>(k: K, val: Venue[K]) => setV((p) => ({ ...p, [k]: val }));
  const preview = trustStatus(v);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (v.name.trim().length < 2) return setError('Mekan adını yaz.');
    if (v.address.trim().length < 5) return setError('Açık adresi yaz.');
    if (v.evidence.trim().length < 8) return setError('Maç yayını kanıtını yaz: Google yorumu, Instagram paylaşımı ya da mekanın kendi beyanı (bağlantıyla).');
    if (!v.evidenceDate) return setError('Maç izlendiğini yazan en yeni yorumun/paylaşımın tarihini seç.');
    if (v.evidenceDate > today) return setError('Kanıt tarihi bugünden ileri olamaz.');
    const digits = phone.replace(/\D/g, '');
    const normPhone = !digits ? '' : digits.startsWith('90') ? digits : `90${digits.replace(/^0/, '')}`;
    if (normPhone && normPhone.length !== 12) return setError('Telefon numarası eksik görünüyor.');
    let id = v.id;
    if (!id) {
      const base = `${v.city.slice(0, 3)}-${slugify(v.name)}`.slice(0, 70);
      id = base;
      for (let n = 2; existingIds.includes(id); n++) id = `${base}-${n}`;
    }
    const out: Venue = {
      ...v,
      id,
      name: v.name.trim(),
      address: v.address.trim(),
      evidence: v.evidence.trim(),
      phone: normPhone,
      instagram: v.instagram?.replace(/^@/, '').trim() || undefined,
      mapsUrl: v.mapsUrl?.trim() || undefined,
      evidenceCount: v.evidenceCount && v.evidenceCount > 0 ? Math.round(v.evidenceCount) : null,
    };
    setBusy(true);
    try {
      await adminSaveVenue(out);
      onSaved(out);
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  const cityInfo = cityById(v.city)!;
  return (
    <motion.form className="venue-form" onSubmit={save} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <h3>{initial ? `${initial.name} · yeniden doğrula` : 'Yeni rehber mekanı'}</h3>
      <div className="row-2">
        <div className="field">
          <label htmlFor="vf-name">Mekan adı</label>
          <input id="vf-name" className="input" value={v.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="vf-kind">Tür</label>
          <select id="vf-kind" className="input" value={v.kind} onChange={(e) => set('kind', e.target.value as CafeKind)}>
            {CAFE_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="row-2">
        <div className="field">
          <label htmlFor="vf-city">Şehir</label>
          <select
            id="vf-city"
            className="input"
            value={v.city}
            onChange={(e) => {
              const d = cityById(e.target.value)!.districts[0];
              setV((p) => ({ ...p, city: e.target.value, district: d.id, lat: d.center[0], lng: d.center[1] }));
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
          <label htmlFor="vf-district">Semt</label>
          <select id="vf-district" className="input" value={v.district} onChange={(e) => set('district', e.target.value)}>
            {cityInfo.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="vf-address">Açık adres</label>
        <input id="vf-address" className="input" value={v.address} onChange={(e) => set('address', e.target.value)} placeholder="Mahalle, cadde/sokak, no, ilçe" />
      </div>
      <div className="field">
        <span className="label">Konum</span>
        <LocationPicker value={{ lat: v.lat, lng: v.lng }} onChange={(p) => setV((x) => ({ ...x, lat: p.lat, lng: p.lng }))} />
      </div>
      <div className="row-3">
        <div className="field">
          <label htmlFor="vf-phone">Telefon / WhatsApp</label>
          <input id="vf-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0532 … ya da 0312 …" />
        </div>
        <div className="field">
          <label htmlFor="vf-ig">Instagram</label>
          <input id="vf-ig" className="input" value={v.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} placeholder="kullaniciadi" />
        </div>
        <div className="field">
          <label htmlFor="vf-maps">Google Maps bağlantısı</label>
          <input id="vf-maps" className="input" value={v.mapsUrl ?? ''} onChange={(e) => set('mapsUrl', e.target.value)} placeholder="https://maps.app.goo.gl/…" />
        </div>
      </div>
      <div className="venue-flags">
        {(
          [
            ['bigScreen', 'Dev ekran / projeksiyon'],
            ['alcohol', 'Alkol var'],
            ['hookah', 'Nargile'],
            ['garden', 'Açık alan'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="check">
            <input type="checkbox" checked={v.features[k]} onChange={(e) => set('features', { ...v.features, [k]: e.target.checked })} /> {label}
          </label>
        ))}
      </div>
      <fieldset className="evidence-box">
        <legend>Maç yayını kanıtı (zorunlu)</legend>
        <div className="field">
          <label htmlFor="vf-ev">Kanıt notu</label>
          <input
            id="vf-ev"
            className="input"
            value={v.evidence}
            onChange={(e) => set('evidence', e.target.value)}
            placeholder="ör. Google yorumu: “GS-FB derbisini izledik” / Instagram derbi duyurusu bağlantısı"
          />
        </div>
        <div className="row-2">
          <div className="field">
            <label htmlFor="vf-evd">En yeni maç yorumunun / paylaşımının tarihi</label>
            <input id="vf-evd" className="input" type="date" max={today} value={v.evidenceDate ?? ''} onChange={(e) => set('evidenceDate', e.target.value || null)} />
          </div>
          <div className="field">
            <label htmlFor="vf-evc">Son 11 aydaki maç yorumu sayısı</label>
            <input
              id="vf-evc"
              className="input"
              type="number"
              min={0}
              value={v.evidenceCount ?? ''}
              onChange={(e) => set('evidenceCount', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
        </div>
        <p className={preview === 'ok' ? 'hint' : 'hint warn'}>
          {preview === 'ok'
            ? 'Bu kanıtla mekan sitede görünür.'
            : preview === 'none'
              ? 'Tarih girilmeden mekan sitede görünmez.'
              : `Kanıt eski: en yeni yorum son ${FRESH_MONTHS} ayda değil ve son ${MAX_MONTHS} ayda ${MIN_RECENT} yorum yok. Kaydedilir ama sitede görünmez.`}
        </p>
      </fieldset>
      {error && <div className="form-error">{error}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Vazgeç
        </button>
        <button className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </motion.form>
  );
}
