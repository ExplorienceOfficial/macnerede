# MaçNerede

Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor maçlarını veren **anlaşmalı** kafe/pub'ları gösteren site.
Taraftar maçı seçer, şehrini/ilçesini seçer, yerini ayırtır. Mekanlar aylık üyelikle (ya da aktivasyon koduyla) listelenir.

## Çalıştır

```
npm install
npm run dev
```

Firebase ayarları depodaki `.env` dosyasında (web ayarları gizli değildir; güvenliği `firestore.rules` sağlar), yani
klonlayıp çalıştırınca site doğrudan `macnerede-58592` projesine bağlanır. Firebase değişkenleri boş bırakılırsa site
**demo modunda** çalışır: örnek mekanlar, kayıt ve rezervasyonlar tarayıcıda saklanır.

## Sayfalar

| Yol | Ne |
|---|---|
| `/` | Bu haftanın maçları, takım/şehir seçimi, sıradaki maç + geri sayım |
| `/mac/[id]` | Maçı veren mekanlar: filtreler, harita (stadyum fotoğraflı işaretçi), rezervasyon + bilet animasyonu |
| `/kafe/[id]` | Mekan detayı, fotoğraf galerisi, bu hafta verdiği maçlar |
| `/kayit` | Mekan kaydı (5 adım) — fotoğraflar, aktivasyon kodu, üyelik |
| `/giris` · `/panel` | Mekan girişi (şifremi unuttum dahil) ve paneli: maç aç/kapa, canlı rezervasyonlar, gelen müşteri istatistikleri, fotoğraflar, mekan bilgileri |
| `/yonetim` | **Admin paneli** (Google ile giriş): bu haftanın maçları ve rezervasyon özeti, tüm mekanlar + üyelik işlemleri (1 ay aktif, 1 yıl ücretsiz, deneme, askıya al, plan), mekan adına hesap açma, aktivasyon kodları |

## Fikstür

`data/fikstur.json` — sitenin tek fikstür kaynağı. Site sadece **içinde bulunulan haftanın** (Pzt–Paz, TSİ) maçlarını gösterir;
haftanın maçları bittiyse bir sonraki haftayı açar. Süper Lig 7–16. hafta + Avrupa kupaları lig aşaması.
`time: null` → saat henüz açıklanmadı. 17. hafta ve sonrası TFF açıkladıkça aynı formatta eklenmeli.

## Firebase

Proje: `macnerede-58592`.

1. **Authentication** → Sign-in method → **Email/Password** (mekanlar) ve **Google** (yönetim sayfası) açık olmalı
2. **Firestore** kuralları: `firebase deploy --only firestore:rules --account <proje sahibinin e-postası>`
3. Canlıya alırken alan adını Authentication → Settings → Authorized domains'e ekle

| Koleksiyon | Açıklama |
|---|---|
| `cafes/{uid}` | Mekan profili + küçük kapak fotoğrafı. `membership.status`: `trial`/`active`/`past_due`/`canceled` |
| `cafes/{uid}/photos/{id}` | Mekan fotoğrafları (tarayıcıda küçültülüp data URL olarak saklanır; ücretsiz planda Storage gerekmez) |
| `broadcasts/{uid}_{matchId}` | Mekanın vereceği maç: ses, giriş, min. harcama, yer sayısı, ayrılan yer |
| `reservations/{auto}` | Taraftar rezervasyonu (telefonu sadece ilgili mekan görür) |
| `codes/{KOD}` | Tek seferlik aktivasyon kodu: `days`, `plan`, `used`, `usedBy`, `usedAt` |

Güvenlik kuralları (`firestore.rules`) şunları garanti eder: normal kayıt en fazla 14 günlük deneme açabilir; kodlu kayıt
ancak kodu **aynı işlemde** kullanarak açılabilir (kod iki kez kullanılamaz); mekan kendi üyeliğine dokunamaz;
kodları sadece yönetici (`kagankarki03@gmail.com`, Google ile) listeleyip oluşturabilir.

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
Anahtar yokken Google Maps gömülü görünümü kullanılır; Google'ın iğnesi yerine kendi işaretçimiz (stadyum fotoğrafı ya da
mekan kapağı) ortada gösterilir.

## Görseller

- **Armalar** (`public/logos`) ve **turnuva logoları** (`public/comps`): Wikipedia / Wikimedia Commons. Kulüp ve turnuva logoları
  tescilli markadır; ticari kullanımda hukuki durumu kontrol et.
- **Stadyum fotoğrafları** (`public/stadiums`): Wikimedia Commons, özgür lisanslı (CC BY / CC BY-SA / CC0). Fotoğrafçı ve lisans
  her fotoğrafın üstünde gösterilir; kaynak bağlantıları `lib/teams.ts` → `stadiums`. Rizespor, Çorum ve Shakhtar için özgür
  lisanslı fotoğraf bulunamadı, bu maçlarda saha çizgisi deseni görünür.

## Sıradaki adımlar

- **Ödeme**: iyzico/PayTR abonelik + webhook → `membership.status` güncelle (Cloud Function)
- **Spam koruması**: Firebase App Check (rezervasyon formu herkese açık)
- **Bildirim**: yeni rezervasyonda mekana WhatsApp/SMS
