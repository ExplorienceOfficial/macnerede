'use client';

// Tek veri katmanı: Firebase ayarlıysa Firestore + Auth, değilse tarayıcıda çalışan demo modu.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  setDoc,
  deleteDoc,
  updateDoc,
  runTransaction,
  Timestamp,
  addDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { creatorAuth, firebase, firebaseEnabled } from './firebase';
import { demoBroadcasts, demoCafes } from './demo-seed';
import { CODE_PATTERN, MAX_PHOTOS, PERIODS, POLICY, TRIAL_DAYS, periodPrice, type ActivationCode, type Broadcast, type Cafe, type CafePhoto, type Customer, type Payment, type PeriodId, type PlanId, type Reservation } from './types';

/** Aktivasyon kodlarının varsayılan süresi (yönetim sayfası da bunu kullanır) */
export const CODE_DAYS = 365;

export const demoMode = !firebaseEnabled;

const LIVE_STATUSES = ['trial', 'active'];
const bId = (cafeId: string, matchId: string) => `${cafeId}_${matchId}`;

export type NewCafe = Omit<Cafe, 'id' | 'membership' | 'createdAt'>;

/** Denemesi bitmiş mekanlar listeden kendiliğinden düşer (ödeme gelince status 'active' olur) */
const isListed = (c: Cafe, now = Date.now()) =>
  c.membership.status === 'active' || (c.membership.status === 'trial' && new Date(c.membership.renewsAt).getTime() > now);

// Firestore'da tarihler Timestamp olarak durur (kurallar deneme süresini doğrulayabilsin diye); uygulama içinde ISO string
const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : String(v ?? ''));
function cafeFromDoc(d: DocumentSnapshot): Cafe {
  const data = d.data() as Omit<Cafe, 'id'> & { membership: Record<string, unknown>; createdAt: unknown };
  return {
    ...data,
    id: d.id,
    createdAt: iso(data.createdAt),
    membership: {
      status: data.membership.status as Cafe['membership']['status'],
      startedAt: iso(data.membership.startedAt),
      renewsAt: iso(data.membership.renewsAt),
    },
  };
}

// ---------------- demo depolama ----------------
const K = { cafes: 'mn.cafes', bc: 'mn.broadcasts', res: 'mn.reservations', acc: 'mn.accounts', session: 'mn.session', codes: 'mn.codes', photos: 'mn.photos', adminCodes: 'mn.adminCodes', cust: 'mn.cust', custAcc: 'mn.custAccounts', custProfiles: 'mn.custProfiles', payments: 'mn.payments' };
const SESSION_EVENT = 'mn-session';

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));

let seedCache: Broadcast[] | null = null;
const demo = {
  cafes: (): Cafe[] => [...demoCafes, ...lsGet<Cafe[]>(K.cafes, [])],
  broadcasts(): Broadcast[] {
    seedCache ??= demoBroadcasts();
    const map = new Map(seedCache.map((b) => [bId(b.cafeId, b.matchId), b]));
    for (const [k, b] of Object.entries(lsGet<Record<string, Broadcast | null>>(K.bc, {}))) {
      if (b) map.set(k, b);
      else map.delete(k);
    }
    return [...map.values()];
  },
  putBroadcast(key: string, b: Broadcast | null) {
    const all = lsGet<Record<string, Broadcast | null>>(K.bc, {});
    all[key] = b;
    lsSet(K.bc, all);
  },
  reservations: (): Reservation[] => lsGet<Reservation[]>(K.res, []),
};

// Demo şifresi sadece tarayıcıda tutulur; gerçek kimlik doğrulama Firebase Auth ile yapılır
const weakHash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7).toString(36);

function makeCode() {
  const a = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
  return 'MN-' + Array.from({ length: 5 }, () => a[Math.floor(Math.random() * a.length)]).join('');
}

function membershipFor(days: number) {
  const now = new Date();
  const renews = new Date(now.getTime() + days * 86400000);
  return { status: 'trial' as const, startedAt: now.toISOString(), renewsAt: renews.toISOString() };
}

export const POPUP_BLOCKED = 'Tarayıcı Google penceresini engelledi. Adres çubuğundan bu siteye açılır pencere izni verip tekrar dene.';

function authError(e: unknown): Error {
  const code = (e as { code?: string })?.code ?? '';
  const msg: Record<string, string> = {
    'auth/email-already-in-use': 'Bu e-posta ile zaten bir mekan kayıtlı. Giriş yapmayı dene.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/invalid-email': 'E-posta adresi geçersiz görünüyor.',
    'auth/invalid-credential': 'E-posta ya da şifre hatalı.',
    'auth/user-not-found': 'E-posta ya da şifre hatalı.',
    'auth/wrong-password': 'E-posta ya da şifre hatalı.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı, birkaç dakika sonra tekrar dene.',
    'auth/operation-not-allowed': 'E-posta ile kayıt henüz açılmamış (Firebase → Authentication → E-posta/Şifre).',
    'auth/network-request-failed': 'Bağlantı kurulamadı, internetini kontrol et.',
    'auth/popup-blocked': POPUP_BLOCKED,
    'permission-denied': 'Kayıt veritabanına yazılamadı. Firestore kuralları yüklenmemiş olabilir.',
  };
  if (code && !msg[code]) console.error('[firebase]', e);
  return new Error(msg[code] ?? (e instanceof Error ? e.message : 'Bir şeyler ters gitti.'));
}

