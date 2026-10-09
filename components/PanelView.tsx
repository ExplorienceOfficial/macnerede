'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, animate, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Check, CheckCheck, CreditCard, ExternalLink, Gift, LogOut, Phone } from 'lucide-react';
import Crest from './Crest';
import PhotoPicker from './PhotoPicker';
import ProfileEditor from './ProfileEditor';
import {
  addPhoto,
  deletePhoto,
  getCafe,
  listCafeBroadcasts,
  listPhotos,
  logout,
  removeBroadcast,
  saveBroadcast,
  setCover,
  setReservationStatus,
  watchReservations,
  watchSession,
} from '@/lib/db';
import { tl } from '@/lib/hooks';
import { toCover, toPhoto } from '@/lib/images';
import { team } from '@/lib/teams';
import { plans, type Broadcast, type Cafe, type CafePhoto, type Reservation } from '@/lib/types';
import { findMatch, decorate, type MatchInfo } from '@/lib/fixtures';

export default function PanelView({ matches, weekText }: { matches: MatchInfo[]; weekText: string }) {
  const router = useRouter();
  const [cafeId, setCafeId] = useState<string | null | undefined>(undefined);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [bcs, setBcs] = useState<Broadcast[]>([]);
  const [res, setRes] = useState<Reservation[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Reservation | null>(null);
  const known = useRef<Set<string> | null>(null);

  useEffect(() => watchSession(setCafeId), []);
  useEffect(() => {
    if (cafeId === null) router.replace('/giris');
  }, [cafeId, router]);

  const [missing, setMissing] = useState(false);
  const load = useCallback(async (id: string) => {
    const [c, b] = await Promise.all([getCafe(id), listCafeBroadcasts(id)]);
    setCafe(c);
    setMissing(!c);
    setBcs(b);
  }, []);

  useEffect(() => {
    if (cafeId) load(cafeId);
  }, [cafeId, load]);

  // Rezervasyonlar canlı: yeni gelen satır yeşil yanar, köşede bildirim çıkar, doluluk tazelenir
  useEffect(() => {
    if (!cafeId) return;
    known.current = null;
    return watchReservations(cafeId, (list) => {
      if (known.current) {
        const added = list.filter((r) => !known.current!.has(r.id));
        if (added.length) {
          setFresh((f) => new Set([...f, ...added.map((r) => r.id)]));
          setToast(added[0]);
          listCafeBroadcasts(cafeId).then(setBcs);
        }
      }
      known.current = new Set(list.map((r) => r.id));
      setRes(list);
    });
  }, [cafeId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const weekIds = useMemo(() => new Set(matches.map((m) => m.id)), [matches]);
  const live = res.filter((r) => r.status !== 'cancelled');
  const weekRes = live.filter((r) => weekIds.has(r.matchId));
  const stats = {
    weekCount: weekRes.length,
    expected: weekRes.filter((r) => r.status === 'new').reduce((s, r) => s + r.people, 0),
    arrived: weekRes.filter((r) => r.status === 'arrived').reduce((s, r) => s + r.people, 0),
    allArrived: live.filter((r) => r.status === 'arrived').reduce((s, r) => s + r.people, 0),
  };

  // Maç maç grupla: bu haftanın maçları tarih sırasıyla önde, eski maçlar sonra
  const groups = useMemo(() => {
    const byMatch = new Map<string, Reservation[]>();
    for (const r of res) byMatch.set(r.matchId, [...(byMatch.get(r.matchId) ?? []), r]);
    const info = (id: string) => matches.find((m) => m.id === id) ?? (findMatch(id) ? decorate(findMatch(id)!) : null);
    return [...byMatch.entries()]
      .map(([id, list]) => ({ m: info(id), list }))
      .sort((a, b) => {
        const aw = weekIds.has(a.m?.id ?? '');
        const bw = weekIds.has(b.m?.id ?? '');
        if (aw !== bw) return aw ? -1 : 1;
        const ka = a.m?.kickoffISO ?? '';
        const kb = b.m?.kickoffISO ?? '';
        return aw ? ka.localeCompare(kb) : kb.localeCompare(ka);
      });
  }, [res, matches, weekIds]);

  if (missing) {
    return (
      <div className="container">
        <div className="card empty" style={{ margin: '40px 0' }}>
          <strong>Bu hesaba bağlı mekan bulunamadı</strong>
          Kayıt yarım kalmış olabilir. Çıkış yapıp “Mekanını ekle” ile yeniden dene.
          <button className="btn btn-soft btn-sm" onClick={() => logout().then(() => router.push('/kayit'))}>
            Çıkış yap
          </button>
        </div>
      </div>
    );
  }

  if (!cafeId || !cafe) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="skeleton" style={{ height: 80, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 420 }} />
      </div>
    );
  }

  async function toggleArrived(r: Reservation) {
    const status = r.status === 'arrived' ? 'new' : 'arrived';
    setRes((all) => all.map((x) => (x.id === r.id ? { ...x, status } : x)));
    await setReservationStatus(r.id, status);
  }

  return (
    <div className="container">
      <div className="panel-head">
        <div>
          <span className="faint" style={{ fontSize: 14, fontWeight: 600 }}>Mekan paneli</span>
          <h1>{cafe.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/kafe/${cafe.id}`} className="btn btn-ghost btn-sm">
            <ExternalLink size={15} /> Sayfamı gör
          </Link>
          <button
            className="btn btn-soft btn-sm"
            onClick={async () => {
              await logout();
              router.push('/');
            }}
          >
            <LogOut size={15} /> Çıkış
          </button>
        </div>
      </div>

      <div className="stats">
        <StatTile value={stats.arrived} label="Bu hafta gelen müşteri" highlight />
        <StatTile value={stats.expected} label="Bu hafta beklenen kişi" />
        <StatTile value={stats.weekCount} label="Bu haftaki rezervasyon" />
        <StatTile value={stats.allArrived} label="Toplam gelen müşteri" />
      </div>

      <div className="panel-grid">
        <div>
          <section className="card panel-card">
            <h2>Bu hafta vereceğin maçlar</h2>
            <p>{weekText} · Açtığın maçlar taraftarlara anında görünür.</p>
            {matches.map((m) => (
              <BroadcastRow
                key={m.id}
                m={m}
                cafe={cafe}
                existing={bcs.find((b) => b.matchId === m.id) ?? null}
                reservedPeople={weekRes.filter((r) => r.matchId === m.id).reduce((s, r) => s + r.people, 0)}
                onChange={() => load(cafe.id)}
              />
            ))}
          </section>
          <PhotoManager cafe={cafe} onCafe={setCafe} />
          <ProfileEditor cafe={cafe} onCafe={setCafe} />
        </div>

        <div>
          <Membership cafe={cafe} />
          <section className="card panel-card">
            <h2>Gelen müşteriler</h2>
            <p>Rezervasyonlar burada canlı düşer. Müşteri gelince “Geldi”ye bas, sayılar güncellensin.</p>
            {res.length === 0 && <p className="faint" style={{ fontSize: 14 }}>Henüz rezervasyon yok. Maçlarını açtığında burada görünecek.</p>}
            {groups.map(({ m, list }) => {
              const arrived = list.filter((r) => r.status === 'arrived').reduce((s, r) => s + r.people, 0);
              const total = list.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + r.people, 0);
              return (
                <div key={m?.id ?? list[0].matchId} className="res-group">
                  <div className="res-group-head">
                    {m && (
                      <>
                        <Crest id={m.home} size={20} />
                        <Crest id={m.away} size={20} />
                        <span>
                          {team(m.home).short}–{team(m.away).short} · {m.day} {m.time ?? ''}
                        </span>
                      </>
                    )}
                    <span className="meta">
                      {arrived}/{total} kişi geldi
                    </span>
                  </div>
                  <AnimatePresence initial={false}>
                    {list.map((r) => (
                      <ReservationItem key={r.id} r={r} fresh={fresh.has(r.id)} onToggle={() => toggleArrived(r)} />
                    ))}
                  </AnimatePresence>
                </div>
              );
            })}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ y: 40, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
            <motion.span className="ic" animate={{ rotate: [0, -18, 14, -8, 0] }} transition={{ duration: 0.7, delay: 0.2 }}>
              <BellRing size={18} />
            </motion.span>
            Yeni rezervasyon: {toast.name} · {toast.people} kişi
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Sayarak artan istatistik kutusu */
function StatTile({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    const ctl = animate(from, value, {
      duration: 0.9,
      ease: [0.2, 0.7, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = new Intl.NumberFormat('tr-TR').format(Math.round(v));
      },
    });
    return () => ctl.stop();
  }, [value]);
  return (
    <motion.div className={`card stat-tile${highlight ? ' hl' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <b ref={ref}>0</b>
      <span>{label}</span>
    </motion.div>
  );
}

function PhotoManager({ cafe, onCafe }: { cafe: Cafe; onCafe: (c: Cafe) => void }) {
  const [photos, setPhotos] = useState<CafePhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPhotos(cafe.id).then(setPhotos).catch(() => setPhotos([]));
  }, [cafe.id]);

  async function makeCover(p: CafePhoto | null) {
    const cover = p ? await toCover(p.data) : null;
    await setCover(cafe.id, cover, p?.id ?? null);
    onCafe({ ...cafe, cover, coverPhotoId: p?.id ?? null });
  }

  async function add(files: File[]) {
    setError(null);
    let list = photos ?? [];
    for (const f of files) {
      const saved = await addPhoto(cafe.id, await toPhoto(f));
      list = [...list, saved];
      setPhotos(list);
    }
    if (!cafe.coverPhotoId && list[0]) await makeCover(list[0]);
  }

  async function remove(id: string) {
    setError(null);
    try {
      await deletePhoto(cafe.id, id);
      const rest = (photos ?? []).filter((p) => p.id !== id);
      setPhotos(rest);
      if (cafe.coverPhotoId === id) await makeCover(rest[0] ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="card panel-card">
      <h2>Fotoğraflar</h2>
      <p>Taraftarlar listede kapak fotoğrafını, mekan sayfanda hepsini görür. Yıldıza basarak kapağı seç.</p>
      {photos === null ? (
        <div className="skeleton" style={{ height: 100 }} />
      ) : (
        <PhotoPicker photos={photos} coverId={cafe.coverPhotoId ?? null} onAdd={add} onRemove={remove} onCover={(id) => makeCover(photos.find((p) => p.id === id) ?? null)} />
      )}
      {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
    </section>
  );
}

function Membership({ cafe }: { cafe: Cafe }) {
  const m = cafe.membership;
  const end = new Date(m.renewsAt).getTime();
  const total = Math.max(1, Math.round((end - new Date(m.startedAt).getTime()) / 86400000));
  const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / 86400000));
  const p = plans[cafe.plan];
  const viaCode = !!cafe.activationCode;
  const status = {
    trial: { t: viaCode ? `Aktivasyon kodu · ${daysLeft} gün ücretsiz` : total > 30 ? `Ücretsiz üyelik · ${daysLeft} gün kaldı` : `Deneme · ${daysLeft} gün kaldı`, c: 'var(--accent)' },
    active: { t: 'Aktif üyelik', c: 'var(--accent)' },
    past_due: { t: 'Ödeme bekleniyor', c: 'var(--gold)' },
    canceled: { t: 'Üyelik bitti — listede görünmüyorsun', c: 'var(--danger)' },
  }[m.status];
  const renews = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(m.renewsAt));

  return (
    <section className="card panel-card">
      <div className="member-mini">
        <motion.div
          className="ring"
          style={{ background: `conic-gradient(${status.c} ${m.status === 'trial' ? Math.round((daysLeft / total) * 360) : 360}deg, var(--surface-2) 0)` }}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', display: 'grid', placeItems: 'center', fontSize: daysLeft > 99 ? 12 : 14 }}>
            {m.status === 'trial' ? daysLeft : <Check size={18} />}
          </span>
        </motion.div>
        <div>
          <h2 style={{ marginBottom: 2 }}>
            {p.name} {viaCode || (m.status === 'trial' && total > 30) ? '' : `· ${tl(p.price)}/ay`}
          </h2>
          <span style={{ color: status.c, fontWeight: 600, fontSize: 14, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {viaCode && <Gift size={15} />} {status.t}
          </span>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13.5, marginTop: 14 }}>
        {m.status !== 'trial'
          ? `Sonraki yenileme: ${renews}.`
          : viaCode
            ? `${cafe.activationCode} koduyla ${renews} tarihine kadar ücretsizsin.`
            : total > 30
              ? `${renews} tarihine kadar ücretsizsin.`
              : `Deneme ${renews} tarihinde bitiyor. Ödeme bağlantısı e-postana gelecek.`}
      </p>
      <a className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} href={`mailto:merhaba@macnerede.com?subject=${encodeURIComponent(`Üyelik: ${cafe.name}`)}`}>
        <CreditCard size={15} /> Ödeme / plan değişikliği
      </a>
    </section>
  );
}

