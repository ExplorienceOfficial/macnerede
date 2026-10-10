// Firestore güvenlik kuralları testi — emülatörde çalışır:
//   firebase emulators:exec --only firestore --project demo-macnerede "node tests/rules.test.mjs"
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-macnerede',
  firestore: { rules: readFileSync('firestore.rules', 'utf8') },
});

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await env.clearFirestore();
    await fn();
    passed++;
    console.log('  ✓', name);
  } catch (e) {
    failed++;
    console.log('  ✗', name, '\n     ', e?.message?.split('\n')[0]);
  }
}

const seedDoc = (path, data) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));

const cafe = () => env.authenticatedContext('cafe1').firestore();
const other = () => env.authenticatedContext('cafe2').firestore();
const anon = () => env.unauthenticatedContext().firestore();
const admin = () => env.authenticatedContext('admin', { email: 'kagankarki03@gmail.com', email_verified: true }).firestore();
const impostor = () => env.authenticatedContext('x', { email: 'kagankarki03@gmail.com', email_verified: false }).firestore();

const bc = (cafeId = 'cafe1', matchId = 'm1') => ({ cafeId, matchId, sound: true, entryFee: null, minSpend: null, reservationRequired: false });
const lead = (extra = {}) => ({ name: 'Moda Köşe Pub', city: 'istanbul', district: 'kadikoy', phone: '905321234567', venueId: null, createdAt: serverTimestamp(), ...extra });
const venue = { name: 'Rehber Pub', city: 'ankara', district: 'kizilay', kind: 'Pub', phone: '903120000000' };

console.log('Maç yayınları:');
await check('mekan kendi maçını açabilir', async () => {
  await assertSucceeds(setDoc(doc(cafe(), 'broadcasts/cafe1_m1'), bc()));
});
await check('başka mekan adına maç açılamaz', async () => {
  await assertFails(setDoc(doc(other(), 'broadcasts/cafe1_m1'), bc()));
});
await check('belge adı uid_maçId değilse reddedilir', async () => {
  await assertFails(setDoc(doc(cafe(), 'broadcasts/cafe1_baska'), bc()));
});
await check('başka mekanın yayını değiştirilemez ve silinemez', async () => {
  await seedDoc('broadcasts/cafe1_m1', bc());
  await assertFails(updateDoc(doc(other(), 'broadcasts/cafe1_m1'), { sound: false }));
  await assertFails(deleteDoc(doc(other(), 'broadcasts/cafe1_m1')));
});
await check('herkes yayınları okuyabilir', async () => {
  await seedDoc('broadcasts/cafe1_m1', bc());
  await assertSucceeds(getDoc(doc(anon(), 'broadcasts/cafe1_m1')));
});

console.log('Rehber mekanları:');
await check('herkes rehberi okuyabilir', async () => {
  await seedDoc('venues/v1', venue);
  await assertSucceeds(getDocs(collection(anon(), 'venues')));
});
await check('mekan hesabı rehbere yazamaz', async () => {
  await assertFails(setDoc(doc(cafe(), 'venues/v1'), venue));
});
await check('yönetici rehberi yazar ve gizleyebilir', async () => {
  await assertSucceeds(setDoc(doc(admin(), 'venues/v1'), venue));
  await assertSucceeds(updateDoc(doc(admin(), 'venues/v1'), { hidden: true }));
});
await check('e-postası doğrulanmamış "yönetici" yazamaz', async () => {
  await assertFails(setDoc(doc(impostor(), 'venues/v1'), venue));
});