// ---------------- mekanlar ----------------
export async function listCafes(): Promise<Cafe[]> {
  if (demoMode) {
    await wait(250);
    return demo.cafes().filter((c) => isListed(c));
  }
  const { db } = firebase();
  const snap = await getDocs(query(collection(db, 'cafes'), where('membership.status', 'in', LIVE_STATUSES)));
  return snap.docs.map(cafeFromDoc).filter((c) => isListed(c));
}

export async function getCafe(id: string): Promise<Cafe | null> {
  if (demoMode) {
    await wait(200);
    return demo.cafes().find((c) => c.id === id) ?? null;
  }
  const snap = await getDoc(doc(firebase().db, 'cafes', id));
  return snap.exists() ? cafeFromDoc(snap) : null;
}

// ---------------- yayınlar ----------------
export async function listBroadcasts(matchIds: string[]): Promise<Broadcast[]> {
  if (!matchIds.length) return [];
  if (demoMode) {
    await wait(300);
    const set = new Set(matchIds);
    return demo.broadcasts().filter((b) => set.has(b.matchId));
  }
  const { db } = firebase();
  const out: Broadcast[] = [];
  for (let i = 0; i < matchIds.length; i += 30) {
    const snap = await getDocs(query(collection(db, 'broadcasts'), where('matchId', 'in', matchIds.slice(i, i + 30))));
    snap.forEach((d) => out.push(bcFromDoc(d)));
  }
  return out;
}

export async function listCafeBroadcasts(cafeId: string): Promise<Broadcast[]> {
  if (demoMode) return demo.broadcasts().filter((b) => b.cafeId === cafeId);
  const snap = await getDocs(query(collection(firebase().db, 'broadcasts'), where('cafeId', '==', cafeId)));
  return snap.docs.map(bcFromDoc);
}

export async function saveBroadcast(b: Broadcast) {
  if (demoMode) {
    await wait(300);
    demo.putBroadcast(bId(b.cafeId, b.matchId), b);
    return;
  }
  const clean: Record<string, unknown> = Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined));
  if (b.kickoff) clean.kickoff = Timestamp.fromDate(new Date(b.kickoff));
  await setDoc(doc(firebase().db, 'broadcasts', bId(b.cafeId, b.matchId)), clean);
}

function bcFromDoc(d: DocumentSnapshot): Broadcast {
  const x = d.data() as Broadcast & { kickoff?: unknown };
  return { ...x, kickoff: x.kickoff ? iso(x.kickoff) : undefined };
}

function resFromDoc(d: DocumentSnapshot): Reservation {
  const x = d.data() as Omit<Reservation, 'id'> & { kickoff?: unknown; cancelledAt?: unknown };
  return { ...x, id: d.id, kickoff: x.kickoff ? iso(x.kickoff) : undefined, cancelledAt: x.cancelledAt ? iso(x.cancelledAt) : undefined };
}

/** İptal için son an: maça 1 saat kalana kadar */
export const cancelDeadline = (kickoffISO: string) => new Date(new Date(kickoffISO).getTime() - POLICY.cancelCutoffMin * 60000);
export const canCancel = (r: Reservation, now = Date.now()) => r.status === 'new' && !!r.kickoff && now < cancelDeadline(r.kickoff).getTime();

export async function removeBroadcast(cafeId: string, matchId: string) {
  if (demoMode) {
    await wait(250);
    demo.putBroadcast(bId(cafeId, matchId), null);
    return;
  }
  await deleteDoc(doc(firebase().db, 'broadcasts', bId(cafeId, matchId)));
}

// ---------------- rezervasyonlar ----------------
export interface ReservationInput {
  cafeId: string;
  matchId: string;
  /** Rezervasyonu yapan müşteri (giriş zorunlu) */
  userId: string;
  name: string;
  phone: string;
  people: number;
  /** Maçın başlama saati (ISO) */
  kickoff: string;
}

/**
 * Yer ayırır. Kurallar: maç başlamadıysa, en fazla 12 kişi, yer varsa, müşterinin bu maç için başka aktif rezervasyonu yoksa
 * ve son günlerde fazla "gelmedi" almadıysa. Sayaç ile rezervasyon aynı işlemde yazılır.
 */
export async function createReservation(input: ReservationInput): Promise<Reservation> {
  if (Date.now() >= new Date(input.kickoff).getTime()) throw new Error('Maç başladı, rezervasyon kapandı.');
  if (input.people < 1 || input.people > POLICY.maxPeople) throw new Error(`Bir rezervasyon en fazla ${POLICY.maxPeople} kişilik olabilir.`);
  const mine = await listMyReservations(input.userId);
  const ban = noShowBan(mine);
  if (ban) throw new Error(`Son ${POLICY.noShowWindowDays} günde ${POLICY.noShowLimit} kez rezervasyona gelmediğin için ${ban} tarihine kadar yeni rezervasyon yapamazsın.`);
  const active = mine.find((r) => r.matchId === input.matchId && r.status === 'new');
  if (active) throw new Error('Bu maç için zaten aktif bir rezervasyonun var. Önce onu iptal etmen gerekiyor (Hesabım).');

  const r: Reservation = { ...input, id: '', code: makeCode(), createdAt: new Date().toISOString(), status: 'new' };

  if (demoMode) {
    await wait(900);
    const b = demo.broadcasts().find((x) => x.cafeId === input.cafeId && x.matchId === input.matchId);
    if (!b) throw new Error('Bu mekan artık bu maçı vermiyor.');
    if (b.reserved + input.people > b.seats) throw new Error(`Bu maç için yalnızca ${b.seats - b.reserved} kişilik yer kaldı.`);
    r.id = r.code;
    demo.putBroadcast(bId(b.cafeId, b.matchId), { ...b, reserved: b.reserved + input.people, lastRes: r.id });
    lsSet(K.res, [...demo.reservations(), r]);
    return r;
  }

  const { db } = firebase();
  const bRef = doc(db, 'broadcasts', bId(input.cafeId, input.matchId));
  const rRef = doc(collection(db, 'reservations'));
  r.id = rRef.id;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bRef);
    if (!snap.exists()) throw new Error('Bu mekan artık bu maçı vermiyor.');
    const b = snap.data() as Broadcast;
    if (b.reserved + input.people > b.seats) throw new Error(`Bu maç için yalnızca ${b.seats - b.reserved} kişilik yer kaldı.`);
    tx.update(bRef, { reserved: b.reserved + input.people, lastRes: rRef.id });
    const { id: _id, kickoff, ...data } = r;
    tx.set(rRef, { ...data, kickoff: Timestamp.fromDate(new Date(kickoff!)) });
  });
  return r;
}

