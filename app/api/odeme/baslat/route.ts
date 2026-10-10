import { CONTACT_EMAIL, PAYMENTS_ENABLED } from '@/lib/site';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { admin, adminConfigured } from '@/lib/server/firebaseAdmin';
import { iyzicoConfigured, initCheckout } from '@/lib/server/iyzico';
import { PERIODS, periodPrice, plans, type PeriodId, type PlanId } from '@/lib/types';

export const runtime = 'nodejs';

/** Mekan üyelik ödemesini başlatır: iyzico ödeme sayfasının adresini döner */
export async function POST(req: Request) {
  // Ödeme şimdilik kapalı (lib/site.ts → PAYMENTS_ENABLED)
  if (!PAYMENTS_ENABLED) return NextResponse.json({ error: 'Ödeme şu an kapalı.' }, { status: 404 });
  if (!iyzicoConfigured() || !adminConfigured()) {
    return NextResponse.json({ error: 'Ödeme altyapısı henüz bağlı değil. Üyelik için bizimle iletişime geç.' }, { status: 503 });
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Önce mekan hesabınla giriş yap.' }, { status: 401 });

  const { db, auth } = admin();
  let uid: string;
  try {
    uid = (await auth.verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: 'Oturumun süresi dolmuş, tekrar giriş yap.' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: PlanId; period?: number };
  const plan = body.plan && body.plan in plans ? body.plan : null;
  const period = (body.period === 1 || body.period === 12 ? body.period : null) as PeriodId | null;
  if (!plan || !period) return NextResponse.json({ error: 'Plan ya da dönem geçersiz.' }, { status: 400 });

  const cafeSnap = await db.doc(`cafes/${uid}`).get();
  if (!cafeSnap.exists) return NextResponse.json({ error: 'Bu hesaba bağlı mekan bulunamadı.' }, { status: 403 });
  const cafe = cafeSnap.data() as { name: string; phone: string; address: string; city: string };
  const user = await auth.getUser(uid);

  const amount = periodPrice(plan, period);
  const months = PERIODS[period].months;
  const ref = db.collection('payments').doc();
  await ref.set({ cafeId: uid, cafeName: cafe.name, plan, months, amount, status: 'pending', createdAt: FieldValue.serverTimestamp() });

  const origin = req.headers.get('origin') || new URL(req.url).origin;
  const [first, ...rest] = cafe.name.trim().split(/\s+/);
  try {
    const init = await initCheckout({
      conversationId: ref.id,
      amount,
      itemId: `${plan}-${months}`,
      itemName: `NeredeMaç ${plans[plan].name} üyelik (${PERIODS[period].label})`,
      callbackUrl: `${origin}/api/odeme/sonuc`,
      buyer: {
        id: uid,
        name: first || 'Mekan',
        surname: rest.join(' ') || 'İşletmesi',
        email: user.email ?? CONTACT_EMAIL,
        phone: cafe.phone,
        address: cafe.address || cafe.city,
        city: cafe.city,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      },
    });
    await ref.update({ token: init.token });
    return NextResponse.json({ paymentPageUrl: init.paymentPageUrl });
  } catch (e) {
    await ref.update({ status: 'failed', error: (e as Error).message });
    console.error('[odeme/baslat]', e);
    return NextResponse.json({ error: `Ödeme başlatılamadı: ${(e as Error).message}` }, { status: 502 });
  }
}
