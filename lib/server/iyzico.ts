import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';

/**
 * iyzico Ortak Ödeme Sayfası (Checkout Form) istemcisi — IYZWSv2 imzalı istekler.
 * Test için: https://sandbox-merchant.iyzipay.com üzerinden ücretsiz test hesabı → Ayarlar → API anahtarları.
 * Canlıda IYZICO_BASE_URL=https://api.iyzipay.com
 */
const BASE = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';

export const iyzicoConfigured = () => Boolean(process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY);
export const iyzicoSandbox = () => BASE.includes('sandbox');

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.IYZICO_API_KEY!;
  const secret = process.env.IYZICO_SECRET_KEY!;
  const payload = JSON.stringify(body);
  const randomKey = `${Date.now()}${randomBytes(4).toString('hex')}`;
  const signature = createHmac('sha256', secret).update(randomKey + path + payload).digest('hex');
  const auth = Buffer.from(`apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`).toString('base64');
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `IYZWSv2 ${auth}`, 'x-iyzi-rnd': randomKey },
    body: payload,
    cache: 'no-store',
  });
  const data = (await res.json()) as T & { status?: string; errorMessage?: string };
  if (data.status !== 'success') throw new Error(data.errorMessage || `iyzico hatası (${res.status})`);
  return data;
}

/** iyzico fiyatları ondalıklı metin ister: 1000 → "1000.0" */
const money = (n: number) => n.toFixed(1);

export interface CheckoutInit {
  conversationId: string;
  amount: number;
  itemId: string;
  itemName: string;
  callbackUrl: string;
  buyer: { id: string; name: string; surname: string; email: string; phone: string; address: string; city: string; ip: string };
}

export async function initCheckout(p: CheckoutInit) {
  return call<{ token: string; paymentPageUrl: string; checkoutFormContent: string }>('/payment/iyzipos/checkoutform/initialize/auth/ecom', {
    locale: 'tr',
    conversationId: p.conversationId,
    price: money(p.amount),
    paidPrice: money(p.amount),
    currency: 'TRY',
    basketId: p.conversationId,
    paymentGroup: 'SUBSCRIPTION',
    callbackUrl: p.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: p.buyer.id,
      name: p.buyer.name,
      surname: p.buyer.surname,
      gsmNumber: `+${p.buyer.phone}`,
      email: p.buyer.email,
      // iyzico TC kimlik no ister; dijital hizmet satışında yaygın olarak varsayılan değer gönderilir — sözleşmende kontrol et
      identityNumber: process.env.IYZICO_DEFAULT_IDENTITY || '11111111111',
      registrationAddress: p.buyer.address,
      ip: p.buyer.ip,
      city: p.buyer.city,
      country: 'Turkey',
    },
    billingAddress: { contactName: `${p.buyer.name} ${p.buyer.surname}`, city: p.buyer.city, country: 'Turkey', address: p.buyer.address },
    basketItems: [{ id: p.itemId, name: p.itemName, category1: 'Üyelik', itemType: 'VIRTUAL', price: money(p.amount) }],
  });
}

export async function retrieveCheckout(token: string) {
  return call<{ paymentStatus: string; paymentId: string; paidPrice: number; price: number; conversationId: string; basketId: string; fraudStatus?: number }>(
    '/payment/iyzipos/checkoutform/auth/ecom/detail',
    { locale: 'tr', token },
  );
}