/** Müşterinin iptali: sadece maça 1 saat kalana kadar; boşalan yer sayaca geri döner */
export async function cancelReservation(res: Reservation): Promise<void> {
  if (!canCancel(res)) throw new Error(`Maça ${POLICY.cancelCutoffMin} dakikadan az kaldığı için bu rezervasyon artık iptal edilemez.`);
  if (demoMode) {
    await wait(500);
    lsSet(K.res, demo.reservations().map((r) => (r.id === res.id ? { ...r, status: 'cancelled', cancelledAt: new Date().toISOString() } : r)));
    const b = demo.broadcasts().find((x) => x.cafeId === res.cafeId && x.matchId === res.matchId);
    if (b) demo.putBroadcast(bId(b.cafeId, b.matchId), { ...b, reserved: Math.max(0, b.reserved - res.people), lastRes: res.id });
    return;
  }
  const { db } = firebase();
  const bRef = doc(db, 'broadcasts', bId(res.cafeId, res.matchId));
  const rRef = doc(db, 'reservations', res.id);
  await runTransaction(db, async (tx) => {
    const [bs, rs] = await Promise.all([tx.get(bRef), tx.get(rRef)]);
    if (!rs.exists() || rs.get('status') !== 'new') throw new Error('Bu rezervasyon zaten değişmiş.');
    const people = rs.get('people') as number;
    tx.update(rRef, { status: 'cancelled', cancelledAt: serverTimestamp() });
    if (bs.exists()) tx.update(bRef, { reserved: Math.max(0, (bs.get('reserved') as number) - people), lastRes: res.id });
  });
}

/** Son 60 günde 2+ "gelmedi" → son gelmeme tarihinden itibaren 30 gün yasak (yasak bitiş tarihini döndürür) */
export function noShowBan(mine: Reservation[], now = Date.now()): string | null {
  const windowStart = now - POLICY.noShowWindowDays * 86400000;
  const recent = mine.filter((r) => r.status === 'noshow' && new Date(r.kickoff ?? r.createdAt).getTime() > windowStart);
  if (recent.length < POLICY.noShowLimit) return null;
  const last = Math.max(...recent.map((r) => new Date(r.kickoff ?? r.createdAt).getTime()));
  const until = last + POLICY.banDays * 86400000;
  return until > now ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(until)) : null;
}

export async function listMyReservations(uid: string): Promise<Reservation[]> {
  if (demoMode) return demo.reservations().filter((r) => r.userId === uid);
  const snap = await getDocs(query(collection(firebase().db, 'reservations'), where('userId', '==', uid)));
  return snap.docs.map(resFromDoc);
}

/** Müşterinin rezervasyonlarını canlı izler (mekan "geldi/gelmedi" işaretleyince anında görünür) */
export function watchMyReservations(uid: string, cb: (list: Reservation[]) => void): () => void {
  const sort = (l: Reservation[]) => l.sort((a, b) => (b.kickoff ?? b.createdAt).localeCompare(a.kickoff ?? a.createdAt));
  if (demoMode) {
    const fire = () => cb(sort(demo.reservations().filter((r) => r.userId === uid)));
    fire();
    const t = setInterval(fire, 4000);
    return () => clearInterval(t);
  }
  return onSnapshot(
    query(collection(firebase().db, 'reservations'), where('userId', '==', uid)),
    (snap) => cb(sort(snap.docs.map(resFromDoc))),
    (err) => console.error('[rezervasyonlarım]', err),
  );
}

export async function listReservations(cafeId: string): Promise<Reservation[]> {
  if (demoMode) {
    await wait(250);
    return demo.reservations().filter((r) => r.cafeId === cafeId);
  }
  const snap = await getDocs(query(collection(firebase().db, 'reservations'), where('cafeId', '==', cafeId)));
  return snap.docs.map(resFromDoc);
}

export async function setReservationStatus(id: string, status: Reservation['status']) {
  if (demoMode) {
    lsSet(K.res, demo.reservations().map((r) => (r.id === id ? { ...r, status } : r)));
    return;
  }
  await updateDoc(doc(firebase().db, 'reservations', id), { status });
}

// ---------------- aktivasyon kodları ----------------
export type CodeCheck = { ok: true; days: number; plan: PlanId } | { ok: false; reason: string };

/** "mac x7k2 9pqr" → "MAC-X7K2-9PQR" (yazarken tireleri kendisi koyar) */
export function normalizeCode(raw: string) {
  const up = raw.toUpperCase();
  // Yapıştırılan metnin içinden kodu ayıkla ("001  MAC-2FHU-DRDT" gibi satır numaralı kopyalar dahil)
  const m = up.match(/MAC[^A-Z0-9]*([A-Z0-9]{4})[^A-Z0-9]*([A-Z0-9]{4})/);
  if (m) return `MAC-${m[1]}-${m[2]}`;
  const c = up.replace(/[^A-Z0-9]/g, '').replace(/^MAC/, '').slice(0, 8);
  if (!c) return '';
  return `MAC-${c.slice(0, 4)}${c.length > 4 ? '-' + c.slice(4) : ''}`;
}