function BroadcastRow({ m, cafe, existing, reservedPeople, onChange }: { m: MatchInfo; cafe: Cafe; existing: Broadcast | null; reservedPeople: number; onChange: () => void }) {
  const [on, setOn] = useState(!!existing);
  const [sound, setSound] = useState(existing?.sound ?? true);
  const [entryFee, setEntryFee] = useState(existing?.entryFee ? String(existing.entryFee) : '');
  const [minSpend, setMinSpend] = useState(existing?.minSpend ? String(existing.minSpend) : '');
  const [seats, setSeats] = useState(String(existing?.seats ?? cafe.capacity));
  const [resReq, setResReq] = useState(existing?.reservationRequired ?? false);
  const [note, setNote] = useState(existing?.note ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => setOn(!!existing), [existing]);

  const dirty = useMemo(
    () =>
      !existing ||
      existing.sound !== sound ||
      String(existing.entryFee ?? '') !== entryFee ||
      String(existing.minSpend ?? '') !== minSpend ||
      String(existing.seats) !== seats ||
      existing.reservationRequired !== resReq ||
      (existing.note ?? '') !== note,
    [existing, sound, entryFee, minSpend, seats, resReq, note],
  );

  async function save() {
    setState('saving');
    const n = (v: string) => (Number(v) > 0 ? Math.round(Number(v)) : null);
    await saveBroadcast({
      cafeId: cafe.id,
      matchId: m.id,
      sound,
      entryFee: n(entryFee),
      minSpend: n(minSpend),
      seats: Math.max(n(seats) ?? cafe.capacity, existing?.reserved ?? 0),
      reserved: existing?.reserved ?? 0,
      reservationRequired: resReq,
      note: note.trim() || undefined,
    });
    setState('saved');
    onChange();
    setTimeout(() => setState('idle'), 1800);
  }

  async function toggle() {
    if (on && existing) {
      if (existing.reserved > 0 && !confirm(`${existing.reserved} kişilik rezervasyon var. Yine de bu maçı kaldırmak istiyor musun?`)) return;
      setOn(false);
      await removeBroadcast(cafe.id, m.id);
      onChange();
    } else setOn(!on);
  }

  const home = team(m.home);
  const away = team(m.away);

  return (
    <div className={`bc-row${on ? ' on' : ''}`} style={m.finished ? { opacity: 0.5 } : undefined}>
      <div className="bc-head">
        <Crest id={m.home} size={28} />
        <Crest id={m.away} size={28} />
        <div className="info">
          <b>
            {home.name} – {away.name}
          </b>
          <span>
            {m.day} {m.time ?? ''} {existing && ` · ${existing.reserved}/${existing.seats} dolu`}
            {reservedPeople > 0 && !existing && ` · ${reservedPeople} kişi`}
          </span>
        </div>
        <button className="switch" role="switch" aria-checked={on} aria-label={`${home.name} – ${away.name} maçını ver`} onClick={toggle} disabled={m.finished}>
          <motion.i layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} style={{ left: on ? 21 : 3 }} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {on && !m.finished && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div className="bc-body">
              <div className="row-3">
                <div className="field">
                  <label htmlFor={`${m.id}-fee`}>Giriş (TL)</label>
                  <input id={`${m.id}-fee`} className="input" type="number" min={0} inputMode="numeric" placeholder="Yok" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor={`${m.id}-min`}>Min. harcama (TL)</label>
                  <input id={`${m.id}-min`} className="input" type="number" min={0} inputMode="numeric" placeholder="Yok" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor={`${m.id}-seats`}>Ayrılabilir yer</label>
                  <input id={`${m.id}-seats`} className="input" type="number" min={1} inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value)} />
                </div>
              </div>
              <div className="toolbar-row" style={{ marginBottom: 12 }}>
                <div className="seg">
                  {[true, false].map((v) => (
                    <button key={String(v)} type="button" aria-pressed={sound === v} onClick={() => setSound(v)}>
                      {sound === v && <motion.span layoutId={`snd-${m.id}`} className="seg-thumb" />}
                      {v ? 'Ses açık' : 'Ses kapalı'}
                    </button>
                  ))}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" checked={resReq} onChange={(e) => setResReq(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                  Rezervasyon şart
                </label>
              </div>
              <div className="field">
                <label htmlFor={`${m.id}-note`}>Kısa not (isteğe bağlı)</label>
                <input id={`${m.id}-note`} className="input" maxLength={120} placeholder="ör. Girişe 1 içecek dahil" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={state === 'saving' || (!dirty && !!existing)}>
                  {state === 'saving' ? 'Kaydediliyor…' : existing ? 'Güncelle' : 'Yayına al'}
                </button>
                <AnimatePresence>
                  {state === 'saved' && (
                    <motion.span className="saved" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                      <motion.span initial={{ rotate: -90 }} animate={{ rotate: 0 }} style={{ display: 'grid' }}>
                        <CheckCheck size={18} />
                      </motion.span>
                      Taraftarlara görünüyor
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReservationItem({ r, fresh, onToggle }: { r: Reservation; fresh: boolean; onToggle: () => void }) {
  const arrived = r.status === 'arrived';
  const when = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(r.createdAt));
  return (
    <motion.div className={`res-item${fresh ? ' fresh' : ''}`} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
      <span className="res-people">{r.people}</span>
      <div className="who">
        <b style={arrived ? { opacity: 0.6 } : undefined}>
          {r.name}
          {fresh && <span className="new-dot">YENİ</span>}
        </b>
        <span>
          {r.code} · {when}
        </span>
      </div>
      <a className="icon-btn" href={`tel:+${r.phone.startsWith('90') ? r.phone : `90${r.phone.replace(/^0/, '')}`}`} aria-label="Ara">
        <Phone size={16} />
      </a>
      <button className={`btn btn-sm ${arrived ? 'btn-primary' : 'btn-ghost'}`} onClick={onToggle}>
        {arrived ? <Check size={15} /> : null} Geldi
      </button>
    </motion.div>
  );
}
