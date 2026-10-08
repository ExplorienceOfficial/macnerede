'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, FileUp, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { LogoMark } from './art';
import { CODE_DAYS, adminListCodes, adminSignIn, adminUploadCodes, demoMode, getCafe, logout, watchAdmin } from '@/lib/db';
import type { ActivationCode } from '@/lib/types';

const CODE_RE = /MAC-[A-Z2-9]{4}-[A-Z2-9]{4}/g;

function friendly(e: unknown) {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/operation-not-allowed') return 'Google ile giriş kapalı. Firebase Console → Authentication → Sign-in method → Google’ı aç.';
  if (code === 'auth/unauthorized-domain') return 'Bu alan adı Firebase’de yetkili değil (Authentication → Settings → Authorized domains).';
  if (code === 'permission-denied') return 'Bu Google hesabının yönetim yetkisi yok.';
  return (e as Error)?.message ?? 'Bir şeyler ters gitti.';
}

export default function AdminView() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [codes, setCodes] = useState<ActivationCode[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'free' | 'used'>('all');
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => (demoMode ? undefined : watchAdmin(setEmail)), []);

  const refresh = useCallback(async () => {
    try {
      const list = await adminListCodes();
      setCodes(list);
      setError(null);
      // Kodu kullanan mekanların adları
      const ids = [...new Set(list.filter((c) => c.usedBy).map((c) => c.usedBy!))];
      const pairs = await Promise.all(ids.map(async (id) => [id, (await getCafe(id).catch(() => null))?.name ?? 'Silinmiş mekan'] as const));
      setNames(Object.fromEntries(pairs));
    } catch (e) {
      setCodes(null);
      setError(friendly(e));
    }
  }, []);

  useEffect(() => {
    if (email) refresh();
  }, [email, refresh]);

  const shown = useMemo(() => (codes ?? []).filter((c) => (filter === 'all' ? true : filter === 'used' ? c.used : !c.used)), [codes, filter]);
  const usedCount = (codes ?? []).filter((c) => c.used).length;

  async function readFile(f: File | undefined) {
    if (!f) return;
    const found = [...new Set((await f.text()).toUpperCase().match(CODE_RE) ?? [])];
    setPending(found);
    setNotice(found.length ? null : 'Dosyada MAC-XXXX-XXXX biçiminde kod bulunamadı.');
  }

  async function upload() {
    setBusy(true);
    setNotice(null);
    try {
      const n = await adminUploadCodes(pending);
      setNotice(`${n} yeni kod yüklendi${pending.length - n ? `, ${pending.length - n} tanesi zaten vardı` : ''}.`);
      setPending([]);
      if (fileRef.current) fileRef.current.value = '';
      await refresh();
    } catch (e) {
      setNotice(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1400);
  }

  if (demoMode) {
    return (
      <div className="card auth-wrap">
        <h1>Yönetim</h1>
        <p className="muted" style={{ marginTop: 8 }}>Yönetim sayfası için Firebase bağlantısı gerekli (.env.local).</p>
      </div>
    );
  }

  if (email === undefined) return <div className="skeleton" style={{ height: 200, margin: '40px 0' }} />;

  if (!email) {
    return (
      <motion.div className="card auth-wrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <LogoMark size={40} />
        <h1 style={{ marginTop: 14 }}>Yönetim</h1>
        <p className="muted" style={{ margin: '6px 0 22px' }}>Aktivasyon kodlarını yönetmek için yönetici Google hesabınla gir.</p>
        {error && <div className="form-error">{error}</div>}
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() =>
            adminSignIn().catch((e) => {
              if ((e as { code?: string })?.code !== 'auth/popup-closed-by-user') setError(friendly(e));
            })
          }
        >
          <ShieldCheck size={18} /> Google ile giriş yap
        </button>
      </motion.div>
    );
  }

  return (
    <div style={{ padding: '30px 0 70px' }}>
      <div className="panel-head" style={{ paddingTop: 0 }}>
        <div>
          <span className="faint" style={{ fontSize: 14, fontWeight: 600 }}>Yönetim · {email}</span>
          <h1>Aktivasyon kodları</h1>
        </div>
        <button className="btn btn-soft btn-sm" onClick={() => logout()}>
          <LogOut size={15} /> Çıkış
        </button>
      </div>

      {error ? (
        <div className="form-error">{error}</div>
      ) : (
        <>
          <div className="stats">
            <div className="card stat-tile">
              <b>{codes?.length ?? '…'}</b>
              <span>Toplam kod</span>
            </div>
            <div className="card stat-tile hl">
              <b>{codes ? codes.length - usedCount : '…'}</b>
              <span>Boşta (gönderilebilir)</span>
            </div>
            <div className="card stat-tile">
              <b>{codes ? usedCount : '…'}</b>
              <span>Kullanılan</span>
            </div>
            <div className="card stat-tile">
              <b>{Math.round(CODE_DAYS / 365)} yıl</b>
              <span>Kod başına ücretsiz süre</span>
            </div>
          </div>

          <section className="card panel-card">
            <h2>Kod yükle</h2>
            <p>kodlar.txt dosyasını seç. Firebase’de zaten olan kodlara dokunulmaz, kullanılmış kodlar sıfırlanmaz.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                <FileUp size={16} /> Dosya seç
              </button>
              <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={(e) => readFile(e.target.files?.[0])} />
              {pending.length > 0 && (
                <motion.button className="btn btn-primary" onClick={upload} disabled={busy} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <KeyRound size={16} /> {busy ? 'Yükleniyor…' : `${pending.length} kodu Firebase’e yükle`}
                </motion.button>
              )}
            </div>
            <AnimatePresence>
              {notice && (
                <motion.p className="trial-note" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {notice}
                </motion.p>
              )}
            </AnimatePresence>
          </section>

          <section className="card panel-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <h2>Kodlar</h2>
              <div className="chips">
                {(
                  [
                    ['all', 'Hepsi'],
                    ['free', 'Boşta'],
                    ['used', 'Kullanılan'],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {codes === null ? (
              <div className="skeleton" style={{ height: 200 }} />
            ) : codes.length === 0 ? (
              <p className="faint">Henüz kod yok. Yukarıdan kodlar.txt dosyasını yükle.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Durum</th>
                      <th>Mekan</th>
                      <th>Tarih</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((c) => (
                      <tr key={c.code}>
                        <td>
                          <code>{c.code}</code>
                        </td>
                        <td>{c.used ? <span className="badge badge-comp">Kullanıldı</span> : <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>Boşta</span>}</td>
                        <td>{c.usedBy ? names[c.usedBy] ?? '…' : '—'}</td>
                        <td className="faint">{c.usedAt ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(c.usedAt)) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          {!c.used && (
                            <button className="icon-btn" onClick={() => copy(c.code)} aria-label="Kodu kopyala" title="Kopyala">
                              {copied === c.code ? <Check size={15} /> : <Copy size={15} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