console.log('Başvurular:');
await check('giriş yapmadan başvuru bırakılabilir', async () => {
  await assertSucceeds(addDoc(collection(anon(), 'leads'), lead()));
});
await check('rehberdeki mekan için başvuru bırakılabilir', async () => {
  await assertSucceeds(addDoc(collection(anon(), 'leads'), lead({ venueId: 'ank-alerta-pub' })));
});
await check('eksik telefonlu başvuru reddedilir', async () => {
  await assertFails(addDoc(collection(anon(), 'leads'), lead({ phone: '123' })));
});
await check('listede olmayan şehir reddedilir', async () => {
  await assertFails(addDoc(collection(anon(), 'leads'), lead({ city: 'trabzon' })));
});
await check('fazladan alan eklenemez', async () => {
  await assertFails(addDoc(collection(anon(), 'leads'), lead({ admin: true })));
});
await check('tarih istemciden gelemez', async () => {
  await assertFails(addDoc(collection(anon(), 'leads'), lead({ createdAt: Timestamp.now() })));
});
await check('başvuruları sadece yönetici okur ve siler', async () => {
  await seedDoc('leads/l1', { ...lead(), createdAt: Timestamp.now() });
  await assertFails(getDoc(doc(anon(), 'leads/l1')));
  await assertFails(getDoc(doc(cafe(), 'leads/l1')));
  await assertSucceeds(getDoc(doc(admin(), 'leads/l1')));
  await assertSucceeds(deleteDoc(doc(admin(), 'leads/l1')));
});

console.log('Öne çıkarma:');
const cafeDoc = { name: 'Moda Pub', plan: 'standart', membership: { status: 'trial' }, phone: '905321234567', capacity: 50 };
await check('mekan kendini öne çıkaramaz, diğer bilgisini güncelleyebilir', async () => {
  await seedDoc('cafes/cafe1', cafeDoc);
  await assertFails(updateDoc(doc(cafe(), 'cafes/cafe1'), { featuredUntil: '2099-01-01' }));
  await assertSucceeds(updateDoc(doc(cafe(), 'cafes/cafe1'), { name: 'Moda Pub 2' }));
});
await check('yönetici mekanı ve rehber kaydını öne çıkarır', async () => {
  await seedDoc('cafes/cafe1', cafeDoc);
  await seedDoc('venues/v1', venue);
  await assertSucceeds(updateDoc(doc(admin(), 'cafes/cafe1'), { featuredUntil: '2026-10-12' }));
  await assertSucceeds(updateDoc(doc(admin(), 'venues/v1'), { featuredUntil: '2026-10-12' }));
  await assertFails(updateDoc(doc(cafe(), 'venues/v1'), { featuredUntil: '2026-10-12' }));
});

console.log('Analitik:');
const stat = (action) => ({ venueId: 'v1', date: '2026-10-10', [action]: increment(1) });
await check('giriş yapmadan sayaç açılır ve 1 artırılır', async () => {
  await assertSucceeds(setDoc(doc(anon(), 'stats/v1_2026-10-10'), stat('wa'), { merge: true }));
  await assertSucceeds(setDoc(doc(anon(), 'stats/v1_2026-10-10'), stat('wa'), { merge: true }));
  await assertSucceeds(setDoc(doc(anon(), 'stats/v1_2026-10-10'), stat('dir'), { merge: true }));
});
await check('sayaç birden fazla artırılamaz ya da elle yazılamaz', async () => {
  await assertFails(setDoc(doc(anon(), 'stats/v1_2026-10-10'), { venueId: 'v1', date: '2026-10-10', wa: 50 }));
  await seedDoc('stats/v1_2026-10-10', { venueId: 'v1', date: '2026-10-10', wa: 3 });
  await assertFails(updateDoc(doc(anon(), 'stats/v1_2026-10-10'), { wa: increment(5) }));
  await assertFails(updateDoc(doc(anon(), 'stats/v1_2026-10-10'), { wa: 0 }));
  await assertFails(updateDoc(doc(anon(), 'stats/v1_2026-10-10'), { wa: increment(1), call: increment(1) }));
});
await check('belge adı mekan_tarih olmalı, fazladan alan yok', async () => {
  await assertFails(setDoc(doc(anon(), 'stats/baska'), stat('wa'), { merge: true }));
  await assertFails(setDoc(doc(anon(), 'stats/v1_2026-10-10'), { ...stat('wa'), ip: '1.2.3.4' }, { merge: true }));
});
await check('sayaçları sadece yönetici okur', async () => {
  await seedDoc('stats/v1_2026-10-10', { venueId: 'v1', date: '2026-10-10', wa: 3 });
  await assertFails(getDoc(doc(anon(), 'stats/v1_2026-10-10')));
  await assertFails(getDocs(collection(cafe(), 'stats')));
  await assertSucceeds(getDocs(collection(admin(), 'stats')));
});

await env.cleanup();
console.log(`\n${passed} geçti, ${failed} kaldı`);
process.exit(failed ? 1 : 0);
