// Firestore güvenlik kuralları testi — emülatörde çalışır:
//   firebase emulators:exec --only firestore --project demo-macnerede "node tests/rules.test.mjs"
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-macnerede',
  firestore: { rules: readFileSync('firestore.rules', 'utf8') },
});

const H = 3600 * 1000;
const ts = (ms) => Timestamp.fromMillis(Date.now() + ms);
// Maç saati: yayın ve rezervasyon aynı değeri kullanır (uygulamada ikisi de fikstürden gelir)
let KICKOFF = ts(3 * 3600 * 1000);
let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ✓', name);
  } catch (e) {
    failed++;
    console.log('  ✗', name, '\n     ', e?.message?.split('\n')[0]);
  }
}

/** Her senaryo temiz veriyle: kafe1'in m1 maçı (10 yer) */
async function seed(kickoffMs = 3 * H, extra = {}) {
  KICKOFF = ts(kickoffMs);
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'broadcasts/cafe1_m1'), { cafeId: 'cafe1', matchId: 'm1', seats: 10, reserved: 0, sound: true, kickoff: KICKOFF, ...extra });
  });
}

const resData = (uid, people = 2) => ({
  cafeId: 'cafe1', matchId: 'm1', userId: uid, name: 'Ali Taraftar', phone: '05001112233',
  people, code: 'MN-TEST1', createdAt: new Date().toISOString(), status: 'new', kickoff: KICKOFF,
});

/** Uygulamanın yaptığı gibi: rezervasyon + sayaç tek işlemde */
async function book(db, uid, id, people = 2, reservedBefore = 0) {
  const b = writeBatch(db);
  b.set(doc(db, 'reservations', id), resData(uid, people));
  b.update(doc(db, 'broadcasts/cafe1_m1'), { reserved: reservedBefore + people, lastRes: id });
  return b.commit();
}

async function cancel(db, id, people = 2, reservedBefore = 2) {
  const b = writeBatch(db);
  b.update(doc(db, 'reservations', id), { status: 'cancelled', cancelledAt: serverTimestamp() });
  b.update(doc(db, 'broadcasts/cafe1_m1'), { reserved: reservedBefore - people, lastRes: id });
  return b.commit();
}

const ali = () => env.authenticatedContext('ali').firestore();
const veli = () => env.authenticatedContext('veli').firestore();
const cafe = () => env.authenticatedContext('cafe1').firestore();
const anon = () => env.unauthenticatedContext().firestore();

console.log('Rezervasyon:');
await check('giriş yapmış taraftar yer ayırtabilir', async () => {
  await seed();
  await assertSucceeds(book(ali(), 'ali', 'r1'));
});
await check('giriş yapmadan rezervasyon yapılamaz', async () => {
  await seed();
  await assertFails(book(anon(), 'ali', 'r1'));
});
await check('başkası adına rezervasyon yapılamaz', async () => {
  await seed();
  await assertFails(book(veli(), 'ali', 'r1'));
});
await check('13 kişilik rezervasyon reddedilir', async () => {
  await seed();
  await assertFails(book(ali(), 'ali', 'r1', 13));
});
await check('maç başladıktan sonra rezervasyon reddedilir', async () => {
  await seed(-10 * 60 * 1000);
  await assertFails(book(ali(), 'ali', 'r1'));
});
await check('sayaç artırılmadan rezervasyon oluşturulamaz', async () => {
  await seed();
  await assertFails(setDoc(doc(ali(), 'reservations/r1'), resData('ali')));
});
await check('rezervasyonsuz sayaç şişirilemez', async () => {
  await seed();
  await assertFails(updateDoc(doc(ali(), 'broadcasts/cafe1_m1'), { reserved: 8, lastRes: 'yok' }));
});
await check('kapasite aşılamaz', async () => {
  await seed(3 * H, { reserved: 9 });
  await assertFails(book(ali(), 'ali', 'r1', 2, 9));
});

console.log('İptal:');
await check('maça 3 saat varken iptal edilebilir', async () => {
  await seed();
  await book(ali(), 'ali', 'r1');
  await assertSucceeds(cancel(ali(), 'r1'));
});
await check('maça 30 dk kala iptal reddedilir', async () => {
  await seed(30 * 60 * 1000);
  await book(ali(), 'ali', 'r1');
  await assertFails(cancel(ali(), 'r1'));
});
await check('başkasının rezervasyonu iptal edilemez', async () => {
  await seed();
  await book(ali(), 'ali', 'r1');
  await assertFails(cancel(veli(), 'r1'));
});

console.log('Mekan ve gizlilik:');
await check('mekan "gelmedi" işaretleyebilir', async () => {
  await seed();
  await book(ali(), 'ali', 'r1');
  await assertSucceeds(updateDoc(doc(cafe(), 'reservations/r1'), { status: 'noshow' }));
});
await check('taraftar kendini "geldi" işaretleyemez', async () => {
  await seed();
  await book(ali(), 'ali', 'r1');
  await assertFails(updateDoc(doc(ali(), 'reservations/r1'), { status: 'arrived' }));
});
await check('başka taraftar rezervasyonu (telefonu) okuyamaz', async () => {
  await seed();
  await book(ali(), 'ali', 'r1');
  await assertFails(getDoc(doc(veli(), 'reservations/r1')));
});
await check('taraftar kendi rezervasyonunu okuyabilir', async () => {
  await seed();
  await book(ali(), 'ali', 'r1');
  await assertSucceeds(getDoc(doc(ali(), 'reservations/r1')));
});

await env.cleanup();
console.log(`\n${passed} geçti, ${failed} kaldı`);
process.exit(failed ? 1 : 0);
