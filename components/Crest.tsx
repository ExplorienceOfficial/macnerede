import { useId } from 'react';
import { team } from '@/lib/teams';

// Kulüp renkleriyle çizilmiş arma. Resmi arma kullanmak istersen lib/teams.ts içinde `logo` alanını doldur.
export default function Crest({ id, size = 40, className }: { id: string; size?: number; className?: string }) {
  const t = team(id);
  const uid = useId().replace(/:/g, '');
  const [c1, c2] = t.colors;

  if (t.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={t.logo} alt={t.name} width={size} height={size} className={`crest-img${className ? ` ${className}` : ''}`} style={{ objectFit: 'contain', flex: 'none', display: 'block' }} draggable={false} />;
  }

  const fontSize = t.short.length >= 4 ? 15 : t.short.length === 3 ? 19 : 24;

  if (t.pattern === 'ring') {
    const light = isLight(c2);
    const ink = contrast(c1, c2) >= 3 ? c2 : isLight(c1) ? '#141414' : '#ffffff';
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={t.name}>
        <circle cx="50" cy="50" r="47" fill={c1} />
        <circle cx="50" cy="50" r="39" fill="none" stroke={c2} strokeWidth="4" opacity={light ? 0.9 : 1} />
        <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="2" />
        <text x="50" y="50" dy="0.35em" textAnchor="middle" fontSize={fontSize + 2} fontWeight="800" fill={ink} style={{ letterSpacing: '-0.02em' }}>
          {t.short}
        </text>
      </svg>
    );
  }

  const shield = 'M50 3 L94 15 V54 C94 82 74 101 50 109 C26 101 6 82 6 54 V15 Z';
  const textColor = isLight(c1) ? '#141414' : c1;
  return (
    <svg viewBox="0 0 100 112" width={size} height={(size * 112) / 100} className={className} role="img" aria-label={t.name}>
      <defs>
        <clipPath id={`s${uid}`}>
          <path d={shield} />
        </clipPath>
        <linearGradient id={`g${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#s${uid})`}>
        {t.pattern === 'split' && (
          <>
            <rect width="100" height="112" fill={c2} />
            <polygon points="0,0 100,0 0,112" fill={c1} />
          </>
        )}
        {t.pattern === 'halves' && (
          <>
            <rect width="100" height="112" fill={c2} />
            <rect width="50" height="112" fill={c1} />
          </>
        )}
        {t.pattern === 'stripes' && (
          <>
            <rect width="100" height="112" fill={c1} />
            {[14, 34, 54, 74].map((x) => (
              <rect key={x} x={x} width="11" height="112" fill={c2} />
            ))}
          </>
        )}
        <rect width="100" height="112" fill={`url(#g${uid})`} />
      </g>
      <path d={shield} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="2.5" />
      <circle cx="50" cy="55" r="25" fill="#fff" stroke={isLight(c1) ? '#141414' : c1} strokeWidth="3.5" />
      <text x="50" y="55" dy="0.36em" textAnchor="middle" fontSize={fontSize} fontWeight="800" fill={textColor} style={{ letterSpacing: '-0.03em' }}>
        {t.short}
      </text>
    </svg>
  );
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 200;
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
