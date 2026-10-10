# NeredeMaç (neredemac.com)

Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor maçlarını veren kafe/pub'ları gösteren site (İstanbul, Ankara, İzmir).
Taraftar maçı ve semtini seçer, mekanı bulur, yerini WhatsApp'tan hazır mesajla ayırtır. İki tür mekan var:

- **Anlaşmalı mekanlar**: kayıt olur, hangi maçı verdiğini, sesi, giriş ücretini kendisi girer; listede üstte görünür.
- **Rehber mekanları**: anlaşmasız, ama maç verdiği Google yorumlarıyla doğrulanmış mekanlar (`data/rehber.json`).

## Çalıştır

```
npm install
npm run dev
```

Ortam değişkenleri depoda **yok**: `.env.local.example`'ı `.env.local` (ya da `.env`) olarak kopyalayıp doldur. Canlıda aynı
değişkenler Vercel → Project → Settings → Environment Variables'ta durur. `NEXT_PUBLIC_FIREBASE_*` eksikse canlı derleme bilerek
durur (`next.config.mjs`), Vercel önceki sürümü yayında tutar; site hiçbir zaman sahte demo verisiyle yayına çıkmaz. Yerelde Firebase
değişkenleri boş bırakılırsa site **demo modunda** çalışır: örnek anlaşmalı mekanlar, kayıtlar ve başvurular tarayıcıda saklanır.

## Sayfalar

