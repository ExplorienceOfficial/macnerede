'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Ban, CalendarClock, Check, LogOut, MessageCircle, Navigation, Phone, Ticket, X } from 'lucide-react';
import Crest from './Crest';
import AuthPanel from './AuthPanel';
import { LogoMark } from './art';
import { cancelDeadline, canCancel, cancelReservation, getCafe, logout, noShowBan, saveCustomer, watchMyReservations } from '@/lib/db';
import { directionsLink, formatPhone, telLink, useAccount, waLink } from '@/lib/hooks';
import { decorate, findMatch } from '@/lib/fixtures';
import { districtName } from '@/lib/places';
import { team } from '@/lib/teams';
import { POLICY, type Cafe, type Reservation } from '@/lib/types';

const STATUS: Record<Reservation['status'], { t: string; cls: string }> = {
  new: { t: 'Onaylı', cls: 'ok' },
  arrived: { t: 'Gittin', cls: 'ok' },
  noshow: { t: 'Gitmedin', cls: 'off' },
  cancelled: { t: 'İptal edildi', cls: 'muted' },
};

export default function AccountView() {
  const account = useAccount();
  const [list, setList] = useState<Reservation[] | null>(null);
  const [cafes, setCafes] = useState<Record<string, Cafe | null>>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (account?.role !== 'customer') return;
    return watchMyReservations(account.uid, setList);
  }, [account?.uid, account?.role]);

  // Rezervasyonlardaki mekanların bilgileri (adres, telefon)
  useEffect(() => {
    const missing = [...new Set((list ?? []).map((r) => r.cafeId))].filter((id) => !(id in cafes));
    if (!missing.length) return;
    Promise.all(missing.map(async (id) => [id, await getCafe(id).catch(() => null)] as const)).then((pairs) =>
      setCafes((c) => ({ ...c, ...Object.fromEntries(pairs) })),
    );
  }, [list, cafes]);

  const upcoming = useMemo(() => (list ?? []).filter((r) => r.status === 'new' && new Date(r.kickoff ?? 0).getTime() + 2 * 3600000 > now), [list, now]);
  const past = useMemo(() => (list ?? []).filter((r) => !upcoming.includes(r)), [list, upcoming]);
  const ban = list ? noShowBan(list, now) : null;

  if (account === undefined) return <div className="skeleton" style={{ height: 300, margin: '40px 0' }} />;

  if (!account) {
    return (
      <motion.div className="card auth-wrap" style={{ maxWidth: 560 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <LogoMark size={40} />
        <h1 style={{ marginTop: 14 }}>Taraftar hesabı</h1>
        <p className="muted" style={{ margin: '6px 0 18px' }}>Maç için yer ayırtmak, rezervasyonlarını görmek ve iptal etmek için giriş yap.</p>
        <AuthPanel />
        <p className="legal" style={{ fontSize: 14 }}>
          Mekan sahibi misin?{' '}
          <Link href="/giris" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Mekan girişi
          </Link>
        </p>
      </motion.div>
    );
  }

  if (account.role === 'cafe') {
    return (
      <div className="card empty" style={{ margin: '40px 0' }}>
        <strong>Bu bir mekan hesabı</strong>
        Rezervasyonlarını ve maçlarını mekan panelinden yönetebilirsin.
        <Link href="/panel" className="btn btn-primary btn-sm">
          Mekan paneli
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px 0 70px' }}>
      <div className="panel-head" style={{ paddingTop: 0 }}>
        <div>
          <span className="faint" style={{ fontSize: 14, fontWeight: 600 }}>Hesabım · {account.email}</span>
          <h1>Merhaba{account.customer?.name ? `, ${account.customer.name.split(' ')[0]}` : ''}!</h1>
        </div>
        <button className="btn btn-soft btn-sm" onClick={() => logout()}>
          <LogOut size={15} /> Çıkış
        </button>
      </div>

      {ban && (
        <div className="form-error" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Ban size={18} /> Son {POLICY.noShowWindowDays} günde {POLICY.noShowLimit} rezervasyonuna gitmediğin için {ban} tarihine kadar yeni rezervasyon yapamazsın.
        </div>
      )}

      <div className="panel-grid">
        <div>
          <section className="card panel-card">
            <h2>Yaklaşan rezervasyonlar</h2>
            <p>Maça {POLICY.cancelCutoffMin / 60} saat kalana kadar ücretsiz iptal edebilirsin; son 1 saatte iptal kapanır.</p>
            {list === null && <div className="skeleton" style={{ height: 140 }} />}
            {list && upcoming.length === 0 && (
              <div className="empty" style={{ padding: '20px 0' }}>
                <strong>Yaklaşan rezervasyonun yok</strong>
                <Link href="/" className="btn btn-primary btn-sm">
                  Bu haftanın maçları
                </Link>
              </div>
            )}
            <AnimatePresence initial={false}>
              {upcoming.map((r) => (
                <ResCard key={r.id} r={r} cafe={cafes[r.cafeId]} now={now} />
              ))}
            </AnimatePresence>
          </section>

          {past.length > 0 && (
            <section className="card panel-card">
              <h2>Geçmiş</h2>
              {past.map((r) => {
                const m = findMatch(r.matchId);
                const st = STATUS[r.status];
                return (
                  <div key={r.id} className="res-item">
                    {m && <Crest id={m.home} size={22} />}
                    {m && <Crest id={m.away} size={22} />}
                    <div className="who">
                      <b>{m ? `${team(m.home).short}–${team(m.away).short}` : r.matchId}</b>
                      <span>
                        {cafes[r.cafeId]?.name ?? '…'} · {r.people} kişi · {r.code}
                      </span>
                    </div>
                    <span className={`ac-status ${st.cls}`}>{st.t}</span>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        <div>
          <ProfileCard key={account.uid} uid={account.uid} email={account.email} name={account.customer?.name ?? ''} phone={account.customer?.phone ?? ''} />
          <section className="card panel-card">
            <h2>Rezervasyon kuralları</h2>
            <ul className="policy" style={{ marginTop: 10 }}>
              <li>Maça {POLICY.cancelCutoffMin / 60} saat kalana kadar ücretsiz iptal; son 1 saatte iptal yok.</li>
              <li>Bir maç için tek aktif rezervasyon, en fazla {POLICY.maxPeople} kişi.</li>
              <li>Maç başlayınca o maç için rezervasyon kapanır.</li>
              <li>
                Rezervasyona gitmezsen mekan “gelmedi” işaretler. {POLICY.noShowWindowDays} günde {POLICY.noShowLimit} kez olursa {POLICY.banDays} gün rezervasyon yapamazsın.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function ResCard({ r, cafe, now }: { r: Reservation; cafe: Cafe | null | undefined; now: number }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const m = findMatch(r.matchId);
  const info = m ? decorate(m) : null;
  const can = canCancel(r, now);
  const deadline = r.kickoff ? cancelDeadline(r.kickoff).getTime() : 0;
  const leftMin = Math.max(0, Math.round((deadline - now) / 60000));
  const leftText =
    leftMin >= 48 * 60
      ? `${Math.floor(leftMin / 1440)} gün ${Math.floor((leftMin % 1440) / 60)} saat`
      : leftMin >= 120
        ? `${Math.floor(leftMin / 60)} saat ${leftMin % 60} dk`
        : `${leftMin} dk`;

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await cancelReservation(r);
    } catch (e) {
      setError((e as Error).message);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div className="my-res" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30, height: 0 }}>
      {m && (
        <div className="my-res-head">
          <Crest id={m.home} size={28} />
          <b>
            {team(m.home).name} – {team(m.away).name}
          </b>
          <Crest id={m.away} size={28} />
        </div>
      )}
      <div className="my-res-body">
        <div>
          <span className="faint">Mekan</span>
          <b>{cafe?.name ?? '…'}</b>
          <span className="muted">{cafe ? `${cafe.address}, ${districtName(cafe.city, cafe.district)}` : ''}</span>
        </div>
        <div>
          <span className="faint">Ne zaman</span>
          <b>{info ? `${info.day}, ${info.dateText} · ${info.time ?? ''}` : ''}</b>
          <span className="muted">
            {r.people} kişi · kod <b>{r.code}</b>
          </span>
        </div>
      </div>
      <div className="my-res-actions">
        {cafe && (
          <>
            <a className="btn btn-ghost btn-sm" href={telLink(cafe.phone)}>
              <Phone size={14} /> {formatPhone(cafe.phone)}
            </a>
            <a className="btn btn-ghost btn-sm" href={waLink(cafe.phone, `Merhaba, ${r.code} kodlu ${r.people} kişilik rezervasyonum hakkında yazıyorum.`)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={14} /> WhatsApp
            </a>
            <a className="btn btn-ghost btn-sm" href={directionsLink(cafe.lat, cafe.lng)} target="_blank" rel="noopener noreferrer">
              <Navigation size={14} /> Yol tarifi
            </a>
          </>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          {can ? (
            confirming ? (
              <>
                <span className="faint" style={{ fontSize: 13 }}>Emin misin?</span>
                <button className="btn btn-sm btn-ghost danger" disabled={busy} onClick={cancel}>
                  <Check size={14} /> {busy ? 'İptal ediliyor…' : 'Evet, iptal et'}
                </button>
                <button className="btn btn-sm btn-soft" onClick={() => setConfirming(false)}>
                  Vazgeç
                </button>
              </>
            ) : (
              <>
                <span className="faint" style={{ fontSize: 12.5, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  <CalendarClock size={13} /> İptal için {leftText}
                </span>
                <button className="btn btn-sm btn-ghost danger" onClick={() => setConfirming(true)}>
                  <X size={14} /> İptal et
                </button>
              </>
            )
          ) : (
            <span className="faint" style={{ fontSize: 12.5, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <Ticket size={13} /> Maça 1 saatten az kaldı, iptal kapalı
            </span>
          )}
        </span>
      </div>
      {error && <div className="form-error" style={{ marginTop: 10 }}>{error}</div>}
    </motion.div>
  );
}

function ProfileCard({ uid, email, name: n0, phone: p0 }: { uid: string; email: string; name: string; phone: string }) {
  const [name, setName] = useState(n0);
  const [phone, setPhone] = useState(p0);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const missing = !n0 || !p0;

  async function save() {
    setError(null);
    setState('saving');
    try {
      await saveCustomer({ uid, email, name, phone });
      setState('saved');
      setTimeout(() => setState('idle'), 1600);
    } catch (e) {
      setError((e as Error).message);
      setState('idle');
    }
  }

  return (
    <section className="card panel-card">
      <h2>Bilgilerim</h2>
      <p>{missing ? 'Rezervasyon yapabilmek için adını ve telefonunu tamamla.' : 'Mekanlar rezervasyon için bu bilgileri görür.'}</p>
      <div className="field">
        <label htmlFor="pf-name">Ad soyad</label>
        <input id="pf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="pf-phone">Telefon</label>
        <input id="pf-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="05xx xxx xx xx" />
      </div>
      {error && <div className="form-error">{error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={state === 'saving'}>
          {state === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {state === 'saved' && (
          <motion.span className="saved" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}>
            <Check size={16} /> Kaydedildi
          </motion.span>
        )}
      </div>
    </section>
  );
}