/** Kodu kontrol eder ama kullanmaz; kod kaydın sonunda mekanla aynı işlemde kullanılır */
export async function checkCode(code: string): Promise<CodeCheck> {
  if (!CODE_PATTERN.test(code)) return { ok: false, reason: 'Kod MAC-XXXX-XXXX biçiminde olmalı.' };
  if (demoMode) {
    await wait(500);
    if (lsGet<string[]>(K.codes, []).includes(code)) return { ok: false, reason: 'Bu kod daha önce kullanılmış.' };
    return { ok: true, days: CODE_DAYS, plan: 'standart' };
  }
  const snap = await getDoc(doc(firebase().db, 'codes', code));
  if (!snap.exists()) return { ok: false, reason: 'Böyle bir kod bulunamadı. Harfleri kontrol et.' };
  const c = snap.data() as { used: boolean; days: number; plan: PlanId };
  if (c.used) return { ok: false, reason: 'Bu kod daha önce kullanılmış.' };
  return { ok: true, days: c.days, plan: c.plan };
}

// ---------------- hesap ----------------
export interface RegisterExtras {
  code?: string;
  /** Galeri fotoğrafları (data URL) */
  photos?: string[];
  /** Küçük kapak (data URL) */
  cover?: string | null;
}

export async function registerCafe(email: string, password: string, data: NewCafe, extras: RegisterExtras = {}): Promise<Cafe> {
  if (password.length < 6) throw new Error('Şifre en az 6 karakter olmalı.');
  const { code, photos = [], cover = null } = extras;

  if (demoMode) {
    await wait(700);
    const accounts = lsGet<{ email: string; pass: string; cafeId: string }[]>(K.acc, []);
    if (accounts.some((a) => a.email === email.toLowerCase())) throw new Error('Bu e-posta ile zaten bir mekan kayıtlı. Giriş yapmayı dene.');
    if (code) {
      const chk = await checkCode(code);
      if (!chk.ok) throw new Error(chk.reason);
      lsSet(K.codes, [...lsGet<string[]>(K.codes, []), code]);
    }
    const id = `demo-${Date.now().toString(36)}`;
    const cafe: Cafe = {
      ...data,
      ...(code ? { activationCode: code, plan: 'standart' as PlanId } : {}),
      id,
      cover,
      membership: membershipFor(code ? CODE_DAYS : TRIAL_DAYS),
      createdAt: new Date().toISOString(),
    };
    if (cover && photos.length) cafe.coverPhotoId = `${id}-0`;
    lsSet(K.cafes, [...lsGet<Cafe[]>(K.cafes, []), cafe]);
    lsSet(K.photos,{ ...lsGet<Record<string, CafePhoto[]>>(K.photos, {}), [id]: photos.map((p, i) => ({ id: `${id}-${i}`, data: p, createdAt: cafe.createdAt })) });
    lsSet(K.acc, [...accounts, { email: email.toLowerCase(), pass: weakHash(password), cafeId: id }]);
    setDemoSession(id);
    return cafe;
  }

  const { auth, db } = firebase();
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    throw authError(e);
  }
  const uid = cred.user.uid;
  const ts = (v: string) => Timestamp.fromDate(new Date(v));
  let cafe: Cafe;
  try {
    // Kod kullanımı ve mekan kaydı tek işlemde: ya ikisi birden olur ya hiçbiri (kod iki kez kullanılamaz)
    cafe = await runTransaction(db, async (tx) => {
      let days = TRIAL_DAYS;
      let plan = data.plan;
      if (code) {
        const codeRef = doc(db, 'codes', code);
        const snap = await tx.get(codeRef);
        if (!snap.exists()) throw new Error('Böyle bir aktivasyon kodu bulunamadı.');
        const c = snap.data() as { used: boolean; days: number; plan: PlanId };
        if (c.used) throw new Error('Bu aktivasyon kodu az önce kullanılmış.');
        days = c.days;
        plan = c.plan;
        tx.update(codeRef, { used: true, usedBy: uid, usedAt: serverTimestamp() });
      }
      const result: Cafe = {
        ...data,
        plan,
        id: uid,
        cover,
        ...(code ? { activationCode: code } : {}),
        membership: membershipFor(days),
        createdAt: new Date().toISOString(),
      };
      const { id: _id, ...rest } = result;
      tx.set(doc(db, 'cafes', uid), {
        ...rest,
        createdAt: ts(result.createdAt),
        membership: { status: 'trial', startedAt: ts(result.membership.startedAt), renewsAt: ts(result.membership.renewsAt) },
      });
      return result;
    });
  } catch (e) {
    // Mekan kaydı yazılamadıysa hesabı geri al; yoksa aynı e-postayla tekrar denenemez
    await cred.user.delete().catch(() => {});
    throw authError(e);
  }
  // Fotoğraflar ayrı belgeler; biri yüklenemezse kayıt yine tamamdır, panelden tekrar eklenebilir
  const saved: CafePhoto[] = [];
  for (const p of photos) {
    const ph = await addPhoto(uid, p).catch((err) => (console.error('[foto]', err), null));
    if (ph) saved.push(ph);
  }
  if (cover && saved[0]) await updateDoc(doc(db, 'cafes', uid), { coverPhotoId: saved[0].id }).catch(() => {});
  fireAuthRefresh(); // hesap artık "mekan": üst menü ve panel bunu hemen görsün
  return { ...cafe, coverPhotoId: saved[0]?.id ?? null };
}

