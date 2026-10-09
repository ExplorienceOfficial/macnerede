'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { MessageCircle, Minus, Phone, Plus, Scissors, X } from 'lucide-react';
import Crest from './Crest';
import { Barcode } from './art';
import Link from 'next/link';
import AuthPanel from './AuthPanel';
import { createReservation, saveCustomer } from '@/lib/db';
import { formatPhone, telLink, useAccount, waLink } from '@/lib/hooks';
import { districtName } from '@/lib/places';
import { team } from '@/lib/teams';
import { compLabel, compLogo, type MatchInfo } from '@/lib/fixtures';
import { POLICY, type Broadcast, type Cafe, type Reservation } from '@/lib/types';

interface Props {
  cafe: Cafe;
  b: Broadcast;
  match: MatchInfo;
  onClose: () => void;
  onReserved: (people: number) => void;
}

type Step = 'form' | 'printing' | 'done';

export default function ReserveSheet({ cafe, b, match, onClose, onReserved }: Props) {
  const account = useAccount();
  const left = Math.max(0, b.seats - b.reserved);
  const max = Math.min(POLICY.maxPeople, left);
  const [step, setStep] = useState<Step>('form');
  const [people, setPeople] = useState(Math.min(2, max));
  const [dir, setDir] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Reservation | null>(null);
  const started = Date.now() >= new Date(match.kickoffISO).getTime();

  // Ad ve telefon müşteri profilinden gelir
  useEffect(() => {
    if (account?.customer) {
      setName((n) => n || account.customer!.name);
      setPhone((p) => p || account.customer!.phone);
    }
  }, [account?.customer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && step !== 'printing' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, step]);

  function bump(d: number) {
    setDir(d);
    setPeople((p) => Math.max(1, Math.min(max, p + d)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!account || account.role !== 'customer') return;
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) return setError('Rezervasyon için adını yaz.');
    if (digits.length < 10) return setError('Telefon numarası eksik görünüyor.');
    setError(null);
    setStep('printing');
    try {
      // Profil eksikse (Google ile giriş) ya da değiştiyse kaydet
      const c = account.customer;
      if (!c || c.name !== name.trim() || c.phone !== digits) await saveCustomer({ uid: account.uid, email: account.email, name, phone: digits });
      const r = await createReservation({
        cafeId: cafe.id,
        matchId: match.id,
        userId: account.uid,
        name: name.trim(),
        phone: digits,
        people,
        kickoff: match.kickoffISO,
      });
      setRes(r);
      onReserved(people);
      setStep('done');
    } catch (err) {
      setError((err as Error).message);
      setStep('form');
    }
  }

  const home = team(match.home);
  const away = team(match.away);

  return (
    <motion.div
      className="sheet-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && step !== 'printing' && onClose()}
    >
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Yer ayırt"
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        <button className="icon-btn sheet-close" onClick={onClose} disabled={step === 'printing'} aria-label="Kapat">
          <X size={18} />
        </button>

        <AnimatePresence mode="wait" initial={false}>
          {step !== 'done' ? (
            <motion.div key="form" exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <h2>{cafe.name}</h2>
              <p className="sheet-sub">
                {districtName(cafe.city, cafe.district)} · {cafe.address}
              </p>
              <a className="call-line" href={telLink(cafe.phone)}>
                <Phone size={14} /> {formatPhone(cafe.phone)} <span>· Ara</span>
              </a>

              <div className="mini-match">
                <Crest id={match.home} size={24} />
                <span>{home.short}</span>
                <span className="faint">–</span>
                <span>{away.short}</span>
                <Crest id={match.away} size={24} />
                <span className="when">
                  {match.day} {match.time ?? ''}
                </span>
              </div>

              {started ? (
                <div className="form-error">Maç başladı, bu maç için rezervasyon kapandı. Yer sormak için mekanı arayabilirsin.</div>
              ) : account === undefined ? (
                <div className="skeleton" style={{ height: 220 }} />
              ) : !account ? (
                <AuthPanel compact intro="Yer ayırtmak için hesabınla gir ya da 30 saniyede hesap oluştur. Rezervasyonlarını Hesabım’dan görür, istersen iptal edersin." />
              ) : account.role === 'cafe' ? (
                <div className="form-error">Mekan hesabıyla rezervasyon yapılamaz. Taraftar olarak ayırtmak için mekan hesabından çıkış yap.</div>
              ) : (
              <form onSubmit={submit}>
              <div className="people">
                <div className="people-label">
                  Kaç kişisiniz?
                  <small>{left} kişilik yer kaldı</small>
                </div>
                <div className="stepper">
                  <button type="button" onClick={() => bump(-1)} disabled={people <= 1} aria-label="Azalt">
                    <Minus size={18} />
                  </button>
                  <div className="val" aria-live="polite">
                    <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                      <motion.span
                        key={people}
                        custom={dir}
                        initial={{ y: dir * 22, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: dir * -22, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        {people}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <button type="button" onClick={() => bump(1)} disabled={people >= max} aria-label="Arttır">
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="r-name">Adın</label>
                <input id="r-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Rezervasyon kimin adına?" />
              </div>
              <div className="field">
                <label htmlFor="r-phone">Telefon</label>
                <input id="r-phone" className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="05xx xxx xx xx" />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div className="form-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button className="btn btn-primary btn-lg btn-block" disabled={step === 'printing' || max === 0}>
                {step === 'printing' ? (
                  <span className="printing">
                    Bilet kesiliyor
                    <span className="cut-line">
                      <motion.span
                        style={{ position: 'absolute', top: -9 }}
                        animate={{ left: ['0%', '85%'] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                      >
                        <Scissors size={18} style={{ transform: 'rotate(-90deg) scaleX(-1)' }} />
                      </motion.span>
                    </span>
                  </span>
                ) : (
                  `${people} kişilik yer ayırt`
                )}
              </button>
              <ul className="policy">
                <li>
                  <b>Ücretsiz iptal:</b> maça {POLICY.cancelCutoffMin / 60} saat kalana kadar, <Link href="/hesap">Hesabım</Link>’dan. Son 1 saatte iptal yok.
                </li>
                <li>Bir maç için tek aktif rezervasyon, en fazla {POLICY.maxPeople} kişi.</li>
                <li>
                  Gelmezsen mekan “gelmedi” işaretler; {POLICY.noShowWindowDays} günde {POLICY.noShowLimit} kez olursa {POLICY.banDays} gün rezervasyon yapamazsın.
                </li>
              </ul>
              <p className="legal">Adın ve telefonun sadece {cafe.name} ile paylaşılır. Ücret mekanda ödenir.</p>
              </form>
              )}
            </motion.div>
          ) : (
            res && <Done key="done" res={res} cafe={cafe} match={match} onClose={onClose} />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function Done({ res, cafe, match, onClose }: { res: Reservation; cafe: Cafe; match: MatchInfo; onClose: () => void }) {
  const home = team(match.home);
  const away = team(match.away);

  useEffect(() => {
    const t = setTimeout(() => {
      const colors = [...home.colors, ...away.colors];
      const shoot = (x: number, angle: number) =>
        confetti({ particleCount: 70, spread: 65, angle, startVelocity: 42, origin: { x, y: 0.55 }, colors, zIndex: 120, disableForReducedMotion: true, scalar: 0.9 });
      shoot(0.25, 60);
      shoot(0.75, 120);
    }, 1350);
    return () => clearTimeout(t);
  }, [home.colors, away.colors]);

  const wa = waLink(
    cafe.phone,
    `Merhaba ${cafe.name}, MaçNerede üzerinden ${match.day} ${match.time ?? ''} ${home.name} – ${away.name} maçı için ${res.people} kişilik yer ayırttım. Kod: ${res.code} (${res.name})`,
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
        Yerin ayrıldı!
      </motion.h2>
      <motion.p className="sheet-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
        Mekana kodu söylemen yeterli. Ekran görüntüsünü al, kaybolmasın.
      </motion.p>

      <div className="printer">
        <motion.div className="printer-slot" initial={{ scaleX: 0.7, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.25 }} />
        <div className="printer-paper">
          {/* Yazıcıdan kesik kesik çıkan bilet */}
          <motion.div
            style={{ position: 'relative' }}
            initial={{ y: '-108%' }}
            animate={{ y: ['-108%', '-74%', '-72%', '-40%', '-38%', '0%'] }}
            transition={{ duration: 1.05, times: [0, 0.25, 0.35, 0.6, 0.7, 1], ease: 'easeOut', delay: 0.15 }}
          >
            <motion.div className="ticket" animate={{ rotate: [0, 0, -1.4, 1, -0.4, 0] }} transition={{ duration: 0.45, delay: 1.25 }}>
              <div className="ticket-main">
                <div className="ticket-band">
                  <i style={{ background: home.colors[0] }} />
                  <i style={{ background: away.colors[0] }} />
                </div>
                <div className="ticket-brand">
                  MAÇNEREDE · REZERVASYON
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={compLogo[match.comp]} alt={compLabel[match.comp]} />
                </div>
                <div className="ticket-vs">
                  <Crest id={match.home} size={26} />
                  {home.short}
                  <em>vs</em>
                  {away.short}
                  <Crest id={match.away} size={26} />
                </div>
                <div className="ticket-line">
                  <b>
                    {match.day}, {match.dateText} · {match.time ?? 'saat açıklanacak'}
                  </b>
                </div>
                <div className="ticket-line">{cafe.name}</div>
                <div className="ticket-line">
                  {cafe.address}, {districtName(cafe.city, cafe.district)}
                </div>
                <div className="ticket-line" style={{ marginTop: 6 }}>
                  Ad: <b>{res.name}</b>
                </div>
              </div>
              <motion.div className="ticket-stub" initial={{ x: 0, rotate: 0 }} animate={{ x: 12, y: 6, rotate: 6 }} transition={{ type: 'spring', stiffness: 160, damping: 9, delay: 1.95 }}>
                <small>KİŞİ</small>
                <span className="people-big">{res.people}</span>
                <small>KOD</small>
                <span className="ticket-code">{res.code}</span>
                <span className="bc">
                  <Barcode code={res.code} height={34} />
                </span>
              </motion.div>
            </motion.div>
            <motion.div
              className="stamp"
              initial={{ scale: 2.8, opacity: 0, rotate: -26 }}
              animate={{ scale: 1, opacity: 1, rotate: -12 }}
              transition={{ type: 'spring', stiffness: 520, damping: 20, delay: 1.2 }}
            >
              AYIRTILDI
            </motion.div>
          </motion.div>
        </div>
      </div>

      <motion.div className="done-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.1 }}>
        <a className="btn btn-wa btn-lg btn-block" href={wa} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={18} /> Mekana WhatsApp’tan da haber ver
        </a>
        <div className="row-2" style={{ gap: 8 }}>
          <a className="btn btn-ghost btn-lg" href={telLink(cafe.phone)}>
            <Phone size={17} /> Mekanı ara
          </a>
          <Link className="btn btn-ghost btn-lg" href="/hesap">
            Rezervasyonlarım
          </Link>
        </div>
        <button className="btn btn-soft btn-lg btn-block" onClick={onClose}>
          Tamam
        </button>
        <p className="legal">Maça 1 saat kalana kadar Hesabım’dan ücretsiz iptal edebilirsin.</p>
      </motion.div>
    </motion.div>
  );
}
