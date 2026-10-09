'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { LogoMark } from './art';
import { demoMode, login, resetPassword } from '@/lib/db';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  async function forgot() {
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Önce e-posta adresini yaz, sıfırlama bağlantısını oraya gönderelim.');
    try {
      await resetPassword(email.trim());
      setNotice(`Şifre sıfırlama bağlantısı ${email.trim()} adresine gönderildi. Gelen kutunu (ve spam klasörünü) kontrol et.`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.push('/panel');
    } catch (err) {
      setError((err as Error).message);
      setShake((s) => s + 1);
      setBusy(false);
    }
  }

  return (
    <motion.form
      key={shake}
      className="card auth-wrap"
      onSubmit={submit}
      initial={shake ? { x: 0 } : { opacity: 0, y: 16 }}
      animate={shake ? { x: [0, -10, 9, -6, 4, 0] } : { opacity: 1, y: 0 }}
      transition={{ duration: shake ? 0.4 : 0.35 }}
    >
      <LogoMark size={40} />
      <h1 style={{ marginTop: 14 }}>Mekan girişi</h1>
      <p className="muted" style={{ margin: '6px 0 22px' }}>Vereceğin maçları ve mekan bilgilerini yönet.</p>

      {demoMode && (
        <div className="demo-banner">
          <Info size={18} style={{ flex: 'none', marginTop: 1 }} />
          <span>Demo modu: Önce “Mekanını ekle” ile bu tarayıcıda bir hesap oluştur, sonra buradan gir.</span>
        </div>
      )}

      <div className="field">
        <label htmlFor="l-email">E-posta</label>
        <input id="l-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="l-pass">Şifre</label>
        <input id="l-pass" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-4px 0 14px' }}>
        <button type="button" className="link-btn" onClick={forgot}>
          Şifremi unuttum
        </button>
      </div>
      <AnimatePresence>
        {notice && (
          <motion.div className="trial-note" style={{ marginTop: 0, marginBottom: 14 }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0 }}>
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {error && (
          <motion.div className="form-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0 }}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
        {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
      <p className="legal" style={{ fontSize: 14 }}>
        Henüz üye değil misin? <Link href="/kayit" style={{ color: 'var(--accent)', fontWeight: 600 }}>Mekanını ekle</Link>
      </p>
    </motion.form>
  );
}
