import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { admin } from '@/lib/server/firebaseAdmin';
import { retrieveCheckout } from '@/lib/server/iyzico';

export const runtime = 'nodejs';

/** Takvim ayı ekler (31 Ocak + 1 ay → 28/29 Şubat) */
function addMonths(ms: number, months: number) {
  const d = new Date(ms);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.getTime();
}

/**
 * iyzico ödeme sayfası ödemeden sonra buraya POST eder (token).
 * Sonuç her zaman iyzico'dan ayrıca sorgulanır; başarılıysa üyelik aktif edilir ve süre uzatılır.
 * Aynı ödeme iki kez işlenmez.
 */
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const back = (q: string) => NextResponse.redirect(`${origin}/panel?odeme=${q}`, 303);
  try {
    const form = await req.formData();
    const token = String(form.get('token') ?? '');
    if (!token) return back('hata');

    const r = await retrieveCheckout(token);
    const { db } = admin();
    const payRef = db.doc(`payments/${r.conversationId}`);

    const outcome = await db.runTransaction(async (tx) => {
      const pay = await tx.get(payRef);
      if (!pay.exists) return 'hata';
      const p = pay.data() as { cafeId: string; plan: string; months: number; amount: number; status: string; token?: string };
      if (p.status === 'paid') return 'ok';
      if (p.token && p.token !== token) return 'hata';

      const cafeRef = db.doc(`cafes/${p.cafeId}`);
      const cafe = await tx.get(cafeRef);
      const ok = r.paymentStatus === 'SUCCESS' && Number(r.paidPrice) >= p.amount && cafe.exists;
      if (!ok) {
        tx.update(payRef, { status: 'failed', paymentStatus: r.paymentStatus, checkedAt: FieldValue.serverTimestamp() });
        return 'hata';
      }

      // Kalan süre yanmasın: üyelik/deneme hâlâ sürüyorsa bitişin üstüne ekle
      const m = cafe.get('membership') as { status?: string; renewsAt?: Timestamp } | undefined;
      const end = m?.renewsAt?.toMillis?.() ?? 0;
      const base = m?.status !== 'canceled' && end > Date.now() ? end : Date.now();
      tx.update(cafeRef, {
        plan: p.plan,
        membership: { status: 'active', startedAt: Timestamp.now(), renewsAt: Timestamp.fromMillis(addMonths(base, p.months)) },
      });
      tx.update(payRef, { status: 'paid', paymentId: r.paymentId, paidPrice: Number(r.paidPrice), paidAt: FieldValue.serverTimestamp() });
      return 'ok';
    });
    return back(outcome);
  } catch (e) {
    console.error('[odeme/sonuc]', e);
    return back('hata');
  }
}

/** Tarayıcıdan doğrudan açılırsa panele dön */
export function GET(req: Request) {
  return NextResponse.redirect(`${new URL(req.url).origin}/panel`, 303);
}