export async function login(email: string, password: string): Promise<string> {
  if (demoMode) {
    await wait(500);
    const acc = lsGet<{ email: string; pass: string; cafeId: string }[]>(K.acc, []).find((a) => a.email === email.toLowerCase());
    if (!acc || acc.pass !== weakHash(password)) throw new Error('E-posta ya da şifre hatalı.');
    setDemoSession(acc.cafeId);
    return acc.cafeId;
  }
  try {
    const cred = await signInWithEmailAndPassword(firebase().auth, email, password);
    return cred.user.uid;
  } catch (e) {
    throw authError(e);
  }
}

export async function logout() {
  if (demoMode) {
    lsSet(K.session, null);
    lsSet(K.cust, null);
    fireSession();
    return;
  }
  await signOut(firebase().auth);
}

const fireSession = () => window.dispatchEvent(new Event(SESSION_EVENT));
function setDemoSession(id: string | null) {
  lsSet(K.session, id);
  if (id) lsSet(K.cust, null);
  fireSession();
}
function setDemoCustomer(uid: string | null) {
  lsSet(K.cust, uid);
  if (uid) lsSet(K.session, null);
  fireSession();
}

// ---------------- hesap türü: mekan mı müşteri mi ----------------
export type Role = 'cafe' | 'customer';
export interface Account {
  uid: string;
  email: string;
  role: Role;
  /** Müşterinin profili (ad, telefon); henüz doldurmadıysa null */
  customer: Customer | null;
}

/** Oturumdaki hesap. Mekan = cafes/{uid} belgesi olan hesap; diğer herkes müşteri. */
export function watchAccount(cb: (a: Account | null) => void): () => void {
  if (demoMode) {
    const fire = () => {
      const cafeId = lsGet<string | null>(K.session, null);
      if (cafeId) return cb({ uid: cafeId, email: '', role: 'cafe', customer: null });
      const uid = lsGet<string | null>(K.cust, null);
      if (!uid) return cb(null);
      const c = lsGet<Record<string, Customer>>(K.custProfiles, {})[uid] ?? null;
      cb({ uid, email: c?.email ?? '', role: 'customer', customer: c });
    };
    fire();
    window.addEventListener(SESSION_EVENT, fire);
    window.addEventListener('storage', fire);
    return () => {
      window.removeEventListener(SESSION_EVENT, fire);
      window.removeEventListener('storage', fire);
    };
  }
  const { auth, db } = firebase();
  let seq = 0;
  const resolve = async (u: typeof auth.currentUser) => {
    const mine = ++seq;
    if (!u) return cb(null);
    const [cafe, prof] = await Promise.all([getDoc(doc(db, 'cafes', u.uid)).catch(() => null), getDoc(doc(db, 'users', u.uid)).catch(() => null)]);
    if (mine !== seq) return;
    if (cafe?.exists()) return cb({ uid: u.uid, email: u.email ?? '', role: 'cafe', customer: null });
    const customer = prof?.exists() ? { uid: u.uid, email: u.email ?? '', name: String(prof.get('name') ?? ''), phone: String(prof.get('phone') ?? '') } : null;
    cb({ uid: u.uid, email: u.email ?? '', role: 'customer', customer });
  };
  const unsub = onAuthStateChanged(auth, resolve);
  // Profil ya da mekan kaydı yazılınca hesap türünü yeniden çöz
  const refresh = () => resolve(auth.currentUser);
  window.addEventListener(SESSION_EVENT, refresh);
  return () => {
    unsub();
    window.removeEventListener(SESSION_EVENT, refresh);
  };
}

/** Mekan oturumu: oturumdaki hesap mekansa id'si, değilse null */
export function watchSession(cb: (cafeId: string | null) => void): () => void {
  return watchAccount((a) => cb(a?.role === 'cafe' ? a.uid : null));
}

// ---------------- müşteri hesapları ----------------
const cleanPhone = (p: string) => p.replace(/\D/g, '');

function checkCustomer(name: string, phone: string) {
  if (name.trim().length < 2) throw new Error('Adını ve soyadını yaz.');
  if (cleanPhone(phone).length < 10) throw new Error('Telefon numarası eksik görünüyor (mekan seni arayabilsin diye gerekli).');
}

export async function customerRegister(email: string, password: string, name: string, phone: string): Promise<void> {
  checkCustomer(name, phone);
  if (password.length < 6) throw new Error('Şifre en az 6 karakter olmalı.');
  if (demoMode) {
    await wait(500);
    const all = lsGet<{ email: string; pass: string; uid: string }[]>(K.custAcc, []);
    const taken = all.some((a) => a.email === email.toLowerCase()) || lsGet<{ email: string }[]>(K.acc, []).some((a) => a.email === email.toLowerCase());
    if (taken) throw new Error('Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.');
    const uid = `cust-${Date.now().toString(36)}`;
    lsSet(K.custAcc, [...all, { email: email.toLowerCase(), pass: weakHash(password), uid }]);
    lsSet(K.custProfiles, { ...lsGet<Record<string, Customer>>(K.custProfiles, {}), [uid]: { uid, email, name: name.trim(), phone: cleanPhone(phone) } });
    setDemoCustomer(uid);
    return;
  }
  const { auth, db } = firebase();
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), { name: name.trim(), phone: cleanPhone(phone), email, createdAt: serverTimestamp() });
    fireAuthRefresh();
  } catch (e) {
    throw authError(e);
  }
}