| Yol | Ne |
|---|---|
| `/` | Bu haftanın maçları, gün sekmeleri (`?gun=bugun\|yarin\|haftasonu`), takım/şehir seçimi (varsayılan Ankara), popüler semtler, sıradaki maç + geri sayım (başlayınca "Oynanıyor", bitince "Maç sona erdi") |
| `/[sehir]/[ev]-[deplasman]-maci` | Maçı veren mekanlar, ör. `/ankara/galatasaray-kasimpasa-maci`: semt (`?semt=`), filtreler (ses, dev ekran, açık alan, girişsiz, alkol, nargile, ₺/₺₺/₺₺₺), harita, WhatsApp ile yer ayırtma. Eski `/mac/[id]?sehir=` adresleri buraya kalıcı yönlenir |
| `/mekan/[id]` | Rehber mekanının profili (mekanlara gönderilen bağlantı): adres, telefon, yol tarifi, bu haftanın maçları, "Bu işletmenin sahibi misiniz?". Kanıtı eskimişse açılmaz |
| `/kafe/[id]` | Anlaşmalı mekan detayı, telefon/ara, fotoğraf galerisi, bu hafta verdiği maçlar |
| `/kayit` | **Kısa başvuru** (ad, şehir/semt, WhatsApp — şimdilik ücretsiz); isteyen 5 adımlı formla profilini kendisi kurar. `?mekan=<rehber id>` rehberdeki mekanın bilgilerini doldurur |
| `/giris` · `/panel` | Mekan girişi (Google ya da e-posta/şifre, şifremi unuttum dahil) ve paneli: maç aç/kapa, fotoğraflar, mekan bilgileri, üyelik |
| `/yonetim` | **Admin paneli** (Google ile giriş): bu haftanın maçları, analitik (mekan başına tıklamalar + Excel indirme), tüm mekanlar + üyelik işlemleri, başvurular, rehber (Firebase'e yükle, gizle/göster), mekan adına hesap açma, ödemeler, aktivasyon kodları |

## Güvenilirlik: maç vermeyen mekan listede görünmez

Rehber mekanında `evidenceDate` (maç izlendiğini yazan en yeni Google yorumunun/paylaşımın tarihi) ve `evidenceCount`
(son 11 aydaki maç yorumu sayısı) tutulur. Mekan sitede ancak **en yeni kanıt son 6 ay içindeyse** ya da **son 11 ayda en az
3 maç yorumu varsa** görünür (`lib/venues.ts` → `isTrusted`). Kanıt eskiyince mekan listelerden, haritadan, profil sayfasından
ve site haritasından kendiliğinden düşer. Yönetim → Rehber'de "Yeniden doğrula" ile yeni tarih girilince geri gelir; yeni mekan
kanıt tarihi olmadan kaydedilemez. Doğrulama: Google Maps'te mekanın yorumlarında "maç" diye arat, en yeni yorumun tarihine bak.

"Bu işletmenin sahibi misiniz?" butonu `merhaba@neredemac.com`'a hazır konulu e-posta açar (`lib/site.ts`).
Öne çıkarma (ücretli): Yönetim → Rehber/Mekanlar → "Öne çıkar", son gün seçilir; o güne kadar şehrin listesinde en üstte, "Öne çıkan" etiketiyle.

## Fikstür

`data/fikstur.json` — sitenin tek fikstür kaynağı. Site sadece **içinde bulunulan haftanın** (Pzt–Paz, TSİ) maçlarını gösterir;
haftanın maçları bittiyse bir sonraki haftayı açar. Süper Lig 7–16. hafta + Avrupa kupaları lig aşaması.
`time: null` → saat henüz açıklanmadı. 17. hafta ve sonrası TFF açıkladıkça aynı formatta eklenmeli.

## Firebase

Proje: `macnerede-58592`.

1. **Authentication** → Sign-in method → **Email/Password** ve **Google** açık olmalı (mekanlar ikisiyle de kayıt olur; yönetim sayfası Google ile)
2. **Firestore** kuralları: `firebase deploy --only firestore:rules --account <proje sahibinin e-postası>`
3. Canlıya alırken alan adını Authentication → Settings → Authorized domains'e ekle

| Koleksiyon | Açıklama |
|---|---|
| `cafes/{uid}` | Mekan profili + küçük kapak fotoğrafı. `membership.status`: `trial`/`active`/`past_due`/`canceled` |
| `cafes/{uid}/photos/{id}` | Mekan fotoğrafları (tarayıcıda küçültülüp data URL olarak saklanır; ücretsiz planda Storage gerekmez) |
| `broadcasts/{uid}_{matchId}` | Anlaşmalı mekanın vereceği maç: ses, giriş, min. harcama, "önceden yer ayırt" |
| `venues/{id}` | Rehber mekanları (herkes okur, yönetici yazar). Boşsa site `data/rehber.json`'u gösterir; `hidden: true` listeden kaldırır |
| `leads/{auto}` | Kısa başvurular: ad, şehir, semt, WhatsApp, varsa rehber id'si. Giriş gerekmez; sadece yönetici okur/siler |
| `stats/{mekanId}_{YYYY-AA-GG}` | Analitik: mekan başına günlük sayaçlar (`seat` Yerini ayırt, `wa` WhatsApp, `call` arama, `dir` yol tarifi, `view` mekan sayfası). Kişisel veri yok; herkes bir sayacı sadece 1 artırabilir, sadece yönetici okur. Yönetim → Analitik'ten Excel (.xlsx) indirilir |
| `payments/{id}` | Üyelik ödemeleri — sadece sunucu yazar |
| `codes/{KOD}` | Tek seferlik aktivasyon kodu: `days`, `plan`, `used`, `usedBy`, `usedAt` |

Güvenlik kuralları (`firestore.rules`) şunları garanti eder: normal kayıt en fazla 14 günlük deneme açabilir; kodlu kayıt
ancak kodu **aynı işlemde** kullanarak açılabilir (kod iki kez kullanılamaz); mekan kendi üyeliğine dokunamaz;
kodları sadece yönetici (`kagankarki03@gmail.com`, Google ile) listeleyip oluşturabilir; rehberi sadece yönetici yazar;
başvurular sadece belirli alanlarla ve sunucu saatiyle oluşturulabilir.

Kuralların testi (Firebase emülatörü, Java gerekir): `npm run test:rules` — 22 senaryo.

## Yer ayırtma (WhatsApp)

Site rezervasyon tutmaz. "Yerini ayırt" → kişi sayısı seçilir → mekanın WhatsApp'ına hazır mesaj açılır
("neredemac.com üzerinden ulaşıyorum… 4 kişilik yeriniz var mı?"). WhatsApp düğmesi sadece cep numaralarında (905…) çıkar;
sabit hatlarda "Ara" gösterilir.

## Rehber mekanları

`data/rehber.json` — İstanbul, Ankara ve İzmir'de semt semt mekanlar. Listeye girme şartı: Google'daki taraftar
yorumlarında maç izlendiğinin yazması (en az 2 yorum, en yenisi yakın tarihli) ve mekanın açık olması; her kaydın
`evidence` alanında kanıt özeti var (ör. "5 yorum, en yenisi 1 ay önce"). Adres, telefon ve konum Google Haritalar'dan.
Özellikler (alkol, nargile, açık alan, dev ekran) sadece biliniyorsa işaretli; fiyat bilgisi yok, bütçe filtresi rehber mekanlarını eler.

- Yeni kayıt eklemek/çıkarmak için dosyayı düzenle, sonra `/yonetim` → **Rehber** → "Paketteki listeyle güncelle".
- Bir mekan şikayet ederse `/yonetim` → **Rehber** → **Gizle** (Firebase'e yüklenmiş olmalı).
- Anlaşmalı bir mekan rehberdekiyle aynı telefonla kayıt olursa rehber kaydı sitede kendiliğinden gizlenir.

## Ödeme (iyzico)

Mekan panelinde **Üyeliği öde / uzat** → plan + dönem (1 ay ya da 12 ay — 12 ay 10 ay fiyatına) → iyzico'nun güvenli ödeme
sayfası → `/api/odeme/sonuc` ödemeyi iyzico'dan doğrular, üyeliği aktif eder ve süreyi uzatır (kalan gün yanmaz).

Kurulum (`.env.local`, bkz. `.env.local.example`; canlıda barındırma servisinin ortam değişkenlerine):

1. iyzico test hesabı: https://sandbox-merchant.iyzipay.com → API anahtarı + gizli anahtar → `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`
2. Firebase Console → Proje ayarları → Hizmet hesapları → yeni özel anahtar → `FIREBASE_SERVICE_ACCOUNT`
3. Canlıya geçerken iyzico'dan canlı üye işyeri başvurusu (şirket gerekir), `IYZICO_BASE_URL=https://api.iyzipay.com`

Anahtarlar yokken ödeme düğmesi "Ödeme altyapısı henüz bağlı değil" der; site normal çalışır.

## Aktivasyon kodları

- `kodlar.txt` (git'e girmez) — 100 adet `MAC-XXXX-XXXX` kodu, her biri tek seferlik, **1 yıl ücretsiz Standart** üyelik.
- Firebase'e yüklemek: `/yonetim` → Google ile gir → **Dosya seç** → `kodlar.txt` → **Yükle**. Var olan kodlara dokunulmaz.
- Mekan, kayıt ekranının son adımında kodu girer; kod doğrulanınca plan seçimi kalkar, üyelik 365 gün olarak açılır.
- Yeni kod üretmek için aynı biçimde bir txt hazırlayıp yönetim sayfasından yüklemek yeterli.

## Mekan hesapları

İki yol var: mekan `/kayit`'tan kendisi kayıt olur (14 gün deneme ya da aktivasyon kodu), ya da yönetici `/yonetim` →
**Yeni mekan** sekmesinden hesabı açar ve çıkan giriş bilgisini (kopyala / WhatsApp) mekana gönderir. Mekan geçici şifreyi
giriş ekranındaki **Şifremi unuttum** ile değiştirebilir.

## Tema

Sağ üstteki düğmeyle açık/koyu tema; seçim hatırlanır, seçim yoksa sistem ayarı kullanılır. Üstteki atkı şeridi
(dört takımın renkleri) sürekli kayar; "hareketi azalt" açık cihazlarda durur.

## Google Maps

`.env.local`'a `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Maps JavaScript API) ve isteğe bağlı `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` ekle.
Anahtar yokken (şu an canlıda da böyle) Google Maps gömülü görünümü kullanılır: harita bütün mekanları kapsayacak merkez ve
yakınlaştırmayla açılır, işaretçilerimiz Web Mercator hesabıyla üstüne yerleştirilir (tıklanınca mekan seçilir). Harita stadı
göstermez; taraftar stadı değil, yakınındaki mekanı arıyor.

## Görseller

- **Armalar** (`public/logos`) ve **turnuva logoları** (`public/comps`): Wikipedia / Wikimedia Commons. Kulüp ve turnuva logoları
  tescilli markadır; ticari kullanımda hukuki durumu kontrol et.
- **Stadyum fotoğrafları** (`public/stadiums`): Wikimedia Commons ve Flickr, özgür lisanslı (CC BY / CC BY-SA / CC0). Fotoğrafçı
  ve lisans her fotoğrafın üstünde gösterilir; kaynak bağlantıları `lib/teams.ts` → `stadiums`. Fikstürdeki her ev sahibinin
  stadyumu var. Shakhtar 2026-27 Şampiyonlar Ligi iç saha maçlarını Londra'da (Stamford Bridge) oynuyor.
- **Atmosfer fotoğrafları** (`public/scenes`, `lib/scenes.ts`): Flickr, özgür lisanslı, künyeli.

## Sıradaki adımlar

- **Otomatik yenileme**: iyzico abonelik ürünüyle her ay otomatik çekim (şu an her dönem elle ödeniyor)
- **Üyelik bitişi**: süresi biten aktif üyelikleri `past_due` yapan zamanlanmış görev
- **Spam koruması**: Firebase App Check (başvuru formu herkese açık)
- **Bildirim**: yeni başvuruda yöneticiye e-posta/WhatsApp
- **Rehber bakımı**: yorum kanıtlarını birkaç ayda bir yeniden kontrol et (mekan kapanmış ya da yayını bırakmış olabilir)
