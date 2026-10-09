'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'mn.theme';
const EVENT = 'mn-theme';

/** Sayfa boyanmadan önce çalışır: kayıtlı temayı uygular, yanlış renkte yanıp sönmeyi önler */
export const themeInitScript = `try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

function effective(): Theme {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Geçerli tema (düğmeyle seçilen, yoksa sistem ayarı) */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    const sync = () => setTheme(effective());
    sync();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', sync);
    window.addEventListener(EVENT, sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  return theme;
}

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/** Temayı değiştirir; destekleyen tarayıcıda tıklanan noktadan dairesel geçişle */
export function switchTheme(next: Theme, origin?: { x: number; y: number }) {
  const apply = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  const doc = document as VTDocument;
  if (!doc.startViewTransition || !origin || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply();
  const { x, y } = origin;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  doc.startViewTransition(apply).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 550, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
}