export async function customerLogin(email: string, password: string): Promise<void> {
  if (demoMode) {
    await wait(400);
    const acc = lsGet<{ email: string; pass: string; uid: string }[]>(K.custAcc, []).find((a) => a.email === email.toLowerCase());
    if (!acc || acc.pass !== weakHash(password)) throw new Error('E-posta ya da şifre hatalı.');
    setDemoCustomer(acc.uid);
    return;
  }
  try {
    await signInWithEmailAndPassword(firebase().auth, email, password);
  } catch (e) {
    throw authError(e);
  }
}

/**
 * Google penceresini önceden hazırlar. Firebase ilk tıklamada pencereyi açmadan önce gizli bir iframe yükler;
 * bu uzarsa tarayıcı tıklamayla bağı kaybedip pencereyi engeller (auth/popup-blocked). Firebase bunu sadece
 * Safari ve mobilde kendisi önceden yüklüyor; Google düğmesi olan sayfalar açılırken biz de yüklüyoruz.
 */
export function prepareGoogle() {
  if (demoMode) return;
  const auth = firebase().auth as unknown as { _popupRedirectResolver?: { _initialize(a: unknown): Promise<unknown> } | null };
  auth._popupRedirectResolver?._initialize(auth).catch(() => {});
}

export async function customerGoogle(): Promise<void> {
  if (demoMode) throw new Error('Demo modunda Google ile giriş yok; e-posta ile hesap oluştur.');
  try {
    await signInWithPopup(firebase().auth, new GoogleAuthProvider());
  } catch (e) {
    if ((e as { code?: string })?.code === 'auth/popup-closed-by-user') return;
    throw authError(e);
  }
}

/** Müşteri profili (Google ile girenler için ad/telefon tamamlama ya da düzenleme) */
export async function saveCustomer(c: Customer): Promise<void> {
  checkCustomer(c.name, c.phone);
  const clean = { ...c, name: c.name.trim(), phone: cleanPhone(c.phone) };
  if (demoMode) {
    lsSet(K.custProfiles, { ...lsGet<Record<string, Customer>>(K.custProfiles, {}), [c.uid]: clean });
    fireSession();
    return;
  }
  await setDoc(doc(firebase().db, 'users', c.uid), { name: clean.name, phone: clean.phone, email: c.email, updatedAt: serverTimestamp() }, { merge: true });
  fireAuthRefresh();
}

