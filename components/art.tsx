// Sitenin el çizimi SVG varlıkları
import { useId } from 'react';
import { team, type BigTeam } from '@/lib/teams';

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <path d="M20 2C11.7 2 5 8.6 5 16.8 5 28 20 38 20 38s15-10 15-21.2C35 8.6 28.3 2 20 2Z" fill="var(--accent)" />
      <circle cx="20" cy="17" r="8.5" fill="#fff" />
      <path d="M20 11.6l2.9 2.1-1.1 3.4h-3.6l-1.1-3.4Z" fill="var(--accent)" />
      <path d="M13.2 15.6l2.6-.8 1.1 3.4-2 2.6M26.8 15.6l-2.6-.8-1.1 3.4 2 2.6M17.6 22.9l.7-2.6h3.4l.7 2.6" fill="none" stroke="var(--accent)" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

/** Sayfanın en üstündeki atkı şeridi: dört kulübün renkleri */
export function ScarfStripe() {
  const segs: BigTeam[] = ['gs', 'fb', 'bjk', 'ts'];
  return (
    <div className="scarf" aria-hidden>
      {segs.map((id) => {
        const [a, b] = team(id).colors;
        return <span key={id} style={{ background: `repeating-linear-gradient(-45deg, ${a} 0 10px, ${b} 10px 20px)` }} />;
      })}
    </div>
  );
}

export function Jersey({ id, size = 84 }: { id: BigTeam; size?: number }) {
  const t = team(id);
  const [c1, c2] = t.colors;
  const uid = useId().replace(/:/g, '');
  const body = 'M40 12 L18 20 L4 44 L21 54 L28 45 V112 H92 V45 L99 54 L116 44 L102 20 L80 12 C76 21 68 26 60 26 C52 26 44 21 40 12 Z';
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
      <defs>
        <clipPath id={`j${uid}`}>
          <path d={body} />
        </clipPath>
      </defs>
      <g clipPath={`url(#j${uid})`}>
        <rect width="120" height="120" fill={c1} />
        {t.pattern === 'split' && <rect x="60" width="60" height="120" fill={c2} />}
        {t.pattern === 'halves' && <rect x="60" width="60" height="120" fill={c2} />}
        {t.pattern === 'stripes' && [30, 50, 70, 90].map((x) => <rect key={x} x={x - 5} width="10" height="120" fill={c2} />)}
        <path d="M0 44 L21 54 L28 45" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="2" />
        <path d="M120 44 L99 54 L92 45" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="2" />
      </g>
      <path d={body} fill="none" stroke="rgba(0,0,0,.22)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M44 14 C48 22 54 25 60 25 C66 25 72 22 76 14" fill="none" stroke={c2 === '#FFFFFF' ? '#d9d9d9' : c2} strokeWidth="4" strokeLinecap="round" />
      {/* Göğüste gerçek arma, beyaz bir yamanın üstünde */}
      <circle cx="60" cy="62" r="19" fill="#fff" stroke="rgba(0,0,0,.15)" strokeWidth="1.5" />
      {t.logo && <image href={t.logo} x="45" y="47" width="30" height="30" preserveAspectRatio="xMidYMid meet" />}
    </svg>
  );
}

/** Saha çizgileri — kart arka planları için */
export function PitchLines({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="10" y="10" width="380" height="200" rx="2" />
        <line x1="200" y1="10" x2="200" y2="210" />
        <circle cx="200" cy="110" r="34" />
        <circle cx="200" cy="110" r="2.5" fill="currentColor" />
        <rect x="10" y="60" width="52" height="100" />
        <rect x="10" y="85" width="20" height="50" />
        <rect x="338" y="60" width="52" height="100" />
        <rect x="370" y="85" width="20" height="50" />
        <path d="M62 88 A26 26 0 0 1 62 132" />
        <path d="M338 88 A26 26 0 0 0 338 132" />
      </g>
    </svg>
  );
}

export function HookahIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 3h6l-1 2.5h-4z" />
      <path d="M12 5.5v6" />
      <path d="M10 9.5h4" />
      <path d="M8.5 21c-1.7-1-2.5-2.6-2.5-4.3C6 14 8.7 12 12 12s6 2 6 4.7c0 1.7-.8 3.3-2.5 4.3z" />
      <path d="M17.5 14.5c2.2 0 3.5-1.2 3.5-3.5" />
    </svg>
  );
}

export function TeaGlassIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7.5 4h9c0 3-1.8 4.5-1.8 7s1.8 4 1.8 7.5c0 1-.8 1.5-1.8 1.5H9.3c-1 0-1.8-.5-1.8-1.5C7.5 15 9.3 13.5 9.3 11S7.5 7 7.5 4z" />
      <path d="M8.6 8h6.8" opacity=".55" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function PintIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 4h11l-1.4 16.2a1 1 0 0 1-1 .8H8.9a1 1 0 0 1-1-.8z" />
      <path d="M7 8.5h10" />
      <path d="M6.5 4c.5-1.2 1.6-1.6 2.6-1.1.8-.9 2.6-.9 3.3.1 1-.7 2.6-.3 3.1.8.9-.2 1.7.1 2 .2" />
    </svg>
  );
}

/** Boş durum çizimi: maç açık bir televizyon */
export function TvIllustration({ home = 'gs', away = 'fb' }: { home?: string; away?: string }) {
  const h = team(home).colors[0];
  const a = team(away).colors[0];
  return (
    <svg viewBox="0 0 220 160" width="220" height="160" aria-hidden>
      <rect x="20" y="14" width="180" height="112" rx="12" fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="3" />
      <rect x="32" y="26" width="156" height="88" rx="6" fill="#2f7d53" />
      <g stroke="rgba(255,255,255,.55)" strokeWidth="1.5" fill="none">
        <rect x="40" y="33" width="140" height="74" />
        <line x1="110" y1="33" x2="110" y2="107" />
        <circle cx="110" cy="70" r="13" />
      </g>
      <circle cx="80" cy="60" r="4" fill={h} stroke="#fff" strokeWidth="1.5" />
      <circle cx="92" cy="80" r="4" fill={h} stroke="#fff" strokeWidth="1.5" />
      <circle cx="132" cy="58" r="4" fill={a} stroke="#fff" strokeWidth="1.5" />
      <circle cx="140" cy="84" r="4" fill={a} stroke="#fff" strokeWidth="1.5" />
      <circle cx="116" cy="74" r="2.6" fill="#fff" />
      <path d="M90 126l-10 18M130 126l10 18" stroke="var(--line-strong)" strokeWidth="4" strokeLinecap="round" />
      <path d="M66 146h88" stroke="var(--line-strong)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Bilet üzerindeki barkod — koddan türetilir, her bilette farklı görünür */
export function Barcode({ code, height = 46 }: { code: string; height?: number }) {
  let x = 0;
  const bars: { x: number; w: number }[] = [];
  for (let i = 0; i < code.length * 3; i++) {
    const c = code.charCodeAt(i % code.length) * (i + 7);
    const w = (c % 3) + 1;
    bars.push({ x, w });
    x += w + ((c >> 2) % 2) + 1;
  }
  return (
    <svg viewBox={`0 0 ${x} 10`} preserveAspectRatio="none" width="100%" height={height} aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} width={b.w} height="10" fill="currentColor" />
      ))}
    </svg>
  );
}
