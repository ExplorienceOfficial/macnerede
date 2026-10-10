'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, animate, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, CreditCard, ExternalLink, Gift, LogOut, MessageCircle, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import Crest from './Crest';
import PhotoPicker from './PhotoPicker';
import ProfileEditor from './ProfileEditor';
import PaymentSheet from './PaymentSheet';
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
  watchSession,
} from '@/lib/db';
import { formatPhone, tl } from '@/lib/hooks';
import { CONTACT_EMAIL, PAYMENTS_ENABLED } from '@/lib/site';
import { hasWhatsApp } from '@/lib/venues';
import { toCover, toPhoto } from '@/lib/images';
import { team } from '@/lib/teams';
import { plans, type Broadcast, type Cafe, type CafePhoto } from '@/lib/types';
import type { MatchInfo } from '@/lib/fixtures';

export default function PanelView({ matches, weekText }: { matches: MatchInfo[]; weekText: string }) {
  const router = useRouter();
  const [cafeId, setCafeId] = useState<string | null | undefined>(undefined);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [bcs, setBcs] = useState<Broadcast[]>([]);

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

  // iyzico'dan dönüş: /panel?odeme=ok | hata
  const [payResult, setPayResult] = useState<'ok' | 'hata' | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('odeme');
    if (q !== 'ok' && q !== 'hata') return;
    setPayResult(q);
    window.history.replaceState(null, '', '/panel');
    if (q === 'ok') confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, colors: ['#1e7a4c', '#e2b54a', '#ffffff'], disableForReducedMotion: true });
  }, []);

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

      <AnimatePresence>
        {payResult && (
          <motion.div className={`pay-banner ${payResult}`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {payResult === 'ok' ? <CheckCheck size={20} /> : <CreditCard size={20} />}
            <span style={{ flex: 1 }}>
              {payResult === 'ok' ? 'Ödemen alındı, üyeliğin uzatıldı. Teşekkürler!' : 'Ödeme tamamlanamadı. Kartından para çekilmediyse tekrar deneyebilirsin.'}
            </span>
            <button className="icon-btn" onClick={() => setPayResult(null)} aria-label="Kapat">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="stats">
        <StatTile value={bcs.filter((b) => matches.some((m) => m.id === b.matchId)).length} label="Bu hafta açtığın maç" highlight />
        <StatTile value={bcs.length} label="Toplam açtığın maç" />
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
                onChange={() => load(cafe.id)}
              />
            ))}
          </section>
          <PhotoManager cafe={cafe} onCafe={setCafe} />
          <ProfileEditor cafe={cafe} onCafe={setCafe} />
        </div>

        <div>
          {PAYMENTS_ENABLED ? <Membership cafe={cafe} onCafe={setCafe} /> : <FreeListing cafe={cafe} />}
          <section className="card panel-card">
            <h2>Taraftarlar sana nasıl ulaşır?</h2>
            <p>
              Maç sayfasında “Yerini ayırt”a basan taraftar, kaç kişi olduğunu seçer ve{' '}
              {hasWhatsApp(cafe.phone) ? 'WhatsApp numarana hazır bir mesaj gönderir' : 'seni arar'}. Yer ayırmayı kendin yönetirsin.
            </p>
            <p className="faint" style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <MessageCircle size={16} /> {formatPhone(cafe.phone)}
              {!hasWhatsApp(cafe.phone) && ' · sabit hat; cep numarası girersen WhatsApp düğmesi açılır'}
            </p>
          </section>
        </div>
      </div>

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

/** Ödeme kapalıyken: üyelik yerine "profilin yayında, şimdilik ücretsiz" */
function FreeListing({ cafe }: { cafe: Cafe }) {
  const off = cafe.membership.status === 'canceled' || cafe.membership.status === 'past_due';
  return (
    <section className="card panel-card">
      <h2>{off ? 'Profilin şu an yayında değil' : 'Profilin yayında'}</h2>
      <p className="muted" style={{ fontSize: 14 }}>
        {off ? 'Tekrar yayına almak için bize yaz.' : 'Şimdilik ücret yok. Taraftarlar seni maç sayfalarında görür, yer sormak için doğrudan sana yazar.'}
      </p>
      <a className="btn btn-ghost btn-sm" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Mekan: ${cafe.name}`)}`}>
        Bize yaz
      </a>
    </section>
  );
}

function Membership({ cafe, onCafe }: { cafe: Cafe; onCafe: (c: Cafe) => void }) {
  const [paying, setPaying] = useState(false);
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
              : `Deneme ${renews} tarihinde bitiyor. Devam etmek için üyeliğini buradan başlatabilirsin.`}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setPaying(true)}>
          <CreditCard size={15} /> {m.status === 'active' ? 'Üyeliği uzat' : 'Üyeliği öde'}
        </button>
        <a className="btn btn-ghost btn-sm" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Üyelik: ${cafe.name}`)}`}>
          Fatura / soru
        </a>
      </div>
      <AnimatePresence>{paying && <PaymentSheet cafe={cafe} onClose={() => setPaying(false)} onPaid={onCafe} />}</AnimatePresence>
    </section>
  );
}

function BroadcastRow({ m, cafe, existing, onChange }: { m: MatchInfo; cafe: Cafe; existing: Broadcast | null; onChange: () => void }) {
  const [on, setOn] = useState(!!existing);
  const [sound, setSound] = useState(existing?.sound ?? true);
  const [entryFee, setEntryFee] = useState(existing?.entryFee ? String(existing.entryFee) : '');
  const [minSpend, setMinSpend] = useState(existing?.minSpend ? String(existing.minSpend) : '');
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
      existing.reservationRequired !== resReq ||
      (existing.note ?? '') !== note,
    [existing, sound, entryFee, minSpend, resReq, note],
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
      reservationRequired: resReq,
      note: note.trim() || undefined,
      kickoff: m.kickoffISO,
    });
    setState('saved');
    onChange();
    setTimeout(() => setState('idle'), 1800);
  }

  async function toggle() {
    if (on && existing) {
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
            {m.day} {m.time ?? ''}
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
              <div className="row-2">
                <div className="field">
                  <label htmlFor={`${m.id}-fee`}>Giriş (TL)</label>
                  <input id={`${m.id}-fee`} className="input" type="number" min={0} inputMode="numeric" placeholder="Yok" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor={`${m.id}-min`}>Min. harcama (TL)</label>
                  <input id={`${m.id}-min`} className="input" type="number" min={0} inputMode="numeric" placeholder="Yok" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} />
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
                  Önceden yer ayırtmak şart
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
