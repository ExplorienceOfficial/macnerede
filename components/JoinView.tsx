'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { ArrowRight, Check, MessageCircle } from 'lucide-react';
import RegisterFlow from './RegisterFlow';
import { LogoMark } from './art';
import { createLead } from '@/lib/db';
import { DEFAULT_CITY, cities, cityById } from '@/lib/places';
import { bundledVenues } from '@/lib/venues';
import { formatPhone } from '@/lib/hooks';

/**
 * "Mekanını ekle": önce 3 alanlık kısa başvuru (ad, semt, WhatsApp) — profili biz hazırlarız.
 * Beklemek istemeyen mekan 5 adımlı formla profilini kendisi kurar.
 * ?mekan=<rehber id> ile gelinirse rehberdeki mekanın bilgileri hazır gelir.
 */
export default function JoinView({ weekMatchCount, venueId }: { weekMatchCount: number; venueId?: string }) {
  const venue = useMemo(() => bundledVenues.find((v) => v.id === venueId) ?? null, [venueId]);
  const [mode, setMode] = useState<'quick' | 'full'>('quick');
  const [name, setName] = useState(venue?.name ?? '');
  const [city, setCity] = useState(venue?.city ?? DEFAULT_CITY);
  const [district, setDistrict] = useState(venue?.district ?? cityById(DEFAULT_CITY)!.districts[0].id);
  const [phone, setPhone] = useState(venue?.phone ? formatPhone(venue.phone) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (mode === 'full') {
    return (
      <RegisterFlow
        weekMatchCount={weekMatchCount}
        prefill={
          venue
            ? { name: venue.name, city: venue.city, district: venue.district, address: venue.address, phone: venue.phone ? formatPhone(venue.phone) : '', loc: { lat: venue.lat, lng: venue.lng }, locTouched: true }
            : { name, city, district, phone }
        }
      />
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createLead({ name, city, district, phone, venueId: venue?.id ?? null });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 560, padding: '36px 20px 70px' }}>
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div key="sent" className="card auth-wrap" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <motion.span className="join-ok" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
              <Check size={28} />
            </motion.span>
            <h1 style={{ marginTop: 14 }}>Başvurun bize ulaştı</h1>
            <p className="muted" style={{ margin: '8px 0 20px' }}>
              {name} için {phone.trim()} numarasına WhatsApp’tan yazacağız. Profilini birlikte
              hazırlayıp onayına sunacağız; şimdilik ücret yok.
            </p>
            <Link href="/" className="btn btn-primary btn-block">
              Bu haftanın maçları <ArrowRight size={16} />
            </Link>
          </motion.div>
        ) : (
          <motion.form key="form" className="card auth-wrap" onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <LogoMark size={40} />
            <h1 style={{ marginTop: 14 }}>Mekanını ekle</h1>
            <p className="muted" style={{ margin: '6px 0 18px' }}>
              <b>Şimdilik ücretsiz.</b> Üç bilgi yeter; profilini biz hazırlayıp onayına sunalım. Taraftarlar yer sormak için doğrudan WhatsApp’tan sana
              yazsın.
            </p>
            {venue && (
              <div className="trial-note" style={{ marginTop: 0, marginBottom: 16 }}>
                <MessageCircle size={18} style={{ flex: 'none', marginTop: 2 }} />
                <span>
                  <b>{venue.name}</b> şu an rehberimizde taraftar yorumlarıyla listeleniyor. Profili sahiplenince maçlarını, sesi ve giriş ücretini sen
                  girersin.
                </span>
              </div>
            )}
            <div className="field">
              <label htmlFor="j-name">Mekan adı</label>
              <input id="j-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. Moda Köşe Pub" autoComplete="organization" />
            </div>
            <div className="row-2">
              <div className="field">
                <label htmlFor="j-city">Şehir</label>
                <select
                  id="j-city"
                  className="input"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setDistrict(cityById(e.target.value)!.districts[0].id);
                  }}
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="j-district">Semt</label>
                <select id="j-district" className="input" value={district} onChange={(e) => setDistrict(e.target.value)}>
                  {cityById(city)!.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="j-phone">WhatsApp numarası</label>
              <input id="j-phone" className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" autoComplete="tel" />
              <span className="hint">Sana bu numaradan yazacağız; taraftarlar da yer sormak için bu numaraya yazar.</span>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? 'Gönderiliyor…' : 'Başvur'}
            </button>
            <p className="hint" style={{ marginTop: 10, textAlign: 'center' }}>
              Başvurarak maçları yasal ticari yayın üyeliğiyle verdiğini beyan edersin.
            </p>
            <div className="join-alt">
              <button type="button" className="link-btn" onClick={() => setMode('full')}>
                Beklemeden profilimi kendim kurayım (5 adım)
              </button>
              <Link href="/giris" className="link-btn">
                Zaten üyeyim
              </Link>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
