'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { customerGoogle, customerLogin, customerRegister, demoMode, resetPassword } from '@/lib/db';

/** Taraftar girişi / kaydı — rezervasyon penceresinde ve Hesabım sayfasında kullanılır */
export default function AuthPanel({ compact, intro }: { compact?: boolean; intro?: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Geçerli bir e-posta yaz.');
    setBusy(true);
    try {
      if (mode === 'register') await customerRegister(email.trim(), password, name, phone);
      else await customerLogin(email.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Önce e-posta adresini yaz.');
    try {
      await resetPassword(email.trim());
      setNotice(`Şifre sıfırlama bağlantısı ${email.trim()} adresine gönderildi.`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className={compact ? 'auth-panel compact' : 'auth-panel'}>
      {intro && <p className="sheet-sub" style={{ marginBottom: 14 }}>{intro}</p>}
      <div className="seg" style={{ marginBottom: 16 }}>
        {(
          [
            ['register', 'Hesap oluştur'],
            ['login', 'Giriş yap'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}>
            {mode === k && <motion.span layoutId={`auth-mode-${compact ? 'c' : 'p'}`} className="seg-thumb" />}
            {l}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {mode === 'register' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="row-2">
              <div className="field">
                <label htmlFor="a-name">Ad soyad</label>
                <input id="a-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="a-phone">Telefon</label>
                <input id="a-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="row-2">
        <div className="field">
          <label htmlFor="a-email">E-posta</label>
          <input id="a-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="a-pass">Şifre</label>
          <input
            id="a-pass"
            className="input"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'En az 6 karakter' : ''}
          />
        </div>
      </div>

      {mode === 'login' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-4px 0 12px' }}>
          <button type="button" className="link-btn" onClick={forgot}>
            Şifremi unuttum
          </button>
        </div>
      )}
      {notice && <div className="trial-note" style={{ marginTop: 0, marginBottom: 12 }}>{notice}</div>}
      {error && <div className="form-error">{error}</div>}

      <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
        {busy ? 'Bekle…' : mode === 'register' ? 'Hesabı oluştur' : 'Giriş yap'}
      </button>
      {!demoMode && (
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => customerGoogle().catch((e) => setError((e as Error).message))}>
          <GoogleG /> Google ile devam et
        </button>
      )}
    </form>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.4-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