/** Profil yazıldıktan sonra watchAccount dinleyicilerini yeniden çalıştır */
function fireAuthRefresh() {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

// ---------------- fotoğraflar ----------------
export async function listPhotos(cafeId: string): Promise<CafePhoto[]> {
  if (demoMode) return lsGet<Record<string, CafePhoto[]>>(K.photos, {})[cafeId] ?? [];
  const snap = await getDocs(query(collection(firebase().db, 'cafes', cafeId, 'photos'), orderBy('createdAt')));
  return snap.docs.map((d) => ({ id: d.id, data: d.get('data') as string, createdAt: iso(d.get('createdAt')) }));
}

export async function addPhoto(cafeId: string, data: string): Promise<CafePhoto> {
  if (demoMode) {
    const all = lsGet<Record<string, CafePhoto[]>>(K.photos, {});
    const list = all[cafeId] ?? [];
    if (list.length >= MAX_PHOTOS) throw new Error(`En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsin.`);
    const p = { id: `${cafeId}-${Date.now()}`, data, createdAt: new Date().toISOString() };
    lsSet(K.photos, { ...all, [cafeId]: [...list, p] });
    return p;
  }
  const ref = await addDoc(collection(firebase().db, 'cafes', cafeId, 'photos'), { data, createdAt: serverTimestamp() });
  return { id: ref.id, data, createdAt: new Date().toISOString() };
}

export async function deletePhoto(cafeId: string, photoId: string) {
  if (demoMode) {
    const all = lsGet<Record<string, CafePhoto[]>>(K.photos, {});
    lsSet(K.photos, { ...all, [cafeId]: (all[cafeId] ?? []).filter((p) => p.id !== photoId) });
    return;
  }
  await deleteDoc(doc(firebase().db, 'cafes', cafeId, 'photos', photoId));
}

export async function setCover(cafeId: string, cover: string | null, coverPhotoId: string | null) {
  if (demoMode) {
    lsSet(K.cafes, lsGet<Cafe[]>(K.cafes, []).map((c) => (c.id === cafeId ? { ...c, cover, coverPhotoId } : c)));
    return;
  }
  await updateDoc(doc(firebase().db, 'cafes', cafeId), { cover, coverPhotoId });
}

// ---------------- canlı rezervasyonlar ----------------
/** Mekanın rezervasyonlarını canlı izler: yeni rezervasyon gelince sayfa yenilemeden düşer */
export function watchReservations(cafeId: string, cb: (list: Reservation[]) => void): () => void {
  const sort = (l: Reservation[]) => l.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (demoMode) {
    const fire = () => cb(sort(demo.reservations().filter((r) => r.cafeId === cafeId)));
    fire();
    const t = setInterval(fire, 4000);
    window.addEventListener('storage', fire);
    return () => {
      clearInterval(t);
      window.removeEventListener('storage', fire);
    };
  }
  return onSnapshot(
    query(collection(firebase().db, 'reservations'), where('cafeId', '==', cafeId)),
    (snap) => cb(sort(snap.docs.map(resFromDoc))),
    (err) => console.error('[rezervasyon]', err),
  );
}

// ---------------- şifre & profil ----------------
export async function resetPassword(email: string) {
  if (demoMode) {
    await wait(400);
    return;
  }
  try {
    await sendPasswordResetEmail(firebase().auth, email);
  } catch (e) {
    throw authError(e);
  }
}

/** Mekanın kendi bilgilerini güncellemesi (üyelik/plan/kod hariç) */
export type CafeProfile = Pick<Cafe, 'name' | 'kind' | 'address' | 'phone' | 'capacity' | 'screens' | 'features' | 'priceMin' | 'priceMax' | 'fanOf'>;

export async function updateCafeProfile(cafeId: string, patch: CafeProfile) {
  if (demoMode) {
    await wait(300);
    lsSet(K.cafes, lsGet<Cafe[]>(K.cafes, []).map((c) => (c.id === cafeId ? { ...c, ...patch } : c)));
    return;
  }
  await updateDoc(doc(firebase().db, 'cafes', cafeId), { ...patch });
}

// ---------------- yönetim (sadece firestore.rules'taki yönetici e-postası) ----------------
const DEMO_ADMIN = 'demo-yonetici@macnerede';

export async function adminSignIn(): Promise<void> {
  if (demoMode) return;
  const provider = new GoogleAuthProvider();
  // Başka bir Google hesabıyla girilmişse Google aynı hesabı sessizce seçmesin
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(firebase().auth, provider);
}

/** null: Google ile girilmemiş · admin false: girilmiş ama yönetici değil */
export type AdminSession = { email: string; admin: boolean } | null;

/**
 * Yönetici kim, tek yerde belli: firestore.rules → isAdmin(). Burada e-posta tekrar yazılmıyor;
 * sadece yöneticinin okuyabildiği kodlar okunmaya çalışılıyor, izin yoksa panel hiç açılmıyor.
 */
export function watchAdmin(cb: (s: AdminSession) => void): () => void {
  if (demoMode) {
    cb({ email: DEMO_ADMIN, admin: true });
    return () => {};
  }
  let seq = 0;
  return onAuthStateChanged(firebase().auth, async (u) => {
    const run = ++seq;
    const email = u && u.providerData.some((p) => p.providerId === 'google.com') ? u.email : null;
    if (!email) return cb(null);
    const admin = await getDocs(query(collection(firebase().db, 'codes'), limit(1))).then(
      () => true,
      () => false,
    );
    if (run === seq) cb({ email, admin });
  });
}

export async function adminListCodes(): Promise<ActivationCode[]> {
  if (demoMode) {
    const used = lsGet<string[]>(K.codes, []);
    return lsGet<string[]>(K.adminCodes, [])
      .map((code) => ({ code, days: CODE_DAYS, plan: 'standart' as PlanId, used: used.includes(code), usedBy: null, usedAt: null }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }
  const snap = await getDocs(collection(firebase().db, 'codes'));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return { code: d.id, days: x.days, plan: x.plan, used: x.used, usedBy: x.usedBy ?? null, usedAt: x.usedAt ? iso(x.usedAt) : null };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** Yeni kodları yükler; zaten var olanlara dokunmaz (kullanılmış bir kod sıfırlanmasın) */
export async function adminUploadCodes(codes: string[], days = CODE_DAYS, plan: PlanId = 'standart'): Promise<number> {
  const existing = new Set((await adminListCodes()).map((c) => c.code));
  const fresh = [...new Set(codes)].filter((c) => CODE_PATTERN.test(c) && !existing.has(c));
  if (demoMode) {
    lsSet(K.adminCodes, [...lsGet<string[]>(K.adminCodes, []), ...fresh]);
    return fresh.length;
  }
  const { db } = firebase();
  for (let i = 0; i < fresh.length; i += 400) {
    const batch = writeBatch(db);
    fresh.slice(i, i + 400).forEach((c) => batch.set(doc(db, 'codes', c), { days, plan, used: false, usedBy: null, usedAt: null, createdAt: serverTimestamp() }));
    await batch.commit();
  }
  return fresh.length;
}

/** Tüm mekanlar (üyeliği bitmiş olanlar dahil) */
export async function adminListCafes(): Promise<Cafe[]> {
  if (demoMode) {
    await wait(250);
    return demo.cafes();
  }
  const snap = await getDocs(collection(firebase().db, 'cafes'));
  return snap.docs.map(cafeFromDoc).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type MembershipPreset = 'trial' | 'year' | 'month' | 'cancel';

const presetDays: Record<Exclude<MembershipPreset, 'cancel'>, number> = { trial: TRIAL_DAYS, year: 365, month: 30 };

function presetMembership(preset: MembershipPreset, current?: Cafe['membership']): Cafe['membership'] {
  const now = Date.now();
  if (preset === 'cancel') return { status: 'canceled', startedAt: current?.startedAt ?? new Date(now).toISOString(), renewsAt: new Date(now).toISOString() };
  // Süre uzatırken kalan günler yanmasın: bitiş tarihi ileride ise oradan devam et
  const base = current && preset === 'month' && current.status === 'active' ? Math.max(now, new Date(current.renewsAt).getTime()) : now;
  return {
    status: preset === 'month' ? 'active' : 'trial',
    startedAt: new Date(now).toISOString(),
    renewsAt: new Date(base + presetDays[preset] * 86400000).toISOString(),
  };
}

const membershipToDb = (m: Cafe['membership']) => ({
  status: m.status,
  startedAt: Timestamp.fromDate(new Date(m.startedAt)),
  renewsAt: Timestamp.fromDate(new Date(m.renewsAt)),
});

/** Yönetici mekan adına hesap açar; mekan bu e-posta/şifreyle /giris'ten girer */
export async function adminCreateCafe(email: string, password: string, data: NewCafe, preset: MembershipPreset): Promise<Cafe> {
  if (password.length < 6) throw new Error('Şifre en az 6 karakter olmalı.');
  const membership = presetMembership(preset);

  if (demoMode) {
    await wait(600);
    const accounts = lsGet<{ email: string; pass: string; cafeId: string }[]>(K.acc, []);
    if (accounts.some((a) => a.email === email.toLowerCase())) throw new Error('Bu e-posta ile zaten bir mekan kayıtlı.');
    const cafe: Cafe = { ...data, id: `demo-${Date.now().toString(36)}`, cover: null, membership, createdAt: new Date().toISOString() };
    lsSet(K.cafes, [...lsGet<Cafe[]>(K.cafes, []), cafe]);
    lsSet(K.acc, [...accounts, { email: email.toLowerCase(), pass: weakHash(password), cafeId: cafe.id }]);
    return cafe;
  }

  // Hesap ikinci uygulamada açılır, yöneticinin oturumu açık kalır
  const auth = creatorAuth();
  let uid: string;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
  } catch (e) {
    throw authError(e);
  }
  const cafe: Cafe = { ...data, id: uid, cover: null, membership, createdAt: new Date().toISOString() };
  const { id: _id, ...rest } = cafe;
  try {
    await setDoc(doc(firebase().db, 'cafes', uid), { ...rest, createdAt: Timestamp.fromDate(new Date(cafe.createdAt)), membership: membershipToDb(membership) });
  } catch (e) {
    await auth.currentUser?.delete().catch(() => {});
    throw authError(e);
  } finally {
    await signOut(auth).catch(() => {});
  }
  return cafe;
}

/** Üyelik işlemleri: deneme, 1 ay aktif (uzatır), 1 yıl ücretsiz, askıya al; istenirse plan değişikliği */
export async function adminSetMembership(cafe: Cafe, preset: MembershipPreset | null, plan?: PlanId): Promise<Cafe> {
  const membership = preset ? presetMembership(preset, cafe.membership) : cafe.membership;
  const next: Cafe = { ...cafe, membership, plan: plan ?? cafe.plan };
  if (demoMode) {
    await wait(300);
    const own = lsGet<Cafe[]>(K.cafes, []);
    // Örnek (seed) mekanlar da yönetilebilsin diye yerel kopyaya yaz
    const list = own.some((c) => c.id === cafe.id) ? own.map((c) => (c.id === cafe.id ? next : c)) : own;
    lsSet(K.cafes, list);
    return next;
  }
  await updateDoc(doc(firebase().db, 'cafes', cafe.id), { plan: next.plan, membership: membershipToDb(membership) });
  return next;
}

/** Seçilen maçların tüm rezervasyonları (sadece yönetici) */
export async function adminListReservations(matchIds: string[]): Promise<Reservation[]> {
  if (!matchIds.length) return [];
  if (demoMode) return demo.reservations().filter((r) => matchIds.includes(r.matchId));
  const { db } = firebase();
  const out: Reservation[] = [];
  for (let i = 0; i < matchIds.length; i += 30) {
    const snap = await getDocs(query(collection(db, 'reservations'), where('matchId', 'in', matchIds.slice(i, i + 30))));
    snap.forEach((d) => out.push(resFromDoc(d)));
  }
  return out;
}

// ---------------- üyelik ödemesi (iyzico) ----------------
export type PaymentStart = { redirect: string } | { demo: Cafe };

/** Ödemeyi başlatır: gerçek modda iyzico ödeme sayfasına yönlendirme adresi, demo modunda anında "ödendi" */
export async function startPayment(cafe: Cafe, plan: PlanId, period: PeriodId): Promise<PaymentStart> {
  if (demoMode) {
    await wait(1200);
    const now = Date.now();
    const end = new Date(cafe.membership.renewsAt).getTime();
    const renews = new Date(cafe.membership.status !== 'canceled' && end > now ? end : now);
    renews.setMonth(renews.getMonth() + PERIODS[period].months);
    const next: Cafe = { ...cafe, plan, membership: { status: 'active', startedAt: new Date().toISOString(), renewsAt: renews.toISOString() } };
    lsSet(K.cafes, lsGet<Cafe[]>(K.cafes, []).map((c) => (c.id === cafe.id ? next : c)));
    const pay: Payment = { id: `pay-${Date.now()}`, cafeId: cafe.id, cafeName: cafe.name, plan, months: PERIODS[period].months, amount: periodPrice(plan, period), status: 'paid', createdAt: new Date().toISOString() };
    lsSet(K.payments, [...lsGet<Payment[]>(K.payments, []), pay]);
    return { demo: next };
  }
  const user = firebase().auth.currentUser;
  if (!user) throw new Error('Önce mekan hesabınla giriş yap.');
  const res = await fetch('/api/odeme/baslat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ plan, period }),
  });
  const data = (await res.json().catch(() => ({}))) as { paymentPageUrl?: string; error?: string };
  if (!res.ok || !data.paymentPageUrl) throw new Error(data.error || 'Ödeme başlatılamadı.');
  return { redirect: data.paymentPageUrl };
}

/** Yönetici: tüm ödemeler (son ödeme en üstte) */
export async function adminListPayments(): Promise<Payment[]> {
  if (demoMode) return [...lsGet<Payment[]>(K.payments, [])].reverse();
  const snap = await getDocs(collection(firebase().db, 'payments'));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return { id: d.id, cafeId: x.cafeId, cafeName: x.cafeName, plan: x.plan, months: x.months, amount: x.amount, status: x.status, paymentId: x.paymentId, createdAt: iso(x.createdAt) } as Payment;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
