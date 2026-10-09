'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Check, CreditCard, Lock, Star, X } from 'lucide-react';
import { demoMode, startPayment } from '@/lib/db';
import { tl } from '@/lib/hooks';
import { PERIODS, periodPrice, plans, type Cafe, type PeriodId, type PlanId } from '@/lib/types';

/** Mekan üyelik ödemesi: plan + dönem seçimi → iyzico güvenli ödeme sayfası */
export default function PaymentSheet({ cafe, onClose, onPaid }: { cafe: Cafe; onClose: () => void; onPaid: (c: Cafe) => void }) {
  const [plan, setPlan] = useState<PlanId>(cafe.plan);
  const [period, setPeriod] = useState<PeriodId>(1);
  const [state, setState] = useState<'idle' | 'busy' | 'redirect' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  /** Ödeme sonrası kesin bitiş tarihi (güncellenen üyelikten tekrar hesaplanmasın) */
  const [paidUntil, setPaidUntil] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && state === 'idle' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, state]);

  const total = periodPrice(plan, period);
  const months = PERIODS[period].months;
  const now = Date.now();
  const end = new Date(cafe.membership.renewsAt).getTime();
  const newEnd = new Date(cafe.membership.status !== 'canceled' && end > now ? end : now);
  newEnd.setMonth(newEnd.getMonth() + months);
  const endText = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(newEnd);

  async function pay() {
    setError(null);
    setState('busy');
    try {
      const r = await startPayment(cafe, plan, period);
      if ('redirect' in r) {
        setState('redirect');
        window.location.href = r.redirect;
        return;
      }
      setPaidUntil(new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(r.demo.membership.renewsAt)));
      setState('done');
      onPaid(r.demo);
      confetti({ particleCount: 110, spread: 80, origin: { y: 0.5 }, colors: ['#1e7a4c', '#e2b54a', '#ffffff'], zIndex: 120, disableForReducedMotion: true });
    } catch (e) {
      setError((e as Error).message);
      setState('idle');
    }
  }

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && state === 'idle' && onClose()}>
      <motion.div className="sheet" role="dialog" aria-modal="true" aria-label="Üyelik ödemesi" initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
        <button className="icon-btn sheet-close" onClick={onClose} disabled={state === 'busy' || state === 'redirect'} aria-label="Kapat">
          <X size={18} />
        </button>

        <AnimatePresence mode="wait" initial={false}>
          {state === 'done' ? (
            <motion.div key="done" className="pay-done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <motion.span className="pay-check" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }}>
                <Check size={34} />
              </motion.span>
              <h2>Ödeme alındı!</h2>
              <p className="sheet-sub">
                {plans[plan].name} üyeliğin {paidUntil ?? endText} tarihine kadar aktif.
                {demoMode && ' (Demo modu: gerçek ödeme alınmadı.)'}
              </p>
              <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 18 }} onClick={onClose}>
                Tamam
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" exit={{ opacity: 0 }}>
              <h2>Üyeliğini öde</h2>
              <p className="sheet-sub">{cafe.name} · ödeme sonrası üyeliğin hemen uzar, kalan günlerin yanmaz.</p>

              <div className="pay-plans">
                {(Object.keys(plans) as PlanId[]).map((id) => (
                  <motion.button key={id} type="button" className={`pay-plan${id === 'pro' ? ' pro' : ''}`} aria-pressed={plan === id} onClick={() => setPlan(id)} whileTap={{ scale: 0.97 }}>
                    <b>
                      {plans[id].name} {id === 'pro' && <Star size={13} fill="var(--gold)" color="var(--gold)" />}
                    </b>
                    <span>{tl(plans[id].price)} / ay</span>
                    <small>{plans[id].tagline}</small>
                  </motion.button>
                ))}
              </div>

              <div className="seg" style={{ margin: '14px 0 4px' }}>
                {([1, 12] as PeriodId[]).map((p) => (
                  <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>
                    {period === p && <motion.span layoutId="pay-period" className="seg-thumb" />}
                    {PERIODS[p].label}
                    {p === 12 && <span className="gift-tag">2 ay hediye</span>}
                  </button>
                ))}
              </div>

              <div className="pay-summary">
                <div>
                  <span>Toplam</span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.b key={total} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
                      {tl(total)}
                    </motion.b>
                  </AnimatePresence>
                </div>
                <div>
                  <span>Yeni bitiş</span>
                  <b>{endText}</b>
                </div>
              </div>

              {error && <div className="form-error">{error}</div>}

              <button className="btn btn-primary btn-lg btn-block" onClick={pay} disabled={state !== 'idle'}>
                <CreditCard size={18} /> {state === 'busy' ? 'Hazırlanıyor…' : state === 'redirect' ? 'Ödeme sayfasına gidiliyor…' : `${tl(total)} öde`}
              </button>
              <p className="legal" style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={13} /> Kart bilgilerin iyzico’nun güvenli sayfasında girilir; NeredeMaç kartını görmez.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
